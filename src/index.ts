#!/usr/bin/env node
/**
 * ZeroHour – terminal-based failure predictor.
 * Command: zerohour analyze
 * Recursively scans, infers file intent, detects failure patterns, ranks, outputs TOP 3.
 */

import { Command } from 'commander';
import * as path from 'path';
import { discoverFiles } from './scanner/discover';
import { tagFiles } from './scanner/classify';
import { runAllRules } from './rules';
import { rankFailures } from './scoring/score';
import { printTop3, printBoxed } from './output/printer';

const program = new Command();

program
  .name('zerohour')
  .description('Context-aware failure predictor: TOP 3 failure-prone code paths')
  .version('1.0.0');

program
  .command('analyze')
  .description('Recursively scan current directory, infer file intent, detect failure patterns, output TOP 3')
  .option('-C, --cwd <dir>', 'Directory to analyze (default: current)', process.cwd())
  .option('--no-box', 'Print plain text without boxen')
  .action(async (opts: { cwd: string; box: boolean }) => {
    const rootDir = path.resolve(opts.cwd);
    const filePaths = await discoverFiles(rootDir);
    const tagged = tagFiles(filePaths, rootDir);
    const failures = runAllRules(tagged);
    const ranked = rankFailures(failures);
    const output = opts.box !== false ? printBoxed(ranked) : printTop3(ranked);
    console.log(output);
  });

program.parse();
