-- Create deleted_keywords table for soft delete pattern
-- This table tracks keywords that have been deleted by users
-- Used to filter out deleted keywords from queries while waiting for streaming buffer to settle

CREATE TABLE IF NOT EXISTS `${project_id}.seo_rankings.deleted_keywords` (
  keyword_id STRING NOT NULL,
  project_id STRING NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  deleted_by STRING,
  reason STRING
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_deleted_keywords_keyword_id
ON `${project_id}.seo_rankings.deleted_keywords`(keyword_id);

CREATE INDEX IF NOT EXISTS idx_deleted_keywords_project_id
ON `${project_id}.seo_rankings.deleted_keywords`(project_id);

-- Add comments for documentation
ALTER TABLE `${project_id}.seo_rankings.deleted_keywords`
SET OPTIONS(
  description="Tracks soft-deleted keywords to work around BigQuery streaming buffer limitations. Keywords in this table are hidden from queries immediately."
);