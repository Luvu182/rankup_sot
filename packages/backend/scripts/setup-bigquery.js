#!/usr/bin/env node
import { exec } from 'child_process';
import { readFileSync } from 'fs';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROJECT_ID = 'rankup-manager';
const DATASET_ID = 'seo_rankings';

async function setupBigQuery() {
  console.log('🚀 Setting up BigQuery tables for Rankup...');

  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, '../lib/bigquery-schema.sql');
    let schema = readFileSync(schemaPath, 'utf-8');
    
    // Replace project_id placeholder
    schema = schema.replace(/{project_id}/g, PROJECT_ID);
    
    // Split into individual statements
    const statements = schema
      .split(/;\s*\n/)
      .filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'))
      .map(stmt => stmt.trim() + ';');

    console.log(`📋 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n⏳ Executing statement ${i + 1}/${statements.length}...`);
      
      // Extract table/view name for logging
      const tableMatch = statement.match(/CREATE\s+(TABLE|VIEW|MATERIALIZED VIEW)\s+IF NOT EXISTS\s+`([^`]+)`/i);
      if (tableMatch) {
        console.log(`   Creating ${tableMatch[1]}: ${tableMatch[2]}`);
      }

      try {
        // Use bq query command to execute the statement
        await execAsync(`~/google-cloud-sdk/bin/bq query --use_legacy_sql=false '${statement.replace(/'/g, "\\'")}'`);
        console.log('   ✅ Success');
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        // Continue with next statement if one fails
      }
    }

    console.log('\n✅ BigQuery setup completed!');
    console.log('\n📊 To verify tables, run:');
    console.log(`   bq ls ${PROJECT_ID}:${DATASET_ID}`);
    console.log(`   bq show ${PROJECT_ID}:${DATASET_ID}.rankings`);

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  setupBigQuery();
}

export default setupBigQuery;