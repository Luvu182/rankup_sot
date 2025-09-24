import 'dotenv/config';
import { BigQuery } from '@google-cloud/bigquery';
import fs from 'fs/promises';
import path from 'path';
import csv from 'csv-parse';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const dataset = bigquery.dataset('seo_rankings');

// Generate UUID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Import keywords from CSV
async function importKeywords(filePath: string, projectId: string) {
  console.log('📥 Importing keywords from:', filePath);
  
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const parser = csv.parse(fileContent, {
    columns: true,
    skip_empty_lines: true
  });

  const keywords = [];
  for await (const row of parser) {
    keywords.push({
      keyword_id: generateId(),
      project_id: projectId,
      keyword: row.keyword || row.Keyword,
      search_volume: parseInt(row.search_volume || row['Search Volume'] || '0'),
      keyword_difficulty: parseFloat(row.keyword_difficulty || row['Difficulty'] || '0'),
      target_position: Math.ceil(parseFloat(row.target_position || row['Target'] || '5')), // Round up decimal positions
      category: row.category || row.Category || 'General',
      priority: (row.priority || row.Priority || 'medium').toLowerCase(),
      is_active: true,
      tracking_frequency: 'daily',
      tracking_engines: JSON.stringify(['google']),
      tracking_devices: JSON.stringify(['desktop', 'mobile']),
      tracking_locations: JSON.stringify(['us']),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'seed-import'
    });
  }

  // Insert into BigQuery
  const table = dataset.table('keywords');
  await table.insert(keywords);
  
  console.log(`✅ Imported ${keywords.length} keywords`);
  return keywords;
}

// Generate sample ranking data
async function generateRankingData(keywords: any[], daysOfHistory = 30) {
  console.log('📊 Generating ranking history...');
  
  const rankings = [];
  const today = new Date();
  
  for (const keyword of keywords) {
    // Generate history for each day
    for (let day = 0; day < daysOfHistory; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() - day);
      
      // Simulate position changes
      const basePosition = Math.floor(Math.random() * 50) + 1;
      const variation = Math.floor(Math.random() * 5) - 2; // -2 to +2
      const position = Math.max(1, Math.min(100, basePosition + variation));
      
      rankings.push({
        ranking_id: generateId(),
        keyword_id: keyword.keyword_id,
        project_id: keyword.project_id,
        position: position,
        url: `example.com/${keyword.keyword.toLowerCase().replace(/\s+/g, '-')}`,
        title: `${keyword.keyword} - Best Guide 2024`,
        snippet: `Learn everything about ${keyword.keyword}. Comprehensive guide with tips and strategies.`,
        tracked_date: date.toISOString().split('T')[0],
        tracked_timestamp: date.toISOString(),
        search_volume: keyword.search_volume,
        keyword_difficulty: keyword.keyword_difficulty,
        cpc: Math.random() * 5 + 0.5, // $0.50 to $5.50
        competition: Math.random(),
        search_engine: 'google',
        device: day % 2 === 0 ? 'desktop' : 'mobile',
        location_code: 'us',
        language_code: 'en',
        featured_snippet: Math.random() > 0.9,
        knowledge_panel: Math.random() > 0.95,
        site_links: position <= 3 && Math.random() > 0.7,
        people_also_ask: Math.random() > 0.8,
        local_pack: false,
        image_pack: Math.random() > 0.85,
        video_carousel: Math.random() > 0.9,
        competitor_domains: JSON.stringify([
          'competitor1.com',
          'competitor2.com',
          'competitor3.com'
        ]),
        created_at: new Date().toISOString()
      });
    }
  }

  // Batch insert rankings
  const table = dataset.table('rankings');
  const batchSize = 500;
  
  for (let i = 0; i < rankings.length; i += batchSize) {
    const batch = rankings.slice(i, i + batchSize);
    await table.insert(batch);
    console.log(`  Inserted ${i + batch.length}/${rankings.length} rankings`);
  }
  
  console.log(`✅ Generated ${rankings.length} ranking records`);
}

// Create sample project
async function createSampleProject() {
  console.log('🏗️ Creating sample project...');
  
  const project = {
    project_id: 'sample-project-001',
    user_id: 'clerk-user-id', // Replace with your Clerk user ID
    team_id: null,
    name: 'My SEO Project',
    domain: 'example.com',
    domain_verified: true,
    settings: JSON.stringify({
      tracking_enabled: true,
      tracking_frequency: 'daily',
      notification_settings: {
        email_alerts: true,
        position_drop_threshold: 5,
        new_competitor_alerts: true
      },
      competitor_domains: ['competitor1.com', 'competitor2.com'],
      blocked_keywords: []
    }),
    keyword_limit: 1000,
    keywords_used: 0,
    subscription_tier: 'pro',
    subscription_status: 'active',
    billing_cycle: 'monthly',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const table = dataset.table('projects');
  await table.insert([project]);
  
  console.log('✅ Created sample project');
  return project;
}

// Main import function
async function importSeedData() {
  try {
    console.log('🚀 Starting seed data import...\n');

    // 1. Create sample project
    const project = await createSampleProject();

    // 2. Check if CSV file exists - first check Downloads folder
    let csvPath = '/Users/luvu/Downloads/thinkpro.vn-Performance-on-Search-2025-09-24 - Queries.csv';
    
    try {
      await fs.access(csvPath);
      console.log('📄 Found ThinkPro CSV file in Downloads');
    } catch {
      // Fallback to default path
      csvPath = path.join(__dirname, '../data/seed-keywords.csv');
    
    // If no CSV, create sample data
    const sampleKeywords = `keyword,search_volume,keyword_difficulty,target_position,category,priority
seo tools,12000,45,1,Tools,high
rank tracker,8500,62,3,Tools,high
keyword research,6700,38,5,Research,high
backlink checker,5200,55,5,Analytics,medium
seo audit tool,3900,42,10,Audit,medium
competitor analysis,4100,48,8,Analytics,medium
serp checker,2800,35,10,Tools,low
keyword difficulty tool,2200,40,15,Research,medium
seo reporting,3100,44,12,Reports,medium
local seo tools,2500,38,10,Local,medium
technical seo checker,1900,52,15,Audit,low
content optimization,4500,46,8,Content,high
schema markup generator,1200,32,20,Technical,low
meta tag analyzer,900,28,20,Technical,low
xml sitemap generator,1500,25,20,Technical,low
page speed test,6200,35,5,Performance,high
mobile seo checker,2100,36,15,Mobile,medium
seo chrome extension,3300,30,10,Tools,medium
rank tracking api,800,65,25,API,low
white label seo tools,1100,58,20,Enterprise,low`;

    try {
      await fs.access(csvPath);
      console.log('📄 Found seed-keywords.csv');
    } catch {
      console.log('📝 Creating sample keywords file...');
      await fs.mkdir(path.dirname(csvPath), { recursive: true });
      await fs.writeFile(csvPath, sampleKeywords);
    }

    // 3. Import keywords
    const keywords = await importKeywords(csvPath, project.project_id);

    // 4. Generate ranking history
    await generateRankingData(keywords.slice(0, 10), 30); // First 10 keywords, 30 days

    console.log('\n🎉 Seed data import completed!');
    console.log(`
📊 Summary:
- Project: ${project.name} (${project.project_id})
- Keywords: ${keywords.length}
- Rankings: ${keywords.slice(0, 10).length * 30} records (30 days history)

🔍 You can now:
1. Run the app with: pnpm dev
2. View data in BigQuery Console
3. Or query with: bq query --use_legacy_sql=false "SELECT * FROM \\\`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\\\` LIMIT 10"
`);

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run import
importSeedData();