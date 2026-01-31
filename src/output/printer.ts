/**
 * ZeroHour – terminal output (chalk + boxen).
 * TOP 3 only; strict format.
 */

import chalk from 'chalk';
import boxen from 'boxen';
import { DetectedFailure } from '../types';
import { failureScenario, fixNowBullets, failureTitle } from '../explain/translate';

const BORDER_CHAR = '━';
const BORDER_LINE = BORDER_CHAR.repeat(34);

function whyBullets(f: DetectedFailure): string[] {
  const parts: string[] = [];
  if (f.whyItMatters) parts.push(f.whyItMatters);
  if (f.businessImpact) parts.push(`Business impact: ${f.businessImpact}`);
  return parts.length ? parts : ['This pattern can cause failures under load or invalid input.'];
}

export function printTop3(failures: DetectedFailure[]): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.red(BORDER_LINE));
  lines.push(chalk.red.bold(' 🚨 TOP 3 FAILURE RISKS (ZeroHour) '));
  lines.push(chalk.red(BORDER_LINE));
  lines.push('');

  const top3 = failures.slice(0, 3);
  if (top3.length === 0) {
    lines.push(chalk.gray('No failure patterns detected in the scanned files.'));
    lines.push('');
    return lines.join('\n');
  }

  const labels = ['#1', '#2', '#3'];
  top3.forEach((f, i) => {
    const title = failureTitle(f);
    const why = whyBullets(f);
    const scenario = failureScenario(f);
    const fixBullets = fixNowBullets(f);

    lines.push(chalk.cyan.bold(`${labels[i]} ${title}`));
    lines.push(chalk.gray(`File: ${f.file}:${f.line}`));
    lines.push('');
    lines.push(chalk.white('Why this matters:'));
    why.forEach((b) => lines.push(chalk.white('• ') + b));
    lines.push('');
    lines.push(chalk.white('Failure scenario:'));
    lines.push(chalk.gray(scenario));
    lines.push('');
    lines.push(chalk.green('Fix now:'));
    fixBullets.forEach((b) => lines.push(chalk.green('✔ ') + b));
    lines.push('');
    lines.push(chalk.white(`Confidence: ${f.confidence}`));
    lines.push('');
  });

  return lines.join('\n');
}

export function printBoxed(failures: DetectedFailure[]): string {
  const content = printTop3(failures);
  return boxen(content, {
    borderColor: 'red',
    borderStyle: 'round',
    padding: 1,
    margin: 1,
  });
}
