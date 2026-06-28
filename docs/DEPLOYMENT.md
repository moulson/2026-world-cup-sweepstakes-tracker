# Deploying on Hetzner with an existing Caddy stack

This guide assumes Caddy already runs in another project's compose file (e.g. `/opt/other_app/app/repo/docker-compose.production.yml`) and you want the sweepstakes app in its own directory.

## Layout

```
/opt/other_app/app/repo/     ← existing Caddy + other web app
/opt/world-cup-sweepstakes/  ← this app
```

## 1. Create a shared Docker network (once per server)

```bash
docker network create proxy
```

## 2. Attach Caddy to the proxy network

In your **existing** `docker-compose.production.yml`, add the `proxy` network to the `caddy` service and declare it at the bottom:

```yaml
services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    environment:
      APP_HOST: ${APP_HOST:-demo.crimsoncresties.com}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - /opt/crimson_cresties/caddy/data:/data
      - /opt/crimson_cresties/caddy/config:/config
    depends_on:
      - web
    networks:
      - default    # keep reachability to your existing `web` service
      - proxy

networks:
  proxy:
    external: true
```

Recreate Caddy so it joins the network:

```bash
cd /opt/other_app/app/repo
docker compose -f docker-compose.production.yml up -d caddy
```

## 3. Deploy the sweepstakes app

```bash
cd /opt/world-cup-sweepstakes
cp .env.example .env
# Edit .env — set FOOTBALL_DATA_API_TOKEN and PORT=5000

docker compose -f docker-compose.production.yml up --build -d
```

Verify:

```bash
docker ps --filter name=world-cup-sweepstakes
docker exec world-cup-sweepstakes curl -sf http://localhost:5000/api/health
```

The production compose does **not** publish a host port. Caddy reaches the app over the `proxy` network using the container name `world-cup-sweepstakes`.

## 4. Add a Caddy site block

Edit the Caddyfile next to your existing stack (`./Caddyfile` in the other app repo). Add:

```caddy
sweepstakes.yourdomain.com {
    reverse_proxy world-cup-sweepstakes:5000 {
        flush_interval -1
    }
}
```

`flush_interval -1` helps Server-Sent Events (`/api/events`) stream reliably during live matches.

Reload Caddy:

```bash
cd /opt/other_app/app/repo
docker compose -f docker-compose.production.yml exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## 5. DNS

Point `sweepstakes.yourdomain.com` at your Hetzner server IP. Caddy will obtain a TLS certificate automatically.

## Updating

```bash
cd /opt/world-cup-sweepstakes
git pull
docker compose -f docker-compose.production.yml up --build -d
```

Volume-mounted data (`draw.csv`, profiles, cache) survives rebuilds.

## Alternative: Cloudflare Tunnel (cloudflared)

If you already run a `cloudflared` (Cloudflare Tunnel) container, you can expose the app
through it instead of Caddy — no public ports, no inbound firewall rules. Use
`docker-compose.cloudflared.yml`, which is identical to the Caddy production file except it
joins your existing cloudflared Docker network instead of `proxy`.

On this machine the cloudflared container runs on the external network **`cloudflare_tunnel`**
(discovered with `docker network ls`; confirmed `cloudflared` is attached via
`docker network inspect cloudflare_tunnel`). If your network has a different name, change the
`networks:` entry at the bottom of `docker-compose.cloudflared.yml` to match.

### 1. Confirm the external network exists

The network is created by your cloudflared stack, so it should already exist. The compose file
declares it `external: true` and will **not** create it:

```bash
docker network ls | grep cloudflare_tunnel
```

### 2. Deploy the app onto the tunnel network

```bash
cd /opt/world-cup-sweepstakes
cp .env.example .env
# Edit .env — set FOOTBALL_DATA_API_TOKEN and PORT=5000

docker compose -f docker-compose.cloudflared.yml up --build -d
```

The app does **not** publish a host port. cloudflared reaches it over the shared network using
the stable container name `world-cup-sweepstakes` on internal port `5000`.

### 3. Add the tunnel ingress rule

In your cloudflared tunnel `config.yml`, point a hostname at the container:

```yaml
tunnel: <your-tunnel-id>
credentials-file: /etc/cloudflared/<your-tunnel-id>.json

ingress:
  - hostname: sweepstakes.yourdomain.com
    service: http://world-cup-sweepstakes:5000
  - service: http_status:404
```

Then restart cloudflared so it reloads the config (e.g. `docker compose restart cloudflared` in
your tunnel stack), and route DNS to the tunnel once:

```bash
cloudflared tunnel route dns <your-tunnel-name> sweepstakes.yourdomain.com
```

> Server-Sent Events (`/api/events`) work through Cloudflare Tunnel without extra config, so
> live cache updates stream during matches.

## Local development vs production

| File | Use |
|------|-----|
| `docker-compose.yml` | Local machine — publishes port `5000` on the host |
| `docker-compose.production.yml` | Server behind Caddy — no public port, joins `proxy` network |
| `docker-compose.cloudflared.yml` | Server behind an existing Cloudflare Tunnel — no public port, joins `cloudflare_tunnel` network |

## Troubleshooting

| Problem | Check |
|---------|-------|
| Caddy returns 502 | `docker network inspect proxy` — both `caddy` and `world-cup-sweepstakes` should be listed |
| Wrong port | `.env` must have `PORT=5000` to match healthcheck and Caddy upstream |
| Stale fixtures | `curl https://sweepstakes.yourdomain.com/api/status` — `activeWindow` is only true during match windows |
| Container name conflict | `container_name: world-cup-sweepstakes` is fixed in production compose; change it in both compose and Caddyfile if needed |
