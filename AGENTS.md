# AGENTS.md

## Cursor Cloud specific instructions

This is a single-product TypeScript app: the **World Cup 2026 Sweepstakes Fixture Tracker** (React + Vite frontend in `client/`, Express + `tsx` backend in `server/`, shared logic in `shared/`). There is no database — state is fetched from the football-data.org API and cached to `data/cache/`.

### Environment / secrets
- The backend **exits immediately (`process.exit(1)`) if `FOOTBALL_DATA_API_TOKEN` is unset** (see `server/index.ts`). This secret is injected as an env var in Cloud Agent VMs, so the server boots without any manual step. `dotenv` does not override existing env vars, so a local `.env` is optional; if you create one, it won't clobber the injected token.
- A valid token + network access are needed for real fixture data. If a fetch fails at startup the server still boots with an empty cache and `/api/matches` returns `503` until a fetch succeeds.

### Running (see `package.json` scripts / README for standard commands)
- Dev: `npm run dev` runs backend (`tsx watch`, port **3000**) and Vite frontend (port **5173**) concurrently. Open http://localhost:5173 — Vite proxies `/api` and `/profiles` to the backend on :3000.
- Because dev runs two processes concurrently, prefer starting `npm run dev` in a persistent (tmux) session.
- Tests: `npm test` (Vitest) — pure unit tests, no external services required.
- Build: `npm run build` (client via Vite + server via `tsc`). Production run is `npm start` (serves built client from the backend).
- **There is no lint command / linter config** in this repo.

### Docker note
- The `Dockerfile` sets `PORT=3000`, but the compose files set `PORT=5000` via `.env`; the effective container port comes from the `.env` value.
