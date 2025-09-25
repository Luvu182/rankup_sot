import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@Rankup-manager/backend/convex/_generated/api";
import { createProjectInBigQuery } from "@Rankup-manager/backend/lib/bigquery-client";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST() {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Set auth token for Convex
    const token = await getToken({ template: "convex" });
    convex.setAuth(token || undefined);

    // Get all projects from Convex
    const projects = await convex.query(api.projects.getProjects);
    
    console.log(`[SYNC-ALL] Found ${projects.length} projects to sync`);
    
    const results = [];
    
    for (const project of projects) {
      try {
        console.log(`[SYNC-ALL] Syncing project: ${project.name} (${project.bigQueryProjectId})`);
        
        await createProjectInBigQuery(
          project.bigQueryProjectId,
          userId,
          project.name,
          project.domain
        );
        
        results.push({
          projectId: project._id,
          name: project.name,
          success: true
        });
      } catch (error) {
        console.error(`[SYNC-ALL] Failed to sync project ${project.name}:`, error);
        results.push({
          projectId: project._id,
          name: project.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Synced ${successful} projects successfully, ${failed} failed`,
      results,
      totalProjects: projects.length,
      successful,
      failed
    });

  } catch (error) {
    console.error("[SYNC-ALL] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}