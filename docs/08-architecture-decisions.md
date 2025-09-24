# Architecture Decisions

## Overview

This document consolidates key architectural decisions for the Rankup SEO tracking platform, explaining the rationale behind our technical choices and providing guidance for future scaling.

## Core Architecture

### System Design
- **Monorepo Structure**: Using Turbo for efficient builds and shared code
- **Frontend**: Next.js 15 with App Router for optimal SEO and performance
- **Backend**: Hybrid approach with Convex (metadata) + BigQuery (analytics)
- **Authentication**: Clerk for user management and billing
- **Real-time**: Convex for live updates and notifications

### Data Architecture

#### Single BigQuery Dataset Approach
After evaluating multiple options, we chose a **single shared dataset** model:

```
BigQuery Project: rankup-manager
  └─ Dataset: seo_rankings
      ├─ keywords (project_id, keyword, ...)
      ├─ rankings (project_id, position, ...)
      └─ projects (project_id, metadata, ...)
```

**Benefits**:
- Simple to manage and maintain
- Cost-effective for <10,000 users
- Easy backup and migration
- Single source of truth

**Security**:
- Row-level filtering by `project_id`
- API routes verify project ownership via Convex
- No direct BigQuery access from frontend

#### Data Division Strategy

| Data Type | Storage | Reason |
|-----------|---------|--------|
| User profiles | Convex | Real-time updates, auth integration |
| Project metadata | Convex | Frequent access, real-time sync |
| Keywords (10K+) | BigQuery | Cost-effective for large datasets |
| Rankings (1M+) | BigQuery | Optimized for analytics queries |
| Notifications | Convex | Real-time delivery required |
| API keys | Convex | Security and quick validation |

## Multi-Tenancy Strategy

### Current Implementation
1. **Authentication**: Clerk handles user identity
2. **Authorization**: Convex verifies project ownership
3. **Data Access**: BigQuery filtered by project_id
4. **Subscription**: Clerk Billing manages limits

### Security Flow
```typescript
// Every API request follows this pattern:
1. Clerk Auth → userId
2. Convex Query → verify user owns project
3. BigQuery Query → filter by project.bigQueryProjectId
```

### Future Scaling Options

#### When to Consider Multi-Dataset
- **Threshold**: >10,000 active users
- **Enterprise**: Compliance requirements
- **Performance**: Query times >2 seconds

#### Migration Path
```
Phase 1 (Current): Single dataset
Phase 2 (Growth): Dataset per tier (free/pro/enterprise)
Phase 3 (Scale): Dataset per large customer
Phase 4 (Enterprise): Dedicated BigQuery projects
```

## Subscription Architecture

### Clerk Billing Integration
We use Clerk's native billing instead of custom implementation:

**Configuration**:
- 4 Plans: Free, Starter ($29), Pro ($99), Enterprise (Custom)
- Features managed via Clerk metadata
- Stripe for payment processing
- Webhooks for subscription events

**Enforcement**:
```typescript
// Simple feature checks
const { has } = await auth();
if (!has({ permission: "api_access" })) {
  return new Response("Upgrade required", { status: 402 });
}
```

### Caching Strategy
- Redis/Upstash for limit checks (5 min TTL)
- Reduces API calls by 90%
- Clears on subscription changes

## API Design Principles

### RESTful Endpoints
```
GET    /api/projects          # List projects
POST   /api/projects          # Create project
GET    /api/keywords          # List keywords (requires projectId)
POST   /api/keywords/import   # Bulk import
GET    /api/rankings          # Get rankings (requires projectId)
```

### Consistent Error Handling
- 401: Unauthorized (no auth)
- 403: Forbidden (no access to resource)
- 402: Payment Required (limit reached)
- 400: Bad Request (validation errors)

### Performance Optimization
1. **Pagination**: Default 50 items per page
2. **Caching**: Redis for hot queries
3. **Batch Operations**: Bulk imports/updates
4. **Background Jobs**: Heavy operations queued

## Technology Decisions

### Why This Stack?

| Choice | Reason |
|--------|--------|
| Next.js 15 | Latest features, excellent DX, built-in optimization |
| Convex | Real-time without complexity, great auth integration |
| BigQuery | Handles millions of records, cost-effective |
| Clerk | Complete auth + billing solution |
| Tailwind v4 | Modern styling, great performance |
| Radix UI | Accessible components, customizable |

### Rejected Alternatives

| Technology | Reason for Rejection |
|------------|---------------------|
| Supabase | Less real-time features than Convex |
| PostgreSQL | Expensive at scale for analytics |
| Custom Auth | Clerk provides more features out-of-box |
| Material UI | Too opinionated for our design |

## Best Practices

### Code Organization
```
apps/
  web/                 # Next.js frontend
    src/
      app/            # App router pages
      components/     # Reusable components
      hooks/          # Custom React hooks
      lib/            # Utilities
      
packages/
  backend/            # Convex + BigQuery
    convex/          # Real-time functions
    lib/             # BigQuery client
    scripts/         # Migration tools
    
  shared/            # Shared types & utils
```

### Security Guidelines
1. **Never trust user input**: Always validate
2. **Verify ownership**: Check project access
3. **Use parameters**: No string concatenation in queries
4. **Limit exposure**: Return only necessary data
5. **Audit logs**: Track sensitive operations

### Performance Guidelines
1. **Cache aggressively**: Redis for repeated queries
2. **Paginate always**: Never return unlimited results
3. **Index properly**: BigQuery clustering on project_id
4. **Batch operations**: Reduce API calls
5. **Background jobs**: Queue heavy tasks

## Migration Strategies

### Importing Existing Data
Proper flow for data import:
1. User uploads CSV/JSON
2. Validate format and limits
3. Create import job with tracking
4. Process in background
5. Notify on completion

### Scaling Considerations

#### Database Growth
- Partition BigQuery tables by date
- Archive old data (>1 year)
- Implement data retention policies

#### User Growth
- Monitor query performance
- Consider read replicas for Convex
- Implement rate limiting
- Add CDN for static assets

## Monitoring & Observability

### Key Metrics
- API response times
- BigQuery query costs
- Subscription conversion rates
- Error rates by endpoint
- User engagement metrics

### Alerting Thresholds
- API response >2s
- Error rate >1%
- BigQuery cost >$100/day
- Failed payment rate >5%

## Future Considerations

### Potential Enhancements
1. **GraphQL API**: For mobile apps
2. **Webhook System**: For integrations
3. **Advanced Analytics**: ML-powered insights
4. **White-label**: Custom domains
5. **API Marketplace**: Third-party apps

### Technical Debt to Address
1. Add comprehensive testing
2. Implement proper logging
3. Create admin dashboard
4. Add data export features
5. Improve error messages

## Conclusion

This architecture balances simplicity with scalability, using modern tools that reduce complexity while providing room to grow. Key principles:

- **Start simple**: Single dataset, straightforward auth
- **Use managed services**: Clerk, Convex, BigQuery
- **Plan for scale**: Clear migration paths defined
- **Maintain flexibility**: Loosely coupled components
- **Focus on value**: Ship features, not infrastructure