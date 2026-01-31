/**
 * ZeroHour – recursive file discovery
 * Scans directory and returns file paths for analysis (no hardcoded folder names).
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const DEFAULT_IGNORE = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '*.min.js',
  '*.bundle.js',
  'package-lock.json',
  'yarn.lock',
];

const ANALYZABLE_EXTENSIONS = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.vue',
  '.svelte',
  '.html',
  '.css',
  '.sql',
  '.prisma',
  '.env',
  '.env.*',
  '.yaml',
  '.yml',
  'Dockerfile',
];

/**
 * Recursively discover files under rootDir that are analyzable.
 */
export async function discoverFiles(rootDir: string): Promise<string[]> {
  const absRoot = path.resolve(rootDir);
  if (!fs.existsSync(absRoot) || !fs.statSync(absRoot).isDirectory()) {
    return [];
  }

  const pattern = `**/*{${ANALYZABLE_EXTENSIONS.join(',')}}`;
  const ignore = DEFAULT_IGNORE.map((p) => (p.startsWith('*') ? p : `**/${p}/**`));
  const files = await glob(pattern, {
    cwd: absRoot,
    absolute: true,
    ignore,
    nodir: true,
  });

  return files.filter((f) => {
    const name = path.basename(f);
    if (name.endsWith('.min.js') || name.endsWith('.bundle.js')) return false;
    return true;
  });
}
