import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getLatestRankings } from "@Rankup-manager/backend/lib/bigquery-client";

export async function GET(request: Request) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Require projectId - no default values
    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required. Please select a project first." },
        { status: 400 }
      );
    }

    // Fetch from BigQuery with the provided project ID
    const rankings = await getLatestRankings(projectId, limit, offset, userId);
    
    // Format response
    const formattedData = {
      data: rankings,
      total: rankings.length,
      limit,
      offset
    };

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Rankings API error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    
    // TODO: Trigger ranking check via job queue
    // await scheduleRankingCheck(body.keywords);

    return NextResponse.json({ 
      message: "Ranking check scheduled",
      keywords: body.keywords?.length || 0
    });
  } catch (error) {
    console.error("Rankings POST error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}