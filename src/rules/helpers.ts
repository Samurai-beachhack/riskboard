/**
 * Helpers for rule detection: line number, create failure.
 */

import { TaggedFile, DetectedFailure, ConfidenceLevel, FailureCategory } from '../types';

export function lineOf(content: string, pattern: RegExp): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) return i + 1;
  }
  return 1;
}

export function allLineMatches(content: string, pattern: RegExp): { line: number; text: string }[] {
  const lines = content.split('\n');
  const out: { line: number; text: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) out.push({ line: i + 1, text: lines[i] });
  }
  return out;
}

export function createFailure(
  file: TaggedFile,
  ruleId: string,
  line: number,
  detectionExplanation: string,
  whyItMatters: string,
  businessImpact: string,
  category: FailureCategory,
  confidence: ConfidenceLevel,
  businessImpactScore: number,
  exposureScore: number,
  likelihoodScore: number,
  abuseEaseScore: number
): DetectedFailure {
  return {
    ruleId,
    file: file.relativePath,
    line,
    detectionExplanation,
    whyItMatters,
    businessImpact,
    confidence,
    category,
    businessImpactScore,
    exposureScore,
    likelihoodScore,
    abuseEaseScore,
  };
}
