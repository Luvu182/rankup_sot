import * as dotenv from 'dotenv';
import path from 'path';
import { BigQuery } from '@google-cloud/bigquery';
import fs from 'fs/promises';
import { parse } from 'csv-parse/sync';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize BigQuery
const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const dataset = bigquery.dataset('seo_rankings');

// Generate ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function cleanAndReimport(userId: string) {
  try {
    console.log('🧹 Starting clean and reimport process...\n');
    
    // 1. Delete old data
    console.log('🗑️  Deleting old data...');
    
    try {
      // Delete rankings first (foreign key constraint)
      await bigquery.query({
        query: `DELETE FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\` WHERE project_id = 'thinkpro-project-001'`
      });
      console.log('✅ Deleted old rankings');
    } catch (e) {
      console.log('⚠️  No rankings to delete or error:', e.message);
    }
    
    try {
      // Delete keywords
      await bigquery.query({
        query: `DELETE FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\` WHERE project_id = 'thinkpro-project-001'`
      });
      console.log('✅ Deleted old keywords');
    } catch (e) {
      console.log('⚠️  No keywords to delete or error:', e.message);
    }
    
    try {
      // Delete project
      await bigquery.query({
        query: `DELETE FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\` WHERE project_id = 'thinkpro-project-001'`
      });
      console.log('✅ Deleted old project\n');
    } catch (e) {
      console.log('⚠️  No project to delete or error:', e.message);
    }
    
    // Wait a bit for BigQuery to process
    console.log('⏳ Waiting for BigQuery to process deletions...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 2. Create new project with correct user ID
    const projectId = 'thinkpro-project-001';
    const project = {
      project_id: projectId,
      user_id: userId, // Use the provided user ID
      name: 'ThinkPro SEO Project',
      domain: 'thinkpro.vn',
      tracking_enabled: true,
      notification_settings: {
        email_alerts: true,
        position_drop_threshold: 5,
        new_competitor_alerts: true
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📊 Creating ThinkPro project with user ID:', userId);
    await dataset.table('projects').insert([project]);
    console.log('✅ Project created\n');

    // 3. Read and import keywords
    const csvPath = '/Users/luvu/Downloads/thinkpro.vn-Performance-on-Search-2025-09-24 - Queries.csv';
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true
    });

    console.log(`📄 Found ${records.length} keywords in CSV\n`);

    // Prepare keywords
    const keywords = records.map((row: any) => ({
      keyword_id: generateId(),
      project_id: projectId,
      keyword: row.keyword || row.Keyword || row.Query,
      target_position: Math.ceil(parseFloat(row.target_position || row.Position || '5')),
      category: row.category || 'Laptop',
      priority: (row.priority || 'medium').toLowerCase(),
      is_active: true,
      tracking_frequency: 'daily',
      tags: [row.category || 'Laptop', 'thinkpro'],
      target_url: `thinkpro.vn/${(row.keyword || row.Keyword || row.Query || '').toLowerCase().replace(/\s+/g, '-')}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Insert keywords
    console.log('💾 Inserting keywords into BigQuery...');
    await dataset.table('keywords').insert(keywords);
    console.log(`✅ Imported ${keywords.length} keywords\n`);

    // 4. Generate sample rankings
    console.log('📈 Generating ranking history...');
    const rankings = [];
    const today = new Date();
    
    for (let i = 0; i < Math.min(10, keywords.length); i++) {
      const keyword = keywords[i];
      const row = records[i];
      
      for (let day = 0; day < 30; day++) {
        const date = new Date(today);
        date.setDate(date.getDate() - day);
        
        const basePos = keyword.target_position;
        const variation = Math.floor(Math.random() * 5) - 2;
        const position = Math.max(1, Math.min(100, basePos + variation));
        
        rankings.push({
          ranking_id: generateId(),
          keyword_id: keyword.keyword_id,
          project_id: projectId,
          position: position,
          url: `thinkpro.vn/${keyword.keyword.toLowerCase().replace(/\s+/g, '-')}`,
          title: `${keyword.keyword} - ThinkPro`,
          snippet: `Mua ${keyword.keyword} chính hãng, giá tốt nhất tại ThinkPro.`,
          tracked_date: date.toISOString().split('T')[0],
          tracked_timestamp: date.toISOString(),
          search_volume: parseInt(row.search_volume || '1000'),
          keyword_difficulty: parseFloat(row.keyword_difficulty || '50'),
          cpc: Math.random() * 3 + 0.5,
          search_engine: 'google',
          device: day % 2 === 0 ? 'desktop' : 'mobile',
          location_code: 'vn',
          language_code: 'vi',
          featured_snippet: position <= 3 && Math.random() > 0.8,
          knowledge_panel: false,
          site_links: position === 1 && Math.random() > 0.5,
          competitor_domains: ['gearvn.com', 'cellphones.com.vn', 'dienmayxanh.com'],
          created_at: new Date().toISOString()
        });
      }
    }

    // Batch insert rankings
    const batchSize = 500;
    for (let i = 0; i < rankings.length; i += batchSize) {
      const batch = rankings.slice(i, i + batchSize);
      await dataset.table('rankings').insert(batch);
      console.log(`  Inserted ${i + batch.length}/${rankings.length} rankings`);
    }
    
    console.log(`✅ Generated ${rankings.length} ranking records\n`);

    console.log('🎉 Clean and reimport completed successfully!\n');
    console.log(`Summary:
- User ID: ${userId}
- Project: ThinkPro SEO Project (${projectId})  
- Keywords: ${keywords.length}
- Rankings: ${rankings.length} (30 days history for first 10 keywords)
`);

  } catch (error) {
    console.error('❌ Clean and reimport failed:', error);
    process.exit(1);
  }
}

// Get user ID from command line
const userId = process.argv[2];
if (!userId) {
  console.error('❌ Please provide user ID as argument');
  console.log('Usage: npx tsx clean-and-reimport.ts <user-id>');
  process.exit(1);
}

cleanAndReimport(userId);