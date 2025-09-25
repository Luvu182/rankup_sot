import { BigQuery } from '@google-cloud/bigquery';
// Temporarily disabled cache in dev environment
// import { getCachedBigQueryResult } from './redis';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize BigQuery client
export const bigquery = new BigQuery({
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
  snippet?: string | null;
  tracked_date: string;
  tracked_timestamp: string;
  search_engine: string;
  device: string;
  location_code?: string;
  language_code?: string;
  featured_snippet?: boolean;
  knowledge_panel?: boolean;
  site_links?: boolean;
  competitor_domains?: string[];
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
    LEFT JOIN \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.deleted_keywords\` d 
      ON k.keyword_id = d.keyword_id
    WHERE k.project_id = @projectId
      AND d.keyword_id IS NULL  -- Filter out deleted keywords
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
      AND k.is_active = true
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
          true as email_alerts,
          10 as position_drop_threshold,
          true as new_competitor_alerts
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
    console.log('[BigQuery] Creating/updating project with MERGE:', { projectId, userId, name, domain });
    const [job] = await bigquery.query({
      query,
      params,
    });
    console.log('[BigQuery] MERGE operation completed successfully for project:', projectId);
    return { success: true };
  } catch (error) {
    console.error('[BigQuery] Error creating project:', error);
    throw error;
  }
}

// Insert keywords batch
// Delete project and all associated data from BigQuery
export async function deleteProjectFromBigQuery(
  projectId: string,
  userId: string
) {
  try {
    // Delete rankings first (foreign key constraint)
    const deleteRankingsQuery = `
      DELETE FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.rankings\`
      WHERE project_id = @projectId
        AND EXISTS (
          SELECT 1 FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\` p
          WHERE p.project_id = @projectId AND p.user_id = @userId
        )
    `;
    
    await bigquery.query({
      query: deleteRankingsQuery,
      params: { projectId, userId }
    });
    
    // Delete keywords
    const deleteKeywordsQuery = `
      DELETE FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
      WHERE project_id = @projectId
        AND EXISTS (
          SELECT 1 FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\` p
          WHERE p.project_id = @projectId AND p.user_id = @userId
        )
    `;
    
    await bigquery.query({
      query: deleteKeywordsQuery,
      params: { projectId, userId }
    });
    
    // Finally delete the project
    const deleteProjectQuery = `
      DELETE FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\`
      WHERE project_id = @projectId AND user_id = @userId
    `;
    
    await bigquery.query({
      query: deleteProjectQuery,
      params: { projectId, userId }
    });
    
    console.log(`[BigQuery] Deleted project ${projectId} and all associated data`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting project from BigQuery:', error);
    throw error;
  }
}

// Debug function to check user projects
export async function getUserProjectsDebug(userId: string) {
  try {
    // Check if tables exist
    const checkTablesQuery = `
      SELECT table_name 
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.INFORMATION_SCHEMA.TABLES\`
      WHERE table_name IN ('projects', 'keywords', 'rankings')
    `;

    const [tables] = await bigquery.query(checkTablesQuery);

    // Query projects for user
    const query = `
      WITH deduped_projects AS (
        SELECT 
          project_id,
          user_id,
          name,
          domain,
          tracking_enabled,
          created_at,
          updated_at,
          ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at DESC) as rn
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\`
        WHERE user_id = @userId
      )
      SELECT 
        project_id,
        user_id,
        name,
        domain,
        tracking_enabled,
        created_at,
        updated_at
      FROM deduped_projects
      WHERE rn = 1
      ORDER BY created_at DESC
    `;

    const [projects] = await bigquery.query({
      query,
      params: { userId }
    });

    // Get keyword count per project
    const keywordsQuery = `
      SELECT 
        p.project_id,
        p.name,
        COUNT(k.keyword_id) as keyword_count
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.projects\` p
      LEFT JOIN \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\` k
        ON p.project_id = k.project_id
      WHERE p.user_id = @userId
      GROUP BY p.project_id, p.name
    `;

    const [projectStats] = await bigquery.query({
      query: keywordsQuery,
      params: { userId }
    });

    return {
      success: true,
      tables: tables.map((t: any) => t.table_name),
      projects,
      projectStats,
      totalProjects: projects.length
    };
  } catch (error: any) {
    console.error('BigQuery debug error:', error);
    
    if (error.message?.includes('Not found: Table')) {
      return {
        success: false,
        error: 'Tables not found',
        message: 'BigQuery tables do not exist. Run schema creation script.'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

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
  try {
    // 1. Check for existing keywords first
    const keywordTexts = keywords.map(k => k.keyword);
    const placeholders = keywordTexts.map((_, i) => `@keyword${i}`).join(', ');
    
    const checkQuery = `
      WITH existing_keywords AS (
        SELECT k.keyword
        FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\` k
        LEFT JOIN \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.deleted_keywords\` d
          ON k.keyword_id = d.keyword_id
        WHERE k.project_id = @projectId
          AND d.keyword_id IS NULL
          AND k.keyword IN (${placeholders})
      )
      SELECT keyword FROM existing_keywords
    `;
    
    const params: any = { projectId };
    keywordTexts.forEach((keyword, i) => {
      params[`keyword${i}`] = keyword;
    });
    
    const [existingRows] = await bigquery.query({
      query: checkQuery,
      params,
    });
    
    const existingKeywords = new Set(existingRows.map((r: any) => r.keyword));
    
    // 2. Filter out duplicates
    const newKeywords = keywords.filter(k => !existingKeywords.has(k.keyword));
    const duplicates = keywords.filter(k => existingKeywords.has(k.keyword));
    
    console.log(`[BigQuery] Found ${duplicates.length} duplicate keywords, inserting ${newKeywords.length} new keywords`);
    
    if (newKeywords.length === 0) {
      return { 
        success: true, 
        count: 0, 
        duplicates: duplicates.length,
        message: 'All keywords already exist'
      };
    }
    
    // 3. Insert only new keywords
    const table = dataset.table('keywords');
    const rows = newKeywords.map(k => ({
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
    
    await table.insert(rows);
    console.log(`Inserted ${rows.length} keywords for project ${projectId}`);
    
    return { 
      success: true, 
      count: rows.length,
      duplicates: duplicates.length,
      inserted: newKeywords.map(k => k.keyword),
      skipped: duplicates.map(k => k.keyword)
    };
  } catch (error) {
    console.error('Error inserting keywords:', error);
    throw error;
  }
}

// Delete a keyword
// Delete keyword using soft delete pattern with tracking table
export async function deleteKeyword(keywordId: string, projectId: string) {
  console.log('[BigQuery] Soft deleting keyword:', { keywordId, projectId });
  
  const params = {
    keywordId,
    projectId
  };
  
  try {
    // IMPORTANT: Verify keyword belongs to project before deleting
    const verifyQuery = `
      SELECT COUNT(*) as count
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
      WHERE keyword_id = @keywordId 
        AND project_id = @projectId
    `;
    
    const [verifyRows] = await bigquery.query({
      query: verifyQuery,
      params,
    });
    
    if (!verifyRows[0]?.count || verifyRows[0].count === 0) {
      console.error('[BigQuery] Keyword not found or does not belong to project');
      throw new Error('Keyword not found or access denied');
    }
    
    // Insert into deleted_keywords tracking table
    const insertDeletedQuery = `
      INSERT INTO \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.deleted_keywords\`
        (keyword_id, project_id, deleted_at)
      VALUES 
        (@keywordId, @projectId, CURRENT_TIMESTAMP())
    `;
    
    await bigquery.query({
      query: insertDeletedQuery,
      params,
    });
    
    console.log(`[BigQuery] Keyword ${keywordId} marked as deleted`);
    
    // Try immediate hard delete (works if data is settled)
    try {
      const hardDeleteQuery = `
        DELETE FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
        WHERE keyword_id = @keywordId 
          AND project_id = @projectId
      `;
      
      const [deleteJob] = await bigquery.query({
        query: hardDeleteQuery,
        params,
      });
      
      if (deleteJob.numDmlAffectedRows > 0) {
        console.log(`[BigQuery] Hard deleted settled keyword ${keywordId}`);
        // Also remove from tracking table since it's fully deleted
        await bigquery.query({
          query: `DELETE FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.deleted_keywords\`
                  WHERE keyword_id = @keywordId`,
          params: { keywordId }
        });
      }
    } catch (hardDeleteError) {
      // Expected for keywords in streaming buffer
      console.log('[BigQuery] Keyword still in streaming buffer, will be cleaned up later');
    }
    
    return { success: true, method: 'soft_delete' };
    
  } catch (error) {
    console.error('[BigQuery] Error in deleteKeyword:', error);
    throw error;
  }
}

// Create deleted_keywords table
export async function createDeletedKeywordsTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.deleted_keywords\` (
      keyword_id STRING NOT NULL,
      project_id STRING NOT NULL,
      deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
      deleted_by STRING,
      reason STRING
    )
    OPTIONS(
      description="Tracks soft-deleted keywords to work around BigQuery streaming buffer limitations."
    )
  `;

  console.log('[BigQuery] Creating deleted_keywords table...');
  await bigquery.query(createTableQuery);
  console.log('[BigQuery] deleted_keywords table created successfully');
  return { success: true };
}

// Update a keyword
export async function updateKeyword(
  keywordId: string,
  projectId: string,
  updates: {
    keyword?: string;
    target_position?: number;
    priority?: string;
    category?: string;
    target_url?: string;
    is_active?: boolean;
  }
) {
  const setStatements = [];
  const params: any = { keywordId, projectId };
  
  if (updates.keyword !== undefined) {
    setStatements.push('keyword = @keyword');
    params.keyword = updates.keyword;
  }
  if (updates.target_position !== undefined) {
    setStatements.push('target_position = @target_position');
    params.target_position = updates.target_position;
  }
  if (updates.priority !== undefined) {
    setStatements.push('priority = @priority');
    params.priority = updates.priority;
  }
  if (updates.category !== undefined) {
    setStatements.push('category = @category');
    params.category = updates.category;
  }
  if (updates.target_url !== undefined) {
    setStatements.push('target_url = @target_url');
    params.target_url = updates.target_url;
  }
  if (updates.is_active !== undefined) {
    setStatements.push('is_active = @is_active');
    params.is_active = updates.is_active;
  }
  
  setStatements.push('updated_at = CURRENT_TIMESTAMP()');
  
  const query = `
    UPDATE \`${process.env.GOOGLE_CLOUD_PROJECT}.seo_rankings.keywords\`
    SET ${setStatements.join(', ')}
    WHERE keyword_id = @keywordId 
      AND project_id = @projectId
  `;
  
  try {
    await bigquery.query({
      query,
      params,
    });
    console.log(`Updated keyword ${keywordId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating keyword:', error);
    throw error;
  }
}