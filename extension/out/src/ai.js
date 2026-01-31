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
exports.prioritizeRisks = prioritizeRisks;
exports.generateFix = generateFix;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const openai_1 = __importDefault(require("openai"));
// Fallback ranking function (shared)
function fallbackRanking(findings) {
    const sorted = findings.sort((a, b) => b.exposureScore - a.exposureScore);
    const top5 = sorted.slice(0, 5).map(f => ({
        title: `Potential ${f.message}`,
        reason: 'Detected by static analysis with high exposure score.',
        impact: 'Unknown business impact (run with AI API for details).',
        fix: 'Review code snippet and apply best practices.',
        confidence: 'Medium',
        originalFinding: f
    }));
    return { topRisks: top5 };
}
async function prioritizeRisks(findings) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return { ...fallbackRanking(findings), isFallback: true };
    }
    try {
        const openai = new openai_1.default({
            apiKey: apiKey,
            baseURL: 'https://api.groq.com/openai/v1',
        });
        // Optimization: Analyze more findings in parallel (Batching)
        // We sort by exposure score first, then take top 60 (3 batches of 20)
        const BATCH_SIZE = 20;
        const MAX_BATCHES = 3;
        const sortedFindings = findings.sort((a, b) => b.exposureScore - a.exposureScore);
        const findingsToAnalyze = sortedFindings.slice(0, BATCH_SIZE * MAX_BATCHES);
        const batches = [];
        for (let i = 0; i < findingsToAnalyze.length; i += BATCH_SIZE) {
            batches.push(findingsToAnalyze.slice(i, i + BATCH_SIZE));
        }
        // Process batches in parallel
        const batchPromises = batches.map(async (batch, batchIndex) => {
            // Minify JSON for prompt (remove whitespace)
            const findingsJson = JSON.stringify(batch.map((f, i) => ({
                id: i, // Local index for mapping back
                rule: f.ruleId,
                file: f.file,
                line: f.line,
                code: f.codeSnippet ? f.codeSnippet.slice(0, 300) : '', // Truncate long snippets
                msg: f.message
            })));
            const prompt = `
      You are a Senior Security Engineer. Analyze these SAST findings.
      Identify the most critical business risks (High/Critical only).
      
      FINDINGS:
      ${findingsJson}

      INSTRUCTIONS:
      1. Verify if the vulnerability is real based on 'code'.
      2. Prioritize based on BUSINESS IMPACT.
      3. Return valid JSON only.
      
      OUTPUT FORMAT:
      {
        "risks": [
          {
            "title": "Concise Title",
            "reason": "Why vulnerable",
            "impact": "Business Impact",
            "fix": "Fix",
            "confidence": "High" | "Medium",
            "originalId": 0
          }
        ]
      }
      `;
            try {
                const completion = await openai.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
                    temperature: 0.1,
                    response_format: { type: 'json_object' }
                });
                const content = completion.choices[0]?.message?.content;
                if (!content)
                    return [];
                const parsed = JSON.parse(content);
                return (parsed.risks || parsed.topRisks || []).map((risk) => ({
                    ...risk,
                    originalFinding: batch[risk.originalId] || batch[0]
                }));
            }
            catch (e) {
                console.warn(`Batch ${batchIndex + 1} failed: ${e.message}`);
                return [];
            }
        });
        // Wait for all batches
        const results = await Promise.all(batchPromises);
        const allRisks = results.flat();
        // Deduplicate and Sort
        const uniqueRisks = allRisks.filter((risk, index, self) => index === self.findIndex((t) => t.title === risk.title && t.originalFinding.file === risk.originalFinding.file));
        // If AI failed completely, fallback
        if (uniqueRisks.length === 0) {
            throw new Error('No risks identified by AI');
        }
        return { topRisks: uniqueRisks.slice(0, 10) }; // Return top 10 combined
    }
    catch (error) {
        // Enhanced error logging
        if (process.env.DEBUG) {
            console.error('Groq AI Error:', error);
        }
        else if (error.status === 401) {
            console.warn('⚠️  Groq API Key Invalid. Check GROQ_API_KEY in .env.');
        }
        else if (error.status === 429) {
            console.warn('⚠️  Groq API Quota Exceeded (429). Falling back to local analysis.');
        }
        else if (error.status === 404) {
            console.warn(`⚠️  Groq Model not found (${process.env.GROQ_MODEL}).`);
        }
        else {
            console.warn(`⚠️  AI Analysis Failed: ${error.message}`);
        }
        return { ...fallbackRanking(findings), isFallback: true };
    }
}
/**
 * Generates a code fix for a specific finding using Groq AI.
 */
async function generateFix(finding, rootPath) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey)
        throw new Error('GROQ_API_KEY not found');
    // Read file context
    let fileContext = '';
    try {
        const baseDir = rootPath || process.cwd();
        const filePath = path.join(baseDir, path.basename(finding.file));
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split(/\r?\n/);
            // Get context: 5 lines before and after
            const start = Math.max(0, (finding.line - 1) - 5);
            const end = Math.min(lines.length, (finding.endLine || finding.line) + 5);
            // Add line numbers for AI reference
            fileContext = lines.slice(start, end)
                .map((line, idx) => `${start + idx + 1}: ${line}`)
                .join('\n');
        }
    }
    catch (e) {
        console.warn('Could not read file for context, using snippet only.');
        fileContext = finding.codeSnippet || '';
    }
    const openai = new openai_1.default({
        apiKey: apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
    });
    const prompt = `
  You are a Senior Secure Code Expert. 
  Fix the following security vulnerability.
  
  VULNERABILITY: ${finding.message}
  FILE: ${finding.file}
  
  CODE CONTEXT (with line numbers):
  ${fileContext}

  TARGET LINES TO FIX: ${finding.line} - ${finding.endLine || finding.line}

  INSTRUCTIONS:
  1. Provide the EXACT code that should replace the target lines.
  2. If the fix requires new imports, list them separately.
  3. Ensure the code fits seamlessly into the surrounding context.
  4. Return valid JSON only.

  OUTPUT FORMAT:
  {
    "replacementCode": "string (the new code for the target lines)",
    "imports": ["string (e.g. import x from 'y')"],
    "explanation": "string (brief explanation of the fix)"
  }
  `;
    const completion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.1,
        response_format: { type: 'json_object' }
    });
    const content = completion.choices[0]?.message?.content || '{}';
    try {
        return JSON.parse(content);
    }
    catch (e) {
        // Fallback if JSON parsing fails
        return {
            replacementCode: content,
            imports: [],
            explanation: 'AI returned raw text.'
        };
    }
}
//# sourceMappingURL=ai.js.map