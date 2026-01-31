#!/usr/bin/env node
import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { parseFindings } from './parser';
import { enrichContext } from './context';
import { prioritizeRisks } from './ai';
import { printWelcome, displayResults, spinner } from './ui';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';

const execPromise = util.promisify(exec);

// Load .env from multiple locations
// Priority 1: Current Working Directory (Project specific)
const localEnvPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: localEnvPath });

// Priority 2: User Home Directory (Global User Config)
const homeEnvPath = path.resolve(os.homedir(), '.zerohour', '.env');
dotenv.config({ path: homeEnvPath });

// Priority 3: Package Installation Directory (Bundled Config)
const packageEnvPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: packageEnvPath });

const program = new Command();

program
  .name('zerohour')
  .description('SAST prioritization CLI')
  .version('1.0.0');

program
  .command('scan')
  .description('Run Semgrep scan and analyze results immediately')
  .argument('[directory]', 'Directory to scan', '.')
  .action(async (directory) => {
    printWelcome();
    
    // Check for Semgrep
    spinner.start('Checking dependencies...');
    try {
      await execPromise('semgrep --version');
    } catch (e) {
      spinner.fail('Semgrep is not installed or not in PATH.');
      console.log('  Please install Semgrep: brew install semgrep (macOS) or pip install semgrep');
      process.exit(1);
    }
    
    // Check for API Key (Non-blocking warning)
    let apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      spinner.stop();
      console.warn(chalk.yellow('⚠️  GROQ_API_KEY not found in any .env file.'));
      console.warn(chalk.yellow('   Running in OFFLINE mode (Deterministic prioritization only).'));
      spinner.start();
    }

    // Run Scan
    spinner.text = 'Running Semgrep scan (this may take a moment)...';
    const findingsFile = path.resolve(process.cwd(), 'findings.json');
    try {
      // Use --json output for parsing
      await execPromise(`semgrep scan --config auto --json "${directory}" > "${findingsFile}"`).catch(e => {
        // semgrep returns 1 if findings found, which is fine
        if (e.code !== 1 && e.code !== 0) throw e;
      });
      spinner.succeed(`Scan complete. Results saved to ${findingsFile}`);
      
      // Auto-trigger analyze
      await runAnalysis(findingsFile);

    } catch (e: any) {
      spinner.fail('Semgrep scan failed');
      console.error(e.message);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .alias('analyse')
  .description('Prioritize risks from an existing findings.json file')
  .argument('[file]', 'Path to findings.json', 'findings.json')
  .action(async (file) => {
    printWelcome();
    await runAnalysis(path.resolve(process.cwd(), file));
  });

async function runAnalysis(filePath: string) {
  // 1. Check API Key Interactively if missing
  if (!process.env.GROQ_API_KEY) {
    console.log(chalk.yellow('\n⚠️  GROQ_API_KEY not found in .env'));
    const { apiKey } = await inquirer.prompt([{
      type: 'password',
      name: 'apiKey',
      message: 'Enter your Groq AI API Key (gsk_...):',
      mask: '*'
    }]);
    
    process.env.GROQ_API_KEY = apiKey;
    
    // Save to .env (Interactive Choice)
    const { saveLocation } = await inquirer.prompt([{
      type: 'list',
      name: 'saveLocation',
      message: 'Where should we save this API key?',
      choices: [
        { name: 'Global (~/.zerohour/.env) - Recommended for all projects', value: 'global' },
        { name: 'Local (.env) - Only for this project', value: 'local' },
        { name: 'Don\'t save', value: 'none' }
      ]
    }]);

    if (saveLocation === 'global') {
      const globalDir = path.resolve(os.homedir(), '.zerohour');
      if (!fs.existsSync(globalDir)) {
        fs.mkdirSync(globalDir, { recursive: true });
      }
      const globalEnvPath = path.join(globalDir, '.env');
      fs.appendFileSync(globalEnvPath, `\nGROQ_API_KEY=${apiKey}\nGROQ_MODEL=llama-3.3-70b-versatile\n`);
      console.log(chalk.green(`✅ API Key saved globally to ${globalEnvPath}`));
    } else if (saveLocation === 'local') {
      const envPath = path.resolve(process.cwd(), '.env');
      fs.appendFileSync(envPath, `\nGROQ_API_KEY=${apiKey}\nGROQ_MODEL=llama-3.3-70b-versatile\n`);
      console.log(chalk.green('✅ API Key saved to local .env'));
    }
  }

  // 2. Load & Parse
  spinner.start('Loading findings...');
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const findings = parseFindings(filePath);
    spinner.succeed(`Loaded ${findings.length} findings`);

    if (findings.length === 0) {
      console.log(chalk.green('No findings to analyze! Good job.'));
      return;
    }

    // 3. Enrich
    spinner.start('Enriching context...');
    const enriched = enrichContext(findings);
    spinner.succeed('Context enrichment complete');

    // 4. Prioritize
    spinner.start('Prioritizing risks (calling Groq AI)...');
    const result = await prioritizeRisks(enriched);
    spinner.succeed('Analysis complete');

    // 5. Display
    displayResults(result);

  } catch (error: any) {
    spinner.fail('Analysis failed');
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

program.parse(process.argv);
