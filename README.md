# Canna Book

A personal cannabis journal. Log the exact product you're smoking, how it made you feel, and whether you'd recommend it. A lookup fills in what the strain and brand are known for:

- **Indica / sativa / hybrid**, and for hybrids how far it leans, shown on an indica-to-sativa meter (e.g. "Hybrid, heavy indica lean · 75% indica / 25% sativa")
- **Terpenes**, with how prominent each one is, plus its aroma and associated effects
- **Flavors**, **expected effects** and **possible downsides**
- **Lineage**, typical THC/CBD, and what it's best for
- **Brand reputation**: a 1–5 score, what the brand is known for, and anything to watch out for (recalls, failed tests, inconsistent batches)
- **Sources** for everything it found

When you log a session, the strain's expected effects are pre-marked so you can compare what it's *supposed* to do with what you actually felt.

## Where the strain data comes from

Neither Leafly nor Weedmaps offers a public strain API anymore. Leafly shut its strain API down in 2016, and both now limit API access to dispensary/POS partners. So the lookup uses Claude (Anthropic's API) with live web search. It reads strain databases, lab results and brand reviews, then returns a structured profile. Results are cached in the local database, so looking up the same product twice doesn't cost anything. Use **Refresh info** to fetch it again.

Profiles are a research summary, not lab results. Terpenes and effects vary by grower and batch. The lookup reports its confidence and lists its sources so you can check them.

## Setup

Requires **Node.js 22.13 or newer**, because the app uses Node's built-in SQLite.

```bash
npm install
cp .env.example .env.local   # then paste your Anthropic API key into it
npm run dev
```

Open http://localhost:3000.

Get an API key at https://console.anthropic.com/settings/keys. Each new lookup typically costs a few cents.

## How it's built

- **Next.js** (App Router) with React. The UI is `app/page.tsx` plus `components/`.
- **API routes**
  - `GET/POST /api/entries`, `GET/PUT/DELETE /api/entries/:id` handle journal entries.
  - `POST /api/lookup` takes `{ brand, product, form, refresh? }` and returns a strain + brand profile.
- **Storage**: SQLite file at `data/canna-book.db` (override with `DATABASE_PATH`).
- **Lookup**: `lib/lookup.ts` calls Claude with the web search tool and a strict `record_profile` tool, so the response always has the expected shape.

## Deploying

This is a single-user app with no login. Run it locally or on a private server you control.

Hosts with a read-only or temporary filesystem, such as Vercel, won't keep the SQLite file. To deploy there, swap `lib/db.ts` for a hosted database (Postgres, Turso, etc.) and add authentication first.
