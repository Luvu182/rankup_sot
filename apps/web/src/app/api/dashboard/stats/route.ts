import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDashboardStats, getRecentRankings } from "@Rankup-manager/backend/lib/bigquery-client";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    
    if (!projectId) {
      return NextResponse.json(
        { error: "Missing required parameter: projectId" },
        { status: 400 }
      );
    }

    // Get dashboard stats and recent rankings in parallel with user filter
    const [stats, recentRankings] = await Promise.all([
      getDashboardStats(projectId, userId),
      getRecentRankings(projectId, 5, userId)
    ]);

    return NextResponse.json({
      stats,
      recentRankings
    });
  } catch (error) {
    console.error("Dashboard stats API error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}