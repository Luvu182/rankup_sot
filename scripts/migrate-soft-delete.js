#!/usr/bin/env node

import { BigQuery } from '@google-cloud/bigquery';

async function migrate() {
  console.log('Starting soft delete migration...');
  
  const bigquery = new BigQuery({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    credentials: {
      client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
  });

  try {
    // Step 1: Create deleted_keywords table
    console.log('Creating deleted_keywords table...');
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
    console.log('✓ Table created');

    // Step 2: Migrate existing soft-deleted keywords (is_active = false)
    console.log('Migrating existing soft-deleted keywords...');
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
    console.log(`✓ Migrated ${job.numDmlAffectedRows || 0} keywords`);

    // Step 3: Remove is_active field usage (optional, can be done later)
    console.log('Migration completed successfully!');
    console.log('Note: Update all queries to use LEFT JOIN with deleted_keywords instead of is_active field');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();