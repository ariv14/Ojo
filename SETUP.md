# Ojo Setup Guide

Quick setup for deploying Ojo to a new environment.

## Prerequisites

- Node.js 18+
- Supabase account
- Vercel account
- World ID App (from Worldcoin Developer Portal)
- WLD wallet address

## Step 1: Supabase Setup

### 1.1 Create Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: `ojo` (or your preferred name)
4. Generate and save database password
5. Select region closest to users

### 1.2 Create Storage Buckets

1. Go to Storage → New Bucket
2. Create `avatars` bucket (Public)
3. Create `photos` bucket (Public)

### 1.3 Run Database Schema

1. Go to SQL Editor
2. Run `supabase/schema.sql`
3. Run `supabase/policies.sql`
4. Run `supabase/storage.sql`

### 1.4 Get API Keys

1. Go to Settings → API
2. Copy Project URL and anon key

## Step 2: Environment Setup

1. Copy `.env.example` to `.env.local`
2. Fill in all values:
   - Supabase URL and key
   - World ID App ID
   - Owner wallet address
   - Admin nullifier hash (get after first login)

## Step 3: Vercel Deployment

### 3.1 Import Project

1. Go to https://vercel.com/new
2. Import from GitHub
3. Select the Ojo repository

### 3.2 Configure Environment Variables

Add all variables from `.env.local`:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `NEXT_PUBLIC_APP_ID` | Your World ID App ID |
| `NEXT_PUBLIC_OWNER_WALLET` | Your WLD wallet address |
| `NEXT_PUBLIC_ADMIN_ID` | Your admin nullifier hash |

### 3.3 Deploy

1. Click Deploy
2. Wait for build to complete

## Step 4: Post-Deployment

### 4.1 Test the App

1. Open deployed URL
2. Verify with World ID
3. Complete onboarding
4. Test posting an image

### 4.2 Set Admin

1. After first login, copy your nullifier_hash
2. Add to `NEXT_PUBLIC_ADMIN_ID` in Vercel
3. Redeploy

## Multi-Environment Setup (Test & Production)

For professional deployments, maintain separate test and production environments.

### Environment Overview

| Environment | Purpose | Supabase Project | Vercel Branch |
|-------------|---------|------------------|---------------|
| Development | Local dev | `ojo-dev` | - |
| Staging/Test | QA testing | `ojo-staging` | `staging` |
| Production | Live users | `ojo-prod` | `main` |

### Step 1: Create Supabase Projects

Create separate Supabase projects for each environment:

1. **ojo-staging** (Test environment)
   - Go to https://supabase.com/dashboard → New Project
   - Name: `ojo-staging`
   - Run all SQL files (`schema.sql`, `policies.sql`, `storage.sql`)
   - Create storage buckets: `avatars`, `photos`

2. **ojo-prod** (Production environment)
   - Create another project: `ojo-prod`
   - Run all SQL files
   - Create storage buckets: `avatars`, `photos`

### Step 2: Create Environment Files

Create separate env files for each environment:

```bash
# Local development (uses staging DB)
.env.local

# Staging environment
.env.staging

# Production environment
.env.production
```

**`.env.staging`:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging-anon-key
NEXT_PUBLIC_APP_ID=app_staging-worldcoin-app-id
NEXT_PUBLIC_OWNER_WALLET=0x_staging_wallet
NEXT_PUBLIC_ADMIN_ID=staging_admin_nullifier
```

**`.env.production`:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key
NEXT_PUBLIC_APP_ID=app_production-worldcoin-app-id
NEXT_PUBLIC_OWNER_WALLET=0x_production_wallet
NEXT_PUBLIC_ADMIN_ID=production_admin_nullifier
```

### Step 3: Configure Vercel Environments

1. **Import project to Vercel** (if not done)

2. **Configure environment variables per environment:**
   - Go to Project Settings → Environment Variables
   - For each variable, select the target environment:
     - **Production**: Variables for `main` branch
     - **Preview**: Variables for `staging` and feature branches
     - **Development**: Variables for local `vercel dev`

3. **Set up branch deployments:**
   - `main` branch → Production (ojo.vercel.app)
   - `staging` branch → Preview (ojo-staging.vercel.app)

### Step 4: Configure Git Branches

```bash
# Create staging branch
git checkout -b staging
git push -u origin staging

# Feature workflow
git checkout staging
git checkout -b feature/my-feature
# ... make changes ...
git push origin feature/my-feature
# Create PR to staging, test, then PR to main
```

### Step 5: World ID App Configuration

Create separate World ID apps for each environment:

1. **Staging App** (`app_staging_xxxxx`)
   - Worldcoin Developer Portal → Create App
   - Name: "Ojo Staging"
   - Set verification actions

2. **Production App** (`app_prod_xxxxx`)
   - Create separate app: "Ojo"
   - Use different action names if needed

### Deployment Workflow

```
Feature Branch → Staging Branch → Main Branch
     ↓                ↓               ↓
  PR Review      QA Testing      Production
     ↓                ↓               ↓
 Auto Deploy    ojo-staging     ojo.vercel.app
                 .vercel.app
```

**Recommended flow:**
1. Develop on feature branch
2. Merge to `staging` via PR
3. Test on staging environment
4. Merge to `main` via PR
5. Auto-deploys to production

### Environment-Specific Commands

```bash
# Run locally with staging env
cp .env.staging .env.local
npm run dev

# Run locally with production env (careful!)
cp .env.production .env.local
npm run dev

# Build for specific environment
npm run build
```

### Database Sync (Optional)

To copy data from production to staging for testing:

```sql
-- Export from production (Supabase SQL Editor)
-- Use pg_dump or Supabase's backup feature

-- Or selectively copy test data:
-- Export users (anonymize sensitive data first!)
SELECT nullifier_hash, first_name, country, created_at
FROM users
WHERE created_at > NOW() - INTERVAL '7 days';
```

**Note:** Never copy real user data to staging without anonymization.

### Environment Checklist

**Staging:**
- [ ] Supabase `ojo-staging` project created
- [ ] Storage buckets configured
- [ ] World ID staging app created
- [ ] Vercel preview environment configured
- [ ] `.env.staging` values set in Vercel
- [ ] `staging` branch created and deployed

**Production:**
- [ ] Supabase `ojo-prod` project created
- [ ] Storage buckets configured
- [ ] World ID production app created
- [ ] Vercel production environment configured
- [ ] `.env.production` values set in Vercel
- [ ] Custom domain configured (optional)

---

## Troubleshooting

### "Failed to upload image"

- Check storage bucket permissions
- Verify bucket names are exactly `avatars` and `photos`

### "Verification failed"

- Check World ID App ID is correct
- Ensure app is configured for Orb verification

### Database errors

- Run schema.sql again
- Check RLS policies are applied

## Quick Commands

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Schema Extraction Queries

If migrating from an existing Supabase project, run these to extract the schema:

```sql
-- Get all table definitions
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Get all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public';

-- Get all foreign keys
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';

-- Get all indexes
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public';
```

## Verification Checklist

- [ ] Supabase project created
- [ ] Storage buckets created: `avatars`, `photos`
- [ ] All 12 tables created successfully
- [ ] Realtime enabled for messages and connections
- [ ] Vercel project deployed successfully
- [ ] Environment variables configured in Vercel
- [ ] App loads at Vercel URL
- [ ] World ID verification works
- [ ] Can create new user (onboarding)
- [ ] Can upload post (storage works)

## Quick Reference Links

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard
- **World ID Developer Portal:** https://developer.worldcoin.org
