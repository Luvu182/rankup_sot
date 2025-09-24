# Deployment Guide - Rankup Manager

## Overview

Rankup sử dụng architecture sau cho production:
- **Frontend**: Vercel (Next.js)
- **Backend**: Convex Cloud
- **Database**: Google BigQuery
- **Cache**: Upstash Redis
- **CDN**: Cloudflare
- **Monitoring**: Sentry + Vercel Analytics

## 1. Pre-deployment Checklist

### 1.1 Code Preparation
- [ ] All tests passing
- [ ] No console.log statements
- [ ] Environment variables documented
- [ ] Security audit completed
- [ ] Performance optimized
- [ ] Error handling complete

### 1.2 Infrastructure Setup
- [ ] Production domains purchased
- [ ] SSL certificates ready
- [ ] Google Cloud project created
- [ ] Convex production deployment
- [ ] Clerk production instance
- [ ] Redis production database

### 1.3 Third-party Services
- [ ] DataForSEO production account
- [ ] Stripe account configured
- [ ] Email service (Resend) setup
- [ ] Monitoring (Sentry) configured
- [ ] Analytics configured

## 2. Environment Configuration

### 2.1 Production Environment Variables

Create `.env.production`:

```env
# App Configuration
NEXT_PUBLIC_APP_URL=https://app.rankup.com
NEXT_PUBLIC_API_URL=https://api.rankup.com
NODE_ENV=production

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
CLERK_JWT_ISSUER_DOMAIN=https://rankup.clerk.accounts.dev

# Database (Convex)
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
CONVEX_DEPLOY_KEY=xxx

# BigQuery
GOOGLE_CLOUD_PROJECT=rankup-production
GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcp-sa.json

# Redis Cache
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# External APIs
DATAFORSEO_LOGIN=xxx
DATAFORSEO_PASSWORD=xxx

# Email Service
RESEND_API_KEY=re_xxx

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ORG=rankup
SENTRY_PROJECT=web

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_BETA_FEATURES=false
```

### 2.2 Secrets Management

Using Vercel for secrets:

```bash
# Add secrets to Vercel
vercel secrets add clerk-secret-key "sk_live_xxx"
vercel secrets add google-credentials "$(cat gcp-sa.json | base64)"

# Reference in vercel.json
{
  "env": {
    "CLERK_SECRET_KEY": "@clerk-secret-key"
  },
  "build": {
    "env": {
      "GOOGLE_APPLICATION_CREDENTIALS_BASE64": "@google-credentials"
    }
  }
}
```

## 3. Database Deployment

### 3.1 BigQuery Production Setup

```bash
# Create production dataset
gcloud config set project rankup-production

bq mk --dataset \
  --location=US \
  --description="Rankup Production Rankings" \
  rankup-production:seo_rankings

# Apply schema
bq query --use_legacy_sql=false < packages/backend/lib/bigquery-schema.sql

# Create materialized views
bq query --use_legacy_sql=false < packages/backend/lib/bigquery-views.sql

# Set up scheduled queries for maintenance
bq mk --transfer_config \
  --project_id=rankup-production \
  --data_source=scheduled_query \
  --display_name="Daily Ranking Aggregation" \
  --target_dataset=seo_rankings \
  --schedule="every day 02:00" \
  --params='{
    "query": "CALL seo_rankings.aggregate_daily_rankings();"
  }'
```

### 3.2 Convex Production Deployment

```bash
# Deploy to production
cd packages/backend
npx convex deploy --prod

# Set production environment variables
npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://rankup.clerk.accounts.dev" --prod

# Run production migrations
npx convex run migrations:latest --prod
```

## 4. Frontend Deployment (Vercel)

### 4.1 Vercel Configuration

Create `vercel.json`:

```json
{
  "buildCommand": "pnpm build:web",
  "outputDirectory": "apps/web/.next",
  "framework": "nextjs",
  "regions": ["iad1", "sfo1"],
  "functions": {
    "apps/web/src/app/api/*": {
      "maxDuration": 60,
      "memory": 1024
    }
  },
  "crons": [
    {
      "path": "/api/cron/rankings",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/reports",
      "schedule": "0 9 * * 1"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,DELETE,OPTIONS" }
      ]
    }
  ]
}
```

### 4.2 Deploy to Vercel

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Or connect to GitHub for auto-deployment
vercel link
vercel git connect
```

### 4.3 Custom Domain Setup

1. Add domain in Vercel Dashboard
2. Update DNS records:

```
Type    Name    Value
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
CNAME   app     cname.vercel-dns.com
```

## 5. API Deployment

### 5.1 API Gateway Setup

Using Vercel Edge Functions:

```typescript
// apps/web/src/app/api/[[...route]]/route.ts
import { Hono } from 'hono'
import { handle } from 'hono/vercel'

export const runtime = 'edge'

const app = new Hono().basePath('/api')

// Apply middleware
app.use('*', cors())
app.use('*', rateLimit())
app.use('*', authenticate())

// Mount routers
app.route('/projects', projectRouter)
app.route('/keywords', keywordRouter)
app.route('/rankings', rankingRouter)

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
```

### 5.2 API Documentation

Deploy API docs:

```bash
# Generate OpenAPI spec
pnpm run generate:api-docs

# Deploy to separate subdomain
# docs.rankup.com -> Vercel/Netlify static site
```

## 6. Background Jobs

### 6.1 Scheduled Jobs Setup

Using Vercel Cron:

```typescript
// apps/web/src/app/api/cron/rankings/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Run ranking updates
  await updateDailyRankings()
  
  return new Response('OK')
}
```

### 6.2 Queue System

Using Inngest for complex workflows:

```typescript
// apps/web/src/inngest/functions.ts
export const checkRankings = inngest.createFunction(
  { name: "Check Rankings" },
  { event: "rankings/check" },
  async ({ event, step }) => {
    // Step 1: Fetch keywords
    const keywords = await step.run("fetch-keywords", async () => {
      return getActiveKeywords(event.data.projectId)
    })

    // Step 2: Check rankings in parallel
    const results = await step.run("check-rankings", async () => {
      return Promise.all(
        keywords.map(kw => checkKeywordRanking(kw))
      )
    })

    // Step 3: Store results
    await step.run("store-results", async () => {
      return storeRankingResults(results)
    })

    // Step 4: Send notifications
    await step.run("notify", async () => {
      return sendRankingAlerts(results)
    })
  }
)
```

## 7. Monitoring & Logging

### 7.1 Sentry Setup

```typescript
// apps/web/src/app/layout.tsx
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})
```

### 7.2 Custom Monitoring

```typescript
// lib/monitoring.ts
export const metrics = {
  rankingCheckDuration: new Histogram({
    name: 'ranking_check_duration',
    help: 'Duration of ranking checks',
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  }),
  
  apiRequestCount: new Counter({
    name: 'api_request_total',
    help: 'Total API requests',
    labelNames: ['method', 'endpoint', 'status'],
  }),
  
  activeUsers: new Gauge({
    name: 'active_users',
    help: 'Number of active users',
  }),
}
```

### 7.3 Logging Strategy

```typescript
// lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
  redact: ['password', 'email', 'apiKey'],
})

// Usage
logger.info({ userId, action }, 'User performed action')
logger.error({ err, context }, 'Error occurred')
```

## 8. Security Hardening

### 8.1 Security Headers

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  )

  return response
}
```

### 8.2 Rate Limiting

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const rateLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h'),
  analytics: true,
})

export async function rateLimit(identifier: string) {
  const { success, limit, reset, remaining } = await rateLimiter.limit(identifier)
  
  if (!success) {
    throw new Error('Rate limit exceeded')
  }
  
  return { limit, reset, remaining }
}
```

### 8.3 Input Validation

```typescript
// lib/validation.ts
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

export const sanitizeInput = (input: string) => {
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  })
}

export const projectSchema = z.object({
  name: z.string().min(1).max(100).transform(sanitizeInput),
  domain: z.string().url().refine(
    (url) => !url.includes('<script>'),
    'Invalid URL'
  ),
})
```

## 9. Performance Optimization

### 9.1 CDN Configuration (Cloudflare)

```javascript
// cloudflare-worker.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    
    // Cache static assets
    if (url.pathname.startsWith('/_next/static/')) {
      const response = await fetch(request)
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      return new Response(response.body, { ...response, headers })
    }
    
    // Cache API responses
    if (url.pathname.startsWith('/api/')) {
      const cacheKey = new Request(url.toString(), request)
      const cache = caches.default
      
      let response = await cache.match(cacheKey)
      if (!response) {
        response = await fetch(request)
        const headers = new Headers(response.headers)
        headers.append('Cache-Control', 's-maxage=60')
        response = new Response(response.body, { ...response, headers })
        await cache.put(cacheKey, response.clone())
      }
      
      return response
    }
    
    return fetch(request)
  }
}
```

### 9.2 Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_rankings_project_date 
ON `seo_rankings.rankings` (project_id, tracked_date DESC)
CLUSTER BY project_id, keyword_id;

-- Materialized view for dashboard
CREATE MATERIALIZED VIEW `seo_rankings.dashboard_stats`
PARTITION BY project_id
AS
SELECT 
  project_id,
  DATE(CURRENT_TIMESTAMP()) as date,
  COUNT(DISTINCT keyword_id) as total_keywords,
  AVG(position) as avg_position,
  COUNT(CASE WHEN position <= 10 THEN 1 END) as top10_count
FROM `seo_rankings.latest_rankings`
GROUP BY project_id;

-- Refresh schedule
CREATE OR REPLACE SCHEDULED QUERY `refresh_dashboard_stats`
OPTIONS (
  query="""REFRESH MATERIALIZED VIEW `seo_rankings.dashboard_stats`""",
  schedule="every 1 hours"
);
```

## 10. Disaster Recovery

### 10.1 Backup Strategy

```bash
# BigQuery automatic backups
bq mk --transfer_config \
  --project_id=rankup-production \
  --data_source=cross_region_copy \
  --target_dataset=seo_rankings_backup \
  --display_name="Daily Backup to EU" \
  --schedule="every day 03:00"

# Convex backups
npx convex backup:create --prod

# Application data export
node scripts/backup-application-data.js
```

### 10.2 Recovery Procedures

```markdown
## Disaster Recovery Runbook

### Scenario 1: BigQuery Data Loss
1. Stop all write operations
2. Restore from latest snapshot: `bq cp -r dataset_backup dataset`
3. Replay missing data from audit logs
4. Verify data integrity
5. Resume operations

### Scenario 2: Application Outage
1. Switch DNS to backup region
2. Scale up backup instances
3. Verify all services healthy
4. Monitor for issues
5. Plan root cause analysis

### Scenario 3: Security Breach
1. Revoke all API keys
2. Reset all passwords
3. Audit access logs
4. Patch vulnerabilities
5. Notify affected users
```

## 11. Rollback Procedures

### 11.1 Vercel Rollback

```bash
# List deployments
vercel list

# Rollback to previous
vercel rollback <deployment-url>

# Or use alias
vercel alias <old-deployment> production
```

### 11.2 Database Rollback

```sql
-- Restore table from snapshot
CREATE OR REPLACE TABLE `seo_rankings.rankings`
AS SELECT * FROM `seo_rankings.rankings`
FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR);
```

## 12. Post-Deployment

### 12.1 Health Checks

```bash
# Run health check script
node scripts/health-check.js

# Manual checks
curl https://app.rankup.com/api/health
curl https://app.rankup.com/api/v1/status
```

### 12.2 Performance Testing

```bash
# Load testing with k6
k6 run --vus 100 --duration 30s tests/load/api.js

# Lighthouse CI
lhci autorun --config=lighthouserc.js
```

### 12.3 Monitoring Dashboard

Set up dashboards for:
- API response times
- Error rates
- User activity
- Database performance
- Cost tracking

## 13. Maintenance Mode

### 13.1 Enable Maintenance

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return NextResponse.rewrite(new URL('/maintenance', request.url))
  }
}
```

### 13.2 Maintenance Page

```tsx
// app/maintenance/page.tsx
export default function Maintenance() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1>We'll be back soon!</h1>
        <p>Rankup is undergoing scheduled maintenance.</p>
        <p>Expected completion: {process.env.MAINTENANCE_END_TIME}</p>
      </div>
    </div>
  )
}
```

## 14. Scaling Considerations

### 14.1 Auto-scaling Configuration

```json
// vercel.json
{
  "functions": {
    "apps/web/src/app/api/rankings/check/route.ts": {
      "maxDuration": 300,
      "memory": 3008,
      "scale": {
        "min": 1,
        "max": 100
      }
    }
  }
}
```

### 14.2 Database Partitioning

```sql
-- Monthly partitions for large tables
ALTER TABLE `seo_rankings.rankings`
SET OPTIONS (
  partition_expiration_days=365,
  require_partition_filter=true
);

-- Archive old data
CREATE TABLE `seo_rankings_archive.rankings_2023`
AS SELECT * FROM `seo_rankings.rankings`
WHERE tracked_date < '2024-01-01';

DELETE FROM `seo_rankings.rankings`
WHERE tracked_date < '2024-01-01';
```

## Support Contacts

- **DevOps Lead**: devops@rankup.com
- **On-call**: +1-xxx-xxx-xxxx
- **Escalation**: cto@rankup.com
- **Status Page**: status.rankup.com