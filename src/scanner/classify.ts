/**
 * ZeroHour – file intent inference (heuristic, no fixed folder names).
 * Tags each file with one or more: frontend, backend, db, config, shared.
 */

import * as path from 'path';
import * as fs from 'fs';
import { FileIntent, TaggedFile } from '../types';

const FRONTEND_EXTENSIONS = ['.jsx', '.tsx', '.vue', '.svelte', '.html', '.css'];
const FRONTEND_DEPS = /\b(react|next|vue|angular|vite|svelte)\b/i;
const FRONTEND_PATTERNS = [
  /<[A-Z][a-zA-Z]*\s/,           // JSX component
  /useState|useEffect|useContext/i,
  /loading|error\s*[=:]|setLoading|setError/i,
];

const BACKEND_PATTERNS = [
  /\.(get|post|put|patch|delete)\s*\(/i,
  /app\.(use|get|post|put|delete|patch)/i,
  /router\.(get|post|put|delete|patch)/i,
  /middleware\s*[=(]/i,
  /express|fastify|nestjs|flask|django/i,
  /req\.(body|params|query)/,
];

const DB_EXTENSIONS = ['.sql'];
const DB_PATTERNS = [
  /\.prisma|schema\.prisma/i,
  /mongoose|sequelize|typeorm|knex/i,
  /transaction|beginTransaction|commit|rollback/i,
  /migration/i,
];

const CONFIG_EXTENSIONS = ['.env', '.yaml', '.yml'];
const CONFIG_PATTERNS = [
  /Dockerfile/i,
  /0\.0\.0\.0|debug\s*=\s*true|NODE_ENV/i,
  /secret|password|api_key|apikey/i,
];

function readFileSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function inferFrontend(filePath: string, content: string, ext: string): boolean {
  if (FRONTEND_EXTENSIONS.includes(ext)) return true;
  if (FRONTEND_DEPS.test(content)) return true;
  return FRONTEND_PATTERNS.some((p) => p.test(content));
}

function inferBackend(filePath: string, content: string): boolean {
  return BACKEND_PATTERNS.some((p) => p.test(content));
}

function inferDb(filePath: string, content: string, ext: string): boolean {
  if (path.basename(filePath).includes('migration')) return true;
  if (ext === '.sql' || filePath.endsWith('.prisma')) return true;
  return DB_PATTERNS.some((p) => p.test(content));
}

function inferConfig(filePath: string, content: string, ext: string): boolean {
  const base = path.basename(filePath).toLowerCase();
  if (base.startsWith('.env') || base === 'dockerfile') return true;
  if (['.yaml', '.yml'].includes(ext)) return true;
  return CONFIG_PATTERNS.some((p) => p.test(content));
}

/**
 * Classify a single file into one or more intents using weak signals.
 */
export function classifyFile(filePath: string, content?: string): FileIntent[] {
  const ext = path.extname(filePath).toLowerCase();
  const body = content ?? readFileSafe(filePath);
  const intents: FileIntent[] = [];

  if (inferFrontend(filePath, body, ext)) intents.push('frontend');
  if (inferBackend(filePath, body)) intents.push('backend');
  if (inferDb(filePath, body, ext)) intents.push('db');
  if (inferConfig(filePath, body, ext)) intents.push('config');

  if (intents.length >= 2) intents.push('shared');
  if (intents.length === 0) intents.push('shared');

  return [...new Set(intents)];
}

/**
 * Produce TaggedFile for a path (read content + classify).
 */
export function tagFile(filePath: string, rootDir: string): TaggedFile {
  const content = readFileSafe(filePath);
  const relativePath = path.relative(rootDir, filePath);
  const extension = path.extname(filePath).toLowerCase();
  const intents = classifyFile(filePath, content);
  return { path: filePath, relativePath, intents, content, extension };
}

/**
 * Tag all discovered files.
 */
export function tagFiles(filePaths: string[], rootDir: string): TaggedFile[] {
  return filePaths.map((p) => tagFile(p, rootDir));
}
