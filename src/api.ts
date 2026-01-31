import * as fs from 'fs';
import { parseFindings } from './parser';
import { enrichContext } from './context';
import { prioritizeRisks } from './ai';
import { AnalysisResult, EnrichedFinding } from './types';

export interface ZeroHourResult extends AnalysisResult {
  allFindings: EnrichedFinding[];
}

export type ProgressCallback = (message: string) => void;

/**
 * Programmatic API to run ZeroHour analysis on a findings file.
 * Useful for extensions and integrations.
 * 
 * @param findingsFilePath Absolute path to the findings.json file
 * @param onProgress Optional callback for status updates
 * @returns Promise containing analyzed risks and all enriched findings
 */
export async function analyzeFindingsFile(findingsFilePath: string, onProgress?: ProgressCallback): Promise<ZeroHourResult> {
  // 1. Validate File
  if (!fs.existsSync(findingsFilePath)) {
    throw new Error(`Findings file not found: ${findingsFilePath}`);
  }

  // 2. Load & Parse
  onProgress?.('Loading findings...');
  const findings = parseFindings(findingsFilePath);
  
  if (findings.length === 0) {
    return {
      topRisks: [],
      allFindings: [],
      isFallback: false
    };
  }

  // 3. Enrich
  onProgress?.('Enriching context with code analysis...');
  const enriched = enrichContext(findings);

  // 4. Prioritize (AI Analysis)
  // Note: prioritizeRisks relies on process.env.GROQ_API_KEY being set
  onProgress?.('AI Prioritization in progress (Groq Llama-3)...');
  const result = await prioritizeRisks(enriched);

  return {
    ...result,
    allFindings: enriched
  };
}
