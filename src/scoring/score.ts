/**
 * ZeroHour – contextual ranking.
 * Rank by: business impact, exposure, likelihood, ease of abuse.
 * Return TOP 3 only. No ties (secondary sort by ruleId).
 */

import { DetectedFailure } from '../types';

export function rankFailures(failures: DetectedFailure[]): DetectedFailure[] {
  const scored = failures.map((f) => ({
    ...f,
    composite:
      f.businessImpactScore * 1.5 +
      f.exposureScore * 1.2 +
      f.likelihoodScore * 1.0 +
      f.abuseEaseScore * 0.8,
  }));

  scored.sort((a, b) => {
    const diff = b.composite - a.composite;
    if (diff !== 0) return diff;
    return (a.ruleId + a.file).localeCompare(b.ruleId + b.file);
  });

  const top3 = scored.slice(0, 3).map(({ composite, ...f }) => f);
  return top3;
}
