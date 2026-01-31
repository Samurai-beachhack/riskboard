import * as fs from 'fs';
import * as path from 'path';
import { EnrichedFinding } from './types';
import { AiFixResult } from './ai';
import chalk from 'chalk';

/**
 * Applies a code fix to the file system using line-based replacement.
 */
export function applyFix(finding: EnrichedFinding, fixResult: AiFixResult): boolean {
  try {
    const filePath = path.resolve(process.cwd(), finding.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split(/\r?\n/);
    
    // Safety check: Verify the lines we are about to replace are close to what we expect
    // This is hard because the AI didn't return the original code, but we trust the line numbers
    // provided they haven't shifted.
    
    const startLineIdx = finding.line - 1;
    const endLineIdx = (finding.endLine || finding.line); // Semgrep end line is exclusive? No, usually inclusive.
    // Wait, let's verify Semgrep lines. Semgrep uses 1-based indexing.
    // If start=3, end=3, it's one line.
    
    // Check if lines exist
    if (startLineIdx < 0 || startLineIdx >= lines.length) {
      throw new Error('Target lines are out of bounds. File may have changed.');
    }

    // 1. Inject Imports (if any)
    let newLines = [...lines];
    if (fixResult.imports && fixResult.imports.length > 0) {
      // Simple heuristic: Add after the last import, or at the top
      let lastImportIdx = -1;
      for (let i = 0; i < newLines.length; i++) {
        if (newLines[i].trim().startsWith('import ') || newLines[i].trim().startsWith('require(')) {
          lastImportIdx = i;
        }
      }
      
      const importsToAdd = fixResult.imports.filter(imp => !fileContent.includes(imp)); // Dedup existing
      if (importsToAdd.length > 0) {
        newLines.splice(lastImportIdx + 1, 0, ...importsToAdd);
        
        // Adjust indices because we added lines?
        // Actually, if we add imports at the top, our target indices shift!
        // We must calculate the shift.
        // Wait, simpler: modify the array in place, but we need to track the offset.
      }
    }

    // 2. Replace Code Block
    // We need to handle the offset if we added imports.
    // Let's re-read or just calculate.
    // Actually, simpler approach: Modify the specific lines first, THEN prepend imports.
    
    // Replace the lines
    // Remove old lines
    const linesToRemove = (finding.endLine || finding.line) - finding.line + 1;
    
    // We replace lines [startLineIdx] to [startLineIdx + linesToRemove - 1]
    // with the new code (split by newline)
    const replacementLines = fixResult.replacementCode.split(/\r?\n/);
    
    // Perform replacement
    lines.splice(startLineIdx, linesToRemove, ...replacementLines);

    // 3. Prepend Imports (Safe approach)
    if (fixResult.imports && fixResult.imports.length > 0) {
       const importsToAdd = fixResult.imports.filter(imp => !fileContent.includes(imp));
       if (importsToAdd.length > 0) {
         // Find where to insert
         let insertIdx = 0;
         // Skip shebang or comments at top
         if (lines[0].startsWith('#!')) insertIdx = 1;
         
         lines.splice(insertIdx, 0, ...importsToAdd);
       }
    }

    // Write back
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    
    return true;
  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to apply fix: ${error.message}`));
    return false;
  }
}
