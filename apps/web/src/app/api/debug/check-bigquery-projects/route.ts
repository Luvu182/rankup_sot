import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserProjectsDebug } from "@Rankup-manager/backend/lib/bigquery-client";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get debug data from BigQuery
    const result = await getUserProjectsDebug(userId);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        message: result.message
      }, { status: 404 });
    }
    
    return NextResponse.json({
      ...result,
      userId,
      message: `Found ${result.totalProjects} projects for user ${userId}`
    });

  } catch (error) {
    console.error("Check BigQuery projects error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details: error
    }, { status: 500 });
  }
}