import { BigQuery } from '@google-cloud/bigquery';

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const dataset = bigquery.dataset('seo_rankings');

export interface RankingData {
  rankingId: string;
  keywordId: string;
  projectId: string;
  position: number;
  url: string;
  title: string;
  snippet: string;
  trackedDate: string;
  trackedTimestamp: string;
  searchEngine: string;
  device: string;
  location: string;
}

// Insert ranking data in batches
export async function insertRankings(rankings: RankingData[]) {
  const table = dataset.table('rankings');
  
  try {
    await table.insert(rankings, {
      skipInvalidRows: false,
      ignoreUnknownValues: false,
    });
    
    return { success: true, count: rankings.length };
  } catch (error) {
    console.error('BigQuery insert error:', error);
    throw error;
  }
}

// Get latest rankings for a project
export async function getLatestRankings(projectId: string, limit = 100) {
  const query = `
    SELECT *
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.latest_rankings\`
    WHERE project_id = @projectId
    ORDER BY position ASC
    LIMIT @limit
  `;

  const options = {
    query,
    params: { projectId, limit },
  };

  const [rows] = await bigquery.query(options);
  return rows;
}

// Get ranking history for a keyword
export async function getRankingHistory(
  keywordId: string,
  startDate: string,
  endDate: string
) {
  const query = `
    SELECT 
      tracked_date,
      position,
      url,
      title
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\`
    WHERE keyword_id = @keywordId
      AND tracked_date BETWEEN @startDate AND @endDate
    ORDER BY tracked_date DESC
  `;

  const options = {
    query,
    params: { keywordId, startDate, endDate },
  };

  const [rows] = await bigquery.query(options);
  return rows;
}

// Get ranking trends
export async function getRankingTrends(projectId: string, days = 30) {
  const query = `
    SELECT 
      tracked_date,
      COUNT(DISTINCT keyword_id) as total_keywords,
      AVG(position) as avg_position,
      SUM(CASE WHEN position <= 3 THEN 1 ELSE 0 END) as top3_count,
      SUM(CASE WHEN position <= 10 THEN 1 ELSE 0 END) as top10_count,
      SUM(CASE WHEN position > 0 THEN 1 ELSE 0 END) as ranking_keywords
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\`
    WHERE project_id = @projectId
      AND tracked_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
    GROUP BY tracked_date
    ORDER BY tracked_date DESC
  `;

  const options = {
    query,
    params: { projectId, days },
  };

  const [rows] = await bigquery.query(options);
  return rows;
}

// Stream insert for real-time data
export async function streamInsertRanking(ranking: RankingData) {
  const table = dataset.table('rankings');
  
  await table.insert([ranking], {
    raw: true,
  });
  
  return { success: true };
}