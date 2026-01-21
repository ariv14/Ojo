# OJO: Building a Human-Only Social Network with Claude Code

## Executive Summary

OJO is a social network exclusively for Orb-verified humans, built as a World App Mini App. The entire application—8,377 lines of production TypeScript code across 36 files—was developed using Claude Code as the primary development tool, demonstrating the potential of AI-assisted software engineering for rapid product development.

---

## Project Overview

### The Problem
Social media platforms are plagued by bots, fake accounts, and inauthentic engagement. Users can't trust that they're interacting with real people.

### The Solution
OJO ("eye" in Spanish) leverages World ID's Orb verification to ensure every single user is a verified, unique human. The tagline says it all: **"Keep an eye on what is real."**

### Key Features
- **Photo Feed** with voting system (like/dislike)
- **Follow System** with prioritized content from followed users
- **Direct Messaging** with real-time presence indicators
- **Creator Monetization** via premium posts, tips, and boosts
- **Privacy Controls** including invisible mode, blocking, and account deletion
- **Admin Dashboard** for moderation and platform management

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 16 (App Router) | Server-side rendering, routing, API routes |
| **Language** | TypeScript | Type safety across the codebase |
| **UI** | React 19 + Tailwind CSS 4 | Component architecture, utility-first styling |
| **Database** | Supabase (PostgreSQL) | Relational data, real-time subscriptions |
| **Storage** | Supabase Storage | Avatar and photo uploads |
| **Auth** | World ID via MiniKit | Orb-level human verification |
| **Payments** | WLD Token via MiniKit Pay | In-app purchases and creator payments |
| **Deployment** | Vercel | Edge deployment, automatic scaling |

### MiniKit Integration
OJO utilizes **8 distinct MiniKit commands**:
- `verify` - Orb verification for login
- `requestPermission` - Push notification permissions
- `walletAuth` - Wallet connection for payments
- `pay` - 4 different payment flows (premium, tips, boosts, invisible mode)
- `share` - Share content externally
- `chat` - Share to World App conversations
- `shareContacts` - Friend invitations
- `sendHapticFeedback` - Tactile feedback throughout

---

## AI Algorithms Powering Development

### The Engine: Claude Opus 4.5

OJO was developed using **Claude Code**, Anthropic's official CLI tool powered by **Claude Opus 4.5**—the most capable model in the Claude family. Here's what's under the hood:

### Core AI Architecture

#### 1. **Transformer-Based Large Language Model**
- **Architecture**: Claude is built on a transformer neural network architecture with attention mechanisms that enable understanding of long-range dependencies in code
- **Context Window**: 200K tokens—allowing Claude to hold entire codebases in memory during development sessions
- **Training**: Trained on diverse programming languages, frameworks, and software engineering patterns

#### 2. **Constitutional AI (CAI)**
- Anthropic's proprietary alignment technique ensuring Claude writes secure, reliable code
- Built-in awareness of security vulnerabilities (OWASP Top 10)
- Preference for maintainable, readable code patterns

#### 3. **Reinforcement Learning from Human Feedback (RLHF)**
- Fine-tuned on millions of code review examples
- Understands best practices across languages and frameworks
- Learns from corrections to avoid repeating mistakes

### Cognitive Capabilities Applied

| Capability | Application in OJO Development |
|------------|-------------------------------|
| **Code Generation** | Writing TypeScript, React components, SQL queries from natural language descriptions |
| **Pattern Recognition** | Identifying existing code patterns and maintaining consistency across 36 files |
| **Semantic Understanding** | Understanding intent ("add tipping") and translating to implementation details |
| **Multi-file Reasoning** | Tracking relationships between components, pages, and utilities |
| **Error Analysis** | Reading build errors and TypeScript diagnostics to fix issues |
| **API Comprehension** | Understanding MiniKit, Supabase, and Next.js APIs from documentation |

### Agentic Workflow

Claude Code operates as an **autonomous coding agent** with:

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLAUDE CODE AGENT LOOP                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Human Intent ──► Reasoning ──► Tool Selection ──► Execution   │
│         ▲                                              │        │
│         │                                              │        │
│         └──────────── Feedback Loop ◄──────────────────┘        │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  AVAILABLE TOOLS:                                               │
│  • Read    - Examine files and understand context               │
│  • Write   - Create new files                                   │
│  • Edit    - Modify existing code precisely                     │
│  • Glob    - Find files by pattern                              │
│  • Grep    - Search code for patterns                           │
│  • Bash    - Execute commands (build, git, npm)                 │
│  • Task    - Spawn sub-agents for complex exploration           │
└─────────────────────────────────────────────────────────────────┘
```

### Advanced Reasoning Techniques

#### Chain-of-Thought Reasoning
Before writing code, Claude breaks down complex tasks:
```
Task: "Add premium post unlocking with payment split"

Reasoning:
1. Need to track which users have unlocked which posts → post_access table
2. Payment goes to two recipients → use MiniKit pay with split
3. 80% to creator, 20% to platform → calculate amounts
4. UI needs locked state → blur image, show unlock button
5. After payment → record access, reveal content
```

#### In-Context Learning
Claude adapts to project-specific patterns by reading existing code:
- Observed glassmorphism pattern → applied consistently
- Observed session management approach → followed same pattern
- Observed Supabase query style → maintained consistency

#### Multi-Step Planning
For complex features, Claude creates implementation plans:
```
Feature: Real-time presence system

Plan:
├── 1. Create heartbeat API endpoint
├── 2. Add last_seen_at column to users table
├── 3. Build client-side heartbeat interval
├── 4. Create UserAvatar component with status indicator
├── 5. Calculate online status (< 5 min = online)
└── 6. Subscribe to presence changes via Supabase Realtime
```

### Model Specifications

| Specification | Value |
|---------------|-------|
| **Model** | Claude Opus 4.5 |
| **Model ID** | claude-opus-4-5-20251101 |
| **Context Window** | 200,000 tokens |
| **Output Limit** | 32,000 tokens per response |
| **Training Data** | Code, documentation, and software engineering resources through early 2025 |
| **Capabilities** | Code generation, debugging, refactoring, architecture design, documentation |

### AI-Assisted Development Patterns

#### 1. **Explore → Plan → Implement → Verify**
```
Explore: Read existing code to understand patterns
    ↓
Plan: Design the implementation approach
    ↓
Implement: Write code across multiple files
    ↓
Verify: Run build to catch errors
    ↓
Iterate: Fix any issues found
```

#### 2. **Context-Aware Code Generation**
Claude doesn't generate code in isolation—it reads surrounding code first:
- Imports existing utilities instead of recreating them
- Follows established naming conventions
- Uses the same error handling patterns
- Maintains consistent styling approaches

#### 3. **Self-Correction Loop**
When builds fail, Claude:
1. Reads the error message
2. Identifies the root cause
3. Applies the fix
4. Verifies the fix works
5. Continues with the task

---

## Development with Claude Code

### How Claude Code Was Used

Claude Code served as the primary development partner throughout the entire project lifecycle:

#### 1. **Architecture & Planning**
- Designed the database schema with proper foreign key relationships
- Planned the user journey from verification to engagement
- Structured the Next.js App Router file organization
- Designed the payment split logic (80/20 creator/platform)

#### 2. **Feature Implementation**
- Built all 16 pages/routes from scratch
- Implemented complex features like:
  - Real-time presence system with heartbeat API
  - Optimistic UI updates for votes and follows
  - Pull-to-refresh with touch gesture handling
  - Infinite scroll with pagination
  - Image compression before upload
  - Feed caching for instant page loads

#### 3. **UI/UX Development**
- Created glassmorphism design system (`bg-white/80 backdrop-blur-md`)
- Built animated gradient headers
- Implemented responsive layouts constrained for mobile-first
- Added haptic feedback for all interactions

#### 4. **Bug Fixing & Optimization**
- Fixed cascade delete issues in database relationships
- Resolved session initialization race conditions
- Optimized feed queries with proper indexing
- Implemented storage cleanup to prevent orphaned files

#### 5. **Code Review & Refactoring**
- Extracted reusable components (`UserAvatar`, `ConfirmationModal`, `Toast`)
- Created utility libraries (`haptics.ts`, `wallet.ts`, `session.ts`)
- Maintained consistent coding patterns across the codebase

### Development Workflow

```
Human Intent → Claude Code Analysis → Implementation → Build Verification → Deploy
```

A typical interaction:
1. **Describe the feature** - "Add tipping functionality with 0.5 WLD payments"
2. **Claude Code explores** - Reads relevant files, understands existing patterns
3. **Claude Code plans** - Proposes implementation approach
4. **Claude Code implements** - Writes the code across multiple files
5. **Claude Code verifies** - Runs `npm run build` to catch errors
6. **Human reviews** - Approves and deploys

---

## Results

### Quantitative Metrics

| Metric | Value |
|--------|-------|
| Total Lines of Code | 8,377 |
| Source Files | 36 |
| Git Commits | 35 |
| Pages/Routes | 16 |
| API Endpoints | 4 |
| Reusable Components | 9 |
| MiniKit Commands Used | 8 |

### Development Velocity
- Full-featured social network built from zero
- Complex payment flows with multi-recipient splits
- Real-time features (presence, messaging, notifications)
- Complete admin dashboard with moderation tools
- All accomplished with Claude Code as the development engine

### Code Quality
- **Zero TypeScript errors** - Every commit passes `npm run build`
- **Consistent patterns** - Same coding style throughout
- **Proper error handling** - Graceful failures with user-friendly messages
- **Security considerations** - Input validation, cascade deletes, storage cleanup

---

## Key Takeaways

### What Worked Well
1. **Rapid iteration** - Features go from idea to implementation in a single session
2. **Consistency** - Claude Code maintains patterns across the entire codebase
3. **Bug prevention** - Build verification catches issues before deployment
4. **Knowledge integration** - Claude Code understands MiniKit, Supabase, Next.js, and how they work together

### Best Practices Discovered
1. **Maintain a CLAUDE.md** - Project context file helps Claude Code understand conventions
2. **Verify builds** - Always run `npm run build` after changes
3. **Incremental development** - Small, focused changes are easier to review
4. **Clear communication** - Specific requests yield better results

---

## Conclusion

OJO demonstrates that Claude Code can serve as a highly effective development partner for building production-grade applications. From database design to UI polish, from payment integration to real-time features, Claude Code handled the full spectrum of software engineering tasks.

The combination of **Claude Opus 4.5's advanced reasoning capabilities** with **Claude Code's agentic tooling** created a development experience where complex features could be described in natural language and implemented correctly across multiple files—with build verification ensuring quality at every step.

The result is a complete, deployable social network that solves a real problem—trust in online interactions—using cutting-edge technology like World ID and WLD payments.

---

**Built by SWATSYS** — A Web3 Product Studio
**Developed with Claude Code** — AI-Powered Software Engineering
**Powered by Claude Opus 4.5** — Anthropic's Most Capable Model
