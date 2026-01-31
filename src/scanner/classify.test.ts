/**
 * Unit tests: file intent inference (frontend, backend, db, config, shared)
 */

import * as path from 'path';
import { classifyFile, tagFile } from './classify';
import { tagFiles } from './classify';

describe('classify', () => {
  it('tags .tsx with react patterns as frontend', () => {
    const content = `import React from 'react'; const [loading, setLoading] = useState(false);`;
    const intents = classifyFile('/app/Component.tsx', content);
    expect(intents).toContain('frontend');
  });

  it('tags express route file as backend', () => {
    const content = `app.get('/api', (req, res) => res.json(req.body));`;
    const intents = classifyFile('/app/server.js', content);
    expect(intents).toContain('backend');
  });

  it('tags .sql as db', () => {
    const intents = classifyFile('/db/migrate.sql', 'CREATE TABLE users (id INT);');
    expect(intents).toContain('db');
  });

  it('tags .env-like content as config', () => {
    const intents = classifyFile('/.env', 'NODE_ENV=production');
    expect(intents).toContain('config');
  });

  it('tagFile returns TaggedFile with path and intents', () => {
    const root = path.join(__dirname, '../../examples/sample-app');
    const filePath = path.join(root, 'server.js');
    const tagged = tagFile(filePath, root);
    expect(tagged.path).toBe(filePath);
    expect(tagged.relativePath).toBe('server.js');
    expect(tagged.intents.length).toBeGreaterThan(0);
    expect(tagged.content).toBeDefined();
  });

  it('tagFiles tags multiple paths', () => {
    const root = path.join(__dirname, '../../examples/sample-app');
    const paths = [path.join(root, 'server.js'), path.join(root, 'config.js')];
    const tagged = tagFiles(paths, root);
    expect(tagged).toHaveLength(2);
    expect(tagged[0].relativePath).toBe('server.js');
  });
});
