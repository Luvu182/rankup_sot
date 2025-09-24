import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDashboardStats } from "@Rankup-manager/backend/lib/bigquery-client";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json(
        { error: "Missing required parameter: projectId" },
        { status: 400 }
      );
    }
    
    const stats = await getDashboardStats(projectId, userId);

    return NextResponse.json({
      totalKeywords: stats.total_keywords || 0,
      keywordsTop10: stats.keywords_top10 || 0,
      avgPosition: stats.avg_position || 0,
      improvedKeywords: stats.improved_keywords || 0
    });
  } catch (error) {
    console.error("Dashboard stats API error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}