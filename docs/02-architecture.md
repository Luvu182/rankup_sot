# System Architecture

## Overview

Rankup employs a modern, scalable architecture designed to handle SEO tracking for thousands of websites with millions of keywords.

## High-Level Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Next.js App   │────▶│   API Routes    │────▶│     Convex      │
│   (Frontend)    │     │   (Backend)     │     │   (Metadata)    │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │                 │
                        │    BigQuery     │
                        │  (Analytics)    │
                        │                 │
                        └─────────────────┘
```

## Core Components

### 1. Frontend (Next.js 15)
- **Technology**: Next.js with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS v4, Radix UI primitives
- **State**: React hooks, URL state for navigation
- **Real-time**: Convex React client for live updates

### 2. Authentication (Clerk)
- **User Management**: Sign up, sign in, profiles
- **Billing**: Integrated subscription management
- **Organizations**: Team collaboration support
- **Security**: JWT tokens, secure sessions

### 3. Backend Services

#### API Routes (Next.js)
- RESTful endpoints for all operations
- Authentication via Clerk middleware
- Request validation and error handling
- Rate limiting and caching

#### Convex (Real-time Database)
Stores frequently accessed metadata:
- User profiles and settings
- Project configurations
- Real-time notifications
- Domain verification status
- Cached statistics

#### BigQuery (Analytics Database)
Stores large-scale analytics data:
- Keywords (1M+ per project)
- Daily ranking data (10M+ records)
- Historical tracking data
- Competitor analysis data

### 4. External Services
- **Clerk**: Authentication & billing
- **Google Cloud**: BigQuery, Cloud Run
- **Upstash Redis**: Caching layer
- **Resend**: Email notifications
- **DataForSEO**: Ranking data provider

## Data Flow

### 1. User Registration Flow
```
User Sign Up → Clerk → Webhook → Convex User Record → Welcome Email
```

### 2. Project Creation Flow
```
Create Project → Convex Metadata → Generate Unique ID → Ready for Keywords
```

### 3. Keyword Import Flow
```
Upload CSV → Validate → Check Limits → Insert to BigQuery → Update Cache
```

### 4. Ranking Check Flow
```
Scheduled Job → DataForSEO API → Process Results → Store in BigQuery → Notify Changes
```

## Security Architecture

### Authentication Layers
1. **Clerk Auth**: Primary authentication
2. **Project Ownership**: Verified in Convex
3. **Data Access**: Filtered by project_id

### API Security
```typescript
// Every API endpoint follows this pattern
const { userId } = await auth();                    // 1. Authenticate
const project = await verifyProjectOwnership();     // 2. Authorize
const data = await queryWithProjectFilter();        // 3. Filter data
```

## Scaling Strategy

### Current Architecture (0-10K users)
- Single BigQuery dataset
- Shared infrastructure
- Redis caching for performance

### Growth Phase (10K-100K users)
- Add read replicas
- Implement CDN
- Enhanced caching strategies
- Background job queues

### Enterprise Scale (100K+ users)
- Multi-region deployment
- Dedicated infrastructure for large customers
- Advanced analytics pipeline
- Custom integrations

## Performance Optimizations

### Caching Strategy
- **Redis**: 5-minute TTL for user limits
- **CDN**: Static assets and images
- **BigQuery**: Materialized views for dashboards
- **Browser**: Aggressive caching headers

### Query Optimization
- Indexed by project_id in all tables
- Partitioned by date for time-series data
- Clustered tables for common queries
- Batch operations for bulk updates

## Monitoring & Observability

### Application Monitoring
- Error tracking with Sentry
- Performance monitoring
- User analytics
- Business metrics dashboard

### Infrastructure Monitoring
- Uptime monitoring
- BigQuery cost tracking
- API rate limit monitoring
- Security audit logs

## Development Workflow

### Local Development
```bash
pnpm dev          # Start all services
convex dev        # Real-time backend
```

### Deployment Pipeline
```
Git Push → GitHub Actions → Build → Test → Deploy to Vercel/Cloud Run
```

### Environment Management
- Development: Local Convex, Test BigQuery dataset
- Staging: Separate Convex deployment, Staging dataset
- Production: Production Convex, Production dataset

## Technology Decisions Summary

| Component | Technology | Why |
|-----------|------------|-----|
| Frontend | Next.js 15 | Latest features, great DX |
| UI Library | Radix UI | Accessible, unstyled |
| Database | Convex + BigQuery | Real-time + Analytics |
| Auth | Clerk | Complete solution |
| Hosting | Vercel | Optimized for Next.js |
| Analytics DB | BigQuery | Cost-effective at scale |
| Cache | Upstash Redis | Serverless, pay-per-use |

## Future Enhancements

### Short Term (3 months)
- API rate limiting improvements
- Advanced caching strategies
- Performance optimizations

### Medium Term (6 months)
- GraphQL API option
- Webhook system for integrations
- Advanced analytics features

### Long Term (12+ months)
- Machine learning insights
- Multi-region deployment
- White-label solutions
- API marketplace