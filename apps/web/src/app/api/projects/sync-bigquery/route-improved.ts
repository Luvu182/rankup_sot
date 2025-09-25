import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createProjectInBigQuery } from "@Rankup-manager/backend/lib/bigquery-client";
import { requestManager } from "@/lib/state/request-manager";

/**
 * Idempotent BigQuery sync API endpoint
 * 
 * Features:
 * - Request deduplication based on user + project combination
 * - Idempotency key support for client-side retry safety
 * - Proper error handling and status codes
 * - Request tracking to prevent race conditions
 */
export async function POST(request: Request) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", success: false },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { projectId, name, domain, idempotencyKey } = body;

    // Validate required fields
    if (!projectId || !name || !domain) {
      return NextResponse.json(
        { 
          error: "Missing required fields: projectId, name, and domain are required",
          success: false 
        },
        { status: 400 }
      );
    }

    // Generate request ID for tracking
    const requestId = idempotencyKey || `sync-${userId}-${projectId}`;

    console.log('[SYNC-API] Starting BigQuery sync:', {
      projectId,
      userId,
      name,
      domain,
      requestId,
      timestamp: new Date().toISOString()
    });

    // Check if this request is already in progress
    if (requestManager.isRequestInProgress(requestId)) {
      console.log('[SYNC-API] Request already in progress:', requestId);
      
      // Return 409 Conflict to indicate duplicate request
      return NextResponse.json(
        { 
          error: "Sync operation already in progress for this project",
          success: false,
          code: "DUPLICATE_REQUEST"
        },
        { status: 409 }
      );
    }

    // Check if we have a recent successful sync (within 5 minutes)
    const existingRequest = requestManager.getRequest(requestId);
    if (existingRequest && 
        existingRequest.status === 'success' && 
        Date.now() - existingRequest.timestamp < 5 * 60 * 1000) {
      
      console.log('[SYNC-API] Returning cached successful result:', requestId);
      
      return NextResponse.json({ 
        success: true,
        message: "Project already synced recently",
        projectId,
        userId,
        cached: true,
        syncedAt: new Date(existingRequest.timestamp).toISOString()
      });
    }

    // Start tracking this request
    if (!requestManager.startRequest(requestId)) {
      // This shouldn't happen due to the check above, but just in case
      return NextResponse.json(
        { 
          error: "Failed to start sync operation",
          success: false,
          code: "REQUEST_START_FAILED"
        },
        { status: 500 }
      );
    }

    try {
      // Execute the BigQuery sync
      const result = await createProjectInBigQuery(projectId, userId, name, domain);
      
      console.log('[SYNC-API] BigQuery sync completed successfully:', { 
        result, 
        projectId,
        requestId,
        timestamp: new Date().toISOString() 
      });

      // Mark request as complete
      requestManager.completeRequest(requestId, { result, projectId, userId });

      return NextResponse.json({ 
        success: true,
        message: "Project synced to BigQuery successfully",
        projectId,
        userId,
        result
      });
      
    } catch (syncError) {
      console.error("[SYNC-API] BigQuery sync error:", syncError);
      
      // Mark request as failed
      const error = syncError instanceof Error ? syncError : new Error('Unknown sync error');
      requestManager.failRequest(requestId, error);

      // Determine appropriate error response
      const errorMessage = error.message || 'Failed to sync project to BigQuery';
      const isRetryable = !errorMessage.includes('already exists') && 
                         !errorMessage.includes('permission denied');

      return NextResponse.json(
        { 
          success: false,
          error: errorMessage,
          code: isRetryable ? "SYNC_FAILED_RETRYABLE" : "SYNC_FAILED_PERMANENT",
          retryable: isRetryable
        },
        { status: isRetryable ? 503 : 400 }
      );
    }
  } catch (error) {
    console.error("[SYNC-API] Unexpected error:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "An unexpected error occurred",
        code: "INTERNAL_ERROR"
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    activeRequests: requestManager.getAllRequests().size
  });
}