/**
 * Snapshot and unit tests: terminal output format
 */

jest.mock('boxen', () => (content: string) => content);

import { printTop3, printBoxed } from './printer';
import { DetectedFailure } from '../types';

function fail(ruleId: string, file: string, line: number): DetectedFailure {
  return {
    ruleId,
    file,
    line,
    detectionExplanation: 'Missing validation',
    whyItMatters: 'Invalid input can reach business logic.',
    businessImpact: 'Data integrity',
    confidence: 'High',
    category: 'business-critical',
    businessImpactScore: 8,
    exposureScore: 9,
    likelihoodScore: 8,
    abuseEaseScore: 7,
  };
}

describe('printer', () => {
  it('output includes TOP 3 header', () => {
    const out = printTop3([
      fail('A1', 'api.js', 10),
      fail('B2', 'config.js', 1),
      fail('C1', 'handler.js', 5),
    ]);
    expect(out).toContain('TOP 3 FAILURE RISKS');
    expect(out).toContain('ZeroHour');
  });

  it('each item has File, Why this matters, Failure scenario, Fix now, Confidence', () => {
    const out = printTop3([fail('A1', 'api.js', 10)]);
    expect(out).toContain('File:');
    expect(out).toContain('api.js:10');
    expect(out).toContain('Why this matters:');
    expect(out).toContain('Failure scenario:');
    expect(out).toContain('Fix now:');
    expect(out).toContain('Confidence:');
  });

  it('empty list prints no failures message', () => {
    const out = printTop3([]);
    expect(out).toContain('No failure patterns detected');
  });

  it('printBoxed returns content (boxen mocked in test)', () => {
    const out = printBoxed([fail('A1', 'api.js', 10)]);
    expect(out).toContain('TOP 3');
    expect(out).toContain('api.js:10');
  });

  it('snapshot: TOP 3 format is stable', () => {
    const failures = [
      fail('A1', 'src/api/users.js', 42),
      fail('B2', 'config/secrets.js', 1),
      fail('C5', 'server.js', 100),
    ];
    const out = printTop3(failures);
    expect(out).toMatchSnapshot();
  });
});
