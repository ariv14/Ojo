# Ojo - World App Mini Apps Submission

## App Name
**Ojo**

## Tagline
Keep an eye on what is real

## Short Description (Under 80 characters)
A human-verified social network for Orb-verified World ID users only.

## Full Description

Ojo is the first social network where every user is guaranteed to be a real, unique human. By requiring Orb-level World ID verification, Ojo eliminates bots, fake accounts, and spam—creating an authentic social experience.

### What Makes Ojo Different

Unlike traditional social networks plagued by bots and fake accounts, Ojo leverages World ID's Orb verification to ensure every user is a verified human. Your World App profile data automatically creates your Ojo profile—no tedious onboarding required.

### Key Features

**Content Creation**
- Share single photos, photo albums (2-10 images), or 10-second video reels
- Add captions to express yourself
- Reshare posts from creators you love

**Social Engagement**
- Follow users and build your community
- Real-time direct messaging with read receipts
- Nested comment threads on posts
- Like/dislike voting to surface quality content

**Creator Economy (WLD Payments)**
- **Premium Posts** (1.0 WLD) - Lock exclusive content behind a paywall; creators earn 80%
- **Tips** (0.5 WLD) - Show appreciation to creators you love; creators earn 80%
- **Boost Posts** (5.0 WLD) - Promote your posts to the top of the feed for 24 hours
- **Referral Program** - Invite friends and earn WLD bonuses

**Privacy & Safety**
- **Invisible Mode** (5.0 WLD) - Browse profiles anonymously for 30 days
- Block users to hide their content
- Report inappropriate posts or users
- Delete your account anytime with full data removal

**Discovery**
- Find and follow new humans in the Discover tab
- Search users by username
- See who viewed your profile

### MiniKit Integration

Ojo uses 8 MiniKit commands for a native World App experience:
- World ID verification (Orb level)
- Wallet authentication for payments
- WLD payments for tips, premium unlocks, and boosts
- Share posts to external apps or World App chat
- Push notifications for tips, messages, and updates
- Haptic feedback for interactions

### How Sign-In Works

When users sign in with World ID, Ojo automatically creates their profile using their World App data:
- Username synced from World App profile
- Avatar synced from World App profile
- Wallet address connected for payments

No manual profile setup required—users go straight to their feed after verification.

## Category
Social

## Screenshots Needed
1. Main feed showing posts with vote counts
2. Profile page with follower count and posts
3. Direct messaging conversation
4. Premium post unlock flow with WLD payment
5. Discover page for finding new users

## URLs

| Page | URL |
|------|-----|
| Privacy Policy | https://your-domain.com/privacy |
| Terms of Service | https://your-domain.com/terms |
| Support | https://your-domain.com/support |

**Note:** Replace `your-domain.com` with the actual deployed domain.

## Support Contact
In-app support ticket system at `/support`

---

## Technical Details for Review

**Verification Level:** Orb only (highest security)

**Permissions Requested:**
- Push notifications (optional, for tips/messages)
- Wallet access (for WLD payments)

**Data Storage:**
- User profiles stored in Supabase (PostgreSQL)
- Media stored in Cloudflare R2 (albums, reels) and Supabase Storage (avatars, photos)
- No third-party analytics or tracking

**Payment Flows:**
| Feature | Cost | Creator Share | Platform Share |
|---------|------|---------------|----------------|
| Premium unlock | 1.0 WLD | 80% | 20% |
| Tips | 0.5 WLD | 80% | 20% |
| Post boost | 5.0 WLD | 0% | 100% |
| Invisible mode | 5.0 WLD | N/A | 100% |

---

## Changelog Since Last Submission

- **Profile Auto-Creation**: Users now automatically get their profile created using World App sign-in data (username, avatar, wallet address)
- **No Manual Onboarding**: Removed separate onboarding flow—users go directly to feed after World ID verification
- **Privacy Policy & Terms**: Updated to reflect World App profile data sync
