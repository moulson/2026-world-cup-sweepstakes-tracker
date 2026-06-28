# World Cup 2026 Sweepstakes Fixture Tracker

A Docker-deployable web app for tracking FIFA World Cup 2026 fixtures alongside a family sweepstakes draw. Participants can click their name to highlight all fixtures involving their four teams, with green/red/grey borders for wins, losses, and draws.

## Features

- 12 sweepstakes participants loaded from `data/draw.csv`
- Live fixture data from [football-data.org](https://www.football-data.org/) API v4
- Smart API polling — only during match windows and for one hour after each game ends
- Click-to-highlight fixtures with win/loss/draw styling
- Knockout bracket view (the default tab) drawn as an accurate binary tree with connector lines — fixtures are ordered so each tie feeds the correct next-round match, each shows its owning participant, and clicking a fixture highlights its participant(s) in the grid
- Next upcoming game pre-highlighted automatically on load — flagged with a "Next up" badge in the bracket and its participant(s) highlighted in the grid
- Kickoff dates and times shown in the viewer's local timezone
- Eliminated nations are dimmed (greyed and struck through) on each participant card, with an "x/4 left" counter, so it's easy to see who still has teams in
- Country flag emojis and profile image placeholders
- Docker deployment with volume mounts for easy updates

## Prerequisites

- Node.js 22+ (local development)
- Docker & Docker Compose (deployment)
- A free API token from [football-data.org](https://www.football-data.org/client/register)

## Setup

1. Copy the environment file and add your API token:

```bash
cp .env.example .env
```

Edit `.env` and set `FOOTBALL_DATA_API_TOKEN` to your personal token. The server sends this as the `X-Auth-Token` header on every football-data.org request.

2. Install dependencies:

```bash
npm install
```

3. Run in development mode:

```bash
npm run dev
```

- Frontend: http://localhost:5173 (proxied to API)
- Backend: http://localhost:3000

## Docker Deployment

### Local

```bash
cp .env.example .env
# Edit .env with your token and PORT=5000

docker compose up --build
```

Open http://localhost:5000

### Hetzner / Caddy (production)

If Caddy runs in another compose file, use the production compose and a shared Docker network. See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for step-by-step instructions.

```bash
docker network create proxy   # once per server
docker compose -f docker-compose.production.yml up --build -d
```

Caddy reverse-proxies to `world-cup-sweepstakes:5000` on the `proxy` network (example block in [docs/caddy-example.caddyfile](docs/caddy-example.caddyfile)).

### Cloudflare Tunnel (cloudflared)

If you already run a `cloudflared` tunnel, expose the app through it instead of Caddy — no public ports. The app joins your existing tunnel network (`cloudflare_tunnel`):

```bash
docker compose -f docker-compose.cloudflared.yml up --build -d
```

Add an ingress rule to your tunnel `config.yml`:

```yaml
ingress:
  - hostname: sweepstakes.yourdomain.com
    service: http://world-cup-sweepstakes:5000
  - service: http_status:404
```

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for full steps.

### Volume mounts

| Path | Purpose |
|------|---------|
| `data/draw.csv` | Sweepstakes participants (edit without rebuild) |
| `data/team-aliases.json` | CSV name → API name mappings |
| `data/cache/` | Persisted match cache across restarts |
| `public/profiles/` | Participant profile photos |

## Profile Images

Add JPEG photos to `public/profiles/` using the participant slug as the filename:

| Name | File |
|------|------|
| Stacey | `stacey.jpg` |
| Jon | `jon.jpg` |
| Hannah | `hannah.jpg` |
| ... | `{slug}.jpg` |

A default SVG avatar is shown when no image is found.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/participants` | Sweepstakes draw with team mappings |
| `GET /api/matches` | Cached WC 2026 fixtures |
| `GET /api/status` | Scheduler state and polling info |
| `GET /api/events` | SSE stream for live cache updates |

## API Polling Strategy

- **Bootstrap**: One fetch on startup (and when cache is older than 24 hours) to load the full schedule
- **Live windows**: Poll every 60 seconds only when a match is in its active window (kickoff through ~2.5 hours, extended 1 hour after full-time)
- **Idle**: Zero API calls between windows

The free football-data.org tier allows 10 requests/minute and may have delayed scores.

## Team Name Aliases

Some CSV country names differ from the API. Mappings live in `data/team-aliases.json`. Add entries if a team fails to resolve at startup.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server + Vite frontend |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm test` | Run unit tests |
