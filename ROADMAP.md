# Bloxparty Roadmap

## Completed

### Web Platform
- [x] Landing page with live coin ticker marquee, featured artists, and Roblox deep link
- [x] Artist discovery page — sort by market cap, volume, community votes
- [x] Artist profile pages with Birdeye candlestick charts, track playback, coin stats, voting
- [x] Event creation with Quick Fill from trending artists + auto-fetch top 10 tracks
- [x] Event detail pages with creator coin card, playlist player, Discord/Roblox links
- [x] Full music player — trending, 8 genres, search, seek, volume, auto-advance
- [x] Solana wallet connection (Phantom) with Audius identity auto-detection
- [x] Glassmorphism UI with custom color palette and scroll reveal animations

### Audius Integration (14 API endpoints)
- [x] Creator coins — live prices, market cap, 24h volume, holder count, price change
- [x] Artist profiles — bio, followers, tracks, supporters, connected wallets
- [x] Track streaming — in-browser playback via Audius stream endpoints
- [x] Artist search — find any Audius creator by name
- [x] Trending data — coins by market cap/volume, trending tracks and playlists
- [x] Wallet lookup — detect Audius identity from connected Solana wallet
- [x] Coin holders — top holders via `/coins/:mint/members`
- [x] Coin insights — market analytics via `/coins/:mint/insights`

### Discord Bot
- [x] `/link <roblox_username>` — auto-fetches Roblox user ID, whitelists account
- [x] `/status` — check whitelist and holder role status
- [x] `/unlink` — remove whitelist entry from database
- [x] Role-gating via Collab.Land verified holder role
- [x] Deployed on Railway as standalone Docker service

### Roblox
- [x] Verifier script — checks whitelist API on player join, kicks unauthorized
- [x] AudioManager script — sequential playlist playback with loop
- [x] Whitelist REST API — POST (add), DELETE (remove), GET (verify)

### Token-Gating Pipeline (End-to-End)
- [x] Collab.Land verifies SPL token holdings on Solana → assigns Discord role
- [x] Discord bot checks role → calls whitelist API with Roblox username
- [x] Roblox game calls verify API on player join → allows or kicks

## Next Up

### Attendance NFTs / POAPs
- [ ] Mint compressed NFT (Bubblegum) after event ends
- [ ] Claim page for verified attendees
- [ ] Gallery showing collected attendance NFTs per wallet

### Roblox Experience Polish
- [ ] Concert venue with stage, audience area, VIP section
- [ ] Event-specific stage configurations (lighting, effects)
- [ ] In-game GUI showing current track, artist info, event name
- [ ] VIP areas gated by higher-tier token holdings

### Platform Features
- [ ] Event scheduling with countdown timer
- [ ] Social sharing (Twitter cards, OG images)
- [ ] Event analytics dashboard for creators
