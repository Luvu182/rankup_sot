import { config } from 'dotenv';
import { BigQuery } from '@google-cloud/bigquery';
import path from 'path';
import fs from 'fs';

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') });

const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_CLOUD_KEYFILE,
});

async function exportThinkProData() {
  console.log('🔄 Exporting ThinkPro data from BigQuery...\n');
  
  try {
    // Query keywords data
    const query = `
      SELECT 
        keyword,
        target_position,
        category,
        priority,
        target_url,
        tags,
        is_active,
        tracking_frequency
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
      WHERE project_id = 'thinkpro-project-001'
      ORDER BY priority DESC, keyword
    `;
    
    const [job] = await bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();
    
    console.log(`📊 Found ${rows.length} keywords to export`);
    
    // Export as JSON
    const jsonExport = {
      source: 'BigQuery Export',
      exportDate: new Date().toISOString(),
      project: 'ThinkPro',
      totalKeywords: rows.length,
      keywords: rows.map(row => ({
        keyword: row.keyword,
        target_position: row.target_position || 3,
        category: row.category || '',
        priority: row.priority || 'medium',
        target_url: row.target_url || ''
      }))
    };
    
    const jsonPath = path.join(__dirname, '../exports/thinkpro-keywords.json');
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(jsonExport, null, 2));
    console.log(`✅ JSON exported to: ${jsonPath}`);
    
    // Export as CSV
    const csvHeader = 'keyword,target_position,category,priority,target_url\n';
    const csvRows = rows.map(row => 
      `"${row.keyword}",${row.target_position || 3},"${row.category || ''}","${row.priority || 'medium'}","${row.target_url || ''}"`
    ).join('\n');
    
    const csvPath = path.join(__dirname, '../exports/thinkpro-keywords.csv');
    fs.writeFileSync(csvPath, csvHeader + csvRows);
    console.log(`✅ CSV exported to: ${csvPath}`);
    
    // Show sample data
    console.log('\n📋 Sample keywords:');
    rows.slice(0, 5).forEach(row => {
      console.log(`  - "${row.keyword}" [${row.priority}] target: ${row.target_position}`);
    });
    
    console.log('\n📝 Import instructions:');
    console.log('1. Login to Rankup at http://localhost:3001');
    console.log('2. Create a new project or select existing');
    console.log('3. Go to Keywords page');
    console.log('4. Click "Import Keywords"');
    console.log('5. Upload one of these files:');
    console.log(`   - ${jsonPath}`);
    console.log(`   - ${csvPath}`);
    
  } catch (error) {
    console.error('❌ Error exporting data:', error);
    process.exit(1);
  }
}

// Run export
exportThinkProData().then(() => {
  console.log('\n✅ Export completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Export failed:', error);
  process.exit(1);
});