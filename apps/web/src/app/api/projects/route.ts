import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@Rankup-manager/backend/convex/_generated/api";
import { Id } from "@Rankup-manager/backend/convex/_generated/dataModel";
import { 
  canCreateProject, 
  incrementProjectCount,
  hasFeature 
} from "@/middleware/subscription";
import { SUBSCRIPTION_FEATURES } from "@Rankup-manager/shared";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const token = await getToken({ template: "convex" });
    convex.setAuth(token || undefined);

    const projects = await convex.query(api.projects.getProjects);
    
    // Add subscription info to response
    const projectLimit = await canCreateProject();
    
    return NextResponse.json({
      projects,
      subscription: {
        canCreateMore: projectLimit.allowed,
        projectsUsed: projectLimit.current,
        projectLimit: projectLimit.limit,
        remaining: projectLimit.remaining
      }
    });
  } catch (error) {
    console.error("Projects GET error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check project limit before creating
    const projectCheck = await canCreateProject();
    if (!projectCheck.allowed) {
      return NextResponse.json({
        error: "Project limit reached",
        message: "You have reached your project limit. Please upgrade your plan to create more projects.",
        limit: projectCheck.limit,
        current: projectCheck.current,
        upgrade_url: "/settings/billing"
      }, { status: 402 });
    }

    const body = await request.json();
    const { name, domain } = body;

    if (!name || !domain) {
      return NextResponse.json(
        { error: "Name and domain are required" },
        { status: 400 }
      );
    }

    const token = await getToken({ template: "convex" });
    convex.setAuth(token || undefined);

    // Create project in Convex
    const projectId = await convex.mutation(api.projects.createProject, {
      name,
      domain,
      settings: body.settings,
      isPublic: body.isPublic || false
    });

    // Increment cached project count
    await incrementProjectCount(userId);
    
    // Get project details to sync with BigQuery
    const project = await convex.query(api.projects.getProject, {
      projectId: projectId as Id<"projects">
    });
    
    if (project?.bigQueryProjectId) {
      // Import BigQuery client
      const { createProjectInBigQuery } = await import("@Rankup-manager/backend/lib/bigquery-client");
      
      // Create project in BigQuery with Clerk user ID
      try {
        await createProjectInBigQuery(
          project.bigQueryProjectId,
          userId, // Clerk user ID
          name,
          domain
        );
        console.log(`✅ Created BigQuery project: ${project.bigQueryProjectId}`);
      } catch (error) {
        console.error("Failed to create BigQuery project:", error);
        // Continue anyway - can be fixed later
      }
    }

    return NextResponse.json({ 
      projectId,
      message: "Project created successfully",
      subscription: {
        projectsUsed: projectCheck.current + 1,
        projectLimit: projectCheck.limit,
        remaining: Math.max(0, projectCheck.remaining - 1)
      }
    });
  } catch (error: any) {
    console.error("Projects POST error:", error);
    
    if (error.message?.includes("domain already exists")) {
      return NextResponse.json(
        { error: "A project with this domain already exists" },
        { status: 409 }
      );
    }
    
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { projectId, updates } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const token = await getToken({ template: "convex" });
    convex.setAuth(token || undefined);

    await convex.mutation(api.projects.updateProject, {
      projectId,
      updates
    });

    return NextResponse.json({ 
      message: "Project updated successfully" 
    });
  } catch (error) {
    console.error("Projects PATCH error:", error);
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
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const token = await getToken({ template: "convex" });
    convex.setAuth(token || undefined);

    await convex.mutation(api.projects.deleteProject, {
      projectId: projectId as any
    });

    // Note: We don't decrement cache here as it's safer to let it expire
    // This prevents issues if delete fails after cache update

    return NextResponse.json({ 
      message: "Project deleted successfully" 
    });
  } catch (error) {
    console.error("Projects DELETE error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}