# Ojo Fresh Setup

Everything you need to deploy a new Ojo instance from scratch.

**Keep an eye on what is real**

---

## Quick Start

```bash
# 1. Configure your brand
nano brand.config.json

# 2. Run rebrand script
./rebrand.sh

# 3. Follow setup guide
cat docs/QUICK-START.md
```

---

## What's Included

```
fresh-setup/
├── README.md                    # This file
├── brand.config.json           # Brand configuration
├── rebrand.sh                  # Auto-rebrand script
├── database/
│   ├── 00-extract-schema.sql   # Backup queries for existing DB
│   ├── 01-schema.sql           # 12 tables + indexes + realtime
│   ├── 02-policies.sql         # Row Level Security policies
│   ├── 03-storage.sql          # Storage bucket policies
│   └── 04-seed-data.sql        # Optional test data
├── docs/
│   ├── QUICK-START.md          # 10-minute setup guide
│   ├── FULL-GUIDE.md           # Complete step-by-step docs
│   ├── TROUBLESHOOTING.md      # Common issues & solutions
│   └── REBRANDING.md           # How to customize for your app
└── env-templates/
    ├── .env.example            # Annotated template
    ├── .env.development        # Local dev settings
    ├── .env.staging            # Staging environment
    └── .env.production         # Production environment
```

---

## Rebranding

This template is fully rebrandable. To create your own World ID social app:

### 1. Edit Configuration

Update `brand.config.json` with your app details:

```json
{
  "app": {
    "name": "YourApp",
    "name_lowercase": "yourapp",
    "tagline": "Your tagline here"
  },
  "session": {
    "storage_key": "yourapp_user"
  }
}
```

### 2. Run Rebrand Script

```bash
# Requires jq: brew install jq (macOS) or apt install jq (Linux)
./rebrand.sh
```

### 3. Continue with Setup

All files are now branded for your app. Follow `docs/QUICK-START.md`.

See `docs/REBRANDING.md` for detailed customization guide.

---

## Setup Steps

### 1. Create Supabase Project

```
1. Go to supabase.com/dashboard → New Project
2. Name it "ojo"
3. Save the database password
```

### 2. Create Storage Buckets

```
Storage → New Bucket:
  - "avatars" (Public)
  - "photos" (Public)
```

### 3. Run Database Scripts

In SQL Editor, run in order:
```sql
-- Copy and run each file:
database/01-schema.sql    -- Creates tables
database/02-policies.sql  -- Enables RLS
database/03-storage.sql   -- Storage policies
```

### 4. Configure Environment

```bash
cp env-templates/.env.example .env.local
# Edit .env.local with your values
```

### 5. Deploy

```bash
npm install
npm run build
# Push to GitHub → Vercel auto-deploys
```

---

## Environment Setup

### Single Environment (Simple)

Use `.env.example` → copy to `.env.local`

### Multi-Environment (Recommended)

| Environment | Supabase Project | Git Branch | Vercel |
|------------|------------------|------------|--------|
| Development | __APP_NAME_LOWER__-dev | - | localhost |
| Staging | __APP_NAME_LOWER__-staging | staging | Preview |
| Production | __APP_NAME_LOWER__-prod | main | Production |

Create separate Supabase projects and World ID apps for each.

---

## Database Schema Overview

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User profiles | nullifier_hash (PK), wallet_address |
| `posts` | User posts | user_id, image_url, is_premium |
| `connections` | Chat connections | initiator_id, receiver_id, status |
| `messages` | Chat messages | connection_id, sender_id, content |
| `post_votes` | Upvotes/downvotes | post_id, user_id, vote_type |
| `tips` | WLD tips | from_user_id, to_user_id, amount |
| `post_access` | Premium unlocks | post_id, user_id, amount |
| `relationships` | Follow/block | follower_id, target_id, type |
| `profile_views` | View tracking | viewer_id, profile_id |
| `reports` | User reports | reporter_id, target_id, reason |
| `support_tickets` | Support requests | user_id, subject, message |
| `transactions` | Payment records | sender_id, type, amount |

---

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `eyJhbGci...` |
| `NEXT_PUBLIC_APP_ID` | World ID app ID | `app_xxx` |
| `NEXT_PUBLIC_OWNER_WALLET` | Platform wallet | `0x...` |
| `NEXT_PUBLIC_ADMIN_ID` | Admin nullifier hash | `0x...` |

---

## Verification Checklist

After setup, verify:

- [ ] All 12 tables created in Supabase
- [ ] Storage buckets `avatars` and `photos` exist
- [ ] RLS enabled on all tables
- [ ] Realtime enabled for `messages` and `connections`
- [ ] Environment variables set correctly
- [ ] App builds without errors (`npm run build`)
- [ ] World ID verification works
- [ ] Image uploads work
- [ ] Admin panel accessible at /admin

---

## Documentation

| Guide | When to Use |
|-------|-------------|
| [QUICK-START.md](docs/QUICK-START.md) | First-time setup, just want it running |
| [FULL-GUIDE.md](docs/FULL-GUIDE.md) | Detailed setup, multi-environment |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Something isn't working |
| [REBRANDING.md](docs/REBRANDING.md) | Customizing for your own app |

---

## Support

- **Issues:** Check TROUBLESHOOTING.md first
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **World ID Docs:** https://docs.world.org/mini-apps
