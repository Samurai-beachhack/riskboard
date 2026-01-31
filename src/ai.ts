import OpenAI from 'openai';
import { EnrichedFinding, AnalysisResult } from './types';

// Fallback ranking function (shared)
function fallbackRanking(findings: EnrichedFinding[]): AnalysisResult {
  const sorted = findings.sort((a, b) => b.exposureScore - a.exposureScore);
  const top5 = sorted.slice(0, 5).map(f => ({
    title: `Potential ${f.message}`,
    reason: 'Detected by static analysis with high exposure score.',
    impact: 'Unknown business impact (run with AI API for details).',
    fix: 'Review code snippet and apply best practices.',
    confidence: 'Medium' as const,
    originalFinding: f
  }));

  return { topRisks: top5 };
}

export async function prioritizeRisks(findings: EnrichedFinding[]): Promise<AnalysisResult> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return { ...fallbackRanking(findings), isFallback: true };
  }

  try {
    const openai = new OpenAI({
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
        if (!content) return [];
        const parsed = JSON.parse(content);
        
        return (parsed.risks || parsed.topRisks || []).map((risk: any) => ({
          ...risk,
          originalFinding: batch[risk.originalId] || batch[0]
        }));
      } catch (e) {
        console.warn(`Batch ${batchIndex + 1} failed: ${(e as Error).message}`);
        return [];
      }
    });

    // Wait for all batches
    const results = await Promise.all(batchPromises);
    const allRisks = results.flat();

    // Deduplicate and Sort
    const uniqueRisks = allRisks.filter((risk, index, self) => 
      index === self.findIndex((t) => t.title === risk.title && t.originalFinding.file === risk.originalFinding.file)
    );

    // If AI failed completely, fallback
    if (uniqueRisks.length === 0) {
      throw new Error('No risks identified by AI');
    }

    return { topRisks: uniqueRisks.slice(0, 10) }; // Return top 10 combined

  } catch (error: any) {
    // Enhanced error logging
    if (process.env.DEBUG) {
      console.error('Groq AI Error:', error);
    } else if (error.status === 401) {
      console.warn('⚠️  Groq API Key Invalid. Check GROQ_API_KEY in .env.');
    } else if (error.status === 429) {
      console.warn('⚠️  Groq API Quota Exceeded (429). Falling back to local analysis.');
    } else if (error.status === 404) {
      console.warn(`⚠️  Groq Model not found (${process.env.GROQ_MODEL}).`);
    } else {
      console.warn(`⚠️  AI Analysis Failed: ${error.message}`);
    }

    return { ...fallbackRanking(findings), isFallback: true };
  }
}
