-- BigQuery Schema for SEO Ranking Tool
-- Dataset: seo_rankings

-- Main rankings table with partitioning
CREATE TABLE IF NOT EXISTS `{project_id}.seo_rankings.rankings`
(
  -- IDs
  ranking_id STRING NOT NULL,
  keyword_id STRING NOT NULL,
  project_id STRING NOT NULL,
  
  -- Ranking data
  position INT64,
  url STRING,
  title STRING,
  snippet STRING,
  
  -- Tracking metadata
  tracked_date DATE NOT NULL,
  tracked_timestamp TIMESTAMP NOT NULL,
  
  -- SEO metrics
  search_volume INT64,
  keyword_difficulty FLOAT64,
  cpc FLOAT64,
  
  -- Tracking parameters
  search_engine STRING NOT NULL, -- google, bing, yahoo
  device STRING NOT NULL, -- desktop, mobile, tablet
  location_code STRING, -- us, vn, etc
  language_code STRING, -- en, vi, etc
  
  -- SERP features
  featured_snippet BOOL,
  knowledge_panel BOOL,
  site_links BOOL,
  
  -- Competitor tracking
  competitor_domains ARRAY<STRING>,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY tracked_date
CLUSTER BY keyword_id, project_id
OPTIONS(
  description="Historical ranking data partitioned by date",
  partition_expiration_days=730 -- Keep 2 years of data
);

-- Keywords configuration table
CREATE TABLE IF NOT EXISTS `{project_id}.seo_rankings.keywords`
(
  keyword_id STRING NOT NULL,
  project_id STRING NOT NULL,
  keyword STRING NOT NULL,
  
  -- Configuration
  is_active BOOL DEFAULT true,
  tracking_frequency STRING DEFAULT 'daily', -- daily, weekly, monthly
  
  -- Grouping
  tags ARRAY<STRING>,
  category STRING,
  priority STRING, -- high, medium, low
  
  -- Target metrics
  target_position INT64,
  target_url STRING,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Projects table
CREATE TABLE IF NOT EXISTS `{project_id}.seo_rankings.projects`
(
  project_id STRING NOT NULL,
  user_id STRING NOT NULL, -- Clerk user ID
  
  -- Project info
  name STRING NOT NULL,
  domain STRING NOT NULL,
  
  -- Settings
  tracking_enabled BOOL DEFAULT true,
  notification_settings STRUCT<
    email_alerts BOOL,
    position_drop_threshold INT64,
    new_competitor_alerts BOOL
  >,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Materialized view for latest rankings
CREATE MATERIALIZED VIEW IF NOT EXISTS `{project_id}.seo_rankings.latest_rankings`
PARTITION BY project_id
CLUSTER BY keyword_id
AS
SELECT 
  r.*,
  k.keyword,
  k.tags,
  k.target_position,
  p.name as project_name,
  p.domain,
  -- Calculate changes
  LAG(position) OVER (PARTITION BY keyword_id ORDER BY tracked_date) as previous_position,
  position - LAG(position) OVER (PARTITION BY keyword_id ORDER BY tracked_date) as position_change
FROM `{project_id}.seo_rankings.rankings` r
JOIN `{project_id}.seo_rankings.keywords` k USING (keyword_id)
JOIN `{project_id}.seo_rankings.projects` p USING (project_id)
WHERE r.tracked_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
QUALIFY ROW_NUMBER() OVER (PARTITION BY keyword_id ORDER BY tracked_timestamp DESC) = 1;

-- Analytics views
CREATE VIEW IF NOT EXISTS `{project_id}.seo_rankings.ranking_trends`
AS
SELECT 
  keyword_id,
  project_id,
  tracked_date,
  AVG(position) as avg_position,
  MIN(position) as best_position,
  MAX(position) as worst_position,
  COUNT(DISTINCT url) as url_changes
FROM `{project_id}.seo_rankings.rankings`
GROUP BY keyword_id, project_id, tracked_date;

-- Competitor analysis view
CREATE VIEW IF NOT EXISTS `{project_id}.seo_rankings.competitor_rankings`
AS
SELECT 
  project_id,
  tracked_date,
  competitor_domain,
  COUNT(DISTINCT keyword_id) as keywords_ranking,
  AVG(CASE WHEN position < 10 THEN 1 ELSE 0 END) as top10_share
FROM `{project_id}.seo_rankings.rankings`,
UNNEST(competitor_domains) as competitor_domain
GROUP BY project_id, tracked_date, competitor_domain;