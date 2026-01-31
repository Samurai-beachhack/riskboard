import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import figlet from 'figlet';
import gradient from 'gradient-string';
import Table from 'cli-table3';
import { highlight } from 'cli-highlight';
import { AnalysisResult, RiskAnalysis, EnrichedFinding } from './types';

export function printWelcome() {
  const logoText = figlet.textSync('ZERO HOUR', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default',
  });

  const tagline = chalk.bold.cyan('    SAST PRIORITIZATION ENGINE');
  
  // Clear screen for a fresh start
  console.clear();
  console.log('\n' + gradient('cyan', 'blue').multiline(logoText));
  console.log(tagline + '\n');
  console.log(chalk.gray('    v1.0.0 | Powered by Groq AI'));
  console.log(chalk.dim('─'.repeat(60)) + '\n');
}

export function displayResults(result: AnalysisResult) {
  if (result.isFallback) {
    console.log(chalk.yellow('⚠️  AI API unavailable or failed. Showing deterministic results.\n'));
  }

  // 1. Summary Table (Hidden - User requested continuous flow)
  /*
  const table = new Table({
    head: [chalk.cyan('Rank'), chalk.cyan('Risk'), chalk.cyan('Severity'), chalk.cyan('File')],
    style: { head: [], border: [] }, // Minimalist style
  });

  result.topRisks.forEach((risk, index) => {
    table.push([
      `#${index + 1}`,
      risk.title.substring(0, 40) + (risk.title.length > 40 ? '...' : ''),
      risk.originalFinding?.severity === 'ERROR' ? chalk.red('HIGH') : chalk.yellow('MED'),
      risk.originalFinding?.file
    ]);
  });

  console.log(chalk.bold('SUMMARY'));
  console.log(table.toString());
  console.log('\n');
  */

  // 2. Detailed Cards
  result.topRisks.forEach((risk, index) => {
    const color = index === 0 ? 'red' : index === 1 ? 'yellow' : 'cyan';
    const borderColor = index === 0 ? 'red' : index === 1 ? 'yellow' : 'cyan';
    const title = chalk.bold[color](` RISK #${index + 1} `);
    
    // Syntax Highlight Code Snippet
    let codeDisplay = '';
    if (risk.originalFinding?.codeSnippet) {
      codeDisplay = highlight(risk.originalFinding.codeSnippet, {
        language: 'javascript', // Defaulting to JS/TS for now, could be dynamic
        ignoreIllegals: true
      });
    }

    const content = `
${chalk.bold.white(risk.title.toUpperCase())}

${chalk.bold('REASON')}
${chalk.dim('─'.repeat(50))}
${risk.reason}

${chalk.bold('BUSINESS IMPACT')}
${chalk.dim('─'.repeat(50))}
${risk.impact}

${chalk.bold('REMEDIATION')}
${chalk.dim('─'.repeat(50))}
${risk.fix}

${codeDisplay ? `\n${chalk.bold('VULNERABLE CODE')}\n${chalk.dim('─'.repeat(50))}\n${codeDisplay}\n` : ''}
${chalk.dim('─'.repeat(60))}
${chalk.gray('LOCATION')}   ${chalk.cyan(risk.originalFinding?.file)}:${chalk.yellow(risk.originalFinding?.line)}
${chalk.gray('CONFIDENCE')} ${risk.confidence === 'High' ? chalk.green('● High') : chalk.yellow('● Medium')}
    `.trim();

    console.log(
      boxen(content, {
        title: title,
        titleAlignment: 'center',
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: borderColor,
        dimBorder: true,
      })
    );
  });
}

export function displayFullList(findings: EnrichedFinding[], startIndex: number = 1) {
  if (findings.length === 0) return;

  console.log(chalk.bold.cyan(`\n📋 ADDITIONAL FINDINGS (${startIndex}-${startIndex + findings.length - 1})`));
  
  const table = new Table({
    head: [chalk.cyan('#'), chalk.cyan('Severity'), chalk.cyan('File'), chalk.cyan('Line'), chalk.cyan('Message')],
    colWidths: [6, 10, 30, 8, 60],
    wordWrap: true
  });

  findings.forEach((f, i) => {
    table.push([
      startIndex + i,
      f.severity === 'ERROR' ? chalk.red('HIGH') : f.severity === 'WARNING' ? chalk.yellow('MED') : chalk.blue('LOW'),
      f.file,
      f.line,
      f.message
    ]);
  });

  console.log(table.toString());
  console.log('\n');
}

export const spinner = ora({
  spinner: 'dots12', // Cooler spinner
  color: 'cyan'
});
