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

async function replaceKeywordsTable() {
  try {
    console.log('🔄 Replacing keywords table...\n');
    
    // 1. Rename old table as backup
    console.log('1. Creating backup of current keywords table...');
    const backupQuery = `
      CREATE TABLE IF NOT EXISTS \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords_backup_${Date.now()}\`
      AS SELECT * FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
    `;
    
    await bigquery.query(backupQuery);
    console.log('✅ Backup created\n');
    
    // 2. Drop old keywords table
    console.log('2. Dropping old keywords table...');
    const dropQuery = `
      DROP TABLE \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
    `;
    
    await bigquery.query(dropQuery);
    console.log('✅ Old table dropped\n');
    
    // 3. Rename clean table to keywords
    console.log('3. Renaming clean table to keywords...');
    const renameQuery = `
      CREATE TABLE \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
      AS SELECT * FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords_clean\`
    `;
    
    await bigquery.query(renameQuery);
    console.log('✅ Table replaced\n');
    
    // 4. Drop clean table
    console.log('4. Dropping temporary clean table...');
    const dropCleanQuery = `
      DROP TABLE \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords_clean\`
    `;
    
    await bigquery.query(dropCleanQuery);
    console.log('✅ Cleanup completed\n');
    
    // 5. Verify
    console.log('5. Verifying new keywords table...');
    const verifyQuery = `
      SELECT 
        COUNT(*) as total_keywords,
        COUNT(DISTINCT keyword) as unique_keywords
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
    `;
    
    const [result] = await bigquery.query(verifyQuery);
    console.log('✅ Keywords table now has:', result[0]);
    
    console.log('\n🎉 Table replacement completed successfully!');
    
  } catch (error) {
    console.error('❌ Replace failed:', error);
    console.log('\n⚠️  If error occurred, check backup tables and restore manually');
  }
}

replaceKeywordsTable();