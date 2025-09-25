import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { BigQuery } from '@google-cloud/bigquery';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check for duplicate projects
    const query = `
      SELECT 
        project_id,
        COUNT(*) as count,
        ARRAY_AGG(STRUCT(
          user_id,
          name,
          domain,
          created_at,
          updated_at
        ) ORDER BY created_at DESC) as records
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\`
      WHERE user_id = @userId
      GROUP BY project_id
      HAVING COUNT(*) > 1
    `;

    const [duplicates] = await bigquery.query({
      query,
      params: { userId }
    });

    // Get all projects for comparison
    const allQuery = `
      SELECT 
        project_id,
        user_id,
        name,
        domain,
        created_at,
        updated_at,
        tracking_enabled
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\`
      WHERE user_id = @userId
      ORDER BY created_at DESC
    `;

    const [allProjects] = await bigquery.query({
      query: allQuery,
      params: { userId }
    });

    return NextResponse.json({
      success: true,
      userId,
      totalProjects: allProjects.length,
      uniqueProjectIds: new Set(allProjects.map((p: any) => p.project_id)).size,
      duplicates: duplicates,
      allProjects: allProjects,
      message: duplicates.length > 0 
        ? `Found ${duplicates.length} project IDs with duplicates` 
        : 'No duplicate projects found'
    });

  } catch (error) {
    console.error("[DEBUG] Check duplicates error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}