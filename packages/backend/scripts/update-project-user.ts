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

async function updateProjectUser(userId: string) {
  try {
    console.log(`🔄 Updating project user to: ${userId}`);
    
    const query = `
      UPDATE \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\`
      SET user_id = @userId,
          updated_at = CURRENT_TIMESTAMP()
      WHERE project_id = 'thinkpro-project-001'
    `;
    
    const [job] = await bigquery.createQueryJob({
      query,
      params: { userId }
    });
    
    const [rows] = await job.getQueryResults();
    console.log('✅ Project updated successfully');
    
    // Verify update
    const verifyQuery = `
      SELECT project_id, user_id, name, domain
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\`
      WHERE project_id = 'thinkpro-project-001'
    `;
    
    const [verifyRows] = await bigquery.query(verifyQuery);
    console.log('📊 Project info:', verifyRows[0]);
    
  } catch (error) {
    console.error('❌ Update failed:', error);
  }
}

// Get user ID from command line
const userId = process.argv[2];
if (!userId) {
  console.error('❌ Please provide user ID as argument');
  console.log('Usage: npx tsx update-project-user.ts <user-id>');
  process.exit(1);
}

updateProjectUser(userId);