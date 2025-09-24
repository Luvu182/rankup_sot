# Hướng dẫn Setup - Rankup Manager

## Prerequisites

### System Requirements
- Node.js 20+ (LTS)
- pnpm 8+
- Git
- Google Cloud Account (for BigQuery)
- Clerk Account (for authentication)

### Development Tools
- VS Code (recommended)
- Postman or similar (for API testing)
- TablePlus or similar (for database viewing)

## 1. Clone và Setup Repository

```bash
# Clone repository
git clone https://github.com/your-org/rankup-manager.git
cd rankup-manager

# Install dependencies
pnpm install

# Setup git hooks
pnpm prepare
```

## 2. Environment Variables Setup

### 2.1 Create Environment Files

```bash
# Backend environment
cp packages/backend/.env.example packages/backend/.env.local

# Frontend environment
cp apps/web/.env.example apps/web/.env.local
```

### 2.2 Clerk Authentication Setup

1. Đăng ký tại [clerk.com](https://clerk.com)
2. Tạo application mới
3. Copy các keys:

```env
# apps/web/.env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Clerk JWT template issuer
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
```

4. Setup Convex JWT template trong Clerk Dashboard:
   - Go to JWT Templates
   - Create new template tên "convex"
   - Set issuer URL

### 2.3 Convex Setup

```bash
# Navigate to backend
cd packages/backend

# Login to Convex (chọn "Start without account" cho local)
npx convex dev

# Set environment variables in Convex dashboard
# http://localhost:3001 -> Settings -> Environment Variables
# Add: CLERK_JWT_ISSUER_DOMAIN
```

### 2.4 Google Cloud Setup

1. Tạo Google Cloud Project
2. Enable BigQuery API
3. Tạo Service Account:

```bash
# Install gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Create service account
gcloud iam service-accounts create rankup-backend \
  --display-name="Rankup Backend Service"

# Create key
gcloud iam service-accounts keys create \
  ~/rankup-service-account.json \
  --iam-account=rankup-backend@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Grant permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:rankup-backend@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"
```

4. Add to environment:

```env
# packages/backend/.env.local
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

### 2.5 Create BigQuery Dataset

```bash
# Create dataset
bq mk --dataset \
  --location=US \
  --description="Rankup SEO Rankings Data" \
  YOUR_PROJECT_ID:seo_rankings

# Apply schema
cd packages/backend
pnpm run bigquery:migrate
```

Or manually trong BigQuery Console:

```sql
-- Run trong BigQuery Console
CREATE SCHEMA IF NOT EXISTS `your-project-id.seo_rankings`;
```

### 2.6 Redis Setup (Upstash)

1. Đăng ký tại [upstash.com](https://upstash.com)
2. Create Redis database
3. Copy credentials:

```env
# apps/web/.env.local
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

### 2.7 DataForSEO Setup (Optional for MVP)

1. Đăng ký tại [dataforseo.com](https://dataforseo.com)
2. Get API credentials:

```env
# apps/web/.env.local
DATAFORSEO_LOGIN=your_login
DATAFORSEO_PASSWORD=your_password
```

## 3. Database Setup

### 3.1 Run BigQuery Migrations

```bash
# Create tables
cd packages/backend
node scripts/setup-bigquery.js
```

Hoặc run manual trong BigQuery Console:

```sql
-- Copy content từ packages/backend/lib/bigquery-schema.sql
-- Paste và run trong BigQuery Console
```

### 3.2 Setup Convex Schema

```bash
# Convex schema tự động setup khi run
cd packages/backend
npx convex dev
```

## 4. Running Development Environment

### 4.1 Start All Services

```bash
# Từ root directory
pnpm dev
```

This will start:
- Next.js frontend (http://localhost:3001)
- Convex backend (running on port 3210)
- Convex dashboard (chạy `npx convex dashboard` để mở)

### 4.2 Start Individual Services

```bash
# Frontend only
pnpm dev:web

# Backend only
pnpm dev:server

# hoặc chạy trong từng folder
cd apps/web && pnpm dev
cd packages/backend && npx convex dev
```

## 5. Initial Data Setup

### 5.1 Create Test User

1. Visit http://localhost:3001
2. Click "Sign In"
3. Create account với email

### 5.2 Create Test Project

```bash
# Use API hoặc UI
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "domain": "https://example.com"
  }'
```

### 5.3 Import Test Keywords

Create file `test-keywords.csv`:

```csv
keyword,search_volume,target_position
seo tools,1000,5
rank tracker,500,3
keyword research,2000,10
```

Import via UI hoặc API.

## 6. Development Workflow

### 6.1 Code Structure

```
Rankup-manager/
├── apps/
│   └── web/              # Next.js frontend
├── packages/
│   ├── backend/          # Convex backend
│   ├── ui/               # Shared UI components
│   └── utils/            # Shared utilities
├── docs/                 # Documentation
└── scripts/              # Build & deploy scripts
```

### 6.2 Git Workflow

```bash
# Create feature branch
git checkout -b feature/add-keyword-groups

# Make changes
# ...

# Commit
git add .
git commit -m "feat: add keyword grouping functionality"

# Push
git push origin feature/add-keyword-groups

# Create PR on GitHub
```

### 6.3 Testing

```bash
# Run all tests
pnpm test

# Run specific test
pnpm test:web
pnpm test:backend

# E2E tests
pnpm test:e2e
```

## 7. Troubleshooting

### 7.1 Common Issues

**Convex connection failed**
```bash
# Check Convex is running
ps aux | grep convex

# Restart Convex
cd packages/backend
npx convex dev
```

**BigQuery permission denied**
```bash
# Check service account
gcloud auth application-default login

# Verify credentials
echo $GOOGLE_APPLICATION_CREDENTIALS
```

**Clerk authentication error**
- Verify JWT issuer domain matches
- Check environment variables loaded
- Clear cookies and re-login

### 7.2 Debug Mode

```env
# Enable debug logs
DEBUG=* pnpm dev

# Specific debug
DEBUG=convex:* pnpm dev
DEBUG=api:* pnpm dev
```

### 7.3 Reset Everything

```bash
# Clean install
pnpm clean
rm -rf node_modules
rm -rf .next
pnpm install

# Reset database
# Drop và recreate BigQuery dataset
# Clear Convex data trong dashboard
```

## 8. Production Deployment Prep

### 8.1 Environment Variables for Production

```env
# Production URLs
NEXT_PUBLIC_APP_URL=https://app.rankup.com
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Production keys (different from dev)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx

# Production database
GOOGLE_CLOUD_PROJECT=rankup-prod
```

### 8.2 Pre-deployment Checklist

- [ ] All environment variables set
- [ ] BigQuery dataset created in production
- [ ] Convex deployment configured
- [ ] Clerk production instance setup
- [ ] Redis production instance
- [ ] Domain DNS configured
- [ ] SSL certificates ready
- [ ] Error tracking (Sentry) configured
- [ ] Monitoring setup

## 9. Useful Commands

```bash
# Development
pnpm dev              # Start all services
pnpm build            # Build all packages
pnpm clean            # Clean all builds

# Database
pnpm db:push          # Push schema changes
pnpm db:seed          # Seed test data
pnpm db:reset         # Reset database

# Code quality
pnpm lint             # Run linter
pnpm typecheck        # Type checking
pnpm format           # Format code

# Testing
pnpm test             # Run tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report

# Deployment
pnpm deploy:staging   # Deploy to staging
pnpm deploy:prod      # Deploy to production
```

## 10. VS Code Setup

### 10.1 Recommended Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "davidanson.vscode-markdownlint"
  ]
}
```

### 10.2 VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "shortest",
  "typescript.updateImportsOnFileMove.enabled": "always"
}
```

## Support

Nếu gặp vấn đề:
1. Check [docs](./README.md)
2. Search existing [issues](https://github.com/your-org/rankup/issues)
3. Ask in [Discord](https://discord.gg/rankup)
4. Email: support@rankup.com