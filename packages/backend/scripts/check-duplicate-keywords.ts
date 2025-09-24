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

async function checkDuplicateKeywords() {
  try {
    console.log('🔍 Checking duplicate keywords...\n');
    
    // Check duplicate keywords by keyword text
    const duplicatesQuery = `
      WITH keyword_counts AS (
        SELECT 
          keyword,
          COUNT(*) as count,
          ARRAY_AGG(keyword_id LIMIT 5) as sample_ids,
          ARRAY_AGG(created_at ORDER BY created_at DESC LIMIT 5) as created_times
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
        WHERE project_id = 'thinkpro-project-001'
        GROUP BY keyword
        HAVING COUNT(*) > 1
      )
      SELECT *
      FROM keyword_counts
      ORDER BY count DESC
      LIMIT 10
    `;
    
    const [duplicates] = await bigquery.query(duplicatesQuery);
    
    console.log(`Found ${duplicates.length} duplicate keywords (showing top 10):\n`);
    duplicates.forEach(d => {
      console.log(`"${d.keyword}": ${d.count} times`);
      console.log(`  Sample IDs: ${d.sample_ids.slice(0, 3).join(', ')}`);
      console.log(`  Created: ${d.created_times[0]}\n`);
    });
    
    // Check total unique vs total keywords
    const statsQuery = `
      SELECT 
        COUNT(*) as total_rows,
        COUNT(DISTINCT keyword) as unique_keywords,
        COUNT(DISTINCT keyword_id) as unique_ids
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
      WHERE project_id = 'thinkpro-project-001'
    `;
    
    const [stats] = await bigquery.query(statsQuery);
    console.log('\nKeyword stats:');
    console.log(`- Total rows: ${stats[0].total_rows}`);
    console.log(`- Unique keywords (by text): ${stats[0].unique_keywords}`);
    console.log(`- Unique keyword IDs: ${stats[0].unique_ids}`);
    
    // Suggestion to clean up
    if (stats[0].total_rows > stats[0].unique_keywords) {
      console.log('\n⚠️  You have duplicate keywords! Each keyword was imported multiple times.');
      console.log('This explains why you see 3741 (3 x 1247) keywords.');
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkDuplicateKeywords();