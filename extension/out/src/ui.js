"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spinner = void 0;
exports.printWelcome = printWelcome;
exports.displayResults = displayResults;
exports.displayFullList = displayFullList;
const chalk_1 = __importDefault(require("chalk"));
const boxen_1 = __importDefault(require("boxen"));
const ora_1 = __importDefault(require("ora"));
const figlet_1 = __importDefault(require("figlet"));
const gradient_string_1 = __importDefault(require("gradient-string"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const cli_highlight_1 = require("cli-highlight");
function printWelcome() {
    const logoText = figlet_1.default.textSync('ZERO HOUR', {
        font: 'ANSI Shadow',
        horizontalLayout: 'default',
        verticalLayout: 'default',
    });
    const tagline = chalk_1.default.bold.cyan('    SAST PRIORITIZATION ENGINE');
    // Clear screen for a fresh start
    console.clear();
    console.log('\n' + (0, gradient_string_1.default)('cyan', 'blue').multiline(logoText));
    console.log(tagline + '\n');
    console.log(chalk_1.default.gray('    v1.0.0 | Powered by Groq AI'));
    console.log(chalk_1.default.dim('─'.repeat(60)) + '\n');
}
function displayResults(result) {
    if (result.isFallback) {
        console.log(chalk_1.default.yellow('⚠️  AI API unavailable or failed. Showing deterministic results.\n'));
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
        const title = chalk_1.default.bold[color](` RISK #${index + 1} `);
        // Syntax Highlight Code Snippet
        let codeDisplay = '';
        if (risk.originalFinding?.codeSnippet) {
            codeDisplay = (0, cli_highlight_1.highlight)(risk.originalFinding.codeSnippet, {
                language: 'javascript', // Defaulting to JS/TS for now, could be dynamic
                ignoreIllegals: true
            });
        }
        const content = `
${chalk_1.default.bold.white(risk.title.toUpperCase())}

${chalk_1.default.bold('REASON')}
${chalk_1.default.dim('─'.repeat(50))}
${risk.reason}

${chalk_1.default.bold('BUSINESS IMPACT')}
${chalk_1.default.dim('─'.repeat(50))}
${risk.impact}

${chalk_1.default.bold('REMEDIATION')}
${chalk_1.default.dim('─'.repeat(50))}
${risk.fix}

${codeDisplay ? `\n${chalk_1.default.bold('VULNERABLE CODE')}\n${chalk_1.default.dim('─'.repeat(50))}\n${codeDisplay}\n` : ''}
${chalk_1.default.dim('─'.repeat(60))}
${chalk_1.default.gray('LOCATION')}   ${chalk_1.default.cyan(risk.originalFinding?.file)}:${chalk_1.default.yellow(risk.originalFinding?.line)}
${chalk_1.default.gray('CONFIDENCE')} ${risk.confidence === 'High' ? chalk_1.default.green('● High') : chalk_1.default.yellow('● Medium')}
    `.trim();
        console.log((0, boxen_1.default)(content, {
            title: title,
            titleAlignment: 'center',
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: borderColor,
            dimBorder: true,
        }));
    });
}
function displayFullList(findings, startIndex = 1) {
    if (findings.length === 0)
        return;
    console.log(chalk_1.default.bold.cyan(`\n📋 ADDITIONAL FINDINGS (${startIndex}-${startIndex + findings.length - 1})`));
    const table = new cli_table3_1.default({
        head: [chalk_1.default.cyan('#'), chalk_1.default.cyan('Severity'), chalk_1.default.cyan('File'), chalk_1.default.cyan('Line'), chalk_1.default.cyan('Message')],
        colWidths: [6, 10, 30, 8, 60],
        wordWrap: true
    });
    findings.forEach((f, i) => {
        table.push([
            startIndex + i,
            f.severity === 'ERROR' ? chalk_1.default.red('HIGH') : f.severity === 'WARNING' ? chalk_1.default.yellow('MED') : chalk_1.default.blue('LOW'),
            f.file,
            f.line,
            f.message
        ]);
    });
    console.log(table.toString());
    console.log('\n');
}
exports.spinner = (0, ora_1.default)({
    spinner: 'dots12', // Cooler spinner
    color: 'cyan'
});
//# sourceMappingURL=ui.js.map