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

async function testUserFilter() {
  try {
    const userId = 'user_3394bb58Pb6lhmFjJGj3Momwf83';
    const projectId = 'thinkpro-project-001';
    
    console.log('🔍 Testing user filter...\n');
    
    // Test query with user filter
    const query = `
      WITH user_projects AS (
        SELECT project_id 
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\`
        WHERE project_id = @projectId
        AND user_id = @userId
      ),
      recent_rankings AS (
        SELECT 
          keyword_id,
          position,
          tracked_date
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\`
        WHERE project_id = @projectId
          AND tracked_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        QUALIFY ROW_NUMBER() OVER (PARTITION BY keyword_id ORDER BY tracked_date DESC) = 1
      )
      SELECT 
        COUNT(DISTINCT k.keyword_id) as total_keywords,
        COUNT(DISTINCT CASE WHEN r.position <= 10 THEN r.keyword_id END) as keywords_top10,
        ROUND(AVG(r.position), 1) as avg_position
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\` k
      LEFT JOIN recent_rankings r ON k.keyword_id = r.keyword_id
      WHERE k.project_id = @projectId
        AND k.is_active = true
        AND EXISTS (
          SELECT 1 
          FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\` p
          WHERE p.project_id = k.project_id 
          AND p.user_id = @userId
        )
    `;

    const [rows] = await bigquery.query({
      query,
      params: { projectId, userId }
    });
    
    console.log('With user filter:', rows[0]);
    
    // Test without user filter
    const queryNoFilter = `
      WITH recent_rankings AS (
        SELECT 
          keyword_id,
          position,
          tracked_date
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\`
        WHERE project_id = @projectId
          AND tracked_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        QUALIFY ROW_NUMBER() OVER (PARTITION BY keyword_id ORDER BY tracked_date DESC) = 1
      )
      SELECT 
        COUNT(DISTINCT k.keyword_id) as total_keywords,
        COUNT(DISTINCT CASE WHEN r.position <= 10 THEN r.keyword_id END) as keywords_top10,
        ROUND(AVG(r.position), 1) as avg_position
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\` k
      LEFT JOIN recent_rankings r ON k.keyword_id = r.keyword_id
      WHERE k.project_id = @projectId
        AND k.is_active = true
    `;
    
    const [rowsNoFilter] = await bigquery.query({
      query: queryNoFilter,
      params: { projectId }
    });
    
    console.log('Without user filter:', rowsNoFilter[0]);
    
    // Check how many projects exist for this user
    const projectsQuery = `
      SELECT project_id, user_id, created_at
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\`
      WHERE project_id = @projectId
        AND user_id = @userId
      ORDER BY created_at DESC
    `;
    
    const [projects] = await bigquery.query({
      query: projectsQuery,
      params: { projectId, userId }
    });
    
    console.log(`\nProjects for user ${userId}:`, projects.length);
    projects.forEach(p => {
      console.log(`- Created: ${p.created_at}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUserFilter();