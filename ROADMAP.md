# Deadathon Roadmap

## Current (MVP)
- [x] Solana ticket purchases (SOL transfer to creator wallet)
- [x] Stealth purchases (DKSAP via ECDH, stealth scanner)
- [x] Event creation with Audius playlist picker
- [x] Music player (all-time trending, genres, search, volume, seek)
- [x] Minecraft whitelisting via ServerTap REST API
- [x] Duplicate ticket prevention (1 per wallet per event)
- [x] Stealth transfer routes SOL to creator, not stealth address

## Next Up

### Audius Creator Coins Integration
- [ ] Display creator coin info on event pages (`GET /coins` by owner_id)
- [ ] Show coin price, market cap, holder count, 24h volume
- [ ] Token-gated events: require holding X amount of a creator's coin to buy ticket
- [ ] Coin holder leaderboard per event (`GET /coins/:mint/members`)
- [ ] Coin insights dashboard (`GET /coins/:mint/insights`)
- [ ] Volume leaders display (`GET /coins/volume-leaders`)
- [ ] Link events to Audius artist profiles via coin ticker

### Attendance NFTs / POAPs
- [ ] Mint attendance NFT (compressed NFT via Bubblegum) after event ends
- [ ] NFT metadata: event name, date, artist, venue screenshot
- [ ] Claim page: ticket holders can claim their attendance NFT
- [ ] Gallery page: show all attendance NFTs a wallet has collected
- [ ] Use NFT ownership for future perks (early access, discounts)

### Creator Economy
- [ ] Creator profiles: link Twitter/Twitch/Audius accounts
- [ ] Anyone can create events FOR a creator (fans organize shows)
- [ ] Creator claims funds by connecting their platform account
- [ ] Revenue split: event organizer fee vs creator payout
- [ ] Tipping during live events (direct SOL tips to creator)
- [ ] Audius tips integration (`GET /tips` API)

### Minecraft Experience
- [ ] Single persistent world with multiple venue areas
- [ ] OpenAudioMC: stream Audius tracks at concert stage
- [ ] ServerTap: auto-whitelist on ticket purchase
- [ ] Event-specific areas/stages in the world
- [ ] In-game commands for current event info
- [ ] Particle effects / fireworks during live performances

### Twitch Integration
- [ ] tmi.js bot for event chat
- [ ] Chat commands: !ticket, !event, !song
- [ ] Stream overlay with current track + ticket count
- [ ] Chat-triggered Minecraft events (vote for next song, etc.)

### Platform Features
- [ ] Multi-tier tickets (GA, VIP, backstage)
- [ ] Event scheduling with countdown
- [ ] Refund mechanism (before event starts)
- [ ] Event analytics dashboard for creators
- [ ] Social sharing (Twitter cards, OG images)
- [ ] Mobile-responsive improvements

## Audius API Endpoints to Integrate

### Creator Coins
```
GET /coins                     - List/search coins (sort by market_cap, volume, price)
GET /coins/:mint               - Single coin details
GET /coins/ticker/:ticker      - Coin by ticker symbol
GET /coins/:mint/members       - Coin holders list
GET /coins/:mint/insights      - Market data, 24h metrics, bonding curve
GET /coins/volume-leaders      - Top trading addresses
```

### Social
```
GET /tips                      - Recent tips on network
GET /users/:id/supporters      - User's top supporters (tippers)
GET /users/:id/followers       - Followers list
GET /users/:id/following       - Following list
```

### Tracks
```
GET /tracks/trending?time=allTime  - All-time trending (what we use now)
GET /tracks/trending?time=week     - Weekly trending
GET /tracks/search?query=X         - Search tracks
GET /tracks/:id/stream             - Stream audio
```

## Tech Stack
- Next.js 16 (App Router, Turbopack)
- Solana Web3.js + Phantom wallet adapter
- Custom DKSAP stealth protocol (tweetnacl, bs58)
- Drizzle ORM + PostgreSQL (Railway)
- Audius REST API
- Paper MC + ServerTap + OpenAudioMC
- tmi.js (Twitch)
- Railway (deployment)
