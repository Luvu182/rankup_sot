import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getKeywords, insertKeywordsBatch, deleteKeyword } from "@Rankup-manager/backend/lib/bigquery-client";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@Rankup-manager/backend/convex/_generated/api";
import { Id } from "@Rankup-manager/backend/convex/_generated/dataModel";
import { 
  canAddKeywords, 
  incrementKeywordCount,
  hasFeature 
} from "@/middleware/subscription";
import { SUBSCRIPTION_FEATURES } from "@Rankup-manager/shared";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    
    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required. Please select a project first." },
        { status: 400 }
      );
    }

    // Verify user owns this project
    const token = await getToken({ template: "convex" });
    convex.setAuth(token || undefined);
    
    try {
      const project = await convex.query(api.projects.getProject, {
        projectId: projectId as Id<"projects">
      });
      
      if (!project) {
        return NextResponse.json(
          { error: "Project not found or access denied" },
          { status: 403 }
        );
      }

      // Get keywords from BigQuery
      const search = searchParams.get("search") || "";
      const category = searchParams.get("category") || "";
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "50");
      const offset = (page - 1) * limit;

      const keywords = await getKeywords(project.bigQueryProjectId, { 
        search, 
        category, 
        limit, 
        offset
      });

      // Get subscription info for this project
      const keywordLimit = await canAddKeywords(projectId);

      return NextResponse.json({
        ...keywords,
        projectId,
        projectName: project.name,
        subscription: {
          keywordsUsed: keywordLimit.current,
          keywordLimit: keywordLimit.limit,
          canAddMore: keywordLimit.allowed,
          remaining: keywordLimit.remaining
        }
      });
    } catch (convexError) {
      console.error("Convex query error:", convexError);
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error("Keywords API error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    
    if (!body.keywords || !body.projectId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Ensure keywords is an array
    const keywordsToAdd = Array.isArray(body.keywords) 
      ? body.keywords 
      : [{ keyword: body.keywords }];

    // Verify project ownership
    const token = await getToken({ template: "convex" });
    convex.setAuth(token || undefined);
    
    const project = await convex.query(api.projects.getProject, {
      projectId: body.projectId as Id<"projects">
    });
    
    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 403 }
      );
    }

    // Check keyword limit
    const keywordCheck = await canAddKeywords(body.projectId, keywordsToAdd.length);
    
    if (!keywordCheck.allowed) {
      return NextResponse.json({
        error: "Keyword limit reached",
        message: `You can only add ${keywordCheck.remaining} more keywords to this project. Please upgrade your plan to add more keywords.`,
        limit: keywordCheck.limit,
        current: keywordCheck.current,
        remaining: keywordCheck.remaining,
        requested: keywordsToAdd.length,
        upgrade_url: "/settings/billing"
      }, { status: 402 });
    }

    // Insert keywords into BigQuery
    try {
      await insertKeywordsBatch(project.bigQueryProjectId, keywordsToAdd);
    } catch (error) {
      console.error('BigQuery insert error:', error);
      return NextResponse.json({
        error: 'Failed to insert keywords',
        message: 'Could not save keywords to database. Please try again.'
      }, { status: 500 });
    }

    // Update cache
    await incrementKeywordCount(body.projectId, keywordsToAdd.length);

    return NextResponse.json({ 
      message: `${keywordsToAdd.length} keywords added successfully`,
      count: keywordsToAdd.length,
      subscription: {
        keywordsUsed: keywordCheck.current + keywordsToAdd.length,
        keywordLimit: keywordCheck.limit,
        remaining: Math.max(0, keywordCheck.remaining - keywordsToAdd.length)
      }
    });
  } catch (error) {
    console.error("Keywords POST error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keywordId = searchParams.get("id");
    const projectId = searchParams.get("projectId");

    if (!keywordId || !projectId) {
      return new NextResponse("Keyword ID and Project ID required", { status: 400 });
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

    // Delete from BigQuery
    try {
      await deleteKeyword(keywordId, project.bigQueryProjectId);
    } catch (error) {
      console.error('BigQuery delete error:', error);
      return NextResponse.json({
        error: 'Failed to delete keyword',
        message: 'Could not delete keyword from database. Please try again.'
      }, { status: 500 });
    }

    // Note: We don't decrement keyword count cache here
    // It's safer to let it expire and recount

    return NextResponse.json({ 
      message: "Keyword deleted successfully"
    });
  } catch (error) {
    console.error("Keywords DELETE error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * Bulk operations endpoint (Pro/Enterprise only)
 */
export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user has API access (Pro/Enterprise feature)
    if (!await hasFeature(SUBSCRIPTION_FEATURES.API_ACCESS)) {
      return NextResponse.json({
        error: "API access required",
        message: "Bulk operations require a Pro or Enterprise plan.",
        upgrade_url: "/settings/billing"
      }, { status: 402 });
    }

    const body = await request.json();
    
    // TODO: Implement bulk update
    
    return NextResponse.json({
      message: "Bulk operation completed"
    });
  } catch (error) {
    console.error("Keywords PUT error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}