/**
 * Integration test: full scan → infer intent → detect → rank → TOP 3
 */

import * as path from 'path';
import { discoverFiles } from './scanner/discover';
import { tagFiles } from './scanner/classify';
import { runAllRules } from './rules';
import { rankFailures } from './scoring/score';

const SAMPLE_APP = path.join(__dirname, '../examples/sample-app');

describe('integration – full scan', () => {
  it('discovers files, tags, runs rules, ranks, returns at most 3', async () => {
    const filePaths = await discoverFiles(SAMPLE_APP);
    expect(filePaths.length).toBeGreaterThan(0);

    const tagged = tagFiles(filePaths, SAMPLE_APP);
    expect(tagged.length).toBe(filePaths.length);

    const failures = runAllRules(tagged);
    const ranked = rankFailures(failures);

    expect(ranked.length).toBeLessThanOrEqual(3);
    if (ranked.length > 0) {
      expect(ranked[0]).toHaveProperty('ruleId');
      expect(ranked[0]).toHaveProperty('file');
      expect(ranked[0]).toHaveProperty('line');
      expect(ranked[0]).toHaveProperty('confidence');
      expect(ranked[0]).toHaveProperty('businessImpactScore');
    }
  });

  it('sample-app triggers at least one failure', async () => {
    const filePaths = await discoverFiles(SAMPLE_APP);
    const tagged = tagFiles(filePaths, SAMPLE_APP);
    const failures = runAllRules(tagged);
    expect(failures.length).toBeGreaterThan(0);
  });
});
