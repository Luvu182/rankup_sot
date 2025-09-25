# Database Architecture: TimescaleDB + BigQuery Hybrid

## Overview

This document outlines the future database architecture combining TimescaleDB for real-time operations and BigQuery for analytics, designed to handle 1B+ rows efficiently.

## 1. Architecture Overview

### Current State
- **Convex**: Metadata storage (projects, users)
- **BigQuery**: All keyword and ranking data
- **Issues**: Streaming buffer delays, no real-time CRUD, expensive at scale

### Future State
- **Convex**: Real-time metadata and UI state
- **TimescaleDB**: Hot data (90 days), CRUD operations
- **BigQuery**: Cold storage, analytics, ML
- **Redis**: Multi-layer caching

## 2. Data Flow Architecture

```
User Actions → API Gateway → Service Layer → Data Layer
                                    ↓
                          ┌─────────┴─────────┐
                          │                   │
                     Hot Path            Analytics Path
                  (Real-time CRUD)      (Historical Data)
                          │                   │
                   TimescaleDB           BigQuery
                   (Recent 90d)         (All Historical)
```

## 3. Database Responsibilities

### Convex (Real-time Metadata)
- **Data**: Projects, users, settings, UI state
- **Purpose**: Real-time sync, instant updates
- **Retention**: Current state only

### TimescaleDB (Operational Data)
- **Data**: Keywords, rankings (90 days)
- **Purpose**: CRUD operations, recent analytics
- **Features**:
  - Hypertables for automatic partitioning
  - Compression after 7 days (90% reduction)
  - Continuous aggregates for fast queries
  - Full SQL support

### BigQuery (Analytics Warehouse)
- **Data**: All historical data, ML datasets
- **Purpose**: Complex analytics, long-term storage
- **Features**:
  - Partitioned by date
  - Clustered by project_id, keyword_id
  - Materialized views for reports

### Redis (Cache Layer)
- **L1**: Dashboard stats (5 min TTL)
- **L2**: Keyword lists (10 min TTL)
- **L3**: Generated reports (24 hour TTL)
- **L4**: User sessions

## 4. Data Synchronization

### Real-time Sync (< 1 minute)
```
TimescaleDB → Redis (via LISTEN/NOTIFY)
Convex ↔ Frontend (WebSocket)
```

### Near Real-time (5-15 minutes)
```
TimescaleDB → BigQuery (streaming via Kafka/Pub-Sub)
```

### Batch Sync (Daily at 2 AM)
```
1. Export TimescaleDB data > 90 days
2. Bulk load to BigQuery
3. Compress in TimescaleDB
4. Archive to GCS/S3 if > 1 year
```

## 5. Query Patterns

### Recent Data (< 24 hours)
```sql
-- Direct query to TimescaleDB
SELECT time_bucket('1 hour', checked_at) as hour,
       keyword_id,
       AVG(position) as avg_position
FROM rankings
WHERE checked_at > NOW() - INTERVAL '24 hours'
GROUP BY hour, keyword_id;
```

### Medium Range (1-90 days)
```sql
-- Query continuous aggregates
SELECT * FROM daily_keyword_stats
WHERE date >= NOW() - INTERVAL '30 days';
```

### Historical (> 90 days)
```sql
-- Query BigQuery
SELECT DATE_TRUNC(check_date, WEEK) as week,
       AVG(position) as avg_position
FROM `project.rankings_historical`
WHERE keyword_id = @keywordId
GROUP BY week;
```

## 6. Implementation Phases

### Phase 1: Add TimescaleDB (Month 1)
1. Deploy TimescaleDB instance
2. Create keywords, rankings tables
3. Implement dual-write (BigQuery + TimescaleDB)
4. Test CRUD operations

### Phase 2: Migrate Hot Data (Month 2)
1. Copy last 90 days to TimescaleDB
2. Switch read queries to TimescaleDB
3. Implement continuous aggregates
4. Set up compression policies

### Phase 3: Implement Sync (Month 3)
1. Set up Kafka/Pub-Sub pipeline
2. Daily batch export to BigQuery
3. Implement cache layers
4. Monitor and optimize

### Phase 4: Full Migration (Month 4)
1. Stop writes to BigQuery for hot data
2. BigQuery becomes read-only archive
3. Implement data lifecycle policies
4. Cost optimization

## 7. Performance Expectations

| Operation | Current (BigQuery) | Future (TimescaleDB) |
|-----------|-------------------|---------------------|
| Add Keyword | 2-3s + buffer | < 50ms |
| Update Keyword | Not possible | < 50ms |
| Delete Keyword | Soft delete only | < 50ms |
| View Rankings | 1-2s | < 100ms |
| Dashboard Load | 2-3s | < 50ms (cached) |
| Bulk Import 10k | 5-10s | < 1s |
| Historical Query | 1-2s | 1-2s (BigQuery) |

## 8. Cost Analysis

### Current (BigQuery Only)
- Storage: $20/month (1TB)
- Queries: $30/month
- **Total: $50/month**

### Future (Hybrid)
- TimescaleDB: $200/month (managed)
- BigQuery: $20/month (archive only)
- Redis: $50/month
- **Total: $270/month**

### Benefits for 5.4x cost
- 50x faster CRUD operations
- Real-time updates
- No streaming buffer issues
- Better developer experience
- Room to scale to 10B rows

## 9. Monitoring & Maintenance

### Key Metrics
- Query latency (p50, p95, p99)
- Sync lag between databases
- Cache hit rates
- Storage growth rate
- Compression ratios

### Automated Tasks
- Daily compression (TimescaleDB)
- Weekly aggregation refresh
- Monthly data archival
- Quarterly cleanup

## 10. Disaster Recovery

### Backup Strategy
- TimescaleDB: Continuous backups to S3
- BigQuery: Built-in redundancy
- Redis: Persistent snapshots
- Convex: Automatic backups

### RTO/RPO Targets
- RTO (Recovery Time): < 1 hour
- RPO (Recovery Point): < 5 minutes

## 11. Security Considerations

### Data Encryption
- At rest: AES-256
- In transit: TLS 1.3
- Key rotation: 90 days

### Access Control
- Row-level security in TimescaleDB
- IAM roles for BigQuery
- API keys for Redis
- JWT tokens for services

## 12. Migration Checklist

- [ ] Set up TimescaleDB instance
- [ ] Create database schema
- [ ] Implement dual-write logic
- [ ] Set up monitoring
- [ ] Create sync pipelines
- [ ] Test failover procedures
- [ ] Update documentation
- [ ] Train team on new architecture
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Deprecate old patterns

## Appendix: Technology Choices

### Why TimescaleDB?
- Built for time-series data
- PostgreSQL compatible
- Excellent compression
- Continuous aggregates
- Proven at scale (Uber, Fujitsu)

### Why Keep BigQuery?
- Cheap long-term storage
- Excellent for analytics
- No maintenance required
- Good for ML/AI workloads

### Why Redis?
- Sub-millisecond latency
- Proven caching solution
- Flexible data structures
- Pub/Sub capabilities

---

*Last updated: January 2025*
*Next review: Before starting Phase 1*