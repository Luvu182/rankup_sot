import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createProjectInBigQuery } from "@Rankup-manager/backend/lib/bigquery-client";

// In-memory idempotency store (in production, use Redis or database)
interface IdempotencyRecord {
  requestId: string;
  status: 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp: number;
}

const idempotencyStore = new Map<string, IdempotencyRecord>();
const IDEMPOTENCY_WINDOW_MS = 300000; // 5 minutes

// Cleanup expired records periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of idempotencyStore.entries()) {
      if (now - record.timestamp > IDEMPOTENCY_WINDOW_MS) {
        idempotencyStore.delete(key);
      }
    }
  }, 60000);
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", success: false },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId, name, domain } = body;
    
    // Get idempotency key from header or generate one
    const idempotencyKey = request.headers.get('X-Idempotency-Key') || 
                         `sync-${userId}-${projectId}-${Date.now()}`;

    console.log('[SYNC-API] Received sync request:', {
      projectId,
      userId,
      name,
      domain,
      idempotencyKey,
      timestamp: new Date().toISOString()
    });

    if (!projectId || !name || !domain) {
      return NextResponse.json(
        { error: "Missing required fields", success: false },
        { status: 400 }
      );
    }

    // Check idempotency
    const existingRecord = idempotencyStore.get(idempotencyKey);
    
    if (existingRecord) {
      console.log('[SYNC-API] Found existing request:', {
        idempotencyKey,
        status: existingRecord.status
      });
      
      switch (existingRecord.status) {
        case 'processing':
          // Request is still being processed
          return NextResponse.json(
            { error: "Request is being processed", success: false },
            { status: 409, headers: { 'Retry-After': '5' } }
          );
          
        case 'completed':
          // Return cached successful result
          console.log('[SYNC-API] Returning cached success');
          return NextResponse.json(existingRecord.result);
          
        case 'failed':
          // Return cached failure (allow retry after some time)
          const timeSinceFailure = Date.now() - existingRecord.timestamp;
          if (timeSinceFailure < 30000) { // 30 seconds
            return NextResponse.json(
              { 
                error: existingRecord.error || 'Previous request failed', 
                success: false 
              },
              { status: 503, headers: { 'Retry-After': '30' } }
            );
          }
          // Allow retry after cooldown
          idempotencyStore.delete(idempotencyKey);
          break;
      }
    }

    // Mark as processing
    idempotencyStore.set(idempotencyKey, {
      requestId: idempotencyKey,
      status: 'processing',
      timestamp: Date.now()
    });

    try {
      // Perform the actual sync
      const result = await createProjectInBigQuery(projectId, userId, name, domain);
      
      console.log('[SYNC-API] BigQuery sync completed successfully:', { 
        projectId,
        timestamp: new Date().toISOString() 
      });

      const response = { 
        success: true,
        message: "Project synced to BigQuery",
        projectId,
        userId
      };

      // Store successful result
      idempotencyStore.set(idempotencyKey, {
        requestId: idempotencyKey,
        status: 'completed',
        result: response,
        timestamp: Date.now()
      });

      return NextResponse.json(response);

    } catch (error) {
      console.error("[SYNC-API] BigQuery sync error:", error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Store failure
      idempotencyStore.set(idempotencyKey, {
        requestId: idempotencyKey,
        status: 'failed',
        error: errorMessage,
        timestamp: Date.now()
      });

      return NextResponse.json({ 
        success: false,
        error: errorMessage
      }, { status: 500 });
    }

  } catch (error) {
    console.error("[SYNC-API] Unexpected error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}