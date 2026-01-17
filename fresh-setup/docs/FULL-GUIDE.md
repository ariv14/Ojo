# Ojo Complete Setup Guide

This guide walks through setting up Ojo from scratch, including all infrastructure components.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [World ID Setup](#world-id-setup)
4. [Local Development](#local-development)
5. [Vercel Deployment](#vercel-deployment)
6. [Multi-Environment Setup](#multi-environment-setup)
7. [Post-Deployment](#post-deployment)

---

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **Supabase Account** - [Sign up](https://supabase.com/)
- **Vercel Account** - [Sign up](https://vercel.com/)
- **Worldcoin Developer Account** - [Sign up](https://developer.worldcoin.org/)
- **WLD Wallet** - For receiving payments

---

## Supabase Setup

### Step 1: Create Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in details:
   - **Name:** `ojo` (or `__APP_NAME_LOWER__-staging`, `__APP_NAME_LOWER__-prod`)
   - **Database Password:** Generate and save securely
   - **Region:** Choose closest to your users
4. Click **"Create new project"**
5. Wait for project to provision (~2 minutes)

### Step 2: Create Storage Buckets

1. Go to **Storage** in sidebar
2. Click **"New Bucket"**
3. Create first bucket:
   - **Name:** `avatars`
   - **Public:** ON (toggle enabled)
   - Click **"Create bucket"**
4. Create second bucket:
   - **Name:** `photos`
   - **Public:** ON
   - Click **"Create bucket"**

### Step 3: Run Database Schema

1. Go to **SQL Editor** in sidebar
2. Click **"New Query"**
3. Copy contents of `database/01-schema.sql`
4. Click **"Run"** (or Cmd+Enter)
5. Verify: "Success. No rows returned"
6. Repeat for:
   - `database/02-policies.sql`
   - `database/03-storage.sql`

### Step 4: Verify Setup

**Check Tables:**
1. Go to **Table Editor** in sidebar
2. Verify 12 tables exist:
   - users, posts, connections, messages
   - post_votes, tips, post_access, relationships
   - profile_views, reports, support_tickets, transactions

**Check Storage:**
1. Go to **Storage**
2. Click each bucket → **Policies**
3. Verify 4 policies per bucket

**Check Realtime:**
1. Go to **Database** → **Replication**
2. Verify `messages` and `connections` are enabled

### Step 5: Get API Keys

1. Go to **Settings** → **API**
2. Copy and save:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## World ID Setup

### Step 1: Create App

1. Go to [Worldcoin Developer Portal](https://developer.worldcoin.org/)
2. Click **"Create App"**
3. Fill in details:
   - **Name:** `Ojo` (or `Ojo Staging`)
   - **Description:** Social network for verified humans using World ID
4. Save the **App ID** → `NEXT_PUBLIC_APP_ID`

### Step 2: Configure Verification

1. In your app settings, find **Actions**
2. Create action for verification:
   - **Action name:** `verify-human`
   - **Verification level:** Orb only
3. Save configuration

### Step 3: Set Redirect URLs (if needed)

For web-based verification flows:
1. Add your domain to allowed origins
2. Configure callback URLs

---

## Local Development

### Step 1: Clone Repository

```bash
git clone https://github.com/your-username/__APP_NAME_LOWER__.git
cd ojo
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

```bash
# Copy template
cp fresh-setup/env-templates/.env.example .env.local

# Edit with your values
nano .env.local  # or use your preferred editor
```

Fill in all values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_APP_ID=app_xxxxx
NEXT_PUBLIC_OWNER_WALLET=0x...
NEXT_PUBLIC_ADMIN_ID=  # Leave empty initially
```

### Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Step 5: Test Basic Functionality

1. App should load without errors
2. World ID verification prompt should work
3. After verifying, onboarding should appear

---

## Vercel Deployment

### Step 1: Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import from GitHub
4. Select the Ojo repository

### Step 2: Configure Build Settings

Vercel should auto-detect Next.js. Verify:
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

### Step 3: Add Environment Variables

1. Expand **"Environment Variables"** section
2. Add each variable:

| Name | Value | Environments |
|------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | All |
| `NEXT_PUBLIC_APP_ID` | Your World ID app | All |
| `NEXT_PUBLIC_OWNER_WALLET` | Your wallet | All |
| `NEXT_PUBLIC_ADMIN_ID` | Your nullifier | All |

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for build to complete
3. Your app is live at `https://__APP_NAME_LOWER__.vercel.app`

### Step 5: Configure Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

---

## Multi-Environment Setup

For professional deployments, use separate environments.

### Environment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ENVIRONMENTS                          │
├─────────────┬─────────────────┬─────────────────────────┤
│ Development │    Staging      │      Production         │
├─────────────┼─────────────────┼─────────────────────────┤
│ localhost   │ staging.vercel  │   __APP_NAME_LOWER__.vercel.app       │
│ __APP_NAME_LOWER__-dev DB │ __APP_NAME_LOWER__-staging DB │ __APP_NAME_LOWER__-prod DB │
│ Test wallet │ Staging wallet  │   Production wallet     │
│ Dev World ID│ Staging World ID│   Prod World ID         │
└─────────────┴─────────────────┴─────────────────────────┘
```

### Create Multiple Supabase Projects

1. **__APP_NAME_LOWER__-staging** - For QA testing
2. **__APP_NAME_LOWER__-prod** - For live users

Run all SQL files in each project.

### Create Multiple World ID Apps

1. **Ojo Staging** - Less strict, for testing
2. **Ojo** - Production app

### Configure Vercel Environments

1. Go to Project **Settings** → **Environment Variables**
2. For each variable, click **"Edit"**
3. Set different values per environment:
   - **Production** - prod values
   - **Preview** - staging values
   - **Development** - dev values

### Git Branch Strategy

```bash
# Main branches
main      → Production
staging   → Staging/Preview

# Feature branches
feature/* → Preview deployments

# Workflow
git checkout staging
git checkout -b feature/new-feature
# ... develop ...
git push origin feature/new-feature
# Create PR to staging
# Test on staging
# Create PR to main
# Deploy to production
```

---

## Post-Deployment

### Set Admin User

1. Log in to your deployed app with World ID
2. Open browser DevTools → Console
3. Run: `localStorage.getItem('ojo_user')`
4. Copy your `nullifier_hash`
5. Add to `NEXT_PUBLIC_ADMIN_ID` in Vercel
6. Redeploy

### Verify Everything Works

- [ ] App loads without errors
- [ ] World ID verification works
- [ ] Onboarding completes successfully
- [ ] Can upload avatar image
- [ ] Can create post with image
- [ ] Can vote on posts
- [ ] Can view profiles
- [ ] Admin panel accessible (if admin)

### Set Up Monitoring

1. **Vercel Analytics** - Enable in project settings
2. **Supabase Logs** - Check Database → Logs
3. **Error Tracking** - Consider Sentry integration

### Regular Maintenance

- Monitor Supabase usage/quotas
- Review error logs weekly
- Backup database regularly
- Update dependencies monthly

---

## Quick Reference

### Important URLs

| Service | URL |
|---------|-----|
| Supabase Dashboard | https://supabase.com/dashboard |
| Vercel Dashboard | https://vercel.com/dashboard |
| World ID Portal | https://developer.worldcoin.org |

### File Locations

| File | Purpose |
|------|---------|
| `fresh-setup/database/*.sql` | Database setup scripts |
| `fresh-setup/env-templates/*` | Environment templates |
| `.env.local` | Local environment (don't commit) |
| `src/lib/supabase.ts` | Supabase client config |
| `src/lib/session.ts` | Session management |

### Support

- **GitHub Issues:** Report bugs and feature requests
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **World ID Docs:** https://docs.world.org
