import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteProjectFromBigQuery, getUserProjectsDebug } from "@Rankup-manager/backend/lib/bigquery-client";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    console.log('[CLEAN] Starting BigQuery cleanup for user:', userId);

    // First get all projects for this user
    const projectsData = await getUserProjectsDebug(userId);
    const projects = projectsData.projects || [];
    
    console.log(`[CLEAN] Found ${projects.length} projects to delete`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Delete each project
    for (const project of projects) {
      try {
        console.log(`[CLEAN] Deleting project: ${project.project_id}`);
        await deleteProjectFromBigQuery(project.project_id, userId);
        
        results.push({
          projectId: project.project_id,
          name: project.name,
          success: true
        });
        successCount++;
      } catch (error) {
        console.error(`[CLEAN] Failed to delete project ${project.project_id}:`, error);
        results.push({
          projectId: project.project_id,
          name: project.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã xóa ${successCount} project thành công, ${errorCount} thất bại`,
      totalProjects: projects.length,
      successCount,
      errorCount,
      results
    });

  } catch (error) {
    console.error("[CLEAN] BigQuery cleanup error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}