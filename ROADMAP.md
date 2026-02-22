# Deadathon Roadmap

## Current (MVP)
- [x] Token-gated access via Discord (Collab.Land verifies holdings, assigns roles)
- [x] Event creation with Audius playlist picker + Spotify URL support
- [x] Audius artist auto-detection from connected wallet
- [x] Audius music player (all-time trending, genres, search, volume, seek)
- [x] Roblox whitelist API (Discord bot submits usernames, game verifies)
- [x] Event detail page with "How to Join" steps (Discord → Roblox)
- [x] Artist profile cards on event pages (from Audius API)
- [x] Audius creator coins client (coins, members, insights)
- [x] Spotify playlist embed on event pages

## Next Up

### Creator Coins Deep Integration
- [ ] Display creator coin info on event pages (`GET /coins` by owner)
- [ ] Show coin price, market cap, holder count, 24h volume
- [ ] Coin holder leaderboard per event (`GET /coins/:mint/members`)
- [ ] Coin insights dashboard (`GET /coins/:mint/insights`)
- [ ] Volume leaders display (`GET /coins/volume-leaders`)
- [ ] Link events to Audius artist profiles via coin ticker

### Attendance NFTs / POAPs
- [ ] Mint attendance NFT (compressed NFT via Bubblegum) after event ends
- [ ] NFT metadata: event name, date, artist, venue screenshot
- [ ] Claim page: verified attendees can claim their attendance NFT
- [ ] Gallery page: show all attendance NFTs a wallet has collected
- [ ] Use NFT ownership for future perks (early access, exclusive events)

### Spotify Integration
- [ ] Parse Spotify playlist URL to extract track list
- [ ] Display Spotify track names alongside embedded player
- [ ] Auto-match Spotify tracks to Audius equivalents for in-browser playback

### Audius Supporters & Tips
- [ ] Show supporter rankings on artist/event pages (`GET /users/:id/supporters`)
- [ ] Audius tips feed (`GET /tips`)
- [ ] Top supporters badge on Discord (cross-reference supporter data)

### Roblox Experience
- [ ] Concert venue with stage, audience area, and VIP section
- [ ] Pre-uploaded curated audio playlist playback (synced for all players)
- [ ] Event-specific stage configurations (lighting, effects)
- [ ] In-game GUI showing current track, artist info, event name
- [ ] Particle effects / fireworks during live performances
- [ ] VIP areas gated by higher-tier token holdings

### Discord Bot Enhancements
- [ ] Custom bot for Roblox username submission (slash command)
- [ ] Auto-call whitelist API on username submit
- [ ] Event announcements channel (auto-post new events from web app)
- [ ] Live event notifications (event starting, setlist updates)

### Twitch Integration
- [ ] tmi.js bot for event chat
- [ ] Chat commands: !event, !song, !discord, !roblox
- [ ] Stream overlay with current track + event info
- [ ] Chat-triggered Roblox events (vote for next song, etc.)

### Platform Features
- [ ] Event scheduling with countdown
- [ ] Event analytics dashboard for creators
- [ ] Social sharing (Twitter cards, OG images)
- [ ] Mobile-responsive improvements
- [ ] Multi-event calendar view

## Audius API Endpoints Integrated

### Creator Coins
```
GET /coins                     - List/search coins (sort by market_cap, volume, price)
GET /coins/:mint               - Single coin details
GET /coins/:mint/members       - Coin holders list
GET /coins/:mint/insights      - Market data, 24h metrics
```

### Users
```
GET /users/:id                 - User profile
GET /users/:id/tracks          - User's tracks
GET /users/:id/supporters      - User's top supporters
GET /users/id?associated_wallet=X  - Lookup user by Solana wallet
GET /users/:id/connected_wallets   - Get connected wallets (SOL + ERC)
```

### Tracks
```
GET /tracks/trending?time=allTime  - All-time trending
GET /tracks/trending?time=week     - Weekly trending
GET /tracks/search?query=X         - Search tracks
GET /tracks/:id/stream             - Stream audio
```

### Playlists
```
GET /playlists/trending        - Trending playlists
GET /playlists/search?query=X  - Search playlists
GET /playlists/:id/tracks      - Playlist tracks
```

## Tech Stack
- Next.js 16 (App Router, Turbopack)
- Solana Web3.js + Phantom wallet adapter
- Drizzle ORM + PostgreSQL (Railway)
- Audius REST API
- Roblox (Lua, HttpService)
- Discord + Collab.Land (token-gating)
- Spotify (playlist embed)
- tmi.js (Twitch)
- Railway (deployment)
