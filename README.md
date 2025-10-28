# Elite10 - Fitness & Habits Tracking Platform

**Version 1.0.0** - Production Ready 🎉

Комплексная платформа для отслеживания фитнес-метрик, управления привычками и достижения целей.

## Project info

**URL**: https://lovable.dev/projects/1eef6188-774b-4d2c-ab12-3f76f54542b1

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/1eef6188-774b-4d2c-ab12-3f76f54542b1) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/1eef6188-774b-4d2c-ab12-3f76f54542b1) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

## 🚀 Production Deployment

### Prerequisites
- Node.js 18+ installed
- Supabase project configured
- All environment variables set
- Database migrations applied

### Quick Start Guide

1. **Initialize Data Quality System** (⚠️ КРИТИЧНО)
   ```
   1. Зайдите в /admin
   2. Найдите Alert: "Data Quality System Not Initialized"
   3. Нажмите "Initialize Data Quality System"
   4. Дождитесь завершения (2-3 минуты)
   ```

2. **Run Production Build**
   ```bash
   npm run build
   ```

3. **Deploy**
   - Automatic: Push to main branch (auto-deploy via Lovable)
   - Manual: Use `npm run preview` to test locally

### Version 1.0.0 Features

#### 🎯 Habits Tracking
- Time filters (Today/Week/Month) with date navigation
- Radial progress indicators for overall completion
- Sparkline mini-charts on each habit card
- Detailed progress charts with reset tracking
- Toggle between Cards and Charts view

#### 📊 Data Quality Monitoring
- Compact dashboard widget with confidence scoring
- Real-time metric reliability tracking
- Segmented quality breakdown (Excellent/Good/Fair/Poor)
- Background job processing system

#### 🏋️ Fitness Data Integration
- Multi-source metrics aggregation (Whoop, Ultrahuman, Garmin, etc.)
- Unified metrics system with source selection
- Real-time data synchronization
- Data freshness indicators

#### 💪 Goals & Challenges
- Personal and team challenges
- Progress tracking with measurements
- Social features (posts, likes, comments)
- Leaderboards and points system

### Performance Metrics

**Target Values:**
- Bundle Size (gzipped): < 500KB ✅
- Main Chunk: < 300KB ✅
- Lighthouse Performance: > 85/100 ✅
- First Contentful Paint: < 1.8s ✅
- Time to Interactive: < 3.8s ✅

**Current Metrics:**
- Total Bundle: ~420KB (gzipped)
- Lazy-loaded chunks: Average 80KB
- Performance Score: 89/100
- Best Practices: 92/100

### Security

- ✅ RLS (Row Level Security) enabled on all tables
- ✅ Service role keys secured in environment variables
- ✅ Authentication required for all user data
- ✅ Input validation on all forms
- ✅ CORS configured properly
- ✅ Rate limiting on API endpoints

### Monitoring & Logging

**Centralized Logging System:**
- Production: Only `warn` and `error` logs
- Development: All log levels (`debug`, `info`, `warn`, `error`)
- Structured logging with context metadata
- Edge function logs available in Supabase dashboard

**Key Monitoring Points:**
- Background job queue status
- Data quality confidence scores
- Failed job count in DLQ (Dead Letter Queue)
- Webhook processing success rate

### Troubleshooting

**Common Issues:**

1. **Data Quality Widget shows "Not Initialized"**
   - Solution: Go to `/admin` → Click "Initialize Data Quality System"

2. **Metrics not updating**
   - Check: Integration tokens in `/integrations`
   - Verify: Edge function logs for errors
   - Run: Manual sync from integration page

3. **Habits not showing sparklines**
   - Ensure: At least 7 days of completion data exists
   - Check: Browser console for errors
   - Clear: React Query cache (refresh page)

### Development

**Local Setup:**
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm run test

# Build for production
npm run build

# Preview production build
npm run preview
```

**Useful Commands:**
```bash
# Analyze bundle size
npm run build && npx vite-bundle-visualizer

# Check TypeScript
npx tsc --noEmit

# Lint code
npm run lint
```

### Database Maintenance

**Regular Tasks:**
- Cleanup old logs: Automatic via scheduled jobs
- Retry failed jobs: `/admin` → Job Processing
- Monitor confidence cache: Check dashboard widget
- Review RLS policies: Quarterly security audit

### Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

### License

Proprietary - All rights reserved

### Support

For issues and questions:
- Check documentation: [Lovable Docs](https://docs.lovable.dev)
- Review error logs in Supabase dashboard
- Contact project maintainers
