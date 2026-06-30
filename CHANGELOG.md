# Changelog

## [Unreleased]

### Added

- Eliminated nations are dimmed (greyed flag + strikethrough) on each participant card, with an `x/4 left` counter, via the shared `computeEliminatedTeams` / `isParticipantTeamEliminated` helpers (`shared/elimination.ts`) — covers knockout losers (including penalty-shootout defeats) and group-stage non-advancers once the group stage is complete
- Knockout bracket now flags the next upcoming match with a "Next up" badge and accent ring, in addition to pre-highlighting its participant(s) in the grid
- Knockout bracket fixtures now show kickoff date **and** time in the viewer's local timezone (previously date only)
- `docker-compose.production.yml` for deploy behind an external Caddy reverse proxy on a shared `proxy` Docker network

### Changed

- Participants whose four nations are all eliminated are now dimmed across the whole card (greyed avatar, muted name) for quicker scanning of who is still in the running
- Knockout bracket rows for the losing side of a finished tie are dimmed with a strikethrough team name and greyed flag, matching the per-team styling on participant cards
- Knockout bracket is now an accurate binary tree: rounds use the FIFA 2026 feeder map so each tie connects to the correct next-round match (e.g. Brazil/Japan and Ivory Coast/Norway feed match 91), with rounds vertically aligned so every match sits at the midpoint of its two feeders; the Final is a connected column and the third-place play-off is shown as a separate card
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

- Knockout bracket no longer renders twice (blank placeholder tree plus real fixtures): bracket slots are keyed by football-data.org `matchday` (the official FIFA fixture number 1–104), not the API's internal match `id`
- Round of 32 column order is now derived from the Round of 16 layout so connector lines meet the correct tie — Brazil's last-16 fixture sits at the junction of the Brazil/Japan and Ivory Coast/Norway round-of-32 paths
- Knockout bracket connector lines now follow FIFA's cross-pairings at the Round of 32 → Round of 16 step (e.g. Brazil/Japan and Ivory Coast/Norway feed match 91; Spain/Austria and Portugal/Croatia feed match 93) instead of assuming consecutive match ids are paired
- Knockout bracket keeps fixed vertical slots for unpublished ties (TBD placeholders) so fixtures with known teams stay in the correct row — e.g. Brazil's Round of 16 tie remains 5th even when only three last-16 matches have been published so far
- Penalty-shootout and extra-time results no longer break the app: football-data.org v4 can return `homeTeam`/`awayTeam` score fields (especially after knockout ties), which left `fullTime.home`/`away` undefined and caused elimination/result logic to mis-read finished matches. Scores are now normalized on fetch and when loading the cache, and win/loss styling uses `score.winner` when full-time is level
- Partial API failures no longer blank the whole page — participants and fixtures load independently when one endpoint is unavailable

### Added

- Live match activity pills below the title banner when games are in play, in extra time, or in a penalty shootout — fixtures matched an owner whose three-letter code happened to be a substring of the team name (e.g. Japan resolving to the Panama owner via "PAN", or Australia to the Austria owner via "AUS"). The fuzzy name fallback now only matches on whole-word boundaries, so owners like Japan → Alex and Germany → Dad resolve correctly
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
