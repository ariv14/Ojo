# Ojo

**Keep an eye on what is real.**

Ojo is a social network exclusively for verified humans, powered by [World ID](https://worldcoin.org/world-id). Every user is verified as a unique human, eliminating bots and fake accounts.

## Features

### Core Social Features
- **Photo Feed** - Share photos with captions, view posts from verified humans
- **Voting System** - Like/dislike posts to surface quality content
- **Follow System** - Follow users to see their posts prioritized in your feed
- **User Profiles** - Customizable profiles with avatar, name, country, age, and sex
- **Direct Messaging** - Chat with other verified users
- **Real-time Presence** - See when users are online with status indicators

### Monetization
- **Premium Posts** - Lock content behind a 1.0 WLD paywall (80% to creator, 20% platform fee)
- **Tipping** - Send 0.5 WLD tips to appreciate creators
- **Post Boosting** - Pay 5 WLD to boost your post to the top of the feed for 24 hours

### Privacy & Safety
- **Invisible Mode** - Browse profiles without being seen (5 WLD for 30 days)
- **Block Users** - Hide posts from users you don't want to see
- **Report System** - Report inappropriate posts or users
- **Disable Profile** - Temporarily hide your posts from the feed
- **Delete Account** - Permanently delete all your data

### Admin Features
- **Dashboard** - View platform statistics (users, posts, reports)
- **Report Management** - Review, dismiss, or action reports
- **User Moderation** - Ban users, hide/delete posts
- **Support Tickets** - Respond to user support requests
- **Factory Reset** - Complete platform data reset (danger zone)

## User Journey

```
1. Open App
   │
2. World ID Verification (Orb verified)
   │
   ├─► New User ──► Onboarding (name, country, avatar)
   │                    │
   │                    ▼
   │               Create Profile
   │                    │
   └─► Existing User ───┴──► Feed
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
                 Browse    Upload    Profile
                 Posts     Photo     Settings
                    │         │         │
                    ▼         ▼         ▼
              Vote/Tip    Caption   Edit/Delete
              Chat/Report Premium?   Account
```

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Authentication:** World ID via MiniKit
- **Payments:** WLD token via World App
- **Deployment:** Vercel (recommended)

## MiniKit Commands Used

Ojo leverages **8 distinct MiniKit commands** throughout the user journey:

### Authentication & Permissions
| Command | Purpose | Location |
|---------|---------|----------|
| `verify` | World ID Orb verification for login/signup | `LoginButton.tsx` |
| `requestPermission` | Request notification permissions after login | `LoginButton.tsx` |
| `walletAuth` | Connect wallet before any WLD payment | `lib/wallet.ts` |

### Payments (5 WLD payment flows)
| Command | Feature | Amount | Split |
|---------|---------|--------|-------|
| `pay` | Unlock premium post | 1.0 WLD | 80% creator, 20% platform |
| `pay` | Tip creator | 0.5 WLD | 80% creator, 20% platform |
| `pay` | Boost post (24h) | 5.0 WLD | 100% platform |
| `pay` | Invisible mode (30 days) | 5.0 WLD | 100% platform |

### Social & Sharing
| Command | Purpose | Location |
|---------|---------|----------|
| `share` | Share posts/profiles to external apps | `feed/page.tsx`, `profile/[id]/page.tsx` |
| `chat` | Share post link directly to World App chat | `feed/page.tsx` |
| `shareContacts` | Invite friends from contacts | `discover/page.tsx` |

### User Experience
| Command | Purpose | Location |
|---------|---------|----------|
| `sendHapticFeedback` | Tactile feedback for votes, payments, errors | `lib/haptics.ts` |

### Command Usage Summary
```
verify ─────────────► Login/Signup (Orb level verification)
     │
requestPermission ──► Enable push notifications
     │
walletAuth ─────────► Connect wallet (triggered before first payment)
     │
pay ────────────────► Premium unlocks, tips, boosts, invisible mode
     │
share ──────────────► Share content to other apps
     │
chat ───────────────► Share directly to World App conversations
     │
shareContacts ──────► Invite friends to join Ojo
     │
sendHapticFeedback ─► Tactile feedback throughout the app
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Root layout with metadata
│   ├── feed/page.tsx         # Main feed
│   ├── onboarding/page.tsx   # New user setup
│   ├── profile/
│   │   ├── [id]/page.tsx     # User profile view
│   │   ├── [id]/followers/   # Followers list
│   │   └── edit/page.tsx     # Edit profile
│   ├── chat/[id]/page.tsx    # Direct messages
│   ├── inbox/page.tsx        # Message inbox
│   ├── admin/page.tsx        # Admin dashboard
│   ├── support/page.tsx      # Support tickets
│   └── api/
│       ├── verify/route.ts   # World ID verification
│       ├── heartbeat/route.ts # Presence updates
│       └── admin/reset/      # Factory reset
├── components/
│   ├── LoginButton.tsx       # World ID login
│   ├── UploadPost.tsx        # Photo upload modal
│   ├── ChatButton.tsx        # Start chat button
│   ├── TipButton.tsx         # Send tip button
│   ├── ReportModal.tsx       # Report user/post
│   ├── ImageViewer.tsx       # Fullscreen image view
│   ├── UserAvatar.tsx        # Avatar with presence
│   └── MiniKitProvider.tsx   # World App provider
├── lib/
│   ├── supabase.ts           # Supabase client
│   ├── session.ts            # Local session management
│   └── wallet.ts             # Wallet connection helper
└── utils/
    └── compress.ts           # Image compression
```

## Database Schema

### Tables
- `users` - User profiles (nullifier_hash as PK)
- `posts` - Photo posts with captions
- `post_votes` - Like/dislike votes
- `post_access` - Premium content unlocks
- `relationships` - Follow/block relationships
- `profile_views` - Who viewed your profile
- `tips` - Tip transactions
- `connections` - Chat connections
- `messages` - Direct messages
- `reports` - User/post reports
- `support_tickets` - Support requests

### Cascade Deletes
Run `fix_ojo.sql` in Supabase SQL Editor to enable cascade deletes - when a user is deleted, all their related data is automatically cleaned up.

## Environment Variables

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_ID=your_worldcoin_app_id
NEXT_PUBLIC_OWNER_WALLET=your_wld_wallet_address
NEXT_PUBLIC_ADMIN_ID=your_nullifier_hash_for_admin
```

## Getting Started

1. **Clone the repository**
   ```bash
   git clone git@github.com:ariv14/Ojo.git
   cd Ojo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the database migrations
   - Run `fix_ojo.sql` for cascade deletes
   - Create storage buckets: `avatars`, `photos`

4. **Configure environment**
   - Copy `.env.local.example` to `.env.local`
   - Fill in your credentials

5. **Run development server**
   ```bash
   npm run dev
   ```

6. **Build for production**
   ```bash
   npm run build
   ```

## Changelog

### v1.2.0 - Albums, Reels & R2 Migration
- Added albums support (upload 2-10 images per post)
- Added reels support (10-second video posts with thumbnails)
- Migrated media storage from AWS S3 to Cloudflare R2
- Added referral system with invite tracking and bonus rewards
- Added realtime notifications for new posts in feed
- New database: `referrals` table, `media_type` enum, `get_referral_stats` function

### v1.1.0 - MiniKit Integration
- Added animated gradient headers across all pages
- Documented all 8 MiniKit commands used in the app
- Added haptic feedback throughout the user experience
- Integrated shareContacts for friend invitations
- Added chat command for direct World App sharing

### v1.0.0 - Ojo Launch
- Rebranded from OrbGram to Ojo
- Added glassmorphism UI (frosted glass headers and modals)
- Constrained feed width for better tablet/desktop experience
- Added CASCADE DELETE for all foreign keys
- Implemented storage cleanup on post/profile deletion
- Added PWA manifest for mobile home screen

---

Built with World ID for a human-only social experience.
