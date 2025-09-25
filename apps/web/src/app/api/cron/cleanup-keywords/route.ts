import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { BigQuery } from "@google-cloud/bigquery";

// This runs every 6 hours via cron job
// Cleans up soft-deleted keywords that have settled in BigQuery

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT!,
  credentials: {
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL!,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  },
});

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = headers().get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('[Cleanup] Starting keyword cleanup task');

    // Find soft-deleted keywords older than 2 hours (to ensure settled)
    const query = `
      WITH keywords_to_delete AS (
        SELECT keyword_id, project_id
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
        WHERE is_active = false
          AND updated_at < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 HOUR)
        LIMIT 1000  -- Process in batches
      )
      SELECT * FROM keywords_to_delete
    `;

    const [rows] = await bigquery.query({ query });
    
    if (rows.length === 0) {
      console.log('[Cleanup] No keywords to cleanup');
      return NextResponse.json({ 
        success: true, 
        message: 'No keywords to cleanup',
        cleaned: 0 
      });
    }

    console.log(`[Cleanup] Found ${rows.length} keywords to hard delete`);

    // Delete in batches to avoid timeout
    let deleted = 0;
    const batchSize = 100;
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const keywordIds = batch.map(r => `'${r.keyword_id}'`).join(',');
      
      try {
        const deleteQuery = `
          DELETE FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
          WHERE keyword_id IN (${keywordIds})
            AND is_active = false
        `;
        
        const [job] = await bigquery.query({ query: deleteQuery });
        deleted += job.numDmlAffectedRows || 0;
        
        console.log(`[Cleanup] Batch ${i/batchSize + 1}: Deleted ${job.numDmlAffectedRows} keywords`);
      } catch (error) {
        // If still in streaming buffer, skip this batch
        if (error instanceof Error && error.message.includes('streaming buffer')) {
          console.log(`[Cleanup] Batch ${i/batchSize + 1}: Still in streaming buffer, skipping`);
          continue;
        }
        throw error;
      }
    }

    // Also cleanup related data (rankings history for deleted keywords)
    if (deleted > 0) {
      try {
        const cleanupRankingsQuery = `
          DELETE FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\`
          WHERE keyword_id NOT IN (
            SELECT keyword_id 
            FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
          )
          AND check_date < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 HOUR)
        `;
        
        await bigquery.query({ query: cleanupRankingsQuery });
        console.log('[Cleanup] Cleaned up orphaned rankings');
      } catch (error) {
        console.error('[Cleanup] Error cleaning rankings:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed`,
      found: rows.length,
      deleted: deleted,
      skipped: rows.length - deleted
    });

  } catch (error) {
    console.error('[Cleanup] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support POST for manual trigger
export async function POST(request: Request) {
  return GET(request);
}