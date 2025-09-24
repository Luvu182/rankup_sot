import { config } from 'dotenv';
import { BigQuery } from '@google-cloud/bigquery';
import path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') });

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_CLOUD_KEYFILE,
});

async function checkThinkProData() {
  console.log('🔍 Checking ThinkPro data in BigQuery...\n');
  
  try {
    // Check unique project_ids
    const projectsQuery = `
      SELECT 
        project_id,
        COUNT(*) as keyword_count
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
      GROUP BY project_id
      ORDER BY keyword_count DESC
    `;
    
    const [projectsJob] = await bigquery.createQueryJob({ query: projectsQuery });
    const [projects] = await projectsJob.getQueryResults();
    
    console.log('📁 Projects found in keywords table:');
    projects.forEach((row: any) => {
      console.log(`  - ${row.project_id}: ${row.keyword_count} keywords`);
    });
    
    // Check if we have ThinkPro data
    const thinkproQuery = `
      SELECT 
        k.keyword_id,
        k.keyword,
        k.category,
        k.priority,
        k.target_position,
        COUNT(r.ranking_id) as ranking_count,
        MAX(r.tracked_date) as last_tracked
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\` k
      LEFT JOIN \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\` r
        ON k.keyword_id = r.keyword_id
      WHERE k.project_id = 'thinkpro-project-001'
      GROUP BY k.keyword_id, k.keyword, k.category, k.priority, k.target_position
      ORDER BY k.priority DESC, k.keyword
      LIMIT 10
    `;
    
    const [thinkproJob] = await bigquery.createQueryJob({ query: thinkproQuery });
    const [thinkproRows] = await thinkproJob.getQueryResults();
    
    console.log('\n🏢 ThinkPro sample keywords:');
    if (thinkproRows.length > 0) {
      thinkproRows.forEach((row: any) => {
        console.log(`  - "${row.keyword}" [${row.priority}] - ${row.ranking_count} rankings, last: ${row.last_tracked || 'never'}`);
      });
    } else {
      console.log('  No ThinkPro keywords found with project_id = "thinkpro-project-001"');
    }
    
    // Check latest rankings
    const rankingsQuery = `
      SELECT 
        DATE(tracked_timestamp) as date,
        COUNT(DISTINCT keyword_id) as keywords_tracked,
        COUNT(*) as total_rankings
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\`
      WHERE project_id = 'thinkpro-project-001'
      GROUP BY date
      ORDER BY date DESC
      LIMIT 7
    `;
    
    const [rankingsJob] = await bigquery.createQueryJob({ query: rankingsQuery });
    const [rankingsRows] = await rankingsJob.getQueryResults();
    
    console.log('\n📈 ThinkPro rankings by date:');
    if (rankingsRows.length > 0) {
      rankingsRows.forEach((row: any) => {
        console.log(`  - ${row.date}: ${row.keywords_tracked} keywords, ${row.total_rankings} rankings`);
      });
    } else {
      console.log('  No rankings found for ThinkPro');
    }
    
    console.log('\n📝 Summary:');
    console.log('  - The BigQuery data is organized by project_id');
    console.log('  - ThinkPro data uses project_id = "thinkpro-project-001"');
    console.log('  - To link this data with your user:');
    console.log('    1. Create a project in Convex with name "ThinkPro"');
    console.log('    2. Set its bigQueryProjectId to "thinkpro-project-001"');
    console.log('    3. The project will automatically be linked to your user');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
checkThinkProData().then(() => {
  console.log('\n✅ Check completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});