import { BigQuery } from '@google-cloud/bigquery';
// Temporarily disabled cache in dev environment
// import { getCachedBigQueryResult } from './redis';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const dataset = bigquery.dataset('seo_rankings');

// Types
export interface RankingData {
  ranking_id: string;
  keyword_id: string;
  project_id: string;
  position: number | null;
  url: string | null;
  title: string | null;
  tracked_date: string;
  tracked_timestamp: string;
  search_engine: string;
  device: string;
}

export interface KeywordData {
  keyword_id: string;
  keyword: string;
  search_volume: number;
  target_position: number;
  current_position: number | null;
}

// Query functions with caching
export async function getLatestRankings(
  projectId: string,
  limit = 100,
  offset = 0,
  userId?: string
): Promise<any[]> {
  const query = `
    WITH latest_rankings AS (
      SELECT 
        r.keyword_id,
        r.position,
        r.search_engine,
        r.device,
        r.tracked_timestamp,
        r.url,
        LAG(r.position, 1) OVER (PARTITION BY r.keyword_id ORDER BY r.tracked_date) as previous_position
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\` r
      WHERE r.project_id = @projectId
        AND r.tracked_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      QUALIFY ROW_NUMBER() OVER (PARTITION BY r.keyword_id ORDER BY r.tracked_timestamp DESC) = 1
    )
    SELECT 
      k.keyword,
      IFNULL(r.position, NULL) as position,
      k.target_position as target,
      CASE 
        WHEN r.position IS NULL THEN NULL
        WHEN r.previous_position IS NULL THEN 0
        ELSE r.previous_position - r.position
      END as change,
      k.priority,
      IFNULL(r.search_engine, 'google') as searchEngine,
      IFNULL(r.device, 'desktop') as device,
      IFNULL(r.tracked_timestamp, CURRENT_TIMESTAMP()) as lastChecked,
      r.url,
      ARRAY<STRING>[] as serpFeatures
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\` k
    LEFT JOIN latest_rankings r ON k.keyword_id = r.keyword_id
    WHERE k.project_id = @projectId
      AND k.is_active = true
      AND EXISTS (
        SELECT 1 
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\` p
        WHERE p.project_id = k.project_id 
        ${userId ? 'AND p.user_id = @userId' : ''}
      )
    ORDER BY 
      CASE WHEN r.position IS NULL THEN 999999 ELSE r.position END ASC
    LIMIT @limit OFFSET @offset
  `;

  const params: any = { projectId, limit, offset };
  if (userId) {
    params.userId = userId;
  }

  const options = {
    query,
    params,
  };

  // Disable cache in dev environment
  const [rows] = await bigquery.query(options);
  return rows;
}

export async function getKeywordPerformance(
  keywordId: string,
  days = 30
): Promise<any> {
  const query = `
    SELECT 
      DATE(tracked_timestamp) as date,
      AVG(position) as avg_position,
      MIN(position) as best_position,
      MAX(position) as worst_position,
      ANY_VALUE(url) as url
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\`
    WHERE keyword_id = @keywordId
      AND tracked_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
    GROUP BY date
    ORDER BY date DESC
  `;

  const options = {
    query,
    params: { keywordId, days },
  };

  // Disable cache in dev environment
  const [rows] = await bigquery.query(options);
  return rows;
}

export async function insertRankingBatch(rankings: Partial<RankingData>[]) {
  const table = dataset.table('rankings');
  
  // Prepare data for insertion
  const rows = rankings.map(r => ({
    ranking_id: r.ranking_id || generateId(),
    keyword_id: r.keyword_id,
    project_id: r.project_id,
    position: r.position,
    url: r.url,
    title: r.title,
    snippet: r.snippet || null,
    tracked_date: r.tracked_date || new Date().toISOString().split('T')[0],
    tracked_timestamp: r.tracked_timestamp || new Date().toISOString(),
    search_engine: r.search_engine || 'google',
    device: r.device || 'desktop',
    location_code: r.location_code || 'us',
    language_code: r.language_code || 'en',
    featured_snippet: false,
    knowledge_panel: false,
    site_links: false,
    competitor_domains: r.competitor_domains || [],
  }));

  try {
    await table.insert(rows);
    console.log(`Inserted ${rows.length} ranking records`);
  } catch (error) {
    console.error('Error inserting rankings:', error);
    throw error;
  }
}

// Helper to generate IDs
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Dashboard stats
export async function getDashboardStats(projectId: string, userId?: string) {
  const query = `
    WITH user_projects AS (
      SELECT project_id 
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\`
      WHERE project_id = @projectId
      ${userId ? 'AND user_id = @userId' : ''}
    ),
    recent_rankings AS (
      SELECT 
        keyword_id,
        position,
        tracked_date
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\`
      WHERE project_id = @projectId
        AND tracked_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      QUALIFY ROW_NUMBER() OVER (PARTITION BY keyword_id ORDER BY tracked_date DESC) = 1
    ),
    position_changes AS (
      SELECT
        keyword_id,
        position as current_position,
        LAG(position, 1) OVER (PARTITION BY keyword_id ORDER BY tracked_date DESC) as previous_position
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\`
      WHERE project_id = @projectId
        AND tracked_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 2 DAY)
    )
    SELECT 
      COUNT(DISTINCT k.keyword_id) as total_keywords,
      COUNT(DISTINCT CASE WHEN r.position <= 10 THEN r.keyword_id END) as keywords_top10,
      ROUND(AVG(r.position), 1) as avg_position,
      COUNT(DISTINCT CASE 
        WHEN pc.current_position < pc.previous_position THEN pc.keyword_id 
      END) as improved_keywords
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\` k
    LEFT JOIN recent_rankings r ON k.keyword_id = r.keyword_id
    LEFT JOIN position_changes pc ON k.keyword_id = pc.keyword_id
    WHERE k.project_id = @projectId
      AND k.is_active = true
      AND EXISTS (
        SELECT 1 
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\` p
        WHERE p.project_id = k.project_id 
        ${userId ? 'AND p.user_id = @userId' : ''}
      )
  `;

  const params: any = { projectId };
  if (userId) {
    params.userId = userId;
  }
  
  // Disable cache in dev environment
  const [rows] = await bigquery.query({
    query,
    params,
  });
  return rows[0] || {
    total_keywords: 0,
    keywords_top10: 0,
    avg_position: 0,
    improved_keywords: 0
  };
}

// Get keywords with latest rankings
export async function getKeywords(
  projectId: string, 
  options: {
    search?: string;
    category?: string;
    limit?: number;
    offset?: number;
    userId?: string;
  } = {}
) {
  const { search = '', category = '', limit = 50, offset = 0, userId = '' } = options;

  let query = `
    WITH latest_rankings AS (
      SELECT 
        keyword_id,
        position,
        search_volume,
        keyword_difficulty,
        tracked_date
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\`
      WHERE project_id = @projectId
      QUALIFY ROW_NUMBER() OVER (PARTITION BY keyword_id ORDER BY tracked_date DESC) = 1
    ),
    user_projects AS (
      SELECT project_id 
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\`
      WHERE project_id = @projectId
      ${userId ? 'AND user_id = @userId' : ''}
    )
    SELECT 
      k.keyword_id,
      k.keyword,
      k.target_position,
      k.category,
      k.priority,
      k.is_active,
      k.tracking_frequency,
      k.target_url,
      r.position as current_position,
      r.search_volume,
      r.keyword_difficulty,
      r.position - k.target_position as position_diff
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\` k
    LEFT JOIN latest_rankings r ON k.keyword_id = r.keyword_id
    WHERE k.project_id = @projectId
      AND EXISTS (
        SELECT 1 
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\` p
        WHERE p.project_id = k.project_id 
        ${userId ? 'AND p.user_id = @userId' : ''}
      )
  `;

  const params: any = { projectId };
  
  if (userId) {
    params.userId = userId;
  }

  if (search) {
    query += ` AND LOWER(k.keyword) LIKE LOWER(@search)`;
    params.search = `%${search}%`;
  }

  if (category) {
    query += ` AND k.category = @category`;
    params.category = category;
  }

  query += ` ORDER BY r.search_volume DESC NULLS LAST`;
  query += ` LIMIT @limit OFFSET @offset`;
  params.limit = limit;
  params.offset = offset;

  const [rows] = await bigquery.query({ query, params });

  // Get total count
  let countQuery = `
    SELECT COUNT(*) as total
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\` k
    WHERE k.project_id = @projectId
      AND EXISTS (
        SELECT 1 
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\` p
        WHERE p.project_id = k.project_id 
        ${userId ? 'AND p.user_id = @userId' : ''}
      )
  `;

  if (search) {
    countQuery += ` AND LOWER(k.keyword) LIKE LOWER(@search)`;
  }

  if (category) {
    countQuery += ` AND k.category = @category`;
  }

  const countParams: any = { projectId };
  if (userId) countParams.userId = userId;
  if (search) countParams.search = `%${search}%`;
  if (category) countParams.category = category;

  const [countRows] = await bigquery.query({ 
    query: countQuery, 
    params: countParams 
  });

  return {
    data: rows,
    total: countRows[0]?.total || 0
  };
}

// Get recent rankings for dashboard
export async function getRecentRankings(projectId: string, limit: number = 5, userId?: string) {
  const query = `
    WITH user_keywords AS (
      SELECT k.keyword_id
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\` k
      WHERE k.project_id = @projectId
        AND EXISTS (
          SELECT 1 
          FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\` p
          WHERE p.project_id = k.project_id 
          ${userId ? 'AND p.user_id = @userId' : ''}
        )
    ),
    recent_changes AS (
      SELECT 
        k.keyword_id,
        k.keyword,
        k.target_url,
        r1.position as current_position,
        r2.position as previous_position,
        r1.position - r2.position as change,
        r1.tracked_date
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\` k
      JOIN \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\` r1
        ON k.keyword_id = r1.keyword_id
      LEFT JOIN \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\` r2
        ON k.keyword_id = r2.keyword_id
        AND r2.tracked_date = DATE_SUB(r1.tracked_date, INTERVAL 1 DAY)
      WHERE k.project_id = @projectId
        AND r1.project_id = @projectId
        AND EXISTS (SELECT 1 FROM user_keywords WHERE keyword_id = k.keyword_id)
        AND r1.tracked_date = (
          SELECT MAX(tracked_date)
          FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\`
          WHERE project_id = @projectId
        )
    )
    SELECT 
      keyword_id,
      keyword,
      target_url,
      current_position,
      previous_position,
      CASE 
        WHEN previous_position IS NULL THEN 0
        ELSE previous_position - current_position
      END as change,
      tracked_date
    FROM recent_changes
    WHERE change != 0 OR previous_position IS NULL
    ORDER BY ABS(change) DESC
    LIMIT @limit
  `;

  const params: any = { projectId, limit };
  if (userId) {
    params.userId = userId;
  }
  
  // Disable cache in dev environment
  const [rows] = await bigquery.query({
    query,
    params,
  });
  return rows;
}

// Create or update project in BigQuery
export async function createProjectInBigQuery(
  projectId: string,
  userId: string,
  name: string,
  domain: string
) {
  const query = `
    MERGE \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\` T
    USING (
      SELECT 
        @projectId as project_id,
        @userId as user_id,
        @name as name,
        @domain as domain,
        true as tracking_enabled,
        STRUCT(
          true as email_notifications_enabled,
          'weekly' as frequency,
          ARRAY<STRING>[] as email_list
        ) as notification_settings,
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
      INSERT (project_id, user_id, name, domain, tracking_enabled, notification_settings, created_at, updated_at)
      VALUES (S.project_id, S.user_id, S.name, S.domain, S.tracking_enabled, S.notification_settings, S.created_at, S.updated_at)
  `;

  const params = {
    projectId,
    userId,
    name,
    domain
  };

  try {
    await bigquery.query({
      query,
      params,
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating project in BigQuery:', error);
    throw error;
  }
}

// Insert keywords batch
export async function insertKeywordsBatch(
  projectId: string,
  keywords: Array<{
    keyword: string;
    target_position?: number;
    category?: string;
    priority?: string;
    target_url?: string;
  }>
) {
  const table = dataset.table('keywords');
  
  const rows = keywords.map(k => ({
    keyword_id: generateId(),
    project_id: projectId,
    keyword: k.keyword,
    is_active: true,
    tracking_frequency: 'daily',
    tags: [],
    category: k.category || null,
    priority: k.priority || 'medium',
    target_position: k.target_position || 3,
    target_url: k.target_url || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  
  try {
    await table.insert(rows);
    console.log(`Inserted ${rows.length} keywords for project ${projectId}`);
    return { success: true, count: rows.length };
  } catch (error) {
    console.error('Error inserting keywords:', error);
    throw error;
  }
}