import * as fs from 'fs';
import { SemgrepOutput, Finding } from './types';

export function parseFindings(filePath: string): Finding[] {
  try {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const semgrepOutput: SemgrepOutput = JSON.parse(rawData);

    if (!semgrepOutput.results || !Array.isArray(semgrepOutput.results)) {
      throw new Error('Invalid Semgrep JSON format: "results" array missing.');
    }

    return semgrepOutput.results.map((r) => ({
      ruleId: r.check_id,
      file: r.path,
      line: r.start.line,
      message: r.extra.message,
      severity: r.extra.severity,
      codeSnippet: r.extra.lines,
    }));
  } catch (error: any) {
    throw new Error(`Failed to parse findings file: ${error.message}`);
  }
}
