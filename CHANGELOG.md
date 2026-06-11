# Changelog

## [Unreleased]

### Added

- Knockout bracket view with round columns (Round of 32 through Final) and TBD placeholders for unplayed ties
- Fixture view tabs: **Groups & Schedule** and **Knockout Bracket**
- Shared participant team matching (`shared/teamMatch.ts`) with CSV name and alias fallback when API team IDs are missing

### Fixed

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
