# PRODUCT_SPEC.md

This document defines **what this service does**: features, user flows, and requirements.

> This file is in **English** for AI/tooling.
> **All implementation comments and human-facing documentation (design docs, CLONE_GUIDE, etc.) MUST be written in Korean**, as defined in `AGENTS.md` / `CODING_GUIDE.md`.

This project is a **real-time competitive Pong-like game service** for the Korean web market.  
It is inspired by the idea behind ft_transcendence, but it is **not** a reimplementation of the original subject.

We target a **high-end, feature-rich implementation** (roughly “150-point” level):  
- Core game + ranking
- Rich social features
- Tournaments
- Basic operations / admin / monitoring

All versions and implementation priorities are driven by `VERSIONING.md`.

---

## 1. High-level product description

- **Genre**: Real-time 1v1 (and optionally 2v2/custom) Pong-like game
- **Platform**: Web (desktop-first, mobile-friendly)
- **Region focus**: Korea
- **Key aspects**:
  - Low-latency real-time gameplay via WebSocket
  - Persistent accounts, profiles, ranks
  - Social graph (friends, blocks), invitations, chat
  - Competitive modes (ranked, tournaments)
  - Basic admin and monitoring to inspect and operate the system

---

## 2. User roles

### 2.1 Guest user

- Can:
  - Visit landing/home page
  - Read basic service info
  - Watch limited public matches (if allowed by version scope)
- Cannot:
  - Play ranked games
  - Use social features
  - Access personal stats

### 2.2 Registered user

- Can:
  - Log in / log out
  - Play games (normal + ranked, depending on version)
  - Manage profile (nickname, avatar, short bio, basic settings)
  - Use social features:
    - Add/remove friends
    - Accept/decline friend requests
    - Participate in chats/channels (within version scope)
  - Join tournaments / events (if feature is implemented)

### 2.3 Admin / operator

- Can:
  - View user information and match history
  - Apply moderation actions:
    - Ban/suspend users
    - Mute users in chat
  - Inspect basic health metrics and logs (later versions)
- This role is mostly backend-side; frontend may expose an admin UI, but it is not required for the earliest versions.

---

## 3. Core feature groups

We group features into domains:

1. **Account & Authentication**
2. **Profile & Identity**
3. **Game & Match**
4. **Ranking & Progression**
5. **Social & Friends**
6. **Chat & Channels**
7. **Tournaments & Events**
8. **Spectator & Observers**
9. **Notifications**
10. **Admin & Operations**

Each domain has required and optional (later) features.  
The exact version when each feature appears is defined in `VERSIONING.md`.

---

## 4. Account & Authentication

### 4.1 Basic requirements

- Email/username + password registration (or ID/password, depending on design).
- Login with session or JWT (see `STACK_DESIGN.md` / design docs).
- Logout.
- Password reset flow (email or simplified token-based flow).
- Account verification (optional, can be introduced in later versions).

### 4.2 Security

- Password hashing using industry-standard methods.
- Rate limiting or basic lockout for repeated failed logins.
- Session expiration and refresh strategy clearly defined.

### 4.3 Future integrations (Korean-specific)

- Kakao / Naver OAuth as **optional** login options.
- These are later versions; do not implement them before `VERSIONING.md` explicitly defines.

---

## 5. Profile & Identity

### 5.1 User profile

- Fields:
  - Unique identifier (non-changeable ID)
  - Display name / nickname
  - Avatar (image or preset skins)
  - Short bio/status message
  - Country/region (default Korea)
- Functions:
  - View own profile.
  - View other users’ public profiles.
  - Edit profile (nickname, avatar, bio) with validation rules.

### 5.2 Privacy and visibility

- Minimal privacy controls at early versions:
  - Allow/disallow friend requests.
  - Optionally hide match history or stats in later versions.

---

## 6. Game & Match

### 6.1 Game mode: core Pong

- Real-time 1v1 Pong-like game:
  - Ball physics (simple, deterministic).
  - Paddle control (keyboard or simple control scheme).
  - Scoring system (e.g. first to N points).
- The backend is authoritative for game state.

### 6.2 Match types

- **Normal (unranked) match**
  - Quick play without impact on rank.
- **Ranked match** (later version)
  - Uses matchmaking based on rating (ELO/MMR).
  - Impacts rank/league.

- **Custom room**
  - User-created rooms with configurable options:
    - Private/public
    - Custom score limit
    - (Optionally) small rule variations (hard mode, speed multipliers, etc.) in later versions.

Exact mode availability per version is defined in `VERSIONING.md`.

### 6.3 Match flow

- Core flow:
  1. User enters lobby/game screen.
  2. User selects match type (normal/ranked/custom).
  3. System finds or creates a match.
  4. WebSocket connection is established.
  5. Game is played; on finish, results are recorded.
  6. User can rematch, return to lobby, or leave.

- AFK / disconnect handling:
  - If a player disconnects mid-game, game ends with an appropriate result (win/loss/forfeit).
  - Rules to be defined in design docs; must avoid abuse.

---

## 7. Ranking & Progression

### 7.1 Rating system

- Rating (ELO/MMR-like) for ranked matches.
- Ratings adjust after each ranked game.
- New players:
  - Placement matches or default starting rating.

### 7.2 Ranks/tiers

- Tiered rank system (e.g. Bronze/Silver/Gold/Platinum, with sub-tiers).
- Display rank in:
  - Profile
  - Match lobby
  - Post-game screen

### 7.3 Statistics

- Per-user stats:
  - Total games, wins, losses, win rate.
  - Ranked stats separately.
  - Optionally advanced stats (longest win streak, average score difference).

- Global stats (later versions):
  - Overall leaderboard.
  - Season-based leaderboards.

---

## 8. Social & Friends

### 8.1 Friends

- Send/accept/reject friend requests.
- Friends list:
  - Online/offline status
  - Quick invite to game
- Block list:
  - Blocked users cannot send friend requests or messages.

### 8.2 Invitations

- Game invite:
  - Send direct “play with me” invitations to online friends.
- Party (optional, later):
  - Small group of users (2–4) that can queue together.

---

## 9. Chat & Channels

### 9.1 Direct messages

- Basic 1:1 chat between friends.
- Message history for recent conversations.

### 9.2 Rooms / channels

- Lobby/general channel:
  - Global or segmented by region (start with simple global).
- Match room chat:
  - In-game chat restricted to match participants (and possibly spectators).
- Moderation:
  - Simple mute functionality for abusive users.
  - Admin tools to monitor or restrict problematic channels (later).

### 9.3 Korean-specific concerns

- Handle Korean text safely (utf8mb4).
- Optional profanity filtering (for later versions, if added to `VERSIONING.md`).

---

## 10. Tournaments & Events

### 10.1 Tournaments

- Bracket-based 1v1 tournaments:
  - Single-elimination or simple bracket (no need to overcomplicate early).
- Features:
  - Create/join tournament.
  - Auto-advance winners to next round.
  - Schedule or “start when full” modes.

### 10.2 Seasonal events

- Optional design, not mandatory for initial versions.
- Could include:
  - Seasonal ladder resets.
  - Temporary game rule variations.

Exact details and priority will be defined in `VERSIONING.md` and `design/` docs.

---

## 11. Spectator & Observers

### 11.1 Live spectating

- Watch ongoing matches (with a small delay if needed).
- Spectator limits per match can be defined in design docs.

### 11.2 Observability for players

- Simple “who is playing now” list (optional).
- Watching friends’ matches directly from friend list.

Spectator features may appear in later versions; the basic requirement is that the architecture allows it.

---

## 12. Notifications

### 12.1 In-app notifications

- Events:
  - Friend requests
  - Match invitations
  - Tournament start/time
  - Basic system messages (e.g. maintenance, bans)
- Presentation:
  - Bell icon + unread count (or simple list).

### 12.2 Delivery

- Initial versions: in-app only.
- Later versions: possible email / push integration if required (must be explicitly added to `VERSIONING.md`).

---

## 13. Admin & Operations

### 13.1 Admin capabilities

- View:
  - Users, profiles, and basic stats
  - Match history (recent matches, suspicious patterns)
- Act:
  - Ban/suspend/mute users
  - Kick from match (if needed)
  - Reset or adjust ratings (with auditing)

### 13.2 Monitoring

- At high-level:
  - Health checks
  - Basic metrics (requests, errors, active rooms, active users)
  - Logs for debugging incidents

The level of tooling grows with versions; early versions can be minimal.

---

## 14. Non-functional requirements

### 14.1 Latency & performance

- Target:
  - Reasonable gameplay latency for users in Korea.
- For early versions:
  - Single-region deployment is fine.
- Game logic must behave predictably even under moderate latency.

### 14.2 Availability

- No strict SLA, but:
  - The application should be resilient to typical errors and restarts.
  - Avoid single points of failure where trivial to address (e.g. handle backend restarts gracefully from frontend).

### 14.3 Security & abuse

- Basic protections:
  - Input validation
  - Rate limiting (especially on login, chat)
  - Protection against obvious injection/CSRF/XSS vectors
- Abuse:
  - Blocking, reporting, banning mechanisms in social/chat.

---

## 15. Localization & Korean specifics

- **Language**:
  - UI and documentation primarily in Korean.
  - Internal code identifiers remain English.
- **Time**:
  - Core UX assumes Korean time (KST).
- **Typography/UI**:
  - Use fonts and layout that render Hangul cleanly.
  - Consider typical game café/PC usage scenarios.

---

## 16. Out of scope (for now)

These are explicitly **not** required unless added to `VERSIONING.md` later:

- Real-money transactions or in-app purchases.
- Advanced anti-cheat systems beyond basic sanity checks.
- Full multi-region, multi-datacenter deployments.
- Mobile native apps (this project is web-focused).

---

## 17. Relationship with other documents

- `STACK_DESIGN.md`
  - Defines **how** we implement these features: tech stack and architecture.
- `VERSIONING.md`
  - Defines **when** each feature is implemented and in which order.
- `AGENTS.md`
  - Defines the behavior rules for AI agents implementing this spec.
- `CODING_GUIDE.md`
  - Defines coding style and conventions for each part of the stack.
- `design/` (per domain/version)
  - Provides detailed, Korean-language design for each feature and version.

If a feature is not described here, AI agents must **not** invent or implement it autonomously.  
Any new feature must first be added to this `PRODUCT_SPEC.md` (by a human) and then scheduled in `VERSIONING.md`.
