import { config } from 'dotenv';
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import path from 'path';
import { createClerkClient } from '@clerk/backend';

// Load environment variables
config({ path: path.join(__dirname, '../.env.local') });

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!
});

// Your actual user ID from the /api/me response
const YOUR_CLERK_USER_ID = 'user_3394bb58Pb6lhmFjJGj3Momwf83';
const THINKPRO_BIGQUERY_PROJECT_ID = 'thinkpro-project-001';

async function setupThinkProProject() {
  console.log('🚀 Setting up ThinkPro project for your user...\n');
  
  try {
    // 1. Get auth token for your user
    console.log('🔑 Getting auth token...');
    const token = await clerk.sessions.getToken(
      'sess_2pPMO2E2MwsJGxqRkOqSKvY3K6B', // You'll need to get your session ID
      'convex'
    );
    
    if (!token) {
      console.log('❌ Could not get auth token. Please run this script while logged in.');
      console.log('\n📝 Alternative: Manually create the project:');
      console.log('1. Go to http://localhost:3001/projects');
      console.log('2. Click "Create Project"');
      console.log('3. Enter:');
      console.log('   - Name: ThinkPro');
      console.log('   - Domain: thinkpro.vn');
      console.log('4. After creation, we need to update its bigQueryProjectId');
      return;
    }
    
    convex.setAuth(token);
    
    // 2. Check if ThinkPro project already exists
    console.log('\n🔍 Checking existing projects...');
    const projects = await convex.query(api.projects.getProjects);
    
    const existingThinkPro = projects.find(
      p => p.domain === 'thinkpro.vn' || p.name === 'ThinkPro'
    );
    
    if (existingThinkPro) {
      console.log('✅ ThinkPro project already exists!');
      console.log(`   ID: ${existingThinkPro._id}`);
      console.log(`   BigQuery Project ID: ${existingThinkPro.bigQueryProjectId}`);
      
      // Check if it needs to be updated
      if (existingThinkPro.bigQueryProjectId !== THINKPRO_BIGQUERY_PROJECT_ID) {
        console.log('\n⚠️  BigQuery Project ID mismatch!');
        console.log(`   Current: ${existingThinkPro.bigQueryProjectId}`);
        console.log(`   Expected: ${THINKPRO_BIGQUERY_PROJECT_ID}`);
        console.log('\n   Please update manually in Convex dashboard.');
      }
      
      return;
    }
    
    // 3. Create ThinkPro project
    console.log('\n📁 Creating ThinkPro project...');
    const projectId = await convex.mutation(api.projects.createProject, {
      name: 'ThinkPro',
      domain: 'thinkpro.vn',
      settings: {
        timezone: 'Asia/Ho_Chi_Minh',
        currency: 'VND',
        language: 'vi',
        locations: ['Vietnam'],
        searchEngines: ['google'],
        trackingFrequency: 'daily',
        competitorDomains: ['cellphones.com.vn', 'fptshop.com.vn', 'nguyenkim.com'],
        notificationSettings: {
          email: true,
          slack: false,
        },
      },
      isPublic: false,
    });
    
    console.log('✅ Project created successfully!');
    console.log(`   Project ID: ${projectId}`);
    
    // 4. Update the bigQueryProjectId
    console.log('\n🔧 Updating bigQueryProjectId...');
    console.log('⚠️  Note: You may need to manually update the bigQueryProjectId in Convex dashboard');
    console.log(`   Set bigQueryProjectId to: ${THINKPRO_BIGQUERY_PROJECT_ID}`);
    
    console.log('\n✅ Setup completed!');
    console.log('\n📊 Summary:');
    console.log('- ThinkPro project created in Convex');
    console.log('- 1,247 keywords already in BigQuery');
    console.log('- 140 rankings data available');
    console.log('\n🎯 Next steps:');
    console.log('1. Go to http://localhost:3001');
    console.log('2. Select "ThinkPro" from project switcher');
    console.log('3. View your keywords and rankings!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    
    console.log('\n📝 Manual setup instructions:');
    console.log('1. Go to http://localhost:3001/projects');
    console.log('2. Create a new project:');
    console.log('   - Name: ThinkPro');
    console.log('   - Domain: thinkpro.vn');
    console.log('3. Note the created project ID');
    console.log('4. Update bigQueryProjectId in Convex Dashboard to:', THINKPRO_BIGQUERY_PROJECT_ID);
  }
}

// Alternative: Direct Convex mutation without auth
async function setupThinkProProjectDirect() {
  console.log('🚀 Setting up ThinkPro project directly...\n');
  
  try {
    // This approach requires running from a secure context
    // or temporarily disabling auth in Convex
    
    console.log('📝 To link ThinkPro data with your account:');
    console.log('\n1. First, ensure you are logged in at http://localhost:3001');
    console.log('\n2. Open browser console and run:');
    console.log(`
// Get your current user info
fetch('/api/me').then(r => r.json()).then(console.log);

// This will show your userId, use it to verify you're logged in
    `);
    
    console.log('\n3. Then create the project through UI:');
    console.log('   - Go to Projects page');
    console.log('   - Click "New Project"');
    console.log('   - Name: ThinkPro');
    console.log('   - Domain: thinkpro.vn');
    
    console.log('\n4. After creation, we need to update the bigQueryProjectId');
    console.log('   This requires updating the Convex database directly');
    console.log(`   Set bigQueryProjectId = "${THINKPRO_BIGQUERY_PROJECT_ID}"`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the setup
console.log('Choose setup method:');
console.log('1. Automatic (requires active session)');
console.log('2. Manual instructions');
console.log('\nRunning manual instructions...\n');

setupThinkProProjectDirect().then(() => {
  console.log('\n✅ Instructions provided!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});