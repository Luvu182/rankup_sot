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

async function checkBigQueryTables() {
  try {
    console.log('🔍 Kiểm tra các tables trong BigQuery...\n');
    
    const datasetId = 'seo_rankings';
    const dataset = bigquery.dataset(datasetId);
    
    // 1. Check if dataset exists
    try {
      const [exists] = await dataset.exists();
      if (!exists) {
        console.log(`❌ Dataset '${datasetId}' không tồn tại!`);
        return;
      }
      console.log(`✅ Dataset '${datasetId}' tồn tại\n`);
    } catch (error) {
      console.error(`❌ Lỗi khi kiểm tra dataset:`, error);
      return;
    }
    
    // 2. List all tables in dataset
    console.log('📋 Danh sách tất cả tables trong dataset:');
    console.log('=' .repeat(50));
    
    const [tables] = await dataset.getTables();
    
    if (tables.length === 0) {
      console.log('❌ Không có table nào trong dataset!');
      return;
    }
    
    // 3. Check each table
    for (const table of tables) {
      const tableName = table.id;
      console.log(`\n📊 Table: ${tableName}`);
      
      // Get table metadata
      const [metadata] = await table.getMetadata();
      
      console.log(`   - Type: ${metadata.type}`);
      console.log(`   - Created: ${new Date(parseInt(metadata.creationTime)).toLocaleString()}`);
      console.log(`   - Modified: ${new Date(parseInt(metadata.lastModifiedTime)).toLocaleString()}`);
      
      if (metadata.numRows) {
        console.log(`   - Rows: ${metadata.numRows}`);
      }
      
      if (metadata.numBytes) {
        const sizeMB = (parseInt(metadata.numBytes) / 1024 / 1024).toFixed(2);
        console.log(`   - Size: ${sizeMB} MB`);
      }
      
      // Special check for 'projects' table
      if (tableName === 'projects') {
        console.log('   ✅ Bảng PROJECTS TỒN TẠI!');
        
        // Get sample data from projects table
        const query = `
          SELECT 
            project_id,
            user_id,
            name,
            domain,
            created_at
          FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${datasetId}.projects\`
          ORDER BY created_at DESC
          LIMIT 5
        `;
        
        const [rows] = await bigquery.query(query);
        
        if (rows.length > 0) {
          console.log('\n   📌 Sample data từ bảng projects:');
          rows.forEach((row: any, i: number) => {
            console.log(`   ${i + 1}. ${row.name} (${row.domain})`);
            console.log(`      - ID: ${row.project_id}`);
            console.log(`      - User: ${row.user_id}`);
            console.log(`      - Created: ${new Date(row.created_at.value).toLocaleString()}`);
          });
        }
      }
    }
    
    // 4. Show INFORMATION_SCHEMA query example
    console.log('\n\n💡 Để kiểm tra bảng bằng INFORMATION_SCHEMA:');
    console.log('=' .repeat(50));
    
    const schemaQuery = `
      SELECT 
        table_name,
        table_type,
        creation_time,
        row_count,
        size_bytes
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${datasetId}.INFORMATION_SCHEMA.TABLES\`
      WHERE table_name = 'projects'
    `;
    
    console.log('Query:');
    console.log(schemaQuery);
    
    try {
      const [schemaRows] = await bigquery.query(schemaQuery);
      
      if (schemaRows.length > 0) {
        console.log('\n✅ Kết quả từ INFORMATION_SCHEMA:');
        console.log(JSON.stringify(schemaRows[0], null, 2));
      }
    } catch (error) {
      console.log('\n⚠️  INFORMATION_SCHEMA có thể không available cho dataset này');
    }
    
    // 5. Show bq command line examples
    console.log('\n\n🛠️  Các lệnh bq CLI để kiểm tra:');
    console.log('=' .repeat(50));
    console.log(`1. List all tables:`);
    console.log(`   bq ls ${process.env.GOOGLE_CLOUD_PROJECT}:${datasetId}`);
    console.log(`\n2. Show table schema:`);
    console.log(`   bq show ${process.env.GOOGLE_CLOUD_PROJECT}:${datasetId}.projects`);
    console.log(`\n3. Query table:`);
    console.log(`   bq query --use_legacy_sql=false 'SELECT * FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.${datasetId}.projects\` LIMIT 10'`);
    
  } catch (error) {
    console.error('❌ Lỗi:', error);
  }
}

// Run the check
checkBigQueryTables();