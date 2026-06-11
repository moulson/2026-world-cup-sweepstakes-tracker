import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Source runs from server/; compiled output runs from dist/server/
const parentDir = path.basename(path.resolve(__dirname, '..'));
export const ROOT_DIR =
  parentDir === 'dist' ? path.resolve(__dirname, '../..') : path.resolve(__dirname, '..');
export const DATA_DIR = path.join(ROOT_DIR, 'data');
export const CACHE_DIR = path.join(DATA_DIR, 'cache');
export const DRAW_CSV = path.join(DATA_DIR, 'draw.csv');
export const TEAM_ALIASES = path.join(DATA_DIR, 'team-aliases.json');
export const MATCHES_CACHE = path.join(CACHE_DIR, 'matches.json');
export const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
export const CLIENT_DIST = path.join(ROOT_DIR, 'dist', 'client');
