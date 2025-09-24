# Tech Stack - Rankup Manager

## 1. Frontend Stack

### 1.1 Core Framework
- **Next.js 15.5.0**
  - App Router for better performance
  - Server Components by default
  - Turbopack for faster builds
  - Built-in API routes

### 1.2 UI & Styling
- **TypeScript 5.x**
  - Type safety across the app
  - Better IDE support
  - Reduced runtime errors

- **Tailwind CSS v4**
  - Utility-first CSS
  - JIT compilation
  - Custom design system

- **Radix UI + Shadcn/ui**
  - Accessible components
  - Unstyled primitives
  - Customizable themes

### 1.3 State Management
- **Convex React**
  - Real-time subscriptions
  - Optimistic updates
  - Built-in caching

- **TanStack Query**
  - Server state management
  - Background refetching
  - Infinite queries for pagination

### 1.4 Data Visualization
- **Recharts**
  - Responsive charts
  - Composable API
  - TypeScript support

- **Tremor**
  - Dashboard components
  - Pre-built analytics UI
  - Tailwind-based

### 1.5 Forms & Validation
- **React Hook Form**
  - Performance optimized
  - Built-in validation
  - TypeScript support

- **Zod**
  - Schema validation
  - Type inference
  - Runtime validation

## 2. Backend Stack

### 2.1 Runtime & Framework
- **Node.js 20 LTS**
  - Stable and performant
  - Native ES modules
  - Better diagnostics

- **tRPC**
  - End-to-end type safety
  - No code generation
  - RPC-like API

### 2.2 Databases

#### Primary Storage
- **Google BigQuery**
  - Petabyte-scale analytics
  - SQL support
  - Serverless pricing
  - Real-time streaming

#### Real-time Database & Metadata
- **Convex**
  - Chỉ lưu metadata (users, projects, settings)
  - Real-time subscriptions cho notifications
  - ACID transactions
  - Free tier 500MB là quá đủ cho use case này

#### Caching
- **Redis (Upstash)**
  - Serverless Redis
  - Global replication
  - Pay-per-request
  - Edge caching

### 2.3 Authentication
- **Clerk**
  - Complete auth solution
  - Social logins
  - MFA support
  - User management UI

### 2.4 Background Jobs
- **Inngest**
  - Event-driven workflows
  - Reliable execution
  - Built-in retries
  - Observability

### 2.5 External APIs
- **DataForSEO API**
  - SERP data
  - Bulk operations
  - 99.9% uptime
  - Global coverage

## 3. Infrastructure

### 3.1 Hosting
- **Vercel**
  - Frontend hosting
  - Edge functions
  - Automatic SSL
  - Global CDN

- **Google Cloud Platform**
  - BigQuery hosting
  - Cloud Storage for reports
  - Cloud Run for services

### 3.2 Monitoring
- **Sentry**
  - Error tracking
  - Performance monitoring
  - Release tracking
  - User feedback

- **Vercel Analytics**
  - Web vitals
  - Real user monitoring
  - Custom events

### 3.3 DevOps
- **GitHub Actions**
  - CI/CD pipeline
  - Automated testing
  - Preview deployments

- **Terraform**
  - Infrastructure as Code
  - GCP resource management
  - Version control

## 4. Development Tools

### 4.1 Package Management
- **pnpm**
  - Fast installation
  - Disk space efficient
  - Monorepo support
  - Strict dependency resolution

### 4.2 Build Tools
- **Turbo**
  - Monorepo build system
  - Incremental builds
  - Remote caching
  - Parallel execution

- **Vite** (for packages)
  - Fast HMR
  - ES modules
  - Plugin ecosystem

### 4.3 Code Quality
- **ESLint**
  - Code linting
  - Custom rules
  - Auto-fixing

- **Prettier**
  - Code formatting
  - Consistent style
  - Editor integration

- **Husky**
  - Git hooks
  - Pre-commit checks
  - Automated workflows

### 4.4 Testing
- **Vitest**
  - Fast unit tests
  - Jest compatible
  - Native ESM

- **Playwright**
  - E2E testing
  - Cross-browser
  - Visual regression

## 5. Third-party Services

### 5.1 Communications
- **Resend**
  - Transactional emails
  - React email templates
  - Deliverability focus

- **Twilio**
  - SMS notifications
  - WhatsApp integration
  - Voice calls

### 5.2 Payments
- **Stripe**
  - Subscription billing
  - Payment processing
  - Invoice generation
  - Tax calculation

### 5.3 Analytics
- **PostHog**
  - Product analytics
  - Feature flags
  - Session recording
  - A/B testing

### 5.4 Support
- **Crisp**
  - Live chat
  - Knowledge base
  - Ticketing system
  - Chatbot

## 6. Security Stack

### 6.1 Security Services
- **Cloudflare**
  - DDoS protection
  - WAF
  - Bot management
  - SSL/TLS

### 6.2 Security Tools
- **OWASP ZAP**
  - Security scanning
  - Vulnerability detection
  - API testing

- **Snyk**
  - Dependency scanning
  - Container scanning
  - IaC scanning

## 7. Development Environment

### 7.1 Required Tools
```bash
# Node.js 20+
node --version

# pnpm 8+
pnpm --version

# Git
git --version

# Google Cloud CLI
gcloud --version
```

### 7.2 VS Code Extensions
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin
- GitLens
- Thunder Client (API testing)

### 7.3 Environment Variables
```env
# .env.local example
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Convex
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOY_KEY=

# BigQuery
GOOGLE_CLOUD_PROJECT=
GOOGLE_APPLICATION_CREDENTIALS=

# DataForSEO
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=

# Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=
```

## 8. Architecture Decisions

### 8.1 Why This Stack?

**Next.js + Vercel**
- ✅ Best DX for React apps
- ✅ Built-in optimizations
- ✅ Serverless by default
- ✅ Great TypeScript support

**BigQuery for Analytics**
- ✅ Handles 10M+ records easily
- ✅ Cost-effective for big data ($0.02/GB/month)
- ✅ SQL familiar to team
- ✅ Built-in ML capabilities

**Convex for Metadata & Real-time**
- ✅ Perfect for small metadata (< 100MB)
- ✅ Real-time notifications
- ✅ Type-safe queries
- ✅ Free tier covers our needs

**Clerk for Auth**
- ✅ Complete solution
- ✅ Great UX
- ✅ Secure by default
- ✅ Easy integration

### 8.2 Alternatives Considered

| Need | Chosen | Alternative | Why Chosen |
|------|---------|------------|------------|
| Framework | Next.js 15 | Remix, Nuxt | Larger ecosystem, stable |
| Analytics DB | BigQuery | PostgreSQL | Better for 10M+ records |
| Metadata DB | Convex | Firebase | Better DX, type-safe |
| Auth | Clerk | Auth0 | Better pricing |
| Hosting | Vercel | AWS | Simpler deployment |

## 9. Performance Targets

### 9.1 Frontend
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1
- **TTI**: < 3.5s

### 9.2 Backend
- **API Response**: < 200ms (p95)
- **BigQuery**: < 2s for complex queries
- **Uptime**: 99.9%

### 9.3 Scalability
- **Concurrent Users**: 10,000+
- **Keywords/Project**: 1,000,000+
- **API Requests**: 1M/day

## 10. Cost Estimation

### 10.1 Monthly Costs (at scale)
- **Vercel Pro**: $20
- **BigQuery**: ~$50-200 (10M records ≈ 10GB ≈ $0.20 storage + queries)
- **Convex**: $0 (Free tier đủ dùng cho metadata)
- **Clerk Pro**: $25
- **Redis**: $10
- **DataForSEO**: $300+ (usage-based)
- **Monitoring**: $50

**Total**: ~$450-850/month for medium scale

### 10.2 Cost Optimization
- Use BigQuery clustering
- Cache expensive queries
- Batch API requests
- Use Vercel Edge caching
- Archive old data