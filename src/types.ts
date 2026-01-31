/**
 * ZeroHour – shared types
 */

export type FileIntent = 'frontend' | 'backend' | 'db' | 'config' | 'shared';

export interface TaggedFile {
  path: string;
  relativePath: string;
  intents: FileIntent[];
  content: string;
  extension: string;
}

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export interface DetectedFailure {
  ruleId: string;
  file: string;
  line: number;
  detectionExplanation: string;
  whyItMatters: string;
  businessImpact: string;
  confidence: ConfidenceLevel;
  category: FailureCategory;
  /** For ranking: business impact weight */
  businessImpactScore: number;
  /** For ranking: public vs internal */
  exposureScore: number;
  /** For ranking: likelihood of triggering */
  likelihoodScore: number;
  /** For ranking: ease of abuse/crash */
  abuseEaseScore: number;
}

export type FailureCategory =
  | 'business-critical'
  | 'security'
  | 'reliability'
  | 'database'
  | 'frontend'
  | 'config';

export interface RuleDefinition {
  id: string;
  category: FailureCategory;
  detect: (file: TaggedFile) => DetectedFailure[];
}
