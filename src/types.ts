export interface Finding {
  ruleId: string;
  file: string;
  line: number;
  endLine?: number;
  message: string;
  severity: string;
  codeSnippet?: string;
}

export interface ContextSignals {
  isPayment: boolean;
  isAdmin: boolean;
  isAuth: boolean;
  isPublicFacing: boolean;
  modifiesDatabase: boolean;
}

export interface EnrichedFinding extends Finding {
  context: ContextSignals;
  exposureScore: number; // 0-10 based on signals
}

export interface RiskAnalysis {
  title: string;
  reason: string;
  impact: string;
  fix: string;
  confidence: 'High' | 'Medium' | 'Low';
  originalFinding: EnrichedFinding;
}

export interface AnalysisResult {
  topRisks: RiskAnalysis[];
  isFallback?: boolean;
}

// Semgrep JSON Output Interface (Partial)
export interface SemgrepResult {
  check_id: string;
  path: string;
  start: { line: number; col: number };
  end: { line: number; col: number };
  extra: {
    severity: string;
    message: string;
    lines?: string;
  };
}

export interface SemgrepOutput {
  results: SemgrepResult[];
}
