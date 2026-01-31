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
exports.analyzeFindingsFile = analyzeFindingsFile;
exports.getFixForFinding = getFixForFinding;
const fs = __importStar(require("fs"));
const parser_1 = require("./parser");
const context_1 = require("./context");
const ai_1 = require("./ai");
/**
 * Programmatic API to run ZeroHour analysis on a findings file.
 * Useful for extensions and integrations.
 *
 * @param findingsFilePath Absolute path to the findings.json file
 * @param onProgress Optional callback for status updates
 * @returns Promise containing analyzed risks and all enriched findings
 */
async function analyzeFindingsFile(findingsFilePath, onProgress) {
    // 1. Validate File
    if (!fs.existsSync(findingsFilePath)) {
        throw new Error(`Findings file not found: ${findingsFilePath}`);
    }
    // 2. Load & Parse
    onProgress?.('Loading findings...');
    const findings = (0, parser_1.parseFindings)(findingsFilePath);
    if (findings.length === 0) {
        return {
            topRisks: [],
            allFindings: [],
            isFallback: false
        };
    }
    // 3. Enrich
    onProgress?.('Enriching context with code analysis...');
    const enriched = (0, context_1.enrichContext)(findings);
    // 4. Prioritize (AI Analysis)
    // Note: prioritizeRisks relies on process.env.GROQ_API_KEY being set
    onProgress?.('AI Prioritization in progress (Groq Llama-3)...');
    const result = await (0, ai_1.prioritizeRisks)(enriched);
    return {
        ...result,
        allFindings: enriched
    };
}
/**
 * Generates an AI fix for a given finding.
 */
async function getFixForFinding(finding, rootPath) {
    return await (0, ai_1.generateFix)(finding, rootPath);
}
//# sourceMappingURL=api.js.map