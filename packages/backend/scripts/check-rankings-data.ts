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

async function checkRankingsData() {
  try {
    console.log('🔍 Kiểm tra data rankings...\n');
    
    // 1. Check if rankings table has any data
    const rankingsCountQuery = `
      SELECT 
        COUNT(*) as total_rankings,
        COUNT(DISTINCT keyword_id) as tracked_keywords,
        MIN(tracked_date) as earliest_date,
        MAX(tracked_date) as latest_date
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\`
      WHERE project_id = 'thinkpro-project-001'
    `;
    
    const [rankingsStats] = await bigquery.query(rankingsCountQuery);
    console.log('📊 THỐNG KÊ RANKINGS:');
    console.log(`- Tổng số rankings: ${rankingsStats[0].total_rankings}`);
    console.log(`- Số keywords được track: ${rankingsStats[0].tracked_keywords}`);
    console.log(`- Ngày sớm nhất: ${rankingsStats[0].earliest_date}`);
    console.log(`- Ngày mới nhất: ${rankingsStats[0].latest_date}\n`);
    
    // 2. Sample some rankings data
    if (rankingsStats[0].total_rankings > 0) {
      const sampleQuery = `
        SELECT 
          r.keyword_id,
          k.keyword,
          r.position,
          r.search_volume,
          r.tracked_date,
          r.url
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\` r
        JOIN \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\` k
          ON r.keyword_id = k.keyword_id
        WHERE r.project_id = 'thinkpro-project-001'
        ORDER BY r.tracked_date DESC, r.position ASC
        LIMIT 10
      `;
      
      const [sampleData] = await bigquery.query(sampleQuery);
      console.log('📋 MẪU DỮ LIỆU RANKINGS (10 mới nhất):');
      sampleData.forEach((row: any, i: number) => {
        console.log(`${i + 1}. "${row.keyword}"`);
        console.log(`   Position: #${row.position}`);
        console.log(`   Search Volume: ${row.search_volume || 'N/A'}`);
        console.log(`   Date: ${row.tracked_date}`);
        console.log(`   URL: ${row.url || 'N/A'}\n`);
      });
    }
    
    // 3. Check historical changes
    const changeQuery = `
      WITH position_changes AS (
        SELECT 
          r.keyword_id,
          k.keyword,
          r.position as current_position,
          r.tracked_date as current_date,
          LAG(r.position, 1) OVER (PARTITION BY r.keyword_id ORDER BY r.tracked_date) as previous_position,
          LAG(r.tracked_date, 1) OVER (PARTITION BY r.keyword_id ORDER BY r.tracked_date) as previous_date
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\` r
        JOIN \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\` k
          ON r.keyword_id = k.keyword_id
        WHERE r.project_id = 'thinkpro-project-001'
          AND r.tracked_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      )
      SELECT 
        keyword,
        current_position,
        previous_position,
        previous_position - current_position as change,
        current_date,
        previous_date
      FROM position_changes
      WHERE previous_position IS NOT NULL
        AND previous_position != current_position
      ORDER BY ABS(previous_position - current_position) DESC
      LIMIT 5
    `;
    
    const [changes] = await bigquery.query(changeQuery);
    if (changes.length > 0) {
      console.log('📈 THAY ĐỔI VỊ TRÍ GẦN ĐÂY:');
      changes.forEach((row: any) => {
        const change = row.change;
        const icon = change > 0 ? '↑' : '↓';
        const color = change > 0 ? '🟢' : '🔴';
        console.log(`${color} "${row.keyword}": #${row.previous_position} → #${row.current_position} (${icon}${Math.abs(change)})`);
        console.log(`   Từ ${row.previous_date} đến ${row.current_date}\n`);
      });
    } else {
      console.log('❌ Không tìm thấy thay đổi vị trí nào (có thể do chỉ có 1 ngày data)');
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkRankingsData();