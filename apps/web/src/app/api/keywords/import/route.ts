import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@Rankup-manager/backend/convex/_generated/api";
import { Id } from "@Rankup-manager/backend/convex/_generated/dataModel";
import { canAddKeywords, incrementKeywordCount } from "@/middleware/subscription";
import { insertKeywordsBatch } from "@Rankup-manager/backend/lib/bigquery-client";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Import keywords endpoint - proper data flow
 * Supports CSV, JSON, and manual entry
 */
export async function POST(request: Request) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const formData = await request.formData();
    const projectId = formData.get('projectId') as string;
    const source = formData.get('source') as string; // 'csv', 'json', 'manual'
    const file = formData.get('file') as File;
    const keywords = formData.get('keywords') as string; // For manual entry

    if (!projectId || !source) {
      return NextResponse.json(
        { error: "Project ID and source are required" },
        { status: 400 }
      );
    }

    // Verify project ownership
    const token = await getToken({ template: "convex" });
    convex.setAuth(token || undefined);
    
    const project = await convex.query(api.projects.getProject, {
      projectId: projectId as Id<"projects">
    });
    
    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 403 }
      );
    }

    // Parse keywords based on source
    let keywordsToImport: Array<{
      keyword: string;
      target_position?: number;
      category?: string;
      priority?: string;
      target_url?: string;
    }> = [];

    switch (source) {
      case 'csv':
        if (!file) {
          return NextResponse.json(
            { error: "CSV file is required" },
            { status: 400 }
          );
        }
        keywordsToImport = await parseCSV(file);
        break;

      case 'json':
        if (!file) {
          return NextResponse.json(
            { error: "JSON file is required" },
            { status: 400 }
          );
        }
        const jsonText = await file.text();
        keywordsToImport = JSON.parse(jsonText);
        break;

      case 'manual':
        if (!keywords) {
          return NextResponse.json(
            { error: "Keywords are required" },
            { status: 400 }
          );
        }
        // Parse comma or newline separated keywords
        keywordsToImport = keywords
          .split(/[,\n]/)
          .map(k => k.trim())
          .filter(k => k.length > 0)
          .map(keyword => ({ keyword }));
        break;

      default:
        return NextResponse.json(
          { error: "Invalid source type" },
          { status: 400 }
        );
    }

    // Validate keywords
    if (keywordsToImport.length === 0) {
      return NextResponse.json(
        { error: "No valid keywords found" },
        { status: 400 }
      );
    }

    // Check subscription limits
    const keywordCheck = await canAddKeywords(projectId, keywordsToImport.length);
    
    if (!keywordCheck.allowed) {
      return NextResponse.json({
        error: "Keyword limit exceeded",
        message: `You can only add ${keywordCheck.remaining} more keywords. Found ${keywordsToImport.length} keywords to import.`,
        limit: keywordCheck.limit,
        current: keywordCheck.current,
        remaining: keywordCheck.remaining,
        upgrade_url: "/settings/billing"
      }, { status: 402 });
    }

    // Create import job for tracking
    const importJob = {
      id: generateId(),
      projectId: project._id,
      userId,
      source,
      totalRecords: keywordsToImport.length,
      processedRecords: 0,
      failedRecords: 0,
      status: 'processing',
      startedAt: new Date().toISOString()
    };

    // Import keywords to BigQuery
    try {
      await insertKeywordsBatch(project.bigQueryProjectId, keywordsToImport);
      
      // Update cache
      await incrementKeywordCount(projectId, keywordsToImport.length);
      
      // Update import job
      importJob.processedRecords = keywordsToImport.length;
      importJob.status = 'completed';
      
    } catch (error) {
      console.error('BigQuery import error:', error);
      importJob.failedRecords = keywordsToImport.length;
      importJob.status = 'failed';
      
      return NextResponse.json({
        error: "Import failed",
        message: "Failed to import keywords to database",
        jobId: importJob.id
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      jobId: importJob.id,
      imported: importJob.processedRecords,
      failed: importJob.failedRecords,
      subscription: {
        keywordsUsed: keywordCheck.current + importJob.processedRecords,
        keywordLimit: keywordCheck.limit,
        remaining: Math.max(0, keywordCheck.remaining - importJob.processedRecords)
      }
    });

  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Import failed" },
      { status: 500 }
    );
  }
}

/**
 * Parse CSV file
 */
async function parseCSV(file: File): Promise<any[]> {
  const text = await file.text();
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  if (lines.length === 0) return [];
  
  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const keywordIndex = headers.findIndex(h => h.includes('keyword'));
  
  if (keywordIndex === -1) {
    throw new Error('CSV must have a "keyword" column');
  }
  
  // Parse rows
  const keywords = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values[keywordIndex]) {
      keywords.push({
        keyword: values[keywordIndex],
        target_position: parseInt(values[headers.indexOf('target')] || '3') || 3,
        category: values[headers.indexOf('category')] || null,
        priority: values[headers.indexOf('priority')] || 'medium',
        target_url: values[headers.indexOf('url')] || null
      });
    }
  }
  
  return keywords;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}