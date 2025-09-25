import { NextResponse } from "next/server";
import { bigquery } from "@Rankup-manager/backend/lib/bigquery-client";

// Test migration - temporary
export async function GET() {
  try {
    console.log('[Migration] Starting...');
    
    // Step 1: Create table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.deleted_keywords\` (
        keyword_id STRING NOT NULL,
        project_id STRING NOT NULL,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
        deleted_by STRING,
        reason STRING
      )
      OPTIONS(
        description="Tracks soft-deleted keywords to work around BigQuery streaming buffer limitations."
      )
    `;
    
    await bigquery.query(createTableQuery);
    console.log('[Migration] Table created');

    // Step 2: Check if we have any is_active=false keywords to migrate
    const [checkRows] = await bigquery.query(`
      SELECT COUNT(*) as count
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
      WHERE is_active = false
    `);
    
    const inactiveCount = checkRows[0]?.count || 0;
    console.log(`[Migration] Found ${inactiveCount} inactive keywords to migrate`);

    if (inactiveCount > 0) {
      // Migrate existing soft-deleted keywords
      const migrateQuery = `
        INSERT INTO \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.deleted_keywords\`
          (keyword_id, project_id, deleted_at, reason)
        SELECT 
          keyword_id,
          project_id,
          updated_at as deleted_at,
          'Migrated from is_active=false' as reason
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
        WHERE is_active = false
          AND keyword_id NOT IN (
            SELECT keyword_id 
            FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.deleted_keywords\`
          )
      `;
      
      const [job] = await bigquery.query(migrateQuery);
      console.log(`[Migration] Migrated ${job.numDmlAffectedRows || 0} keywords`);
    }

    return NextResponse.json({
      success: true,
      message: "Migration completed",
      migrated: inactiveCount
    });

  } catch (error) {
    console.error('[Migration] Error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}