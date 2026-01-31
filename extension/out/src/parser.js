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
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFindings = parseFindings;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function parseFindings(filePath) {
    try {
        const rawData = fs.readFileSync(filePath, 'utf-8');
        const semgrepOutput = JSON.parse(rawData);
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
                }
                catch (e) {
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
    }
    catch (error) {
        throw new Error(`Failed to parse findings file: ${error.message}`);
    }
}
//# sourceMappingURL=parser.js.map