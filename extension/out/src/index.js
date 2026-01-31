#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const dotenv = __importStar(require("dotenv"));
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const ui_1 = require("./ui");
const api_1 = require("./api");
const fixer_1 = require("./fixer");
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const os_1 = __importDefault(require("os"));
const execPromise = util_1.default.promisify(child_process_1.exec);
// Load .env from multiple locations
// Priority 1: Current Working Directory (Project specific)
const localEnvPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: localEnvPath });
// Priority 2: User Home Directory (Global User Config)
const homeEnvPath = path.resolve(os_1.default.homedir(), '.zerohour', '.env');
dotenv.config({ path: homeEnvPath });
// Priority 3: Package Installation Directory (Bundled Config)
const packageEnvPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: packageEnvPath });
const program = new commander_1.Command();
program
    .name('zerohour')
    .description('SAST prioritization CLI')
    .version('1.0.0');
program
    .command('scan')
    .description('Run Semgrep scan and analyze results immediately')
    .argument('[directory]', 'Directory to scan', '.')
    .action(async (directory) => {
    (0, ui_1.printWelcome)();
    // Check for Semgrep
    ui_1.spinner.start('Checking dependencies...');
    try {
        await execPromise('semgrep --version');
    }
    catch (e) {
        ui_1.spinner.fail('Semgrep is not installed or not in PATH.');
        console.log('  Please install Semgrep: brew install semgrep (macOS) or pip install semgrep');
        process.exit(1);
    }
    // Check for API Key (Non-blocking warning)
    let apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        ui_1.spinner.stop();
        console.warn(chalk_1.default.yellow('⚠️  GROQ_API_KEY not found in any .env file.'));
        console.warn(chalk_1.default.yellow('   Running in OFFLINE mode (Deterministic prioritization only).'));
        ui_1.spinner.start();
    }
    // Run Scan
    ui_1.spinner.text = '🔎 Scanning codebase with Semgrep...';
    const findingsFile = path.resolve(process.cwd(), 'findings.json');
    const cpuCount = os_1.default.cpus().length;
    // Performance optimizations:
    // - jobs: Parallelize scanning
    // - exclude: Skip heavy/irrelevant directories
    // - skip-unknown-extensions: Only scan known code files (speeds up large repos)
    const cmd = `semgrep scan --config auto --json --jobs ${cpuCount} --exclude node_modules --exclude dist --exclude coverage --exclude .git "${directory}" > "${findingsFile}"`;
    try {
        // Use --json output for parsing
        await execPromise(cmd).catch(e => {
            // semgrep returns 1 if findings found, which is fine
            if (e.code !== 1 && e.code !== 0)
                throw e;
        });
        ui_1.spinner.succeed(`Scan complete. Results saved to ${findingsFile}`);
        // Auto-trigger analyze
        await runAnalysis(findingsFile);
    }
    catch (e) {
        ui_1.spinner.fail('Semgrep scan failed');
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
    (0, ui_1.printWelcome)();
    await runAnalysis(path.join(process.cwd(), file.replace(/\.\.\//g, '').replace(/\//g, '')));
});
async function runAnalysis(filePath) {
    // 1. Check API Key Interactively if missing
    if (!process.env.GROQ_API_KEY) {
        console.log(chalk_1.default.yellow('\n⚠️  GROQ_API_KEY not found in .env'));
        const { apiKey } = await inquirer_1.default.prompt([{
                type: 'password',
                name: 'apiKey',
                message: 'Enter your Groq AI API Key (gsk_...):',
                mask: '*'
            }]);
        process.env.GROQ_API_KEY = apiKey;
        // Save to .env (Interactive Choice)
        const { saveLocation } = await inquirer_1.default.prompt([{
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
            const globalDir = path.resolve(os_1.default.homedir(), '.zerohour');
            if (!fs.existsSync(globalDir)) {
                fs.mkdirSync(globalDir, { recursive: true });
            }
            const globalEnvPath = path.join(globalDir, '.env');
            fs.appendFileSync(globalEnvPath, `\nGROQ_API_KEY=${apiKey}\nGROQ_MODEL=llama-3.3-70b-versatile\n`);
            console.log(chalk_1.default.green(`✅ API Key saved globally to ${globalEnvPath}`));
        }
        else if (saveLocation === 'local') {
            const envPath = path.resolve(process.cwd(), '.env');
            fs.appendFileSync(envPath, `\nGROQ_API_KEY=${apiKey}\nGROQ_MODEL=llama-3.3-70b-versatile\n`);
            console.log(chalk_1.default.green('✅ API Key saved to local .env'));
        }
    }
    // 2. Run Analysis using Core API
    ui_1.spinner.start('Initializing analysis...');
    try {
        const result = await (0, api_1.analyzeFindingsFile)(filePath, (msg) => {
            ui_1.spinner.text = msg;
        });
        ui_1.spinner.succeed('Analysis complete');
        if (result.allFindings.length === 0) {
            console.log(chalk_1.default.green('✅ No findings to analyze! Good job.'));
            return;
        }
        // 3. Re-organize findings for continuous numbering
        // Ensure "Top Risks" are indices 1..K, and others follow.
        const topFindings = result.topRisks.map(r => r.originalFinding);
        const topFindingSet = new Set(topFindings);
        const otherFindings = result.allFindings.filter(f => !topFindingSet.has(f));
        // Master list: Top Risks followed by the rest
        const sortedAllFindings = [...topFindings, ...otherFindings];
        // 4. Display Top Risks (Detailed)
        (0, ui_1.displayResults)(result);
        // 5. Display Remaining Findings (Summary)
        // Start numbering from (topRisks.length + 1)
        if (otherFindings.length > 0) {
            (0, ui_1.displayFullList)(otherFindings, result.topRisks.length + 1);
        }
        else {
            console.log(chalk_1.default.green('\n✅ No additional findings.'));
        }
        // 6. Interactive Fix Flow
        let fixing = true;
        let firstPass = true;
        while (fixing) {
            const { shouldFix } = await inquirer_1.default.prompt([{
                    type: 'confirm',
                    name: 'shouldFix',
                    message: firstPass ? 'Fix a finding with AI?' : 'Fix another finding?',
                    default: false
                }]);
            if (!shouldFix) {
                fixing = false;
                break;
            }
            firstPass = false;
            const { findingIndex } = await inquirer_1.default.prompt([{
                    type: 'number',
                    name: 'findingIndex',
                    message: `Enter the Finding # to fix (1-${sortedAllFindings.length}):`,
                    validate: (input) => {
                        if (typeof input === 'number' && !isNaN(input) && input >= 1 && input <= sortedAllFindings.length)
                            return true;
                        return `Please enter a number between 1 and ${sortedAllFindings.length}`;
                    }
                }]);
            const findingToFix = sortedAllFindings[findingIndex - 1];
            if (!findingToFix || !findingToFix.file) {
                console.error(chalk_1.default.red('❌ Error: Selected finding is invalid or missing file path.'));
                continue;
            }
            ui_1.spinner.start('🤖 Generating AI fix...');
            try {
                const fixResult = await (0, api_1.getFixForFinding)(findingToFix);
                ui_1.spinner.stop();
                if (!fixResult || !fixResult.replacementCode) {
                    console.log(chalk_1.default.yellow('⚠️  AI could not generate a fix (empty response).'));
                    continue;
                }
                console.log(chalk_1.default.bold.green('\n🔍 Proposed Fix:'));
                console.log(chalk_1.default.dim('-'.repeat(40)));
                if (fixResult.explanation) {
                    console.log(chalk_1.default.cyan(fixResult.explanation) + '\n');
                }
                if (fixResult.imports && fixResult.imports.length > 0) {
                    console.log(chalk_1.default.magenta('Imports to add:'));
                    fixResult.imports.forEach(imp => console.log(chalk_1.default.gray(`  ${imp}`)));
                    console.log('');
                }
                console.log(fixResult.replacementCode);
                console.log(chalk_1.default.dim('-'.repeat(40)) + '\n');
                const { apply } = await inquirer_1.default.prompt([{
                        type: 'confirm',
                        name: 'apply',
                        message: `Apply this fix to ${findingToFix.file}?`,
                        default: true
                    }]);
                if (apply) {
                    const success = (0, fixer_1.applyFix)(findingToFix, fixResult);
                    if (success) {
                        console.log(chalk_1.default.green('✅ Fix applied successfully!'));
                        console.log(chalk_1.default.yellow('ℹ️  We recommend running tests to verify the change.'));
                    }
                }
            }
            catch (error) {
                ui_1.spinner.fail('Failed to generate fix');
                console.error(chalk_1.default.red(error.message));
            }
        }
    }
    catch (e) {
        ui_1.spinner.fail('Analysis failed');
        console.error(e.message);
    }
}
program.parse(process.argv);
//# sourceMappingURL=index.js.map