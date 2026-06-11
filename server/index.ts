import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import type { MatchesCache } from '../shared/types.js';
import { CLIENT_DIST, PUBLIC_DIR } from './paths.js';
import { FootballDataClient } from './footballDataClient.js';
import { loadParticipants } from './drawLoader.js';
import { MatchWindowScheduler } from './scheduler.js';

const PORT = Number(process.env.PORT ?? 3000);
const TOKEN = process.env.FOOTBALL_DATA_API_TOKEN;

if (!TOKEN) {
  console.error('FOOTBALL_DATA_API_TOKEN is required in .env');
  process.exit(1);
}

const app = express();
const client = new FootballDataClient(TOKEN);
const scheduler = new MatchWindowScheduler(client);

const sseClients = new Set<express.Response>();

scheduler.onUpdate((cache: MatchesCache) => {
  const payload = `data: ${JSON.stringify({ type: 'matches-updated', fetchedAt: cache.fetchedAt })}\n\n`;
  for (const res of sseClients) {
    res.write(payload);
  }
});

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/status', (_req, res) => {
  res.json(scheduler.getStatus());
});

app.get('/api/matches', (_req, res) => {
  const cache = scheduler.getCache();
  if (!cache) {
    res.status(503).json({ error: 'Match data not yet available' });
    return;
  }
  res.json(cache);
});

app.get('/api/participants', async (_req, res) => {
  try {
    const cache = scheduler.getCache();
    const teams = cache?.teams ?? [];
    const participants = await loadParticipants(teams);
    res.json(participants);
  } catch (error) {
    console.error('Failed to load participants:', error);
    res.status(500).json({ error: 'Failed to load participants' });
  }
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);

  const status = scheduler.getStatus();
  res.write(
    `data: ${JSON.stringify({ type: 'connected', activeWindow: status.activeWindow })}\n\n`,
  );

  req.on('close', () => {
    sseClients.delete(res);
  });
});

if (fs.existsSync(PUBLIC_DIR)) {
  app.use('/profiles', express.static(path.join(PUBLIC_DIR, 'profiles')));
}

if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

async function main() {
  try {
    await scheduler.start();
    console.log('Scheduler started');
  } catch (error) {
    console.error('Scheduler bootstrap failed:', error);
    console.log('Server will start with empty cache; retry on next window');
  }

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

main();
