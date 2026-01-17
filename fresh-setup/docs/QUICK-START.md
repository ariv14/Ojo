# Ojo Quick Start

Get Ojo running in under 10 minutes.

---

## Prerequisites

- Node.js 18+ installed
- Supabase account
- Vercel account
- World ID app created

---

## Step 1: Supabase (3 minutes)

1. **Create project** at [supabase.com/dashboard](https://supabase.com/dashboard)
   - Name: `ojo`
   - Save the database password

2. **Create storage buckets**
   - Storage → New Bucket → `avatars` (Public)
   - Storage → New Bucket → `photos` (Public)

3. **Run SQL scripts** (SQL Editor → New Query)
   ```
   Run: database/01-schema.sql
   Run: database/02-policies.sql
   Run: database/03-storage.sql
   ```

4. **Copy API keys** (Settings → API)
   - Project URL
   - anon public key

---

## Step 2: Environment (1 minute)

```bash
# From project root
cp fresh-setup/env-templates/.env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_APP_ID=app_xxxxx
NEXT_PUBLIC_OWNER_WALLET=0x...
NEXT_PUBLIC_ADMIN_ID=
```

---

## Step 3: Local Test (2 minutes)

```bash
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000) - verify app loads.

---

## Step 4: Deploy to Vercel (3 minutes)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Add environment variables (same as `.env.local`)
4. Click Deploy

---

## Step 5: Set Admin (1 minute)

1. Open your deployed app
2. Verify with World ID
3. Open DevTools Console, run:
   ```javascript
   JSON.parse(localStorage.getItem('ojo_user')).nullifier_hash
   ```
4. Copy the hash
5. Add to Vercel: `NEXT_PUBLIC_ADMIN_ID` = your hash
6. Redeploy

---

## Done!

Your Ojo instance is live.

### Verify checklist:
- [ ] App loads
- [ ] World ID verification works
- [ ] Can complete onboarding
- [ ] Can upload images
- [ ] Admin panel works at /admin

### Next steps:
- Read `FULL-GUIDE.md` for multi-environment setup
- Read `TROUBLESHOOTING.md` if issues arise
- Configure custom domain in Vercel

---

## Quick Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
```

## Quick Links

- Supabase: https://supabase.com/dashboard
- Vercel: https://vercel.com/dashboard
- World ID: https://developer.worldcoin.org
