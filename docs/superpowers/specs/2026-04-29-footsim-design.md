# FootSim — Design Spec

**Date** : 2026-04-29
**Owner** : BJBellum
**Status** : Approved (sections), pending implementation plan

## 1. Overview

FootSim is a static, single-page web application that simulates football matches between countries from the "Projet Résurgence" universe. It supports team creation with auto-generated rosters of up to 5,000 players using Football-Manager-style stats, and runs live, tick-based match simulations with events, cards, half-time, and added time.

- **Audience** : single admin (Discord ID `772821169664426025`). Non-admins can view the home page only.
- **Hosting** : GitHub Pages from repo `BJBellum/footsim`.
- **Persistence** : JSON files in repo `BJBellum/footsim-data`, written via the GitHub REST API using the admin's personal access token (PAT).
- **Auth** : Discord OAuth2 implicit flow, scope `identify`.

## 2. Tech Stack

| Concern | Choice |
|---------|--------|
| Framework | Vite + React 18 + TypeScript |
| Routing | React Router v6 |
| State | Zustand (slices: session, teams, match) |
| Styling | Tailwind CSS + shadcn/ui primitives |
| Animation | Framer Motion |
| Sim engine runtime | Web Worker (`Comlink` optional) |
| Tests | Vitest (units for `gen/` and `sim/` only) |
| Deploy | GitHub Actions → Pages |

## 3. Architecture

```
footsim/                          # Site (BJBellum/footsim)
├── src/
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── auth/Callback.tsx
│   │   ├── NoAccess.tsx
│   │   ├── dashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Teams.tsx
│   │   │   ├── TeamNew.tsx
│   │   │   ├── TeamDetail.tsx
│   │   │   └── Settings.tsx
│   │   └── matches/
│   │       ├── MatchSetup.tsx
│   │       └── MatchLive.tsx
│   ├── lib/
│   │   ├── auth/discord.ts
│   │   ├── github/api.ts
│   │   ├── github/store.ts
│   │   ├── gen/players.ts
│   │   ├── gen/names.ts
│   │   ├── gen/positions.ts
│   │   ├── sim/precompute.ts
│   │   ├── sim/engine.ts
│   │   ├── sim/events.ts
│   │   ├── sim/worker.ts
│   │   └── types.ts
│   ├── components/
│   │   ├── ui/                   # Button, Input, Modal, Toast, Slider, Select
│   │   ├── team/FlagUpload.tsx
│   │   ├── team/RosterTable.tsx
│   │   ├── match/Pitch.tsx
│   │   ├── match/Scoreboard.tsx
│   │   ├── match/EventFeed.tsx
│   │   └── match/StatsPanel.tsx
│   ├── stores/
│   │   ├── session.ts
│   │   ├── teams.ts
│   │   └── match.ts
│   ├── styles/globals.css
│   └── App.tsx
├── data/
│   └── names/{culture}.json     # Bundled in build
├── public/
└── .github/workflows/pages.yml

footsim-data/                     # BJBellum/footsim-data (separate repo)
└── data/
    ├── teams/{slug}/team.json
    ├── teams/{slug}/players.json
    └── matches/{id}.json
```

## 4. Authentication

### 4.1 Discord OAuth (Implicit Flow)

1. User clicks **Login** on `/`.
2. Browser navigates to:
   `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT}&response_type=token&scope=identify`
3. Discord redirects to `/auth/callback#access_token=...&token_type=Bearer&expires_in=...`.
4. `Callback.tsx` parses the URL fragment, fetches `https://discord.com/api/users/@me` with the bearer token.
5. Session object `{ id, username, avatar, accessToken, expiresAt }` is stored in `localStorage` under key `footsim.session`.
6. Token expiry is `Date.now() + expires_in * 1000`. On any expired check, the session is cleared and the user is redirected to login.

### 4.2 Admin Gate

- Admin Discord ID is `772821169664426025` (read from `VITE_ADMIN_DISCORD_ID`).
- If session `id !== ADMIN_ID`, all `/dashboard/*` and `/match/*` routes redirect to `/no-access`.
- The home page remains public.

### 4.3 GitHub PAT

- Configured in `/dashboard/settings`. Stored in `localStorage` under key `footsim.github_pat`.
- Validated on save by calling `GET https://api.github.com/user` with the token.
- Required scope: `repo` (or `public_repo` if `footsim-data` is public).
- Display: masked input with reveal toggle. Cleared on logout.

### 4.4 Environment Variables

```
VITE_DISCORD_CLIENT_ID=<set by user>
VITE_DISCORD_REDIRECT_URI=https://bjbellum.github.io/footsim/auth/callback
VITE_DATA_REPO=BJBellum/footsim-data
VITE_DATA_BRANCH=main
VITE_ADMIN_DISCORD_ID=772821169664426025
```

## 5. Data Model

### 5.1 Team

```ts
type Team = {
  id: string;            // uuid
  slug: string;          // kebab-case from name
  name: string;
  flag: string;          // data URL, PNG 150x150
  culture: Culture;
  globalStrength: number; // 1..100
  createdAt: string;     // ISO
  createdBy: string;     // Discord ID
  playerCount: number;
  formation?: Formation; // default '4-3-3'
};

type Culture =
  // Europe
  | 'francais' | 'anglais' | 'allemand' | 'italien' | 'espagnol' | 'portugais'
  | 'grec' | 'hongrois' | 'tcheque' | 'polonais' | 'russe' | 'ukrainien'
  | 'suedois' | 'neerlandais' | 'roumain' | 'serbe' | 'croate' | 'turc'
  // Asia
  | 'arabe' | 'japonais' | 'coreen' | 'chinois' | 'vietnamien' | 'thai'
  | 'indonesien' | 'persan' | 'indien' | 'israelien'
  // America
  | 'bresilien' | 'argentin' | 'mexicain' | 'anglo-americain' | 'quebecois';

type Formation = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1';
```

### 5.2 Player

```ts
type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'DM' | 'CM' | 'AM' | 'LM' | 'RM' | 'LW' | 'RW' | 'ST';

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;           // 16..38
  position: Position;
  altPositions: Position[];
  preferredFoot: 'left' | 'right' | 'both';
  stats: {
    technical: { passing: number; crossing: number; dribbling: number; finishing: number; firstTouch: number; heading: number; longShots: number; tackling: number; marking: number };
    mental:    { vision: number; decisions: number; composure: number; anticipation: number; offTheBall: number; aggression: number; workRate: number };
    physical:  { pace: number; acceleration: number; strength: number; stamina: number; agility: number; balance: number; jumping: number };
    goalkeeping: { reflexes: number; handling: number; aerial: number; oneOnOne: number; kicking: number; throwing: number } | null;
  };
  overall: number;       // 1..100, computed
};
```

All stat values are integers in `[1, 20]`. `overall` is computed as a weighted mean of the player's stats per their primary position.

### 5.3 Match

```ts
type MatchEvent = {
  minute: number;
  half: 1 | 2;
  type: 'goal' | 'shot' | 'shotOnTarget' | 'save' | 'foul' | 'yellow' | 'red' | 'corner' | 'offside' | 'kickoff' | 'halftime' | 'fulltime';
  side?: 'home' | 'away';
  playerId?: string;
  text: string;
  ballPos?: { x: number; y: number };
};

type Match = {
  id: string;
  playedAt: string;
  speed: 'instant' | '0.5' | '1' | '2' | '5';
  home: SideResult;
  away: SideResult;
  events: MatchEvent[];
  finalScore: { home: number; away: number };
};

type SideResult = {
  teamId: string;
  formation: Formation;
  lineup: string[];      // 11 player ids
  score: number;
  shots: number;
  shotsOnTarget: number;
  fouls: number;
  yellows: string[];     // player ids
  reds: string[];
  possession: number;    // 0..100
};
```

## 6. Player Generation

### 6.1 Pipeline

1. **Position assignment** (per 100 players):
   `GK 8 | CB 18 | LB 7 | RB 7 | DM 8 | CM 14 | AM 6 | LM 3 | RM 4 | LW 6 | RW 6 | ST 13`.
2. **Age** : triangular distribution `min=16, mode=24, max=38`.
3. **Names** : pick `firstName` and `lastName` uniformly from `data/names/{culture}.json` (each file has ~100 first names + ~100 last names).
4. **Base stats** : each stat sampled `clamp(round(gauss(mean, sd)), 1, 20)` where `mean = 6 + globalStrength / 10` and `sd = 3`.
5. **Position boosts** : add fixed deltas per position, then clamp again. Example table:
   - `GK` : reflexes +5, handling +5, aerial +4, oneOnOne +4, kicking +3, throwing +3, passing -2, finishing -3.
   - `CB` : tackling +4, marking +4, heading +3, strength +3, jumping +3, pace -1, dribbling -1.
   - `LB/RB` : tackling +3, marking +2, pace +3, stamina +3, crossing +2.
   - `DM` : tackling +3, marking +2, decisions +2, anticipation +2, workRate +2.
   - `CM` : passing +3, vision +3, decisions +2, stamina +2.
   - `AM` : vision +3, dribbling +3, longShots +2, decisions +2.
   - `LW/RW` : pace +4, dribbling +3, crossing +3, acceleration +3.
   - `ST` : finishing +5, composure +3, offTheBall +3, heading +2.
6. **Goalkeeping object** : populated only when `position === 'GK'`; null otherwise.
7. **Alt positions** : 0–2 additional positions in the same family (e.g. CB → LB/RB), 30% chance.
8. **Overall** : weighted mean per position. Example weights for `CM`:
   `passing 3, vision 3, decisions 2, stamina 2, dribbling 1, tackling 1, workRate 2, others 0.5`.
   Normalized to `[1, 100]` by mapping `1..20` → `1..100`.

### 6.2 Performance

- Generation runs in a Web Worker (`gen.worker.ts`) to avoid blocking the UI for 5,000 players.
- Worker posts progress every 5% to drive a progress bar.
- Estimated total time: ~1.5–2.5s for 5,000 players on a modern laptop.

### 6.3 Adding More Players Later

- "Generate +N" appends to the existing `players.json` array. New ids are uuid v4. Existing players are not mutated.

## 7. GitHub Persistence

### 7.1 Read

- Read uses unauthenticated `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}` for public data.
- For private repo case, use `GET /repos/{owner}/{repo}/contents/{path}` with PAT and base64-decode the response.

### 7.2 Write

```
PUT /repos/{owner}/{repo}/contents/{path}
Authorization: Bearer <PAT>
Body: { message, content: base64, sha?: <existing> , branch }
```

- Get existing `sha` first (HEAD request via contents endpoint). If 404, omit `sha` (creates file).
- Single commit per save. Commit messages templated:
  - Team create: `feat(teams): create {slug}`
  - Players regen: `feat(teams/{slug}): generate {count} players`
  - Match save: `feat(matches): record {homeSlug} vs {awaySlug} ({score})`

### 7.3 Caching

- In-memory store (Zustand `teams`) hydrates on dashboard load.
- Optimistic updates: UI shows the new state immediately; on commit failure, rolls back and shows toast error.

## 8. Match Simulation Engine

### 8.1 Pre-Compute

Given each team's roster + formation:

1. Auto-pick best XI by `overall` matching formation slots.
2. Compute team ratings:
   - `attack    = 0.7 * mean(top3 ATT.overall) + 0.3 * mean(AM.overall)`
   - `midfield  = mean(MID.overall)`
   - `defense   = 0.8 * mean(DEF.overall) + 0.2 * GK.overall`
   - `gk        = GK.overall`
3. Derive per-minute probabilities:
   - `pPossHome   = midfieldHome / (midfieldHome + midfieldAway)`
   - `pShotPerMin = 0.15 * (attackSide / (attackSide + defenseOpp))`
   - `pGoalGivenShot = sigmoid((shooter.finishing + shooter.composure - 0.5 * gk) / 20)` clamped to `[0.04, 0.55]`
   - `pFoulPerMin = 0.08`
   - `pYellowGivenFoul = 0.15` (boosted by `aggression`)
   - `pRedDirect = 0.005`

### 8.2 Live Tick

State stored in Zustand `match` slice. Tick driven by `setInterval` (or sync loop in instant mode) inside the worker. Speed mapping:

| Speed | ms per simulated minute |
|-------|--------------------------|
| 0.5   | 2000                     |
| 1     | 1000                     |
| 2     | 500                      |
| 5     | 200                      |
| instant | 0 (synchronous)        |

Per tick:

1. Roll possession side using `pPossHome`.
2. Roll one event from a weighted table:
   `none 60% | shot 8% | foul 8% | corner 4% | offside 3% | save 5% | keyPass 12%`.
3. **Shot** → roll `pGoalGivenShot`. If goal: increment score, push `goal` event, reset ball to centre.
4. **Foul** → roll yellow / red. If red or 2nd yellow on same player: remove from `onPitch`, multiply that side's `attack/midfield/defense` by `0.93`.
5. **Corner / offside / save / keyPass** → push event, animate ball.
6. Update `possession` percentage running average.
7. **Half-time** at minute 45 + `addedTime ∈ [1,5]`. State transitions to `halftime`. Show overlay with first-half stats. Auto-resume after 10s or "Skip" click. Reset ball to centre.
8. **Full-time** at minute 90 + `addedTime ∈ [1,7]`. Status `fulltime`. Persist match to GitHub.

### 8.3 Mini-Map

- SVG `viewBox="0 0 100 50"`.
- Pitch: green fill `#1F8B4C`, white stroke for boundaries, halfway line, centre circle, two penalty boxes, two six-yard boxes.
- 22 player dots placed by formation slot. Home left-half, away right-half during first half (sides flip at half-time).
- Ball: white circle, position `(x, y)` animated via Framer Motion `animate` with `transition={{ type: 'tween', duration: 0.4 }}`.
- Trail: SVG `<path>` decaying opacity from last 5 ball positions.
- Zone of action mapping: shots = attacking third opp, fouls = midfield, corners = corner flags, offside = attacking line.

### 8.4 Event Texts

Templates parametrized by `{minute}`, `{player}`, `{team}`. Example:

- Goal: `⚽ {minute}' — But pour {team} ! {player} marque.`
- Yellow: `🟨 {minute}' — Carton jaune pour {player} ({team}).`
- Red: `🟥 {minute}' — {player} ({team}) expulsé ! {team} à 10.`
- Save: `🧤 {minute}' — Belle parade du gardien {player}.`

### 8.5 Post-Match Persistence

- Match document written to `data/matches/{id}.json` in `footsim-data`.
- A summary entry is also appended to `data/teams/{slug}/team.json#recentMatches` (capped at 20 entries) so the team page can display history without scanning all matches.

## 9. UI / UX

### 9.1 Routes

- `/` — Home: hero with FootSim logo, tagline "Simulez le football du Projet Résurgence", three CTAs.
- `/auth/callback` — loader + redirect.
- `/no-access` — message for non-admins.
- `/dashboard` — overview cards (team count, total players, recent matches).
- `/dashboard/teams` — grid of team cards.
- `/dashboard/teams/new` — creation form (name, flag dropzone with auto-resize 150x150 canvas, culture select, strength slider, player-count select).
- `/dashboard/teams/:slug` — team detail with tabs Roster / Tactique / Historique.
- `/dashboard/settings` — Discord profile, GitHub PAT, logout.
- `/match` — match setup (select home, away, formations, speed).
- `/match/:id` — live view (scoreboard, mini-map, event feed, stats panel, controls).

### 9.2 Style System

| Token | Value |
|-------|-------|
| `--bg` | `#FAFAF8` |
| `--surface` | `#FFFFFF` |
| `--text` | `#1A1A1A` |
| `--muted` | `#8A8A85` |
| `--border` | `#E8E6E1` |
| `--accent` | `#1F8B4C` |
| `--danger` | `#C73E3E` |
| `--warning` | `#D9A93C` |
| Font sans | `Inter` 400/500/600 |
| Font display | `Fraunces` 600 italic |
| Radius sm/md/lg | 6 / 10 / 16 |
| Shadow sm | `0 1px 2px rgba(0,0,0,0.04)` |
| Shadow md | `0 6px 24px rgba(0,0,0,0.06)` |

### 9.3 Animations

| Surface | Animation |
|---------|-----------|
| Page transitions | fade + 8px slide up, 250ms |
| Hero | logo scale-in, tagline word-by-word reveal |
| Team cards | hover lift (translateY -4), flag subtle parallax |
| Player generation | progress bar + count-up |
| Event feed | slide-in from right + colored border flash |
| Goal | score count-up + 200ms full-screen flash + mini-map shake |
| Mini-map ball | smooth tween + decaying trail |
| Half-time | full-screen overlay summarising first-half stats |

### 9.4 Accessibility

- All buttons reachable via Tab. Focus visible ring `outline: 2px solid var(--accent)`.
- Mini-map has aria-live="polite" for last event text.
- Color contrast checked against WCAG AA on the off-white background.

## 10. Deployment

- Repo `BJBellum/footsim`. Branch `main`.
- `vite.config.ts` : `base: '/footsim/'`.
- `.github/workflows/pages.yml` : on push `main`, run `pnpm install && pnpm build`, upload `dist/` to Pages, deploy.
- `footsim-data` repo created manually by user before first save.

## 11. Testing

- Vitest unit tests on:
  - `gen/players.ts` — distributions, position counts, stat clamping, alt positions.
  - `sim/precompute.ts` — rating math, formation lineup selection.
  - `sim/engine.ts` — deterministic seeded run produces stable score given seed; no negative time, no >11 players on pitch, half-time/full-time invariants.
- No E2E tests for this scope.

## 12. Out of Scope

- Multi-user write access (single admin only).
- Player transfers / contracts / wages.
- League tables and tournaments (potential future iteration).
- Real-time multiplayer match viewing.
- Mobile-specific layouts (responsive desktop-first; mobile usable but not optimised).

## 13. Open Items

None. All decisions captured.
