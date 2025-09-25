import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@Rankup-manager/backend/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Special endpoint to link existing ThinkPro data with current user
 * This follows best practices by:
 * 1. Requiring authentication
 * 2. Creating project through proper channels
 * 3. Linking with existing BigQuery data
 */
export async function POST(request: Request) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const token = await getToken({ template: "convex" });
    convex.setAuth(token || undefined);

    // Check if ThinkPro project already exists
    const projects = await convex.query(api.projects.getProjects);
    const existingThinkPro = projects.find(
      p => p.domain === 'thinkpro.vn' || p.bigQueryProjectId === 'thinkpro-project-001'
    );

    if (existingThinkPro) {
      return NextResponse.json({
        message: "ThinkPro project already exists",
        projectId: existingThinkPro._id,
        status: "existing"
      });
    }

    // Create ThinkPro project
    const projectId = await convex.mutation(api.projects.createProject, {
      name: 'ThinkPro',
      domain: 'thinkpro.vn',
      settings: {
        timezone: 'Asia/Ho_Chi_Minh',
        currency: 'VND',
        language: 'vi',
        locations: ['Vietnam'],
        searchEngines: ['google'],
        trackingFrequency: 'daily',
        competitorDomains: ['cellphones.com.vn', 'fptshop.com.vn'],
        notificationSettings: {
          email: true,
          slack: false,
        },
      },
      isPublic: false,
    });

    // Update bigQueryProjectId to link with existing data
    await convex.mutation(api.projects.updateBigQueryProjectId, {
      projectId,
      bigQueryProjectId: 'thinkpro-project-001'
    });

    return NextResponse.json({
      message: "ThinkPro project created and linked successfully",
      projectId,
      status: "created",
      stats: {
        keywords: 1247,
        rankings: 140
      }
    });

  } catch (error: any) {
    console.error("Setup ThinkPro error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to setup ThinkPro project" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check ThinkPro project status
 */
export async function GET() {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const token = await getToken({ template: "convex" });
    convex.setAuth(token || undefined);

    const projects = await convex.query(api.projects.getProjects);
    const thinkProProject = projects.find(
      p => p.bigQueryProjectId === 'thinkpro-project-001'
    );

    if (thinkProProject) {
      return NextResponse.json({
        exists: true,
        project: {
          id: thinkProProject._id,
          name: thinkProProject.name,
          domain: thinkProProject.domain,
          bigQueryProjectId: thinkProProject.bigQueryProjectId,
        }
      });
    }

    return NextResponse.json({
      exists: false,
      message: "ThinkPro project not found. Call POST to create it."
    });

  } catch (error) {
    console.error("Check ThinkPro error:", error);
    return NextResponse.json(
      { error: "Failed to check ThinkPro project" },
      { status: 500 }
    );
  }
}