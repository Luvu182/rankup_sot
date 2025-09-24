# 🚀 Rankup Manager - Hướng dẫn Setup & Development

## 📋 Thông tin Project

### Tech Stack
- **Frontend**: Next.js 15.5.0, TypeScript, Tailwind CSS v4
- **Backend**: Convex (real-time database & functions)
- **Analytics DB**: Google BigQuery
- **Cache**: Upstash Redis
- **Auth**: Clerk
- **Monorepo**: Turbo + pnpm workspaces

### Project Structure
```
Rankup-manager/
├── apps/
│   └── web/              # Next.js frontend app
├── packages/
│   ├── backend/          # Convex backend functions
│   ├── ui/               # Shared UI components
│   └── utils/            # Shared utilities
└── docs/                 # Documentation
```

## 🛠️ Setup đã hoàn thành

### ✅ Google Cloud & BigQuery
- **Project ID**: `rankup-manager`
- **Dataset**: `seo_rankings`
- **Tables**: rankings, keywords, projects
- **Service Account Key**: `~/rankup-keys/rankup-service-account.json`

### ✅ Upstash Redis
- **URL**: https://civil-foal-10510.upstash.io
- **Free tier**: 256MB storage, 500k commands/month

### ✅ Clerk Authentication
- Đã config trong `.env.local`

## 🚀 Development Commands

### Chạy toàn bộ hệ thống (Recommended)
```bash
cd /Volumes/Samsung\ 990/Rankup/Rankup-manager
pnpm dev
```
Lệnh này sẽ tự động chạy:
- Convex backend (http://localhost:3210)
- Next.js frontend (http://localhost:3001)
- Hot reload cho cả 2 services

### Chạy riêng từng service
```bash
# Chỉ frontend
pnpm dev:web

# Chỉ backend
pnpm dev:server

# Setup Convex lần đầu
pnpm dev:setup
```

## 🔧 Convex Dashboard & Tools

### 1. Convex Dashboard
Dashboard KHÔNG tự động mở. Bạn cần chạy lệnh:
```bash
cd packages/backend
npx convex dashboard
```
Dashboard sẽ mở tại: http://127.0.0.1:6790

Features của dashboard:
- View & edit data real-time
- Test functions
- Monitor logs
- Debug queries

### 2. Convex CLI Commands
```bash
# Mở dashboard trong browser
npx convex dashboard

# Deploy to production
npx convex deploy

# View logs
npx convex logs

# Run a function từ CLI
npx convex run myFunction

# Import/Export data
npx convex import --table users data.json
npx convex export
```

### 3. Convex Dev Tools
```bash
# Clear local database
npx convex dev --clear-cache

# Reset schema
npx convex dev --reset

# View current deployment
npx convex env list
```

## 📊 BigQuery Commands

### Truy cập BigQuery
```bash
# List tables
~/google-cloud-sdk/bin/bq ls rankup-manager:seo_rankings

# Query data
~/google-cloud-sdk/bin/bq query --use_legacy_sql=false \
  "SELECT * FROM \`rankup-manager.seo_rankings.keywords\` LIMIT 10"

# Load data from CSV
~/google-cloud-sdk/bin/bq load \
  --source_format=CSV \
  rankup-manager:seo_rankings.keywords \
  keywords.csv \
  keyword_id:STRING,keyword:STRING,project_id:STRING
```

## 🧪 Testing

### Test Redis Connection
```bash
cd packages/backend
npx tsx test-redis.ts
```

### Test BigQuery Connection
```bash
cd packages/backend
npx tsx test-bigquery.ts  # Need to create this file
```

## 🔐 Environment Variables

### Frontend (.env.local)
```env
# apps/web/.env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CONVEX_URL=http://localhost:3210

# Google Cloud / BigQuery  
GOOGLE_CLOUD_PROJECT=rankup-manager
GOOGLE_APPLICATION_CREDENTIALS=/Users/luvu/rankup-keys/rankup-service-account.json

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://civil-foal-10510.upstash.io
UPSTASH_REDIS_REST_TOKEN=ASkOAAIncDI0Y2YwNjIxYTMxYmI0Yzc5OWQ0ZGE0Yjg1Yzk2YTYxOXAyMTA1MTA

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Backend (.env.local)
```env
# packages/backend/.env.local
# Convex auto-generated
CONVEX_DEPLOYMENT=anonymous:anonymous-Luanvu
CONVEX_URL=http://127.0.0.1:3210

# Same as frontend for other services
```

## 🚨 Troubleshooting

### Convex Issues
```bash
# If Convex won't start
npx convex dev --clear-cache

# If schema conflicts
npx convex dev --reset

# Check Convex status
npx convex env list
```

### BigQuery Issues
```bash
# Verify authentication
~/google-cloud-sdk/bin/gcloud auth list

# Check project
~/google-cloud-sdk/bin/gcloud config get-value project

# Re-authenticate
~/google-cloud-sdk/bin/gcloud auth application-default login
```

### Redis Issues
- Check Upstash dashboard: https://console.upstash.com
- Verify no quotes in env variables
- Check usage limits in free tier

## 📦 Useful Scripts

### Add to package.json for convenience
```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "dashboard": "npx convex dashboard",
    "logs": "npx convex logs -w",
    "db:clear": "npx convex dev --clear-cache",
    "bq:shell": "~/google-cloud-sdk/bin/bq shell",
    "redis:test": "cd packages/backend && npx tsx test-redis.ts"
  }
}
```

## 🎯 Next Steps for MVP

1. **Create Core Features**
   - [ ] Dashboard with project stats
   - [ ] Keywords management
   - [ ] Ranking tracker
   - [ ] Analytics charts

2. **Integrate Services**
   - [ ] Connect BigQuery queries with UI
   - [ ] Setup Redis caching for queries
   - [ ] Implement real-time updates with Convex

3. **Optional Enhancements**
   - [ ] DataForSEO API integration
   - [ ] Email notifications
   - [ ] Export reports

## 📞 Support

- **Convex Docs**: https://docs.convex.dev
- **BigQuery Docs**: https://cloud.google.com/bigquery/docs
- **Upstash Docs**: https://docs.upstash.com
- **Project Docs**: See `/docs` folder

---

**Happy coding! 🚀**