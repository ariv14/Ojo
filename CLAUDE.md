# CLAUDE.md - Project Context for AI Assistants

This file provides context for Claude and other AI assistants working on the Ojo project.

## Project Overview

**Ojo** is a social network for verified humans using World ID. The app ensures every user is a unique, Orb-verified human - eliminating bots and fake accounts.

- **Tagline:** "Keep an eye on what is real"
- **Platform:** World App Mini App
- **Authentication:** World ID (Orb verification only)
- **Payments:** WLD token

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage (avatars, single photos), Cloudflare R2 (albums, reels) |
| Realtime | Supabase Realtime |
| Auth | World ID via MiniKit |
| Payments | WLD via MiniKit Pay |

## Key Architecture Decisions

### Session Management
- Sessions are stored in `localStorage` under key `ojo_user`
- Session contains: `nullifier_hash`, `first_name`, `last_name`, `country`, `avatar_url`
- No server-side sessions - all auth is client-side via World ID verification

### User Identity
- `nullifier_hash` is the primary user identifier (from World ID)
- Same person re-verifying gets the same `nullifier_hash`
- This enables "fresh onboarding" after account deletion

### Database Patterns
- All foreign keys use `ON DELETE CASCADE` (see `fix_ojo.sql`)
- User deletion cascades to all related data automatically
- Storage cleanup (images) must be done manually before DB deletion

### Payment Flow
- All payments go through MiniKit Pay
- Premium unlocks: 1.0 WLD (80% creator, 20% platform)
- Tips: 0.5 WLD (100% to creator)
- Boosts: 5 WLD (100% to platform)
- Invisible mode: 5 WLD for 30 days

## Important Files

| File | Purpose |
|------|---------|
| `src/lib/session.ts` | Session management (get/set/clear) |
| `src/lib/supabase.ts` | Supabase client configuration |
| `src/lib/wallet.ts` | Wallet connection helper |
| `src/app/api/verify/route.ts` | World ID verification endpoint |
| `src/app/feed/page.tsx` | Main feed (largest file, ~1100 lines) |
| `fix_ojo.sql` | Database migration for cascade deletes |

## Coding Conventions

### Components
- Use `'use client'` directive for client components
- Prefer functional components with hooks
- Keep modals in the same file as their parent or in `/components`

### Styling
- Use Tailwind CSS classes exclusively
- Glassmorphism pattern: `bg-white/80 backdrop-blur-md`
- Max width for feed: `max-w-md`
- Rounded corners: `rounded-lg` for inputs, `rounded-2xl` for modals

### State Management
- Use React `useState` for local state
- No global state library - pass props or use URL params
- Optimistic updates for votes, follows, etc.

### Error Handling
- Log errors with `console.error`
- Show user-friendly error messages in UI
- Don't expose technical details to users

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anonymous key
NEXT_PUBLIC_APP_ID=              # World ID App ID
NEXT_PUBLIC_OWNER_WALLET=        # Platform owner's WLD wallet
NEXT_PUBLIC_ADMIN_ID=            # Admin user's nullifier_hash

# Cloudflare R2 (for albums and reels media storage)
R2_BUCKET=                       # R2 bucket name (e.g., ojo-media)
R2_ENDPOINT=                     # R2 endpoint URL
NEXT_PUBLIC_R2_PUBLIC_URL=       # Public URL for R2 assets (must be NEXT_PUBLIC for client)
R2_ACCESS_KEY_ID=                # R2 API access key ID
R2_SECRET_ACCESS_KEY=            # R2 API secret access key
```

## Common Tasks

### Adding a New Feature
1. Update the relevant page in `src/app/`
2. Add any new components to `src/components/`
3. Update database schema if needed (and `fix_ojo.sql` for cascades)
4. Update README.md changelog
5. Run `npm run build` to verify

### Storage Cleanup Pattern
When deleting posts or users, always clean up storage first:
```typescript
// Extract filename from URL
const filename = imageUrl.split('/photos/')[1]?.split('?')[0]
if (filename) {
  await supabase.storage.from('photos').remove([filename])
}
```

### World ID Verification
```typescript
// Always use Orb verification level
const verifyRes = await MiniKit.commandsAsync.verify({
  action: 'your-action',
  verification_level: 'orb',
})
```

## Database Schema Quick Reference

### Primary Tables
- `users` - PK: `nullifier_hash`
- `posts` - PK: `id` (uuid), FK: `user_id`
- `connections` - PK: `id`, FKs: `initiator_id`, `receiver_id`
- `messages` - PK: `id`, FKs: `sender_id`, `connection_id`

### Junction Tables
- `post_votes` - `user_id` + `post_id`
- `post_access` - `user_id` + `post_id` (premium unlocks)
- `relationships` - `follower_id` + `target_id` + `type` (follow/block)
- `profile_views` - `viewer_id` + `profile_id`

## Documentation References

- **World ID Concepts**: `https://docs.world.org/world-id/concepts` (Use `verification_level: "orb"`)
- **NextAuth Patterns**: `https://github.com/worldcoin/world-id-nextauth-template` (Adapt security patterns)
- **MiniKit Documentation**: `https://docs.world.org/mini-apps`
- **Supabase Docs**: `https://supabase.com/docs`
- **Next.js App Router**: `https://nextjs.org/docs/app`

## Testing Checklist

Before committing changes, verify:
- [ ] `npm run build` passes
- [ ] All "Ojo" branding is consistent (not "OrbGram")
- [ ] Session key is `ojo_user`
- [ ] New features work on mobile (World App)
- [ ] Storage cleanup is implemented for any delete operations
- [ ] README.md is updated if features changed

## Git Workflow

- Main branch: `main`
- Commit messages: Descriptive, start with verb (Add, Fix, Update, Remove)
- Always run build before committing
- Update README.md changelog for significant changes
