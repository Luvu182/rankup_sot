import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteProjectFromBigQuery } from "@Rankup-manager/backend/lib/bigquery-client";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId" },
        { status: 400 }
      );
    }

    console.log('[DELETE] Deleting from BigQuery:', { projectId, userId });

    const result = await deleteProjectFromBigQuery(projectId, userId);
    
    console.log('[DELETE] BigQuery delete result:', result);

    return NextResponse.json({ 
      success: true,
      message: "Project deleted from BigQuery",
      projectId
    });
  } catch (error) {
    console.error("[DELETE] BigQuery delete error:", error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}