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

async function debugData() {
  try {
    console.log('🔍 Debugging BigQuery data...\n');
    
    // 1. Check projects
    console.log('📊 PROJECTS TABLE:');
    const projectsQuery = `
      SELECT project_id, user_id, name, created_at
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\`
      WHERE project_id = 'thinkpro-project-001'
      ORDER BY created_at DESC
    `;
    
    const [projects] = await bigquery.query(projectsQuery);
    console.log(`Found ${projects.length} projects with ID 'thinkpro-project-001':`);
    projects.forEach((p, i) => {
      console.log(`  ${i + 1}. User: ${p.user_id}, Created: ${p.created_at}`);
    });
    
    // 2. Check total keywords
    console.log('\n📈 KEYWORDS TABLE:');
    const keywordsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT keyword_id) as unique_keywords,
        COUNT(DISTINCT project_id) as projects
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
    `;
    
    const [keywordStats] = await bigquery.query(keywordsQuery);
    console.log('Total keywords stats:', keywordStats[0]);
    
    // 3. Check keywords for specific user
    console.log('\n👤 KEYWORDS FOR USER:');
    const userKeywordsQuery = `
      WITH user_projects AS (
        SELECT DISTINCT project_id 
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\`
        WHERE user_id = @userId
      )
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT k.keyword_id) as unique_keywords
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\` k
      WHERE EXISTS (SELECT 1 FROM user_projects WHERE project_id = k.project_id)
    `;
    
    const [userKeywords] = await bigquery.query({
      query: userKeywordsQuery,
      params: { userId: 'user_3394bb58Pb6lhmFjJGj3Momwf83' }
    });
    console.log('Keywords for user luanvu:', userKeywords[0]);
    
    // 4. Check recent rankings
    console.log('\n📊 RANKINGS TABLE:');
    const rankingsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT keyword_id) as unique_keywords,
        MIN(tracked_date) as oldest_date,
        MAX(tracked_date) as newest_date
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\`
      WHERE project_id = 'thinkpro-project-001'
    `;
    
    const [rankings] = await bigquery.query(rankingsQuery);
    console.log('Rankings stats:', rankings[0]);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugData();