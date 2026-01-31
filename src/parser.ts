import * as fs from 'fs';
import * as path from 'path';
import { SemgrepOutput, Finding } from './types';

export function parseFindings(filePath: string): Finding[] {
  try {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const semgrepOutput: SemgrepOutput = JSON.parse(rawData);

    if (!semgrepOutput.results || !Array.isArray(semgrepOutput.results)) {
      throw new Error('Invalid Semgrep JSON format: "results" array missing.');
    }

    return semgrepOutput.results.map((r) => {
      let codeSnippet = r.extra.lines;

      // Fallback: Read from file if snippet is missing or "requires login"
          // This happens when using Semgrep OSS without login on some rules
          if (!codeSnippet || codeSnippet.trim() === 'requires login') {
            try {
              const sourcePath = path.resolve(process.cwd(), r.path);
              if (fs.existsSync(sourcePath)) {
                const fileContent = fs.readFileSync(sourcePath, 'utf-8');
            const lines = fileContent.split(/\r?\n/);
            
            // Semgrep lines are 1-based
            // Ensure we have valid start/end
            const startLine = Math.max(0, (r.start.line || 1) - 1);
            const endLine = r.end?.line || startLine + 1;
            
            codeSnippet = lines.slice(startLine, endLine).join('\n');
          }
        } catch (e) {
          // Fail silently, finding will lack code snippet
        }
      }

      return {
        ruleId: r.check_id,
        file: r.path,
        line: r.start.line,
        endLine: r.end?.line || r.start.line,
        message: r.extra.message,
        severity: r.extra.severity,
        codeSnippet: codeSnippet,
      };
    });
  } catch (error: any) {
    throw new Error(`Failed to parse findings file: ${error.message}`);
  }
}
