/**
 * Unit tests: file discovery
 */

import * as path from 'path';
import * as fs from 'fs';
import { discoverFiles } from './discover';

const FIXTURES = path.join(__dirname, '../../examples/sample-app');

describe('discover', () => {
  it('discovers analyzable files under root', async () => {
    const files = await discoverFiles(FIXTURES);
    expect(Array.isArray(files)).toBe(true);
    expect(files.some((f) => f.endsWith('.js'))).toBe(true);
    expect(files.some((f) => f.endsWith('.tsx'))).toBe(true);
  });

  it('excludes node_modules', async () => {
    const files = await discoverFiles(FIXTURES);
    expect(files.every((f) => !f.includes('node_modules'))).toBe(true);
  });

  it('returns empty array for non-directory', async () => {
    const files = await discoverFiles(__filename);
    expect(files).toEqual([]);
  });

  it('returns empty array for non-existent path', async () => {
    const files = await discoverFiles(path.join(FIXTURES, 'nonexistent'));
    expect(files).toEqual([]);
  });
});
