import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { canAddKeywords } from "@/middleware/subscription";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const countStr = searchParams.get("count");
    
    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const requestedCount = countStr ? parseInt(countStr) : 1;

    // Check keyword limit
    const keywordCheck = await canAddKeywords(projectId, requestedCount);
    
    return NextResponse.json({
      canAdd: keywordCheck.allowed,
      limit: keywordCheck.limit,
      current: keywordCheck.current,
      remaining: keywordCheck.remaining,
      requested: requestedCount,
    });

  } catch (error) {
    console.error("Check limit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}