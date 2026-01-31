/**
 * Unit tests: ranking correctness
 */

import { rankFailures } from './score';
import { DetectedFailure } from '../types';

function fail(
  ruleId: string,
  businessImpactScore: number,
  exposureScore: number,
  likelihoodScore: number,
  abuseEaseScore: number
): DetectedFailure {
  return {
    ruleId,
    file: 'x.js',
    line: 1,
    detectionExplanation: 'test',
    whyItMatters: 'test',
    businessImpact: 'test',
    confidence: 'High',
    category: 'security',
    businessImpactScore,
    exposureScore,
    likelihoodScore,
    abuseEaseScore,
  };
}

describe('rankFailures', () => {
  it('returns at most 3 failures', () => {
    const many = [
      fail('A1', 1, 1, 1, 1),
      fail('A2', 1, 1, 1, 1),
      fail('A3', 1, 1, 1, 1),
      fail('A4', 1, 1, 1, 1),
      fail('A5', 1, 1, 1, 1),
    ];
    const ranked = rankFailures(many);
    expect(ranked).toHaveLength(3);
  });

  it('ranks by composite (business impact, exposure, likelihood, abuse)', () => {
    const low = fail('L', 1, 1, 1, 1);
    const high = fail('H', 10, 10, 10, 10);
    const ranked = rankFailures([low, high]);
    expect(ranked[0].ruleId).toBe('H');
    expect(ranked[1].ruleId).toBe('L');
  });

  it('breaks ties deterministically (no ties in output order)', () => {
    const a = fail('A', 5, 5, 5, 5);
    const b = fail('B', 5, 5, 5, 5);
    const ranked = rankFailures([a, b]);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].ruleId).toBeDefined();
    expect(ranked[1].ruleId).toBeDefined();
  });

  it('returns empty array when no failures', () => {
    expect(rankFailures([])).toEqual([]);
  });
});
