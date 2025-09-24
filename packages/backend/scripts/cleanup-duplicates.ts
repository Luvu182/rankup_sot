import * as dotenv from 'dotenv';
import path from 'path';
import { BigQuery } from '@google-cloud/bigquery';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize BigQuery
const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

async function cleanupDuplicates() {
  try {
    const userId = 'user_3394bb58Pb6lhmFjJGj3Momwf83';
    
    console.log('🧹 Starting cleanup process...\n');
    
    // First, identify keywords to keep (latest ones for the user)
    const identifyQuery = `
      WITH user_project AS (
        SELECT project_id
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\`
        WHERE project_id = 'thinkpro-project-001'
          AND user_id = @userId
        ORDER BY created_at DESC
        LIMIT 1
      ),
      ranked_keywords AS (
        SELECT 
          k.*,
          ROW_NUMBER() OVER (PARTITION BY k.keyword ORDER BY k.created_at DESC) as rn
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\` k
        WHERE k.project_id = 'thinkpro-project-001'
          AND EXISTS (SELECT 1 FROM user_project)
      )
      SELECT COUNT(*) as total_to_keep
      FROM ranked_keywords
      WHERE rn = 1
    `;
    
    const [keepCount] = await bigquery.query({
      query: identifyQuery,
      params: { userId }
    });
    
    console.log(`Will keep ${keepCount[0].total_to_keep} unique keywords (latest version of each)\n`);
    
    // Create a new table with deduplicated data
    const createTableQuery = `
      CREATE OR REPLACE TABLE \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords_clean\` AS
      WITH user_project AS (
        SELECT project_id
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\`
        WHERE project_id = 'thinkpro-project-001'
          AND user_id = @userId
        ORDER BY created_at DESC
        LIMIT 1
      ),
      ranked_keywords AS (
        SELECT 
          k.*,
          ROW_NUMBER() OVER (PARTITION BY k.keyword ORDER BY k.created_at DESC) as rn
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\` k
        WHERE k.project_id = 'thinkpro-project-001'
          AND EXISTS (SELECT 1 FROM user_project)
      )
      SELECT 
        keyword_id,
        project_id,
        keyword,
        is_active,
        tracking_frequency,
        tags,
        category,
        priority,
        target_position,
        target_url,
        created_at,
        updated_at
      FROM ranked_keywords
      WHERE rn = 1
    `;
    
    console.log('Creating clean table with deduplicated keywords...');
    await bigquery.query({
      query: createTableQuery,
      params: { userId }
    });
    
    console.log('✅ Clean table created\n');
    
    // Verify the clean table
    const verifyQuery = `
      SELECT 
        COUNT(*) as total_keywords,
        COUNT(DISTINCT keyword) as unique_keywords
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords_clean\`
    `;
    
    const [verifyResult] = await bigquery.query(verifyQuery);
    console.log('Clean table stats:', verifyResult[0]);
    
    console.log('\n📌 Next steps:');
    console.log('1. Backup current keywords table');
    console.log('2. Replace keywords table with keywords_clean');
    console.log('3. Or update queries to use keywords_clean');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

cleanupDuplicates();