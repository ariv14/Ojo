# Ojo Complete User Journey

> "Keep an eye on what is real" - A social network for verified humans

## Analogy: A Members-Only Club

Think of Ojo like an exclusive members-only club:
- **Bouncer** (World ID Orb) scans your iris to prove you're human
- **Membership card** (session) lets you move freely inside
- **Bulletin board** (feed) for posting photos and interactions
- **Tip jar** (WLD payments) for supporting creators
- **VIP lounge** (premium features) costs extra
- **Club manager** (admin) handles reports and support
- **Help desk** (support) resolves user issues

---

## Master Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OJO PLATFORM                                    │
│                       "Keep an eye on what is real"                         │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │  USER OPENS  │
                              │   WORLD APP  │
                              └──────┬───────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │        SESSION CHECK           │
                    │   localStorage.get('ojo_user') │
                    └───────────────┬────────────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 │                                     │
                 ▼                                     ▼
      ┌─────────────────┐                   ┌─────────────────┐
      │   NO SESSION    │                   │  HAS SESSION    │
      └────────┬────────┘                   └────────┬────────┘
               │                                     │
               ▼                                     │
  ┌──────────────────────────┐                       │
  │  WORLD ID VERIFICATION   │                       │
  │  ┌────────────────────┐  │                       │
  │  │   ORB SCAN         │  │                       │
  │  │   (Biometric)      │  │                       │
  │  └────────────────────┘  │                       │
  └────────────┬─────────────┘                       │
               │                                     │
    ┌──────────┴──────────┐                          │
    │                     │                          │
    ▼                     ▼                          │
┌─────────┐         ┌─────────┐                      │
│   NEW   │         │EXISTING │                      │
│  USER   │         │  USER   │                      │
└────┬────┘         └────┬────┘                      │
     │                   │                           │
     ▼                   └───────────┬───────────────┘
┌─────────────────┐                  │
│   ONBOARDING    │                  │
│  • First Name   │                  │
│  • Last Name    │                  │
│  • Country      │                  │
│  • Avatar       │                  │
└────────┬────────┘                  │
         │                           │
         └─────────────┬─────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MAIN FEED                                       │
│                                                                              │
│   SORTING: 1) Boosted  2) Followed users  3) Recent                         │
│                                                                              │
│   ┌─ POST ──────────────────────────────────────────┐                       │
│   │  [Avatar] @username                             │                       │
│   │  ┌─────────────────────────────────────────┐    │                       │
│   │  │              IMAGE                      │    │                       │
│   │  └─────────────────────────────────────────┘    │                       │
│   │  Caption text...                                │                       │
│   │  [Like] [Dislike] [Tip] [Chat] [Report]         │                       │
│   └─────────────────────────────────────────────────┘                       │
│                                                                              │
│   [Upload Photo]  [Boost Post]  [Unlock Premium]                            │
└─────────────────────────────────────────────────────────────────────────────┘
                       │
     ┌─────────────────┼─────────────────┬─────────────────┐
     │                 │                 │                 │
     ▼                 ▼                 ▼                 ▼
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│ PROFILE │      │  INBOX  │      │ SUPPORT │      │  ADMIN  │
│         │      │         │      │         │      │(if auth)│
└────┬────┘      └────┬────┘      └────┬────┘      └────┬────┘
     │                │                │                │
     ▼                ▼                ▼                ▼
┌─────────────┐ ┌──────────┐  ┌────────────┐  ┌─────────────┐
│• View users │ │• Chat    │  │• Tickets   │  │• Dashboard  │
│• Follow     │ │• Block   │  │• Reports   │  │• Moderation │
│• Edit own   │ │• Real-   │  │• Get help  │  │• Reports    │
│• Delete acct│ │  time    │  │            │  │• Tickets    │
└─────────────┘ └──────────┘  └────────────┘  └─────────────┘
```

---

## 1. Authentication & Onboarding

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                                  │
│                                                                              │
│    /page.tsx                    /api/verify/route.ts                        │
│         │                              │                                    │
│         ▼                              │                                    │
│   ┌───────────┐    Orb Scan     ┌─────────────┐    Verify     ┌─────────┐  │
│   │  Landing  │ ──────────────▶ │   MiniKit   │ ────────────▶ │ World   │  │
│   │   Page    │                 │   Verify    │               │ ID API  │  │
│   └───────────┘                 └──────┬──────┘               └────┬────┘  │
│                                        │                           │       │
│                                        │◀──────────────────────────┘       │
│                                        │  Returns: nullifier_hash          │
│                                        │                                    │
│                          ┌─────────────┴─────────────┐                      │
│                          │                           │                      │
│                          ▼                           ▼                      │
│                   ┌─────────────┐            ┌─────────────┐                │
│                   │  NEW USER   │            │  EXISTING   │                │
│                   │             │            │    USER     │                │
│                   └──────┬──────┘            └──────┬──────┘                │
│                          │                          │                       │
│                          ▼                          │                       │
│                   /onboarding/page.tsx              │                       │
│                   ┌─────────────┐                   │                       │
│                   │• First name │                   │                       │
│                   │• Last name  │                   │                       │
│                   │• Country    │                   │                       │
│                   │• Avatar     │                   │                       │
│                   └──────┬──────┘                   │                       │
│                          │                          │                       │
│                          └────────────┬─────────────┘                       │
│                                       │                                     │
│                                       ▼                                     │
│                              /lib/session.ts                                │
│                          ┌─────────────────────┐                            │
│                          │  Store in localStorage:                          │
│                          │  • nullifier_hash   │                            │
│                          │  • first_name       │                            │
│                          │  • last_name        │                            │
│                          │  • country          │                            │
│                          │  • avatar_url       │                            │
│                          └──────────┬──────────┘                            │
│                                     │                                       │
│                                     ▼                                       │
│                              Redirect to /feed                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Feed & Post Interactions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FEED PAGE                                       │
│                          /feed/page.tsx                                      │
│                                                                              │
│   LOAD POSTS                           SORT ORDER                           │
│   ──────────                           ──────────                           │
│   ┌─────────────────┐                  1. Boosted (24h active)              │
│   │ Fetch from DB   │                  2. Followed users                    │
│   │ • Filter banned │                  3. All others (newest first)         │
│   │ • Filter blocked│                                                       │
│   │ • Paginate (10) │                                                       │
│   └─────────────────┘                                                       │
│                                                                              │
│   POST INTERACTIONS                                                         │
│   ─────────────────                                                         │
│                                                                              │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│   │   VOTE   │  │   TIP    │  │   CHAT   │  │  REPORT  │  │  UNLOCK  │     │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
│        │             │             │             │             │            │
│        ▼             ▼             ▼             ▼             ▼            │
│   ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌───────────┐      │
│   │Like/    │  │ 0.5 WLD  │  │ Create  │  │ Report   │  │  1.0 WLD  │      │
│   │Dislike  │  │ 80% →    │  │ connec- │  │ Modal    │  │  80% →    │      │
│   │Optimis- │  │ creator  │  │ tion    │  │ filed    │  │  creator  │      │
│   │tic UI   │  │ 20% →    │  │         │  │          │  │  20% →    │      │
│   │         │  │ platform │  │         │  │          │  │  platform │      │
│   └─────────┘  └──────────┘  └─────────┘  └──────────┘  └───────────┘      │
│                                                                              │
│   OWN POST ACTIONS                                                          │
│   ────────────────                                                          │
│                                                                              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│   │  EDIT POST   │  │ DELETE POST  │  │  BOOST POST  │                      │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                      │
│          │                 │                 │                               │
│          ▼                 ▼                 ▼                               │
│   ┌─────────────┐  ┌─────────────────┐  ┌──────────────┐                    │
│   │Update       │  │1. Delete image  │  │ 5 WLD →      │                    │
│   │caption      │  │   from storage  │  │ platform     │                    │
│   │             │  │2. Delete DB row │  │ Top of feed  │                    │
│   │             │  │   (cascades)    │  │ for 24 hours │                    │
│   └─────────────┘  └─────────────────┘  └──────────────┘                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Profile & Account Management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PROFILE SYSTEM                                     │
│                                                                              │
│   VIEW PROFILE (/profile/[id]/page.tsx)                                     │
│   ────────────────────────────────────────                                  │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  ┌────────┐                                                          │   │
│   │  │ Avatar │  Name, Country, Age, Sex                                │   │
│   │  └────────┘  Followers: 123  |  Views: 456                          │   │
│   │                                                                      │   │
│   │  Recent Visitors:  [av1] [av2] [av3] [av4] [av5]                    │   │
│   │                                                                      │   │
│   │  ┌───────┐ ┌───────┐ ┌───────┐                                      │   │
│   │  │ Post  │ │ Post  │ │ Post  │  ...                                 │   │
│   │  └───────┘ └───────┘ └───────┘                                      │   │
│   │                                                                      │   │
│   │  [Follow/Unfollow]  [Send Chat]  [Report]                           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Profile view tracked unless viewer has INVISIBLE MODE active              │
│                                                                              │
│   ───────────────────────────────────────────────────────────────────────   │
│                                                                              │
│   EDIT PROFILE (/profile/edit/page.tsx)                                     │
│   ────────────────────────────────────────                                  │
│                                                                              │
│   ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐       │
│   │   EDIT DETAILS    │  │  DISABLE PROFILE  │  │  INVISIBLE MODE   │       │
│   │                   │  │                   │  │                   │       │
│   │ • Name            │  │  Hide posts from  │  │  5 WLD for 30     │       │
│   │ • Country         │  │  feed temporarily │  │  days - browse    │       │
│   │ • Avatar          │  │                   │  │  without being    │       │
│   │ • Age, Sex        │  │  Toggle on/off    │  │  tracked          │       │
│   └───────────────────┘  └───────────────────┘  └───────────────────┘       │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                       DELETE ACCOUNT                                 │   │
│   │                                                                      │   │
│   │   ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐              │   │
│   │   │Delete  │───▶│Delete  │───▶│Clear   │───▶│Delete  │              │   │
│   │   │post    │    │avatar  │    │local   │    │user    │              │   │
│   │   │images  │    │from    │    │storage │    │record  │              │   │
│   │   │        │    │storage │    │        │    │CASCADE │              │   │
│   │   └────────┘    └────────┘    └────────┘    └────────┘              │   │
│   │                                                                      │   │
│   │   Cascade deletes: posts, connections, messages, relationships,      │   │
│   │                    profile_views, reports, support_tickets           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Messaging System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MESSAGING SYSTEM                                   │
│                                                                              │
│   INBOX (/inbox/page.tsx)                CHAT (/chat/[id]/page.tsx)         │
│   ───────────────────────                ──────────────────────────         │
│                                                                              │
│   ┌─────────────────────┐                ┌─────────────────────────────┐    │
│   │  CONVERSATIONS      │                │  CHAT WITH @username        │    │
│   │                     │                │                             │    │
│   │  ┌───────────────┐  │                │  ┌───────────────────────┐  │    │
│   │  │ @user1        │──┼───────────────▶│  │ Their message         │  │    │
│   │  │ Last msg...   │  │                │  └───────────────────────┘  │    │
│   │  │ [unread: 2]   │  │                │         ┌───────────────┐   │    │
│   │  └───────────────┘  │                │         │ Your message  │   │    │
│   │  ┌───────────────┐  │                │         └───────────────┘   │    │
│   │  │ @user2        │  │                │                             │    │
│   │  │ Last msg...   │  │                │  ┌─────────────────────┐    │    │
│   │  └───────────────┘  │                │  │ Type message...     │    │    │
│   │                     │                │  └─────────────────────┘    │    │
│   │  Real-time updates  │                │  [Send]                     │    │
│   │  via Supabase       │                │                             │    │
│   └─────────────────────┘                │  Actions: Edit, Delete,     │    │
│                                          │           Block user        │    │
│                                          └─────────────────────────────┘    │
│                                                                              │
│   CONNECTION FLOW                                                           │
│   ───────────────                                                           │
│                                                                              │
│   User A                              User B                                │
│      │                                   │                                  │
│      │  Click "Chat" on feed/profile     │                                  │
│      │ ─────────────────────────────────▶│                                  │
│      │                                   │                                  │
│      │     Connection created            │                                  │
│      │     (bidirectional)               │                                  │
│      │◀─────────────────────────────────▶│                                  │
│      │                                   │                                  │
│      │     Real-time messages            │                                  │
│      │◀─────────────────────────────────▶│                                  │
│      │                                   │                                  │
│      │     Either can block              │                                  │
│      │     (independent action)          │                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Support System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPPORT SYSTEM                                     │
│                         /support/page.tsx                                    │
│                                                                              │
│   USER SIDE                                                                  │
│   ─────────                                                                  │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │  MY TICKETS                    │  TICKET DETAILS / NEW FORM          │  │
│   │  ─────────                     │  ────────────────────────           │  │
│   │  ┌────────────────────┐        │  Subject: _______________           │  │
│   │  │ #123 [open]        │───────▶│                                     │  │
│   │  │ Login issue        │        │  Description:                       │  │
│   │  └────────────────────┘        │  ┌─────────────────────────────┐   │  │
│   │  ┌────────────────────┐        │  │                             │   │  │
│   │  │ #122 [resolved]    │        │  └─────────────────────────────┘   │  │
│   │  │ Payment failed     │        │                                     │  │
│   │  └────────────────────┘        │  [Submit Ticket]                    │  │
│   │                                │                                     │  │
│   │  [+ New Ticket]                │                                     │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   TICKET LIFECYCLE                                                          │
│   ────────────────                                                          │
│                                                                              │
│   ┌────────┐    ┌─────────────┐    ┌──────────┐    ┌────────┐              │
│   │  OPEN  │───▶│ IN_PROGRESS │───▶│ RESOLVED │───▶│ CLOSED │              │
│   └────────┘    └─────────────┘    └──────────┘    └────────┘              │
│       │               │                  │                                  │
│    User waits     Admin working     Issue fixed                            │
│                                                                              │
│   ───────────────────────────────────────────────────────────────────────   │
│                                                                              │
│   REPORT SYSTEM (/components/ReportModal.tsx)                               │
│   ─────────────────────────────────────────────                             │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                        REPORT MODAL                                   │  │
│   │                                                                       │  │
│   │   Report Type:  ( ) Post   ( ) User                                  │  │
│   │                                                                       │  │
│   │   Reason:                                                             │  │
│   │   [ ] Spam                                                            │  │
│   │   [ ] Harassment                                                      │  │
│   │   [ ] Inappropriate content                                           │  │
│   │   [ ] Fake account                                                    │  │
│   │   [ ] Other                                                           │  │
│   │                                                                       │  │
│   │   Details: _______________________                                    │  │
│   │                                                                       │  │
│   │   [Cancel]                              [Submit Report]               │  │
│   │                                                                       │  │
│   │   Note: Cannot report own content (validation)                        │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│   CONVERSATION FLOW                                                         │
│   ─────────────────                                                         │
│                                                                              │
│   USER                                                    ADMIN             │
│     │                                                       │               │
│     │  1. Submit ticket                                     │               │
│     │ ─────────────────────────────────────────────────────▶│               │
│     │                                                       │               │
│     │                     2. Admin reviews, sets in_progress│               │
│     │◀───────────────────────────────────────────────────── │               │
│     │                                                       │               │
│     │  3. User adds more details                            │               │
│     │ ─────────────────────────────────────────────────────▶│               │
│     │                                                       │               │
│     │                     4. Admin responds, marks resolved │               │
│     │◀───────────────────────────────────────────────────── │               │
│     │                                                       │               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Admin Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ADMIN DASHBOARD                                    │
│                          /admin/page.tsx                                     │
│                                                                              │
│   ACCESS CONTROL                                                            │
│   ──────────────                                                            │
│                                                                              │
│   user.nullifier_hash === NEXT_PUBLIC_ADMIN_ID ?                            │
│           │                           │                                     │
│          YES                         NO                                     │
│           │                           │                                     │
│           ▼                           ▼                                     │
│   ┌─────────────┐            ┌─────────────────┐                            │
│   │ ADMIN PANEL │            │ ACCESS DENIED   │                            │
│   └─────────────┘            │ Redirect /feed  │                            │
│                              └─────────────────┘                            │
│                                                                              │
│   ───────────────────────────────────────────────────────────────────────   │
│                                                                              │
│   DASHBOARD STATS                                                           │
│   ───────────────                                                           │
│                                                                              │
│   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│   │Total Users │ │Active Users│ │Total Posts │ │Open Tickets│               │
│   │    152     │ │     89     │ │   1,247    │ │      7     │               │
│   └────────────┘ └────────────┘ └────────────┘ └────────────┘               │
│   ┌────────────┐ ┌────────────┐ ┌──────────────┐                            │
│   │  Disabled  │ │   Banned   │ │Pending Reports│                           │
│   │      5     │ │      2     │ │      12      │                            │
│   └────────────┘ └────────────┘ └──────────────┘                            │
│                                                                              │
│   ───────────────────────────────────────────────────────────────────────   │
│                                                                              │
│   ADMIN ACTIONS                                                             │
│   ─────────────                                                             │
│                                                                              │
│   REPORT MANAGEMENT                    SUPPORT TICKETS                      │
│   ┌───────────────────────┐            ┌───────────────────────┐            │
│   │ View pending reports  │            │ View all tickets      │            │
│   └───────────┬───────────┘            └───────────┬───────────┘            │
│               │                                    │                        │
│               ▼                                    ▼                        │
│   ┌───────────────────────┐            ┌───────────────────────┐            │
│   │ Review:               │            │ Read ticket details   │            │
│   │ • Reporter info       │            │ • User message        │            │
│   │ • Reported content    │            │ • Status              │            │
│   │ • Reason & evidence   │            │                       │            │
│   └───────────┬───────────┘            └───────────┬───────────┘            │
│               │                                    │                        │
│        ┌──────┴──────┐                             ▼                        │
│        ▼             ▼                  ┌───────────────────────┐            │
│   ┌─────────┐  ┌──────────┐             │ Respond to user       │            │
│   │ DISMISS │  │  ACTION  │             │ Update status         │            │
│   └─────────┘  └────┬─────┘             └───────────────────────┘            │
│                     │                                                        │
│                     ▼                                                        │
│           ┌─────────────────┐                                               │
│           │ • Warn user     │                                               │
│           │ • Ban user      │                                               │
│           │ • Delete post   │                                               │
│           │ • Delete account│                                               │
│           └─────────────────┘                                               │
│                                                                              │
│   ───────────────────────────────────────────────────────────────────────   │
│                                                                              │
│   USER MODERATION                      DANGER ZONE                          │
│   ┌───────────────────────┐            ┌─────────────────────────────────┐  │
│   │ • Ban user            │            │         FACTORY RESET           │  │
│   │ • Unban user          │            │                                 │  │
│   │ • Disable profile     │            │  Deletes ALL platform data:     │  │
│   │ • Enable profile      │            │  users, posts, messages,        │  │
│   │ • View user details   │            │  connections, storage files     │  │
│   └───────────────────────┘            │                                 │  │
│                                        │  Requires confirmation          │  │
│                                        └─────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Payment Flows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PAYMENT FLOWS                                      │
│                          /lib/wallet.ts                                      │
│                                                                              │
│   WALLET CONNECTION (Lazy - only when needed)                               │
│   ───────────────────────────────────────────                               │
│                                                                              │
│   User initiates payment → MiniKit walletAuth → Wallet address stored       │
│                                                                              │
│   ───────────────────────────────────────────────────────────────────────   │
│                                                                              │
│   PREMIUM UNLOCK (1.0 WLD)              TIP CREATOR (0.5 WLD)               │
│   ────────────────────────              ─────────────────────               │
│                                                                              │
│        User                                  User                            │
│          │                                    │                              │
│          ▼                                    ▼                              │
│   ┌─────────────┐                      ┌─────────────┐                      │
│   │  1.0 WLD    │                      │  0.5 WLD    │                      │
│   └──────┬──────┘                      └──────┬──────┘                      │
│          │                                    │                              │
│     ┌────┴────┐                          ┌────┴────┐                        │
│     ▼         ▼                          ▼         ▼                        │
│ ┌───────┐ ┌───────┐                  ┌───────┐ ┌───────┐                    │
│ │0.2 WLD│ │0.8 WLD│                  │0.1 WLD│ │0.4 WLD│                    │
│ │Platform│ │Creator│                  │Platform│ │Creator│                   │
│ │ (20%) │ │ (80%) │                  │ (20%) │ │ (80%) │                    │
│ └───────┘ └───────┘                  └───────┘ └───────┘                    │
│                                                                              │
│   POST BOOST (5.0 WLD)                  INVISIBLE MODE (5.0 WLD)            │
│   ────────────────────                  ────────────────────────            │
│                                                                              │
│        User                                  User                            │
│          │                                    │                              │
│          ▼                                    ▼                              │
│   ┌─────────────┐                      ┌─────────────┐                      │
│   │  5.0 WLD    │                      │  5.0 WLD    │                      │
│   └──────┬──────┘                      └──────┬──────┘                      │
│          │                                    │                              │
│          ▼                                    ▼                              │
│   ┌─────────────┐                      ┌─────────────┐                      │
│   │  Platform   │                      │  Platform   │                      │
│   │   (100%)    │                      │   (100%)    │                      │
│   │             │                      │             │                      │
│   │ Post at top │                      │ Browse      │                      │
│   │ for 24 hrs  │                      │ anonymously │                      │
│   │             │                      │ for 30 days │                      │
│   └─────────────┘                      └─────────────┘                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Database Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE RELATIONSHIPS                             │
│                                                                              │
│   users (PK: nullifier_hash)                                                │
│     │                                                                        │
│     ├──< posts (FK: user_id)                                                │
│     │      ├──< post_votes (FK: post_id, user_id)                           │
│     │      ├──< post_access (FK: post_id, user_id)                          │
│     │      └──< tips (FK: post_id, tipper_id)                               │
│     │                                                                        │
│     ├──< connections (FK: initiator_id, receiver_id)                        │
│     │      └──< messages (FK: connection_id, sender_id)                     │
│     │                                                                        │
│     ├──< relationships (FK: follower_id, target_id)                         │
│     │      type: 'follow' | 'block'                                         │
│     │                                                                        │
│     ├──< profile_views (FK: viewer_id, profile_id)                          │
│     │                                                                        │
│     ├──< reports (FK: reporter_id, reported_user_id, reported_post_id)      │
│     │                                                                        │
│     └──< support_tickets (FK: user_id)                                      │
│                                                                              │
│   All foreign keys use ON DELETE CASCADE                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `/src/app/page.tsx` | Landing page with session check |
| `/src/app/layout.tsx` | Root layout + MiniKit provider |
| `/src/app/feed/page.tsx` | Main feed (~1100 lines) |
| `/src/app/onboarding/page.tsx` | New user profile setup |
| `/src/app/profile/[id]/page.tsx` | User profile view |
| `/src/app/profile/edit/page.tsx` | Profile editing + account management |
| `/src/app/inbox/page.tsx` | Chat inbox list |
| `/src/app/chat/[id]/page.tsx` | Direct messaging |
| `/src/app/support/page.tsx` | Support ticket system |
| `/src/app/admin/page.tsx` | Admin dashboard |
| `/src/app/api/verify/route.ts` | World ID verification endpoint |
| `/src/app/api/heartbeat/route.ts` | Presence tracking |
| `/src/components/LoginButton.tsx` | World ID verification button |
| `/src/components/UploadPost.tsx` | Photo upload modal |
| `/src/components/TipButton.tsx` | Tipping payment flow |
| `/src/components/ReportModal.tsx` | Report submission modal |
| `/src/lib/session.ts` | Client-side session management |
| `/src/lib/wallet.ts` | Wallet connection helper |
| `/src/lib/supabase.ts` | Supabase client config |

---

## Gotcha: Nullifier Hash Identity

The `nullifier_hash` is **deterministic**, not random. Same human + same Orb = same hash.

**Implications:**
- Deleted users who re-verify get the **same** `nullifier_hash`
- Enables "fresh onboarding" for returning users
- Prevents multiple accounts, allows account recovery
- Admin ID is a specific `nullifier_hash` via environment variable
