import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json(
        { error: "Missing required parameter: projectId" },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      userId,
      projectId,
      message: "Use this userId to link with BigQuery data"
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to get user info" }, { status: 500 });
  }
}