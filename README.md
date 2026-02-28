# bloxparty

**Token-Gated Concerts on Roblox, Powered by Audius**

Artists launch creator coins on Audius. Fans who hold the coin get exclusive access to live concert experiences in Roblox. Hold the coin. Join the show.

[![Live on Railway](https://img.shields.io/badge/Live-Railway-brightgreen)](https://bloxparty.up.railway.app)
[![Solana](https://img.shields.io/badge/Built%20on-Solana-9945FF)](https://solana.com)
[![Audius](https://img.shields.io/badge/Powered%20by-Audius-7E1BCC)](https://audius.co)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js%2015-black?logo=next.js&logoColor=white)](https://nextjs.org)

[**Live Demo**](https://bloxparty.up.railway.app) · [**Discord**](https://discord.gg/sDawtbUm) · [**Roadmap**](ROADMAP.md)

---

`solana` `audius` `creator-coins` `roblox` `token-gating` `discord` `web3` `hackathon`

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [How It Works](#how-it-works)
- [Features](#features)
- [Audius API Integration](#audius-api-integration)
- [Demo](#demo)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Roadmap](#roadmap)

---

## The Problem

Virtual concerts are massive — Lil Nas X drew 33M attendees on Roblox, and billions are spent on virtual experiences annually. But there's no bridge between **music creators with on-chain economies** and **the platforms where their fans actually hang out**.

- Artists launch creator coins on Audius but have no way to gate real experiences with them
- Roblox has 80M+ daily active users but no native crypto integration
- Token-gating exists on Discord but stops there — it never reaches the game

## The Solution

Bloxparty connects the entire pipeline: **Audius creator coins** become the ticket, **Discord** becomes the verification layer, and **Roblox** becomes the venue.

Fans hold a creator coin → Collab.Land verifies on Discord → bot whitelists their Roblox account → they join the concert. One token, one pipeline, zero friction.

---

## How It Works

```mermaid
flowchart LR
    A["Fan holds<br/>$YAK coin"] --> B["Joins Discord"]
    B --> C["Collab.Land verifies<br/>Solana wallet"]
    C --> D["Gets 'kodakBLOX'<br/>role"]
    D --> E["Runs /link<br/>Roblox username"]
    E --> F["Bot calls<br/>whitelist API"]
    F --> G["Joins Roblox<br/>concert"]

    style A fill:#261CC1,stroke:#3A9AFF,color:#fff
    style B fill:#5865F2,stroke:#3A9AFF,color:#fff
    style C fill:#261CC1,stroke:#3A9AFF,color:#fff
    style D fill:#261CC1,stroke:#3A9AFF,color:#fff
    style E fill:#5865F2,stroke:#3A9AFF,color:#fff
    style F fill:#1C0770,stroke:#3A9AFF,color:#fff
    style G fill:#00A651,stroke:#3A9AFF,color:#fff
```

### Architecture

```mermaid
flowchart TB
    subgraph WEB["Web App — Next.js"]
        LP[Landing Page<br/>Coin Ticker + Featured Artists]
        AD[Artist Discovery<br/>Sort by MC / Volume / Votes]
        AP[Artist Profiles<br/>Charts + Tracks + Coin Stats]
        EC[Event Creation<br/>Quick Fill + Track Preview]
        ED[Event Detail<br/>Playlist + Coin Card + Links]
        MP[Music Player<br/>8 Genres + Search + Streaming]
    end

    subgraph AUDIUS["Audius API — 14 Endpoints"]
        COINS["/coins<br/>Prices, MC, Volume, Holders"]
        USERS["/users<br/>Profiles, Tracks, Supporters"]
        STREAM["/tracks/stream<br/>Audio Streaming"]
    end

    subgraph DISCORD["Discord"]
        CL[Collab.Land<br/>SPL Token Verification]
        BOT[Bloxparty Bot<br/>/link  /status  /unlink]
    end

    subgraph ROBLOX["Roblox Game"]
        VER[Verifier.lua<br/>Whitelist Check on Join]
        AUD[AudioManager.lua<br/>Playlist Playback]
    end

    subgraph DB["PostgreSQL"]
        WL[(roblox_whitelist)]
        EV[(events)]
        VO[(artist_votes)]
    end

    WEB <--> AUDIUS
    BOT -->|"POST /api/roblox/whitelist"| DB
    VER -->|"GET /api/roblox/verify"| DB
    CL -->|"Assigns Role"| BOT
    WEB --> DB

    style WEB fill:#0a0a0a,stroke:#261CC1,color:#ededed
    style AUDIUS fill:#7E1BCC,stroke:#B15EFF,color:#fff
    style DISCORD fill:#5865F2,stroke:#7289DA,color:#fff
    style ROBLOX fill:#00A651,stroke:#00D166,color:#fff
    style DB fill:#1C0770,stroke:#3A9AFF,color:#fff
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Creator Coin Ticker** | Live scrolling marquee — prices, market caps, 24h changes from Audius |
| **Artist Discovery** | Browse trending artists sorted by market cap, volume, or community votes |
| **Artist Profiles** | Birdeye candlestick charts, track playback, coin stats, vote for concerts |
| **Event Creation** | Quick Fill from trending artists, auto-fetch top 10 tracks as playlist |
| **Music Player** | Full player — 8 genres, search, seek, volume, auto-advance |
| **Token-Gating** | Collab.Land verifies coin holdings → Discord role → Roblox whitelist |
| **Discord Bot** | `/link`, `/status`, `/unlink` — auto-fetches Roblox user ID from username |
| **Roblox Verification** | Whitelist check on player join, kicks unauthorized players |
| **Audio Playback** | In-game concert playlist with sequential playback and loop |
| **Wallet Detection** | Auto-detect Audius identity from connected Phantom wallet |
| **Community Voting** | Vote for which artist performs at the next token-gated event |

---

## Audius API Integration

Bloxparty uses **14 Audius API endpoints** for deep platform integration:

### Creator Coins
```
GET /coins                        Live prices, market caps, volume, holder counts
GET /coins/:mint                  Single coin details
GET /coins/:mint/members          Top coin holders leaderboard
GET /coins/:mint/insights         24h market analytics
```

### Users
```
GET /users/:id                    Artist profile (bio, followers, stats)
GET /users/:id/tracks             Artist's track catalog
GET /users/:id/supporters         Top fans / supporters
GET /users/:id/connected_wallets  SOL + ERC wallet addresses
GET /users/id?associated_wallet=X Lookup user by Solana wallet
GET /users/search?query=X         Search artists by name
```

### Tracks & Playlists
```
GET /tracks/trending              Trending tracks (all-time, weekly, by genre)
GET /tracks/search?query=X        Search tracks
GET /tracks/:id/stream            Audio streaming endpoint
GET /playlists/:id/tracks         Playlist track listing
```

---

## Demo

### Token-Gating Flow

1. Visit [bloxparty.up.railway.app](https://bloxparty.up.railway.app) and connect your Phantom wallet
2. Browse artists, check creator coin prices, vote for concerts
3. Join the [Discord](https://discord.gg/sDawtbUm) — Collab.Land verifies your $YAK holdings
4. Run `/link YourRobloxUsername` in Discord
5. Join the Roblox concert — Verifier.lua checks your whitelist status
6. You're in

### Kodak Black $YAK Demo

We demo with **Kodak Black's $YAK creator coin** on Audius:
- **Mint:** `ZDaUDL4XFdEct7UgeztrFQAptsvh4ZdhyZDZ1RpxYAK`
- **Audius:** [@kodakblack](https://audius.co/kodakblack)
- Fans holding $YAK get the `kodakBLOX` role on Discord → whitelisted for the Roblox concert

---

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL database

### Installation

```bash
git clone https://github.com/hamzaskewl/bloxparty.git
cd bloxparty

# Install web app dependencies
npm install

# Install Discord bot dependencies
cd discord && npm install && cd ..

# Set up environment
cp .env.example .env
# Edit .env with your credentials
```

### Environment Variables

```env
# Solana
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Audius
NEXT_PUBLIC_AUDIUS_API_HOST=https://discoveryprovider.audius.co

# Discord
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
VERIFIED_ROLE_NAME=kodakBLOX

# Roblox
NEXT_PUBLIC_ROBLOX_PLACE_ID=77480467395158

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/bloxparty
```

### Run Locally

```bash
# Web app
npm run dev

# Discord bot (separate terminal)
cd discord && node bot.js
```

### Deploy on Railway

The project runs as two services from one repo:

| Service | Type | Root Directory | Start Command |
|---------|------|---------------|---------------|
| **Web App** | Next.js | `/` (root) | `npm start` |
| **Discord Bot** | Docker | `/discord` | `node bot.js` |

---

## Project Structure

```
bloxparty/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx               # Landing (ticker, artists, Roblox CTA)
│   │   ├── artists/
│   │   │   ├── page.tsx           # Artist discovery (sort, vote, search)
│   │   │   └── [id]/page.tsx      # Artist profile (chart, tracks, coin)
│   │   ├── events/
│   │   │   ├── page.tsx           # Event creation (Quick Fill)
│   │   │   └── [id]/page.tsx      # Event detail (playlist, coin card)
│   │   ├── music/page.tsx         # Music player (genres, streaming)
│   │   └── api/
│   │       ├── artists/vote/      # POST/GET artist votes
│   │       ├── roblox/
│   │       │   ├── whitelist/     # POST/DELETE whitelist entries
│   │       │   └── verify/        # GET verification check
│   │       ├── events/            # POST/GET events
│   │       └── audius/user/       # Wallet → Audius lookup
│   │
│   ├── components/
│   │   ├── Nav.tsx                # Glass navbar with wallet button
│   │   ├── CoinBadge.tsx          # Creator coin display component
│   │   ├── ArtistCard.tsx         # Artist card (compact / full)
│   │   └── WalletButton.tsx       # Phantom wallet adapter
│   │
│   └── lib/
│       ├── audius/client.ts       # Audius API client (14 endpoints)
│       └── db/
│           ├── index.ts           # Drizzle ORM connection
│           └── schema.ts          # events, roblox_whitelist, artist_votes
│
├── discord/
│   ├── bot.js                     # Discord bot (/link, /status, /unlink)
│   ├── package.json               # Bot dependencies
│   └── Dockerfile                 # Railway deployment
│
├── roblox/
│   └── ServerScriptService/
│       ├── Verifier.lua           # Whitelist check on player join
│       └── AudioManager.lua       # Concert playlist playback
│
└── public/
    └── logo.png                   # Bloxparty logo
```

---

## Tech Stack

**Frontend**
- Next.js 15 (App Router, Turbopack)
- React 19, TypeScript
- Tailwind CSS v4 with custom glassmorphism utilities
- Istok Web font

**Blockchain**
- Solana Web3.js
- Phantom Wallet Adapter
- Audius REST API (14 endpoints)
- Collab.Land (SPL token-gating)

**Backend**
- Drizzle ORM + PostgreSQL
- Next.js API Routes

**Discord**
- discord.js v14
- Slash commands with Roblox username auto-lookup
- Collab.Land role verification

**Roblox**
- Lua (ServerScriptService)
- HttpService for API calls
- Sound service for audio playback

**Infrastructure**
- Railway (web app + bot as separate services)
- Docker (bot deployment)

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full roadmap.

**Up Next:**
- Attendance NFTs / POAPs via Bubblegum compressed NFTs
- Enhanced Roblox venue — VIP areas, stage effects, in-game GUI
- Event scheduling with countdown timers

---

## Acknowledgments

- **Audius** — Creator coin infrastructure and music streaming API
- **Collab.Land** — SPL token-gating on Discord
- **Roblox** — 80M+ DAU platform for virtual experiences
- **Solana Foundation** — Graveyard Hack sponsorship

---

<p align="center">
  <img src="public/logo.png" alt="bloxparty" width="80" />
  <br /><br />
  <strong>Hold the coin. Join the show.</strong>
  <br /><br />
  Built for Solana's Graveyard Hack — Audius Music Bounty
</p>
