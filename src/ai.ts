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

    // Take top 20 by exposure score to avoid context limit
    const topFindings = findings
      .sort((a, b) => b.exposureScore - a.exposureScore)
      .slice(0, 20);

    const prompt = `
    You are a Senior Security Engineer. Analyze these SAST findings and identify the TOP 5 most critical business risks.

    FINDINGS (JSON):
    ${JSON.stringify(topFindings, null, 2)}

    INSTRUCTIONS:
    1. Analyze the 'codeSnippet' in each finding to verify if the vulnerability is real and exploitable.
    2. Prioritize based on BUSINESS IMPACT (e.g., data loss, auth bypass, financial loss, RCE).
    3. Ignore findings that are clearly false positives or test files (unless it's a critical misconfiguration).
    4. Return valid JSON only.

    OUTPUT FORMAT:
    {
      "topRisks": [
        {
          "title": "Concise Risk Title",
          "reason": "Technical reason why this is vulnerable based on the code snippet",
          "impact": "Business consequence (what happens if exploited?)",
          "fix": "Specific code fix or remediation strategy",
          "confidence": "High" | "Medium" | "Low",
          "originalFindingIndex": 0 (index in the provided list)
        }
      ]
    }
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from Groq API');
    }

    const parsed = JSON.parse(content);
    
    // Map original findings back to the results
    const mappedRisks = parsed.topRisks.map((risk: any) => {
      const original = topFindings[risk.originalFindingIndex];
      return {
        ...risk,
        originalFinding: original || topFindings[0] // Fallback if index invalid
      };
    });

    return { topRisks: mappedRisks };

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
