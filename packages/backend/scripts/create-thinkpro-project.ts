import { config } from 'dotenv';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { BigQuery } from '@google-cloud/bigquery';
import path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') });

const convexClient = new ConvexHttpClient(process.env.CONVEX_URL!);
const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_CLOUD_KEYFILE,
});

async function createThinkProProject() {
  console.log('🚀 Creating ThinkPro project and updating BigQuery data...');
  
  try {
    // 1. First, create the project in Convex
    console.log('\n📁 Creating project in Convex...');
    
    // Note: You need to get auth token for your user
    // For now, we'll create the project manually through the UI
    // Then use its ID to update BigQuery
    
    const PROJECT_ID = 'thinkpro-project-001'; // The existing project ID in BigQuery
    const USER_ID = 'user_2pPq5lTaK2kVLJ1JEH8DXQY7yKN'; // Your Clerk user ID
    
    console.log(`Project ID: ${PROJECT_ID}`);
    console.log(`User ID: ${USER_ID}`);
    
    // 2. Update BigQuery tables to associate data with user
    console.log('\n🔄 Updating BigQuery data...');
    
    // Update keywords table
    const updateKeywordsQuery = `
      UPDATE \`${process.env.GOOGLE_CLOUD_PROJECT}.rankup_dataset.keywords\`
      SET 
        project_id = @projectId,
        user_id = @userId,
        updated_at = CURRENT_TIMESTAMP()
      WHERE project_id = 'thinkpro-project-001' OR project_id IS NULL
    `;
    
    const [keywordsJob] = await bigquery.createQueryJob({
      query: updateKeywordsQuery,
      params: {
        projectId: PROJECT_ID,
        userId: USER_ID,
      },
    });
    
    const [keywordsRows] = await keywordsJob.getQueryResults();
    console.log('✅ Updated keywords table');
    
    // Update rankings table
    const updateRankingsQuery = `
      UPDATE \`${process.env.GOOGLE_CLOUD_PROJECT}.rankup_dataset.rankings\`
      SET 
        project_id = @projectId,
        user_id = @userId
      WHERE project_id = 'thinkpro-project-001' OR project_id IS NULL
    `;
    
    const [rankingsJob] = await bigquery.createQueryJob({
      query: updateRankingsQuery,
      params: {
        projectId: PROJECT_ID,
        userId: USER_ID,
      },
    });
    
    const [rankingsRows] = await rankingsJob.getQueryResults();
    console.log('✅ Updated rankings table');
    
    // 3. Create/update project metadata
    const updateProjectsQuery = `
      MERGE \`${process.env.GOOGLE_CLOUD_PROJECT}.rankup_dataset.projects\` T
      USING (
        SELECT 
          @projectId as project_id,
          @userId as user_id,
          'ThinkPro' as name,
          'thinkpro.vn' as domain,
          CURRENT_TIMESTAMP() as created_at,
          CURRENT_TIMESTAMP() as updated_at
      ) S
      ON T.project_id = S.project_id
      WHEN MATCHED THEN
        UPDATE SET 
          user_id = S.user_id,
          name = S.name,
          domain = S.domain,
          updated_at = S.updated_at
      WHEN NOT MATCHED THEN
        INSERT (project_id, user_id, name, domain, created_at, updated_at)
        VALUES (S.project_id, S.user_id, S.name, S.domain, S.created_at, S.updated_at)
    `;
    
    const [projectsJob] = await bigquery.createQueryJob({
      query: updateProjectsQuery,
      params: {
        projectId: PROJECT_ID,
        userId: USER_ID,
      },
    });
    
    const [projectsRows] = await projectsJob.getQueryResults();
    console.log('✅ Created/Updated project in BigQuery');
    
    // 4. Verify the update
    console.log('\n🔍 Verifying updates...');
    
    const verifyQuery = `
      SELECT 
        'keywords' as table_name,
        COUNT(*) as count,
        COUNTIF(user_id = @userId) as user_records
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.rankup_dataset.keywords\`
      WHERE project_id = @projectId
      
      UNION ALL
      
      SELECT 
        'rankings' as table_name,
        COUNT(*) as count,
        COUNTIF(user_id = @userId) as user_records
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.rankup_dataset.rankings\`
      WHERE project_id = @projectId
    `;
    
    const [verifyJob] = await bigquery.createQueryJob({
      query: verifyQuery,
      params: {
        projectId: PROJECT_ID,
        userId: USER_ID,
      },
    });
    
    const [verifyRows] = await verifyJob.getQueryResults();
    console.log('\n📊 Verification Results:');
    verifyRows.forEach((row: any) => {
      console.log(`  ${row.table_name}: ${row.user_records}/${row.count} records assigned to user`);
    });
    
    console.log('\n✨ Done! Now you need to:');
    console.log('1. Go to http://localhost:3001/projects');
    console.log('2. Create a new project with:');
    console.log('   - Name: ThinkPro');
    console.log('   - Domain: thinkpro.vn');
    console.log('3. Note the Convex project ID created');
    console.log('4. Update the bigQueryDatasetId in Convex to match "thinkpro-project-001"');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
createThinkProProject().then(() => {
  console.log('\n✅ Script completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});