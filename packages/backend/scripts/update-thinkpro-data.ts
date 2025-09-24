import { config } from 'dotenv';
import { BigQuery } from '@google-cloud/bigquery';
import path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') });

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_CLOUD_KEYFILE,
});

// Your Clerk User ID
const YOUR_USER_ID = 'user_3394bb58Pb6lhmFjJGj3Momwf83';

async function updateThinkProData() {
  console.log('🚀 Updating ThinkPro data in BigQuery...');
  
  try {
    const PROJECT_ID = 'thinkpro-project-001';
    
    console.log(`\n📋 Configuration:`);
    console.log(`  Project ID: ${PROJECT_ID}`);
    console.log(`  User ID: ${YOUR_USER_ID}`);
    console.log(`  BigQuery Project: ${process.env.GOOGLE_CLOUD_PROJECT}`);
    
    // 1. First check if we have data
    const checkQuery = `
      SELECT 
        'keywords' as table_name,
        COUNT(*) as total_count
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
      
      UNION ALL
      
      SELECT 
        'rankings' as table_name,
        COUNT(*) as total_count
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\`
    `;
    
    const [checkJob] = await bigquery.createQueryJob({ query: checkQuery });
    const [checkRows] = await checkJob.getQueryResults();
    
    console.log('\n📊 Current data:');
    checkRows.forEach((row: any) => {
      console.log(`  ${row.table_name}: ${row.total_count} records`);
    });
    
    // 2. Update all data to use the correct project_id and user_id
    console.log('\n🔄 Updating data...');
    
    // Update keywords
    const updateKeywordsQuery = `
      UPDATE \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
      SET 
        project_id = @projectId,
        user_id = @userId,
        updated_at = CURRENT_TIMESTAMP()
      WHERE 1=1  -- Update all records
    `;
    
    await bigquery.createQueryJob({
      query: updateKeywordsQuery,
      params: {
        projectId: PROJECT_ID,
        userId: YOUR_USER_ID,
      },
    });
    console.log('✅ Updated keywords table');
    
    // Update rankings
    const updateRankingsQuery = `
      UPDATE \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\`
      SET 
        project_id = @projectId,
        user_id = @userId
      WHERE 1=1  -- Update all records
    `;
    
    await bigquery.createQueryJob({
      query: updateRankingsQuery,
      params: {
        projectId: PROJECT_ID,
        userId: YOUR_USER_ID,
      },
    });
    console.log('✅ Updated rankings table');
    
    // 3. Create project record if not exists
    const upsertProjectQuery = `
      MERGE \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\` T
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
    
    await bigquery.createQueryJob({
      query: upsertProjectQuery,
      params: {
        projectId: PROJECT_ID,
        userId: YOUR_USER_ID,
      },
    });
    console.log('✅ Created/Updated project record');
    
    // 4. Verify the update
    console.log('\n🔍 Verifying updates...');
    
    const verifyQuery = `
      SELECT 
        (SELECT COUNT(*) FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\` 
         WHERE project_id = @projectId AND user_id = @userId) as keywords_count,
        (SELECT COUNT(*) FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\` 
         WHERE project_id = @projectId AND user_id = @userId) as rankings_count,
        (SELECT COUNT(*) FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\` 
         WHERE project_id = @projectId AND user_id = @userId) as projects_count
    `;
    
    const [verifyJob] = await bigquery.createQueryJob({
      query: verifyQuery,
      params: {
        projectId: PROJECT_ID,
        userId: YOUR_USER_ID,
      },
    });
    
    const [verifyRows] = await verifyJob.getQueryResults();
    const result = verifyRows[0];
    
    console.log('\n✅ Update completed:');
    console.log(`  Keywords: ${result.keywords_count} records`);
    console.log(`  Rankings: ${result.rankings_count} records`);
    console.log(`  Projects: ${result.projects_count} records`);
    
    console.log('\n📝 Next steps:');
    console.log('1. Go to http://localhost:3001/projects');
    console.log('2. Create a new project with:');
    console.log('   - Name: ThinkPro');
    console.log('   - Domain: thinkpro.vn');
    console.log('3. The BigQuery data is now linked to your user!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
updateThinkProData().then(() => {
  console.log('\n✅ All done!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});