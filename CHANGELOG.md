# Changelog

## [Unreleased]

### Added

- Eliminated nations are dimmed (greyed flag + strikethrough) on each participant card, with an `x/4 left` counter, via the shared `computeEliminatedTeams` / `isParticipantTeamEliminated` helpers (`shared/elimination.ts`) — covers knockout losers (including penalty-shootout defeats) and group-stage non-advancers once the group stage is complete
- Knockout bracket now flags the next upcoming match with a "Next up" badge and accent ring, in addition to pre-highlighting its participant(s) in the grid
- Knockout bracket fixtures now show kickoff date **and** time in the viewer's local timezone (previously date only)
- `docker-compose.production.yml` for deploy behind an external Caddy reverse proxy on a shared `proxy` Docker network

### Changed

- Knockout bracket is now an accurate binary tree: rounds are ordered by football-data match id (the official bracket order) instead of by kickoff date, so consecutive Round of 32 ties feed the correct Round of 16 match (e.g. Germany v Paraguay vs the France v Sweden winner)
- Bracket draws connector lines between each tie and the match it feeds, with rounds vertically aligned so every match sits at the midpoint of its two feeders; the Final is a connected column and the third-place play-off is shown as a separate card
- `docker-compose.cloudflared.yml` for deploy behind an existing Cloudflare Tunnel on the shared `cloudflare_tunnel` Docker network (no published host port; tunnel ingress targets `http://world-cup-sweepstakes:5000`)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) with Hetzner + existing Caddy stack instructions, plus a Cloudflare Tunnel deployment section
- Knockout bracket view with round columns (Round of 32 through Final) and TBD placeholders for unplayed ties
- Knockout bracket now shows each country's owning participant name beside the team, styled like the fixture metadata
- Clicking a knockout fixture highlights the owning participant(s) in the grid with an amber ring (click again to clear); coexists with participant click-to-highlight
- App now opens on the **Knockout Bracket** tab by default
- On load (and when the next game changes) the participant(s) playing the next upcoming fixture are pre-highlighted — preferring the next knockout match, else the next match overall; user clicks still override it
- Fixture view tabs: **Groups & Schedule** and **Knockout Bracket**
- Shared `buildOwnerFinder(participants)` helper resolving a team's owning participant, reused by the bracket and the next-game pre-highlight
- Shared participant team matching (`shared/teamMatch.ts`) with CSV name and alias fallback when API team IDs are missing

### Fixed

- Bracket matches no longer overlap vertically — each match sits in a taller equal-height slot with clear spacing
- Clicking a bracket fixture now highlights that fixture (amber ring) and is mutually exclusive with selecting a participant, so a previously selected participant's fixtures no longer stay highlighted; the next-game pre-highlight stops seeding once you interact
- Participant click-to-highlight now works when team resolver returns null by matching fixture teams on normalized names and aliases
- Upcoming fixtures (`SCHEDULED`, `TIMED`, `IN_PLAY`) highlight with the blue pending border when a participant is selected
- CSV nation names trimmed on load (fixes Windows `\r` suffix breaking alias lookup for DR Congo and similar)
- `Czech Republic` alias mapped to API team `Czechia`
- `Cannot GET /` in production (`npm start` and Docker): `ROOT_DIR` in `server/paths.ts` now resolves to the project root when the server runs from `dist/server/`, so `CLIENT_DIST` points at `dist/client` instead of the non-existent `dist/dist/client`
- Scheduler `TimeoutOverflowWarning` when the next match window is more than ~24.8 days away by chunking `setTimeout` delays to Node's 32-bit limit

## [1.0.0] - 2026-06-11

### Added

- Full-stack World Cup 2026 sweepstakes fixture tracker
- Express backend proxying football-data.org v4 with `X-Auth-Token` authentication
- Smart match-window scheduler (poll during live games + 1 hour post-match)
- React frontend with participant grid and fixture list
- Click-to-highlight participant fixtures with win (green), loss (red), draw (grey) borders
- Sweepstakes data loaded from `data/draw.csv` (12 participants × 4 teams)
- Team name alias resolution via `data/team-aliases.json`
- Country flag emoji display for all teams
- Profile image placeholders in `public/profiles/`
- Docker and docker-compose deployment with health checks and volume mounts
- JSON file cache at `data/cache/matches.json`
- SSE endpoint for live cache update notifications
- Unit tests for match result logic and poll window merging
