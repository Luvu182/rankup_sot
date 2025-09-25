# BigQuery Architecture & Data Flow

## 1. Overview

Rankup Manager sử dụng hybrid architecture:
- **Convex**: Metadata (users, projects)
- **BigQuery**: Analytics data (keywords, rankings)

## 2. Database Schema

### BigQuery Tables

#### keywords table
```sql
CREATE TABLE keywords (
  keyword_id STRING NOT NULL,      -- Generated ID (unique)
  project_id STRING NOT NULL,      -- Link to Convex project
  keyword STRING NOT NULL,         -- Actual keyword text
  target_position INT64,           -- Target ranking (default: 3)
  priority STRING,                 -- high/medium/low
  category STRING,                 -- Optional categorization
  target_url STRING,              -- Optional target URL
  is_active BOOLEAN DEFAULT true,  -- Soft delete flag
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### rankings table
```sql
CREATE TABLE rankings (
  ranking_id STRING NOT NULL,      -- Generated ID
  keyword_id STRING NOT NULL,      -- Link to keyword
  position INT64,                  -- Current position
  check_date TIMESTAMP,           -- When checked
  search_volume INT64,            -- Monthly searches
  keyword_difficulty INT64,        -- Competition score
  competitors JSON,               -- Top 10 competitors
  created_at TIMESTAMP
);
```

#### deleted_keywords table (for soft delete)
```sql
CREATE TABLE deleted_keywords (
  keyword_id STRING NOT NULL,
  project_id STRING NOT NULL,
  deleted_at TIMESTAMP,
  deleted_by STRING,              -- User ID who deleted
  reason STRING                   -- Optional deletion reason
);
```

## 3. Data Flow Diagrams

### 3.1 Add Keyword Flow
```
User → [Add Keyword Form] → POST /api/keywords
                               ↓
                         [Generate ID]
                               ↓
                    [table.insert() to BigQuery]
                               ↓
                    [Streaming Buffer (instant)]
                               ↓
                    [Available for queries immediately]
```

### 3.2 Delete Keyword Flow (Soft Delete Pattern)
```
User → [Delete Button] → DELETE /api/keywords?id=xxx
                               ↓
                    [Insert to deleted_keywords table]
                               ↓
                    [Keyword hidden from queries via JOIN]
                               ↓
         [Background Job (6h later): Hard delete if settled]
```

### 3.3 Query Keywords with Rankings
```
GET /api/keywords → [BigQuery Complex Query]
                           ↓
                    [JOIN keywords + rankings]
                           ↓
                    [LEFT JOIN deleted_keywords]
                           ↓
                    [Filter: WHERE deleted IS NULL]
                           ↓
                    [Return active keywords only]
```

## 4. BigQuery Streaming Buffer Constraints

### What Works:
- ✅ INSERT (append-only)
- ✅ SELECT (read immediately)
- ✅ JOIN with other tables

### What Doesn't Work (within 90 minutes):
- ❌ UPDATE existing rows
- ❌ DELETE rows
- ❌ MERGE operations on buffered data

### Solutions:
1. **Soft Delete Pattern**: Track deletions in separate table
2. **Versioning**: Insert new versions instead of updating
3. **Background Jobs**: Clean up after buffer settles

## 5. Ranking Check Strategies

### 5.1 Manual Check (Single Keyword)
```typescript
// User triggered check for specific keyword
POST /api/rankings/check
{
  "keywordId": "abc123"
}
```

### 5.2 Bulk Check (Multiple Selected)
```typescript
// Check multiple keywords with rate limiting
POST /api/rankings/check-bulk
{
  "keywordIds": ["abc123", "def456", "ghi789"]
}
```

### 5.3 Automated Scheduling by Priority
```sql
-- High priority: Daily
-- Medium priority: Every 3 days
-- Low priority: Weekly

SELECT k.* FROM keywords k
LEFT JOIN latest_ranking_date r ON k.keyword_id = r.keyword_id
WHERE 
  (priority = 'high' AND DATE_DIFF(CURRENT_DATE, last_check, DAY) >= 1)
  OR (priority = 'medium' AND DATE_DIFF(CURRENT_DATE, last_check, DAY) >= 3)
  OR (priority = 'low' AND DATE_DIFF(CURRENT_DATE, last_check, DAY) >= 7)
```

## 6. Query Patterns

### 6.1 Get Active Keywords with Latest Rankings
```sql
WITH latest_rankings AS (
  SELECT 
    keyword_id,
    position,
    check_date,
    ROW_NUMBER() OVER (PARTITION BY keyword_id ORDER BY check_date DESC) as rn
  FROM rankings
),
active_keywords AS (
  SELECT k.*
  FROM keywords k
  LEFT JOIN deleted_keywords d USING(keyword_id)
  WHERE d.keyword_id IS NULL
    AND k.project_id = @projectId
)
SELECT 
  ak.*,
  lr.position as current_position,
  lr.check_date as last_checked
FROM active_keywords ak
LEFT JOIN latest_rankings lr ON ak.keyword_id = lr.keyword_id AND lr.rn = 1
```

### 6.2 Get Ranking History for Chart
```sql
SELECT 
  DATE_TRUNC(check_date, DAY) as date,
  AVG(position) as avg_position,
  MIN(position) as best_position,
  MAX(position) as worst_position
FROM rankings
WHERE keyword_id = @keywordId
  AND check_date > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY date
ORDER BY date
```

## 7. Best Practices

### Do's:
- ✅ Use streaming insert for keywords (fast & cheap)
- ✅ Use query insert for projects (need immediate consistency)
- ✅ Implement soft delete with tracking table
- ✅ Use background jobs for cleanup
- ✅ Design for append-only operations

### Don'ts:
- ❌ Try to UPDATE/DELETE in streaming buffer
- ❌ Mix OLTP patterns with BigQuery
- ❌ Expect immediate consistency for all operations
- ❌ Query without proper indexes/partitioning

## 8. Migration from Current Schema

### Phase 1: Add deleted_keywords table
```sql
CREATE TABLE `rankup-manager.seo_rankings.deleted_keywords` (
  keyword_id STRING NOT NULL,
  project_id STRING NOT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  deleted_by STRING,
  reason STRING
);
```

### Phase 2: Update queries to filter deleted
- Modify `getKeywords()` to JOIN with deleted_keywords
- Update all keyword queries to exclude deleted

### Phase 3: Implement cleanup job
- Create cron job to hard delete settled keywords
- Run every 6 hours

## 9. Cost Optimization

### Current Approach (Expensive):
- Query INSERT for everything
- Immediate consistency but high cost

### Optimized Approach:
- Streaming INSERT for keywords/rankings ($0.01/200MB)
- Query INSERT only for critical data
- Soft delete pattern (no UPDATE needed)
- Estimated 90% cost reduction

## 10. Future Enhancements

1. **Partitioning by date** for rankings table
2. **Materialized views** for dashboard queries
3. **CDC (Change Data Capture)** for real-time sync
4. **ML models** for ranking predictions
5. **Data lifecycle policies** for old data