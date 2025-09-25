import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createDeletedKeywordsTable } from "@Rankup-manager/backend/lib/bigquery-client";

// One-time setup to create deleted_keywords table
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Call the function from backend
    await createDeletedKeywordsTable();

    return NextResponse.json({
      success: true,
      message: "Deleted keywords table created successfully"
    });

  } catch (error) {
    console.error('[BigQuery] Error creating table:', error);
    return NextResponse.json(
      { error: 'Failed to create table', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}