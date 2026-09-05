# Frankenchamp — MVP + Technical Spec

**Working title:** Frankenchamp (alt: Chimera, Patchwork, Draft the Abomination)
**One line:** Get six random League champions, one at a time, and stitch their model, passive, and Q/W/E/R into a single monstrosity — then argue about whose is better.

**Status:** Spec for implementation. Written to be handed to a coding agent. Every section marked `[AC]` is an acceptance criterion.

---

# Part 1 — Product / MVP Spec

## 1.1 Core concept

A champion is made of six **slots**:

| Slot | Supplies |
|---|---|
| `model` | The character's body/art **and** the base name |
| `passive` | Passive ability |
| `q` | Q ability |
| `w` | W ability |
| `e` | E ability |
| `r` | R (ultimate) ability |

The player is dealt six random champions **without replacement**, revealed **one at a time**. After each reveal they must assign that champion to one still-empty slot. They cannot see future draws, and they cannot undo. The tension — "do I burn Yuumi on the model slot now, or gamble that something worse is coming?" — is the entire game. Do not soften it.

The sixth champion is auto-assigned to the last remaining slot (no choice left to make).

## 1.2 The core loop

```
LOBBY  →  DRAFT (6 rounds)  →  NAME & PUBLISH  →  GALLERY
                                                    ↓
                                                 BATTLE  →  LEADERBOARD
```

### Round structure (repeated 6×)

1. **Spin.** Slot-machine reel of champion icons blurs past. ~2.2s.
2. **Reveal.** Reel snaps to the drawn champion. Show splash-lite: loading-screen portrait, name, title, and the five ability icons with names.
3. **Assign.** Six slot cards, filled ones locked and dimmed. Player clicks an empty slot. A confirm step is required only on the *last two* rounds (where mistakes hurt most) — everywhere else, one click commits, with a 1.5s "undo" toast.
4. **Slot fills** with that champion's asset for that slot (portrait for `model`, ability icon for the others).

### Publish

- Base name is pre-filled from the model champion (e.g. `Yuumi`). Player may rename freely.
- Optional tagline, 140 chars ("built to lose lane and win the game").
- Publish posts it to the shared gallery under an author display name.
- Post-publish screen shows the finished champion card + share button.

`[AC]` A player who never touches the rename field still gets a valid, publishable creation.
`[AC]` It is impossible for a player to choose which champions they are dealt or to see a champion before assigning the previous one.

## 1.3 The champion card

The card is the single most-reused component and the unit of sharing. It must look good at three sizes: feed thumbnail, full view, and 1200×630 OG image.

- Each ability row: 48px ability icon, ability name, source champion name (small, muted), and a hover/tap-to-expand plain-text description.
- Source champion icons appear as a small 20px circle badge on each ability icon so you can read the "who did this come from" at a glance.
- `[AC]` Card renders correctly for every champion in the pool, including long names (Nunu & Willump, Renata Glasc, Bel'Veth) and non-ASCII names (Kai'Sa, Kha'Zix, Cho'Gath, LeBlanc).

## 1.4 Gallery

- Feed of creation cards. Tabs: **New**, **Top this week**, **Hall of Fame**.
- Infinite scroll, cursor-paginated, 24 per page.
- Upvote button (one per user per creation, toggleable).
- Report button (see §1.8).
- Deep link per creation: `/c/{id}`, with OG meta so it unfurls in Discord/Twitter as the champion card.

`[AC]` A creation link pasted into Discord renders a 1200×630 preview image of that specific creation, generated server-side.

## 1.5 Battle mode

Two existing creations, side by side, one question: **which one wins?**

- Pairing is server-chosen. Never show a creation against itself. Never show the viewer's own creation against itself.
- Vote for A or B, or **Skip** (skip is recorded but affects no rating).
- After voting, reveal the split (e.g. "61% picked The Unkillable Accident") and immediately serve the next pair. Fast, tappable, one-thumb.
- Self-votes are blocked: you cannot vote in a battle where you authored one of the two creations. If pairing draws one of yours, it swaps it out.
- A voter sees the same *pair* at most once per week.

**Debate layer (keep it light for MVP):** below the vote buttons, a single-line comment box, max 200 chars, posted against the *battle*, shown as a live-ish scrolling strip of recent takes on that matchup. No threading, no replies, no editing. If moderation cost looks scary, ship battle mode without comments behind a flag and turn it on later.

`[AC]` Voting is idempotent per (voter, pair, week) — a double-tap or refresh cannot register two votes.

## 1.6 Ratings and leaderboard

Two numbers per creation, and they do different jobs:

- **Elo rating** (`rating`, starts 1200, K=24) — used for *matchmaking only*, so battles are competitive and lopsided blowouts stop being served. Persistent, never reset.
- **Weekly record** (`wins`, `losses` scoped to the ISO week) — used for the *leaderboard*.

Leaderboard ranking uses the **Wilson lower bound** of weekly win rate at 95% confidence, with a minimum of **8 weekly battles** to appear. This stops a 1-0 creation from topping a 40-31 one. Below the ranked table, show two side boards: **Most Battled** and **Most Upvoted** this week.

Wilson lower bound:

```
p̂ = w / n
z = 1.96
lower = (p̂ + z²/2n − z·√(p̂(1−p̂)/n + z²/4n²)) / (1 + z²/n)
```

**Weekly rollover** (Monday 00:00 UTC):
1. Snapshot the top 10 of the closing week into `hall_of_fame` with their final numbers.
2. Start a new `week_key`. Weekly counters are derived from `battles.week_key`, so nothing needs to be zeroed.
3. **Do not delete creations.** Deleting the corpus deletes the reason to come back. Instead, creations older than 8 weeks stop being served by the *default* gallery feed and battle pairing (still reachable by direct link, still in Hall of Fame). Add a `?all=1` archive view. Revisit only if storage genuinely becomes a cost, which at this scale it will not.

`[AC]` A creation published at 23:58 UTC Sunday and battled at 00:02 UTC Monday has its wins counted in the new week, not the old.

## 1.7 Identity

No login for MVP. On first visit, mint an anonymous user: `user_id` (UUID, httpOnly cookie, 1-year expiry) + an auto-generated display name (`Sleepy Poro 41`), editable once from the header. This is enough to attribute creations, dedupe votes, and block self-voting.

Do not build accounts, OAuth, or Riot RSO for MVP. If retention justifies it later, add Discord OAuth and migrate anon rows by `user_id`.

`[AC]` A user who clears cookies loses attribution but breaks nothing.

## 1.8 Safety and abuse

The user-generated surface is small (name, tagline, one-line battle comments, display name) but it is not zero.

- **Text filter** on all four fields: a maintained profanity/slur list + a normalization pass (leetspeak, spacing, repeated chars, homoglyphs). Reject on submit with a generic "pick a different name".
- **Rate limits** (per `user_id` and per IP, whichever trips first):
  - draft creation: 10/hour
  - publish: 10/hour
  - battle votes: 120/hour
  - upvotes: 200/hour
  - comments: 20/hour
- **Report** button on creations and comments. 3 distinct reports auto-hides pending review; `is_hidden` rows are excluded from feed, pairing, and leaderboard.
- **Admin route** `/admin` behind a static bearer token in env: list reported items, hide/unhide, ban a `user_id`.

`[AC]` A hidden creation returns 404 from the public API and disappears from all leaderboards within one request.

## 1.9 Out of scope for MVP

Explicitly not building: accounts/OAuth, following users, threaded comments, stat/scaling simulation or "would this actually be broken" math, remixing someone else's build, custom champion pools, skins selection, mobile apps, i18n beyond en_US.

## 1.10 Success criteria

Ship when all of the following hold on a staging deploy with seeded data:

- A first-time visitor can complete a draft, publish, and see their creation in the gallery in under 90 seconds.
- Battle mode serves a new pair in under 300ms p95 after a vote.
- Leaderboard is correct against a hand-computed fixture of 50 battles.
- Every `[AC]` in this document has a passing test.

---

# Part 2 — Technical Spec

## 2.1 Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Server routes, cursor pagination, and `@vercel/og` share images in one deploy unit |
| Styling | **Tailwind CSS** + CSS custom properties for theme | Fast, and the card component needs precise sizing control |
| Animation | **Framer Motion** for UI transitions; the reel is hand-rolled CSS transform (see §2.7) | Framer's spring is wrong for a slot machine; you want a single long cubic-bezier |
| DB | **Postgres (Supabase or Neon)** | Relational: creations ↔ battles ↔ votes. Do not use a document store for this. |
| DB access | **Drizzle ORM** + `postgres.js` | Typed schema, cheap migrations |
| Cache / rate limit | **Upstash Redis** | Draft sessions (TTL) and sliding-window rate limits |
| Hosting | **Vercel** | Cron jobs for weekly rollover come free |
| Assets | **Riot Data Dragon**, patch pinned, hot-linked | See §2.2 |

Alternatives that are fine: SvelteKit + Postgres; Vite SPA + Cloudflare Workers + D1. The one non-negotiable is that **drafting is server-authoritative** (§2.5).

## 2.2 Champion data and assets

Source: **Riot Data Dragon** — public CDN, no API key, no rate limit, no auth. Base: `https://ddragon.leagueoflegends.com`.

Latest patch at time of writing: **`16.17.1`** (`GET /api/versions.json` returns a descending array; `[0]` is latest).

### Endpoints used

| Purpose | URL |
|---|---|
| Version list | `/api/versions.json` |
| Champion summary (all) | `/cdn/{v}/data/en_US/champion.json` |
| Champion detail (one) | `/cdn/{v}/data/en_US/champion/{ChampionId}.json` |
| Square icon | `/cdn/{v}/img/champion/{ChampionId}.png` (120×120) |
| Passive icon | `/cdn/{v}/img/passive/{passive.image.full}` (64×64) |
| Ability icon | `/cdn/{v}/img/spell/{spell.image.full}` (64×64) |
| Loading portrait | `/cdn/img/champion/loading/{ChampionId}_0.jpg` (308×560, **no version segment**) |
| Splash | `/cdn/img/champion/splash/{ChampionId}_0.jpg` (1215×717, **no version segment**) |

Note the two image paths without a version segment — that is correct, not a typo. `_0` is the base skin.

### Detail JSON shape (confirmed)

```jsonc
{ "type": "champion", "format": "standAloneComplex", "version": "16.17.1",
  "data": { "Aatrox": {
    "id": "Aatrox", "key": "266", "name": "Aatrox", "title": "the Darkin Blade",
    "image": { "full": "Aatrox.png", "sprite": "champion0.png", "group": "champion",
               "x": 0, "y": 0, "w": 48, "h": 48 },
    "tags": ["Fighter"], "partype": "Blood Well",
    "passive": { "name": "Deathbringer Stance", "description": "...",
                 "image": { "full": "Aatrox_Passive.png", ... } },
    "spells": [ { "id": "AatroxQ", "name": "The Darkin Blade",
                  "description": "...", "tooltip": "...",
                  "cooldownBurn": "14/12/10/8/6", "costBurn": "0", "rangeBurn": "650",
                  "image": { "full": "AatroxQ.png", ... }, "resource": "No Cost" }, ... ]
  } }
}
```

`spells` is **always length 4, always ordered Q, W, E, R**, for every champion including the weird ones (Aphelios, Elise, Jayce, Nidalee, Karma, Sylas, Gnar, Rek'Sai). Index directly: `spells[0..3]`. Do not try to be clever about form-swappers — showing "Nidalee's W" as `Bushwhack` is correct and funny.

### Build-time pipeline

`scripts/build-champions.ts`, run on `prebuild` and committed output:

1. `GET /api/versions.json`, take `[0]`, **or** use `DDRAGON_VERSION` env override.
2. `GET champion.json` → list of champion IDs (~170).
3. For each, `GET` the detail file, concurrency 8, with retry. ~170 requests, ~15s.
4. Emit `src/data/champions.json` conforming to §2.3.
5. Emit `src/data/version.json` = `{ "patch": "16.17.1", "generatedAt": "..." }`.

**Pin the patch.** Do not fetch Data Dragon at runtime. A patch change mid-session must never mutate a published creation's ability names. Store `patch` on each creation row (§2.4) so old creations keep rendering against the patch they were made on.

**Text sanitization.** `description` fields contain HTML (`<br>`, `<i>`, `<font color=...>`) and `tooltip` fields contain unresolved templates (`{{ e1 }}`, `{{ spelldamage }}`). Use `description`, not `tooltip`. In the pipeline: strip all tags except convert `<br>`/`<br/>` → `\n`, decode entities, collapse whitespace, trim. Store the cleaned string. `[AC]` No rendered ability description contains `<` or `{{`.

**Images.** Hot-link Data Dragon directly. It is a public CDN built for this and everyone does it. Serve through `next/image` with `remotePatterns` for `ddragon.leagueoflegends.com`, `unoptimized` for the loading portraits (they are already well-compressed JPEGs). Optionally add `scripts/mirror-assets.ts` to pull everything into `public/ddragon/` behind a `USE_LOCAL_ASSETS` flag — worth having if a CDN outage would embarrass you, but not needed to ship.

**Legal.** Footer, verbatim:

> Frankenchamp isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

## 2.3 Static champion data model

```ts
type Champion = {
  id: string;            // "Aatrox" — DDragon key, also our stable ID
  key: string;           // "266" — Riot numeric id
  name: string;          // "Aatrox"
  title: string;         // "the Darkin Blade"
  tags: string[];        // ["Fighter"]
  square: string;        // full CDN url
  loading: string;       // full CDN url
  splash: string;        // full CDN url
  abilities: {
    passive: Ability;
    q: Ability; w: Ability; e: Ability; r: Ability;
  };
};

type Ability = {
  name: string;          // "Deathbringer Stance"
  description: string;   // sanitized plain text
  icon: string;          // full CDN url
  cooldown?: string;     // cooldownBurn, e.g. "14/12/10/8/6" — passive has none
  cost?: string;         // costBurn
  range?: string;        // rangeBurn
};
```

`champions.json` is `Record<string, Champion>` plus an exported `CHAMPION_IDS: string[]`. Roughly 400KB, gzips to ~90KB. Ship it in the client bundle for the reel; the server imports it too.

## 2.4 Database schema

```sql
-- Anonymous users
create table users (
  id           uuid primary key default gen_random_uuid(),
  display_name text not null,
  created_at   timestamptz not null default now(),
  is_banned    boolean not null default false,
  last_ip_hash text                        -- sha256(ip + salt), for abuse only
);

-- Server-issued draft sessions (also mirrored in Redis for TTL; Postgres is the audit trail)
create table drafts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id),
  champion_ids  text[] not null,            -- the 6 dealt, in deal order
  assignments   jsonb not null default '{}',-- { "q": "Lux", ... }
  revealed_count smallint not null default 0,
  status        text not null default 'active', -- active | published | expired
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null
);

create table creations (
  id          uuid primary key default gen_random_uuid(),
  draft_id    uuid not null unique references drafts(id),
  user_id     uuid not null references users(id),
  name        text not null,               -- 1..24 chars
  tagline     text,                        -- <=140
  model_id    text not null,               -- champion ids
  passive_id  text not null,
  q_id        text not null,
  w_id        text not null,
  e_id        text not null,
  r_id        text not null,
  patch       text not null,               -- "16.17.1"
  week_key    text not null,               -- "2026-W36" (ISO week, UTC)
  rating      integer not null default 1200,
  upvotes     integer not null default 0,
  battles     integer not null default 0,
  wins        integer not null default 0,
  report_count integer not null default 0,
  is_hidden   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on creations (created_at desc) where not is_hidden;
create index on creations (week_key, is_hidden);
create index on creations (rating) where not is_hidden;

create table upvotes (
  creation_id uuid not null references creations(id) on delete cascade,
  user_id     uuid not null references users(id),
  created_at  timestamptz not null default now(),
  primary key (creation_id, user_id)
);

create table battles (
  id          uuid primary key default gen_random_uuid(),
  a_id        uuid not null references creations(id),
  b_id        uuid not null references creations(id),
  winner_id   uuid references creations(id),  -- null = skipped
  voter_id    uuid not null references users(id),
  week_key    text not null,
  created_at  timestamptz not null default now(),
  check (a_id < b_id)                         -- canonical ordering
);
create unique index on battles (voter_id, a_id, b_id, week_key);
create index on battles (week_key);

create table battle_comments (
  id          uuid primary key default gen_random_uuid(),
  battle_pair text not null,                  -- "{a_id}:{b_id}" canonical
  user_id     uuid not null references users(id),
  body        text not null,                  -- <=200
  is_hidden   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on battle_comments (battle_pair, created_at desc);

create table reports (
  id           uuid primary key default gen_random_uuid(),
  target_type  text not null,                 -- creation | comment
  target_id    uuid not null,
  user_id      uuid not null references users(id),
  reason       text,
  created_at   timestamptz not null default now()
);
create unique index on reports (target_type, target_id, user_id);

create table hall_of_fame (
  week_key    text not null,
  rank        smallint not null,
  creation_id uuid not null references creations(id),
  wins        integer not null,
  losses      integer not null,
  score       double precision not null,      -- wilson lower bound
  primary key (week_key, rank)
);
```

Weekly `wins`/`losses` are **derived** from `battles` filtered by `week_key`, materialized into a view refreshed on demand (or a small aggregate query — at MVP volume a plain `GROUP BY` is fine and correct; do not prematurely denormalize). The `creations.wins/battles/rating` columns are lifetime, for matchmaking.

`week_key` helper: ISO-8601 week of the UTC timestamp, formatted `YYYY-'W'WW`. Use `date-fns` `getISOWeek`/`getISOWeekYear` and **always compute from a UTC date**, never local.

## 2.5 The draft is server-authoritative

This is the load-bearing architectural decision. If the client picks the six champions, the whole premise is a lie: anyone can open devtools and publish a hand-picked build, the gallery fills with intentional god-builds, and battle mode becomes meaningless. So:

```
POST /api/draft
  → server: rate-limit check → shuffle CHAMPION_IDS (crypto RNG) → take 6
    → insert drafts row (champion_ids stored, NOT returned)
    → returns { draftId, total: 6 }

POST /api/draft/{id}/reveal
  → validates: draft belongs to caller, status=active, revealed_count < 6,
    and all previously revealed slots are assigned
  → increments revealed_count
  → returns { index, champion: Champion }   ← exactly one champion, ever

POST /api/draft/{id}/assign  { slot: "q" }
  → validates: slot is empty, revealed_count == assignments.size + 1
  → writes assignments[slot] = champion_ids[revealed_count - 1]
  → if this was the 6th assign, auto-nothing (the 6th reveal had one legal slot;
    server still requires the client to send it, and rejects any other slot)
  → returns { assignments }

POST /api/draft/{id}/publish  { name, tagline }
  → validates: 6/6 assigned, status=active, text filter passes
  → inserts creations row from assignments (server-side, ignores any client-sent champs)
  → sets draft status=published
  → returns { creationId }
```

`[AC]` A client that calls `/reveal` twice without an intervening `/assign` gets 409 and no extra champion.
`[AC]` A client that POSTs `/publish` with a body containing champion IDs has them ignored entirely.
`[AC]` A draft older than 30 minutes returns 410 and cannot be published.

Redis mirror: key `draft:{id}` → the same state, TTL 1800s, used for the hot path. Postgres is the durable record and the fallback.

## 2.6 API surface

All routes under `/api`. All responses `{ ok: true, data }` or `{ ok: false, error: { code, message } }`. All mutating routes read the `uid` cookie and mint a user if absent.

| Method | Route | Notes |
|---|---|---|
| POST | `/api/draft` | start a draft |
| POST | `/api/draft/{id}/reveal` | next champion |
| POST | `/api/draft/{id}/assign` | body `{ slot }` |
| POST | `/api/draft/{id}/publish` | body `{ name, tagline? }` |
| GET | `/api/creations` | `?sort=new\|top\|week&cursor=&limit=24` |
| GET | `/api/creations/{id}` | 404 if hidden |
| POST | `/api/creations/{id}/upvote` | toggles, returns new count |
| POST | `/api/creations/{id}/report` | body `{ reason? }` |
| GET | `/api/battle` | returns `{ pairToken, a: Creation, b: Creation }` |
| POST | `/api/battle/vote` | body `{ pairToken, winner: "a"\|"b"\|"skip" }` |
| GET | `/api/battle/comments` | `?pairToken=` |
| POST | `/api/battle/comments` | body `{ pairToken, body }` |
| GET | `/api/leaderboard` | `?week=2026-W36` (default: current) |
| GET | `/api/hall-of-fame` | last 12 weeks |
| POST | `/api/user/name` | rename, once per 24h |
| GET | `/c/{id}/opengraph-image` | 1200×630 PNG via `@vercel/og` |
| POST | `/api/cron/weekly-rollover` | Vercel Cron, `CRON_SECRET` header |

`pairToken` is an HMAC of `{a_id}:{b_id}:{week_key}:{voter_id}` with a server secret, so the vote endpoint cannot be fed an arbitrary pair. Verify and reject on mismatch.

**Cursor pagination:** base64 of `{createdAt, id}` for `sort=new`; `{score, id}` for ranked sorts. Never `OFFSET`.

## 2.7 Battle pairing algorithm

Goal: competitive matchups, even exposure, no self-votes, no repeats.

```
1. Candidate pool = creations where
     not is_hidden
     and created_at > now() - 8 weeks
     and user_id != viewer
2. Pick A: weighted random, weight = 1 / (1 + battles)   -- favors under-exposed
   Implement as: ORDER BY random() / (1 + battles) LIMIT 1  (fine at MVP scale;
   swap to a maintained bucket index if the table passes ~100k rows)
3. Pick B: from candidates with |rating(B) - rating(A)| < 200, same weighting,
   excluding A. If none, widen the band to 400, then drop it entirely.
4. Reject the pair if (voter, a, b, week) already exists in battles. Retry up to 5×,
   then serve anyway with the dedupe index tolerated (vote will 409 → client refetches).
5. Canonicalize so a_id < b_id, then sign the pairToken.
```

**Cold start:** below 20 creations, pairing degrades to pure random and battle mode shows a "still warming up" note. Seed staging with ~200 generated creations so this path is exercised.

**Elo update on vote** (skip = no update):

```
expectedA = 1 / (1 + 10^((ratingB - ratingA) / 400))
ratingA += 24 * ((winner == A ? 1 : 0) - expectedA)
ratingB += 24 * ((winner == B ? 1 : 0) - (1 - expectedA))
```

Apply in the same transaction as the `battles` insert, with the unique index as the idempotency guard: on conflict, do nothing and return the existing result.

## 2.8 The reel animation

The single highest-leverage piece of feel in the product. Get this right.

**Construction.** A vertical strip of 44 champion square icons in a container with `overflow: hidden`, item height 96px. Items 0..42 are random champions (allowed to repeat, purely decorative); item **43 is the actual drawn champion**, which the client learns only from `/reveal`.

**Sequence:**

| Phase | Duration | What |
|---|---|---|
| Anticipation | 220ms | Strip nudges *up* 24px, ease-out. Wind-up. |
| Spin | 1900ms | `translateY` from `+24px` to `-(43 * 96)px`, `cubic-bezier(0.16, 0.9, 0.28, 1)`. Long tail — 80% of distance in the first 40% of time, then a visible crawl into the stop. |
| Overshoot | 140ms | 8px past, then settle back. |
| Impact | 180ms | White flash overlay 0.35→0 opacity, 4px screen shake, icon scales 1.0→1.08→1.0. |
| Card reveal | 300ms | Portrait + abilities fade/slide in, staggered 40ms per ability row. |

**Motion blur** during spin: `filter: blur(0px→6px→0px)` keyed to velocity, plus a top/bottom `mask-image` gradient fade on the container. Do not use per-frame JS — one CSS transition on `transform` and one on `filter`, hardware-composited.

**Ability icon spin** for slots 2–6: the same treatment but with a 3-row horizontal reel of ability icons instead. Reuse the component with an `axis` prop.

**Audio** (optional, default off, persisted toggle): a ticking loop pitched to the reel velocity, plus a thunk on impact. If you ship audio, it must never autoplay before a user gesture.

**Reduced motion:** `@media (prefers-reduced-motion: reduce)` → no reel. Cross-fade straight to the reveal over 200ms, keep the flash at 0.1 opacity, keep all timings under 400ms total.

`[AC]` The reel never reveals the drawn champion before `/reveal` resolves — the strip's final item is populated from the response, and the spin does not start until the response lands.
`[AC]` With reduced motion enabled, a full 6-round draft is completable in under 20 seconds.

## 2.9 Share image

`app/c/[id]/opengraph-image.tsx` using `@vercel/og` (Satori). 1200×630. Renders the champion card horizontally: portrait left (cropped), name and six rows right, footer with site name. Cache `immutable, max-age=31536000` keyed by creation id — creations are immutable after publish, so this is free.

Satori constraints to respect: flexbox only, no `gap` on some versions, explicit `display: flex` on every div, fonts loaded as ArrayBuffer, images must be absolute URLs (Data Dragon URLs work directly).

## 2.10 Weekly rollover job

`vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/weekly-rollover", "schedule": "0 0 * * 1" }] }
```

The handler:
1. Verify `Authorization: Bearer ${CRON_SECRET}`.
2. Compute `closingWeek` = ISO week of `now - 1 hour`.
3. Aggregate battles for that week → per-creation wins/losses → Wilson score, min 8 battles.
4. Insert top 10 into `hall_of_fame` (`ON CONFLICT DO NOTHING` — the job must be idempotent; Vercel can retry).
5. Expire `drafts` where `expires_at < now()` and `status = 'active'`.

`[AC]` Running the rollover twice for the same week produces identical `hall_of_fame` rows and no duplicates.

## 2.11 Project layout

```
src/
  app/
    page.tsx                  lobby
    draft/page.tsx            the six rounds
    c/[id]/page.tsx           creation permalink
    c/[id]/opengraph-image.tsx
    gallery/page.tsx
    battle/page.tsx
    leaderboard/page.tsx
    admin/page.tsx
    api/...                   routes per §2.6
  components/
    ChampionCard.tsx          the unit — 3 size variants
    Reel.tsx                  §2.8
    SlotGrid.tsx              the six slots during draft
    AbilityRow.tsx
    VoteBar.tsx
  data/
    champions.json            generated, committed
    version.json
  lib/
    db/schema.ts  db/index.ts (drizzle)
    draft.ts      shuffle, validation
    elo.ts        rating math
    wilson.ts     leaderboard math
    weeks.ts      ISO week helpers (UTC only)
    profanity.ts
    ratelimit.ts  (upstash)
    pairToken.ts  HMAC sign/verify
    user.ts       cookie → user
scripts/
  build-champions.ts
  seed.ts                     ~200 fake creations + ~2000 battles
tests/
```

## 2.12 Testing

- **Unit:** `elo`, `wilson`, `weeks` (DST and year-boundary cases: Dec 29 2025 → `2026-W01`), `profanity`, `pairToken`.
- **Integration** (Postgres in Docker): the full draft state machine including every `[AC]` in §2.5; vote idempotency; pairing exclusions; rollover idempotency.
- **Fixture test:** 50 hand-specified battles → assert exact leaderboard order.
- **E2E** (Playwright): complete a draft → publish → find it in gallery → vote in a battle. Run with reduced-motion forced.
- **Visual:** snapshot `ChampionCard` at all three sizes for 5 champions including the long-name and apostrophe cases.

## 2.13 Environment

```
DATABASE_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
PAIR_TOKEN_SECRET=
CRON_SECRET=
ADMIN_TOKEN=
IP_HASH_SALT=
DDRAGON_VERSION=            # optional pin override
NEXT_PUBLIC_SITE_URL=
```

## 2.14 Build order

1. **Asset pipeline** (§2.2) → `champions.json`. Nothing else can be built without it.
2. **`ChampionCard`** with hardcoded props. Get it looking good before anything is dynamic — everything downstream is this component.
3. **Schema + migrations** (§2.4), `seed.ts`.
4. **Draft state machine** server-side (§2.5) with integration tests, no UI.
5. **Draft UI** with a placeholder instant reveal.
6. **The reel** (§2.8). Budget real time here; it is the product's feel.
7. **Publish + gallery + permalink + OG image.**
8. **Battle mode + Elo.**
9. **Leaderboard + Wilson + rollover cron.**
10. **Safety: filter, rate limits, report, admin.**
11. Comments on battles (flagged off until moderation is ready).

Steps 1–7 are a shippable product on their own. If the timeline compresses, cut in this order: comments → hall of fame → battle comments' live strip → audio.

---

## Appendix A — Known content edge cases

- **Names with apostrophes/spaces:** Kai'Sa, Kha'Zix, Cho'Gath, Vel'Koz, Rek'Sai, Bel'Veth, Kog'Maw, LeBlanc, Dr. Mundo, Jarvan IV, Lee Sin, Master Yi, Miss Fortune, Tahm Kench, Twisted Fate, Xin Zhao, Aurelion Sol, Renata Glasc, Nunu & Willump, K'Sante. DDragon `id` strips these (`Kaisa`, `MonkeyKing` for Wukong, `Nunu`, `DrMundo`, `AurelionSol`, `RenataGlasc`, `KSante`) — **always key by `id`, display `name`.**
- **Wukong's id is `MonkeyKing`.** Hardcoding `Wukong` anywhere will break.
- **Form-swap champions** (Elise, Jayce, Nidalee, Gnar, Rek'Sai, Karma, Sylas, Aphelios) expose only their primary form's four spells. This is correct and desirable — do not special-case them.
- **Passive icons are sometimes shared** across a champion's abilities; not a bug.
- **Loading art aspect** is 308×560 for every champion, so a fixed-ratio panel is safe.
- **New champion releases** appear on the next patch pull. Bump `DDRAGON_VERSION`, re-run the pipeline, redeploy. Existing creations keep their stored `patch` for display fidelity.

## Appendix B — Copy and tone

Terse, a little mean, never cringe. Ship with these:

- Lobby CTA: **"Roll the abomination"**
- Round header: **"Round 3 of 6 — where does this one go?"**
- Last round: **"No choices left. Live with it."**
- Publish: **"Release it into the wild"**
- Battle: **"Which one wins the 1v1?"**
- Empty gallery: **"Nobody has built anything yet. Suspicious."**
