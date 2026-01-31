/**
 * ZeroHour – 25+ failure detection rules (rule-based only).
 * Categories: A business-critical, B security, C reliability, D database, E frontend, F config.
 */

import { TaggedFile, DetectedFailure, FailureCategory, ConfidenceLevel } from '../types';
import { lineOf, allLineMatches, createFailure } from './helpers';

function runRule(
  file: TaggedFile,
  pattern: RegExp,
  ruleId: string,
  detection: string,
  why: string,
  impact: string,
  category: FailureCategory,
  confidence: ConfidenceLevel,
  bi: number,
  ex: number,
  lik: number,
  abuse: number
): DetectedFailure[] {
  const matches = allLineMatches(file.content, pattern);
  if (matches.length === 0) return [];
  return matches.map((m) =>
    createFailure(file, ruleId, m.line, detection, why, impact, category, confidence, bi, ex, lik, abuse)
  );
}

// --- A. BUSINESS-CRITICAL LOGIC FAILURES ---

function A1_missingInputValidation(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('backend')) return [];
  const hasRoute = /\.(get|post|put|patch|delete)\s*\([^)]*,\s*(async\s*)?\(/i.test(file.content);
  const noValidation = !/\b(validate|sanitize|schema|zod|joi|yup)\b/i.test(file.content) && !/req\.body\s*&&/i.test(file.content);
  if (hasRoute && noValidation && /req\.(body|params|query)/i.test(file.content))
    return runRule(
      file,
      /req\.(body|params|query)\s*[\.\[]/,
      'A1',
      'Public API uses request data without visible validation.',
      'Invalid or malicious input can reach business logic and cause crashes or data corruption.',
      'Data integrity and availability.',
      'business-critical',
      'Medium',
      8, 9, 8, 7
    );
  return [];
}

function A2_clientOnlyValidation(file: TaggedFile): DetectedFailure[] {
  const frontendValidates = /\.(validate|check|isValid)\s*\(|validation\s*[=:]|required\s*[=:]/i.test(file.content) && file.intents.includes('frontend');
  const backendNoValidation = file.intents.includes('backend') && !/\b(validate|sanitize|schema)\b/i.test(file.content);
  if (frontendValidates && file.intents.includes('frontend'))
    return runRule(
      file,
      /validate|validation|required|pattern\s*[=:]/i,
      'A2',
      'Validation appears only on client; backend may trust client.',
      'Attackers can bypass client checks and send invalid data to the API.',
      'Integrity and security of business operations.',
      'business-critical',
      'Medium',
      8, 9, 7, 8
    );
  if (backendNoValidation && /req\.body|req\.query/i.test(file.content))
    return runRule(
      file,
      /req\.(body|query|params)/,
      'A2',
      'Backend uses request data without server-side validation.',
      'Trusting client-side validation only allows bypass and malformed data.',
      'Business logic integrity.',
      'business-critical',
      'High',
      9, 9, 8, 8
    );
  return [];
}

function A3_arithmeticOnUserInput(file: TaggedFile): DetectedFailure[] {
  const pattern = /(\+\s*|\-\s*|\*\s*|\/\s*).*(req\.|params|query|body|input)/i;
  if (!pattern.test(file.content)) return [];
  return runRule(
    file,
    pattern,
    'A3',
    'Arithmetic performed on user-controlled input without bounds check.',
    'Overflow, NaN, or negative values can break calculations or cause crashes.',
    'Correctness of financial or quantitative logic.',
    'business-critical',
    'High',
    9, 8, 7, 7
  );
}

function A4_missingBoundaryChecks(file: TaggedFile): DetectedFailure[] {
  const hasLimit = /\b(limit|max|bound|range|clamp)\b/i.test(file.content);
  const hasPaginationOrSlice = /\.slice\s*\(|\.splice\s*\(|limit\s*[=:]|offset\s*[=:]/i.test(file.content);
  if (hasPaginationOrSlice && !hasLimit && file.intents.includes('backend'))
    return runRule(
      file,
      /\.slice\s*\(|\.splice\s*\(|offset\s*[=:]|limit\s*[=:]/i,
      'A4',
      'Pagination or list operations without visible boundary/limit checks.',
      'Large offsets or unbounded results can cause memory or performance failures.',
      'Stability under load.',
      'business-critical',
      'Medium',
      6, 7, 6, 5
    );
  return [];
}

function A5_emptyCatch(file: TaggedFile): DetectedFailure[] {
  return runRule(
    file,
    /catch\s*\([^)]*\)\s*\{\s*\}/,
    'A5',
    'Empty catch block swallows errors silently.',
    'Failures go unreported; debugging is hard and business state may be inconsistent.',
    'Operational visibility and data consistency.',
    'business-critical',
    'High',
    7, 6, 9, 6
  );
}

function A6_businessRulesOnlyFrontend(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('frontend')) return [];
  const hasBusinessLogic = /\b(price|total|discount|tax|eligibility|permission)\b.*[=:]/i.test(file.content);
  if (hasBusinessLogic)
    return runRule(
      file,
      /(price|total|discount|tax|eligibility|permission)\s*[=:]/i,
      'A6',
      'Business rules (e.g. price, eligibility) appear only in frontend.',
      'Users or attackers can bypass rules by calling API directly or modifying client.',
      'Revenue and policy enforcement.',
      'business-critical',
      'Medium',
      9, 8, 7, 8
    );
  return [];
}

function A7_clientFeatureFlagsOnly(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('frontend')) return [];
  if (!/\b(feature|flag|enable|disabled)\s*[=:]|\buseFeature\b/i.test(file.content)) return [];
  return runRule(
    file,
    /feature|flag|enable|useFeature/i,
    'A7',
    'Feature flags or toggles only in frontend.',
    'Sensitive features can be enabled client-side without server enforcement.',
    'Consistent rollout and security of features.',
    'business-critical',
    'Low',
    5, 6, 6, 6
  );
}

// --- B. SECURITY → BUSINESS FAILURES ---

function B1_missingAuthMiddleware(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('backend')) return [];
  const hasRoutes = /\.(get|post|put|delete|patch)\s*\(/i.test(file.content);
  const noAuth = !/\b(auth|authenticate|middleware|jwt|session|login)\b/i.test(file.content);
  if (hasRoutes && noAuth)
    return runRule(
      file,
      /\.(get|post|put|delete|patch)\s*\(/,
      'B1',
      'Route definitions without visible authentication middleware.',
      'Endpoints may be reachable without login, exposing data or actions.',
      'Confidentiality and access control.',
      'security',
      'Medium',
      9, 10, 7, 8
    );
  return [];
}

function B2_hardcodedSecrets(file: TaggedFile): DetectedFailure[] {
  const pattern = /(password|secret|api_key|apikey|token)\s*[=:]\s*['"][^'"]+['"]/i;
  return runRule(
    file,
    pattern,
    'B2',
    'Hardcoded or plaintext secret in source.',
    'Secrets in repo can leak via version control or builds; compromise of credentials.',
    'Account and system compromise.',
    'security',
    'High',
    10, 8, 8, 9
  );
}

function B3_missingAuthzAdminPayment(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('backend')) return [];
  const adminOrPayment = /\b(admin|payment|pay|billing|refund|delete.*user)\b/i.test(file.content);
  const noRoleCheck = !/\b(role|admin|authorize|permission|isAdmin)\b/i.test(file.content);
  if (adminOrPayment && noRoleCheck)
    return runRule(
      file,
      /(admin|payment|pay|billing|refund)/i,
      'B3',
      'Admin or payment route without visible authorization check.',
      'Privilege escalation or unauthorized payments if auth is missing.',
      'Revenue and compliance.',
      'security',
      'High',
      10, 9, 6, 8
    );
  return [];
}

function B4_noRateLimitExpensive(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('backend')) return [];
  const expensive = /\b(export|report|bulk|search|query)\b/i.test(file.content) && /\.(get|post)\s*\(/i.test(file.content);
  const noRateLimit = !/\b(rateLimit|throttle|limit.*req)\b/i.test(file.content);
  if (expensive && noRateLimit)
    return runRule(
      file,
      /\.(get|post)\s*\(/,
      'B4',
      'Expensive-looking endpoint without visible rate limiting.',
      'Abuse can cause resource exhaustion and denial of service.',
      'Availability and cost.',
      'security',
      'Medium',
      7, 8, 7, 8
    );
  return [];
}

function B5_fileUploadNoValidation(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('backend')) return [];
  const hasUpload = /\b(multer|upload|file\.|req\.file|formidable)\b/i.test(file.content);
  const noValidation = !/\b(mimetype|extension|allowedTypes|validate.*file)\b/i.test(file.content);
  if (hasUpload && noValidation)
    return runRule(
      file,
      /upload|req\.file|multer/i,
      'B5',
      'File upload handling without visible type/size validation.',
      'Malicious files can be uploaded; storage or execution risks.',
      'Security and stability.',
      'security',
      'Medium',
      7, 8, 6, 7
    );
  return [];
}

function B6_directObjectNoOwnership(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('backend')) return [];
  const hasIdParam = /params\.(id|userId|resourceId)|req\.params\.\w+/i.test(file.content);
  const noOwnershipCheck = !/\b(userId|owner|belongsTo|\.user\s*===|session\.user)\b/i.test(file.content);
  if (hasIdParam && noOwnershipCheck && /\.(get|put|patch|delete)\s*\(/i.test(file.content))
    return runRule(
      file,
      /params\.(id|userId)|req\.params/,
      'B6',
      'Resource access by ID without visible ownership or authorization check.',
      'Users may access or modify other users’ data (IDOR).',
      'Data confidentiality and compliance.',
      'security',
      'High',
      9, 9, 7, 8
    );
  return [];
}

// --- C. RELIABILITY & CRASH PATHS ---

function C1_asyncNoTryCatch(file: TaggedFile): DetectedFailure[] {
  return runRule(
    file,
    /async\s+\([^)]*\)\s*\{[^}]*await\s+[^}]*\}(?!\s*catch)/,
    'C1',
    'Async function with await but no try/catch in scope.',
    'Unhandled rejections can crash the process or leave state inconsistent.',
    'Availability and data integrity.',
    'reliability',
    'Medium',
    7, 6, 8, 6
  );
}

function C2_promiseNoCatch(file: TaggedFile): DetectedFailure[] {
  return runRule(
    file,
    /\.then\s*\([^)]*\)\s*(?!\s*\.catch)/,
    'C2',
    'Promise .then() without .catch().',
    'Rejections are unhandled; can lead to unhandledRejection and crashes.',
    'Process stability.',
    'reliability',
    'High',
    7, 6, 9, 6
  );
}

function C3_networkNoTimeout(file: TaggedFile): DetectedFailure[] {
  const hasFetch = /\b(fetch|axios|request|http\.get)\s*\(/i.test(file.content);
  const noTimeout = !/\b(timeout|timeoutMs|signal|AbortController)\b/i.test(file.content);
  if (hasFetch && noTimeout)
    return runRule(
      file,
      /fetch\s*\(|axios\.|http\.get|request\s*\(/i,
      'C3',
      'Network call without visible timeout.',
      'Hanging requests can exhaust connections or block event loop.',
      'Availability and latency.',
      'reliability',
      'Medium',
      6, 6, 7, 5
    );
  return [];
}

function C4_retryNoCircuitBreaker(file: TaggedFile): DetectedFailure[] {
  const hasRetry = /\b(retry|retries|attempt)\b/i.test(file.content);
  const noCircuit = !/\b(circuit|breaker|open|fallback)\b/i.test(file.content);
  if (hasRetry && noCircuit)
    return runRule(
      file,
      /retry|retries|attempt/i,
      'C4',
      'Retry logic without circuit breaker or backoff limit.',
      'Failing dependency can cause stampede and cascade failures.',
      'Availability.',
      'reliability',
      'Low',
      6, 5, 6, 5
    );
  return [];
}

function C5_missingGlobalErrorHandler(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('backend')) return [];
  const hasApp = /\b(app|express|fastify)\s*\.(use|listen)/i.test(file.content);
  const noErrorHandler = !/\b(err|error)\s*=>|\.use\s*\(\s*function\s*\(\s*err/i.test(file.content);
  if (hasApp && noErrorHandler)
    return runRule(
      file,
      /app\.(use|listen)|express\s*\(\)/,
      'C5',
      'App entry without visible global error handler.',
      'Uncaught errors can crash the server or return stack traces.',
      'Stability and security (info leak).',
      'reliability',
      'Medium',
      7, 7, 7, 6
    );
  return [];
}

function C6_unhandledRejection(file: TaggedFile): DetectedFailure[] {
  const hasPromise = /new\s+Promise\s*\(|Promise\./i.test(file.content);
  const noCatch = !/\.catch\s*\(|try\s*\{/i.test(file.content);
  if (hasPromise && noCatch)
    return runRule(
      file,
      /new\s+Promise|Promise\.(all|race)/,
      'C6',
      'Promise created without .catch() or try/catch.',
      'Unhandled rejections can terminate Node process.',
      'Availability.',
      'reliability',
      'High',
      7, 6, 8, 6
    );
  return [];
}

// --- D. DATABASE & STATE FAILURES ---

function D1_multiStepNoTransaction(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('db') && !file.intents.includes('backend')) return [];
  const multipleWrites = /\.(create|update|delete|insert)\s*\(|\.save\s*\(/gi;
  const matches = file.content.match(multipleWrites);
  const noTransaction = !/\b(transaction|beginTransaction|commit|rollback)\b/i.test(file.content);
  if (matches && matches.length >= 2 && noTransaction)
    return runRule(
      file,
      /\.(create|update|delete|save|insert)\s*\(/i,
      'D1',
      'Multiple DB writes without transaction.',
      'Partial success can leave data inconsistent on failure.',
      'Data integrity.',
      'database',
      'High',
      9, 6, 7, 6
    );
  return [];
}

function D2_partialUpdateNoRollback(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('db') && !file.intents.includes('backend')) return [];
  const hasUpdate = /\.update\s*\(|\.updateOne|\.updateMany/i.test(file.content);
  const noRollback = !/\b(rollback|revert|undo)\b/i.test(file.content);
  if (hasUpdate && noRollback && !/\btransaction\b/i.test(file.content))
    return runRule(
      file,
      /\.update\s*\(|\.updateOne|\.updateMany/,
      'D2',
      'Update logic without rollback or transaction.',
      'Failures mid-update can leave partial or corrupt state.',
      'Data consistency.',
      'database',
      'Medium',
      8, 6, 6, 5
    );
  return [];
}

function D3_dbWriteNoErrorHandling(file: TaggedFile): DetectedFailure[] {
  const writePattern = /\.(save|create|update|delete|insert)\s*\(/i;
  if (!writePattern.test(file.content)) return [];
  const noTryCatch = !/try\s*\{[\s\S]*\.(save|create|update|delete|insert)/i.test(file.content) && !/\.catch\s*\(/i.test(file.content);
  if (noTryCatch)
    return runRule(
      file,
      writePattern,
      'D3',
      'DB write without visible error handling.',
      'Write failures can go unhandled and cause inconsistent state or crashes.',
      'Data integrity and stability.',
      'database',
      'High',
      8, 6, 8, 6
    );
  return [];
}

function D4_missingUniquenessConstraints(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('db')) return [];
  const hasUniqueField = /\b(email|username|slug|unique)\b/i.test(file.content);
  const noUniqueConstraint = !/@unique|unique:\s*true|UNIQUE\s+CONSTRAINT|uniqueConstraint/i.test(file.content);
  if (hasUniqueField && noUniqueConstraint && /schema|model|createTable|CREATE TABLE/i.test(file.content))
    return runRule(
      file,
      /email|username|slug|unique/i,
      'D4',
      'Schema/model with unique-looking field but no uniqueness constraint.',
      'Duplicate values can be inserted; integrity and business logic failures.',
      'Data integrity.',
      'database',
      'Medium',
      7, 6, 7, 5
    );
  return [];
}

function D5_concurrentWritesNoGuards(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('db') && !file.intents.includes('backend')) return [];
  const hasCounterOrBalance = /\b(count|balance|increment|decrement)\b/i.test(file.content);
  const noLock = !/\b(lock|transaction|serializable|for update)\b/i.test(file.content);
  if (hasCounterOrBalance && noLock)
    return runRule(
      file,
      /increment|decrement|balance|count\s*[+=]/i,
      'D5',
      'Counter or balance update without transaction/lock.',
      'Concurrent updates can cause lost updates or wrong totals.',
      'Correctness of financial or count data.',
      'database',
      'High',
      8, 6, 6, 6
    );
  return [];
}

// --- E. FRONTEND FAILURE PATHS ---

function E1_infiniteLoaderNoErrorUI(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('frontend')) return [];
  const hasLoader = /loading|isLoading|spinner|Loader/i.test(file.content);
  const noErrorUI = !/error\s*[=:]|ErrorBoundary|catch.*error|onError/i.test(file.content);
  if (hasLoader && noErrorUI)
    return runRule(
      file,
      /loading|isLoading|Loader/,
      'E1',
      'Loading state without visible error UI or error boundary.',
      'Users see infinite loader when API fails; poor UX and support burden.',
      'User trust and support cost.',
      'frontend',
      'Medium',
      5, 7, 8, 5
    );
  return [];
}

function E2_apiFailuresHidden(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('frontend')) return [];
  const hasFetch = /fetch\s*\(|axios\.|useQuery|useSWR/i.test(file.content);
  const noErrorHandling = !/\.catch|catch\s*\(|onError|isError|error\s*&&/i.test(file.content);
  if (hasFetch && noErrorHandling)
    return runRule(
      file,
      /fetch\s*\(|axios\.|useQuery/,
      'E2',
      'API call without visible error handling or user feedback.',
      'Failures are silent; users do not know what went wrong.',
      'UX and support.',
      'frontend',
      'High',
      5, 7, 9, 5
    );
  return [];
}

function E3_optimisticNoRollback(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('frontend')) return [];
  const optimistic = /optimistic|setData\s*\(|updateQueryData/i.test(file.content);
  const noRollback = !/rollback|revert|onError|catch.*setData|onSettled/i.test(file.content);
  if (optimistic && noRollback)
    return runRule(
      file,
      /optimistic|setData\s*\(|updateQueryData/,
      'E3',
      'Optimistic update without rollback on failure.',
      'UI can show success while server failed; inconsistent state.',
      'User trust and data consistency.',
      'frontend',
      'Medium',
      6, 6, 7, 5
    );
  return [];
}

function E4_formsNoDebounceDisable(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('frontend')) return [];
  const hasSubmit = /onSubmit|handleSubmit|submit\s*\(/i.test(file.content);
  const noDebounce = !/\b(debounce|disabled|isSubmitting)\b/i.test(file.content);
  if (hasSubmit && noDebounce)
    return runRule(
      file,
      /onSubmit|handleSubmit|submit\s*\(/,
      'E4',
      'Form submit without debounce or disable-on-submit.',
      'Double submissions can cause duplicate charges or duplicate records.',
      'Revenue and data integrity.',
      'frontend',
      'Medium',
      6, 7, 8, 6
    );
  return [];
}

function E5_blindTrustBackendSuccess(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('frontend')) return [];
  const checksStatus = /\.ok|status\s*===?\s*200|response\.status/i.test(file.content);
  const noCheck = !checksStatus && /fetch\s*\(|axios\./i.test(file.content);
  if (noCheck)
    return runRule(
      file,
      /fetch\s*\(|axios\./,
      'E5',
      'API response used without checking status or success.',
      '4xx/5xx responses can be treated as success; wrong UI or logic.',
      'Correctness and UX.',
      'frontend',
      'High',
      6, 6, 8, 5
    );
  return [];
}

// --- F. CONFIGURATION FAILURES ---

function F1_servicesOnZeroZero(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('config')) return [];
  return runRule(
    file,
    /0\.0\.0\.0|listen\s*\(\s*[\d]+|host\s*[=:]\s*['"]0\.0\.0\.0['"]/i,
    'F1',
    'Service bound to 0.0.0.0 or all interfaces.',
    'Exposes service to network; increase in attack surface if not intended.',
    'Security and compliance.',
    'config',
    'Medium',
    6, 8, 6, 7
  );
}

function F2_debugEnabledProduction(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('config')) return [];
  return runRule(
    file,
    /debug\s*[=:]\s*true|NODE_ENV\s*[=:]\s*['"]dev|DEBUG\s*[=:]\s*['"]?\*['"]?/i,
    'F2',
    'Debug or dev mode enabled in config.',
    'Information leakage and performance impact in production.',
    'Security and stability.',
    'config',
    'High',
    6, 7, 7, 6
  );
}

function F3_missingHttpsSecure(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('config')) return [];
  const hasHttp = /http:\/\//i.test(file.content) && !/https:\/\//i.test(file.content);
  const hasCookie = /cookie|session/i.test(file.content);
  if (hasCookie && hasHttp)
    return runRule(
      file,
      /http:\/\/|cookie|session/,
      'F3',
      'HTTP or cookies without visible secure/HTTPS configuration.',
      'Sessions or data can be sent over plaintext; interception risk.',
      'Confidentiality and compliance.',
      'config',
      'Medium',
      7, 8, 6, 6
    );
  return [];
}

function F4_missingEnvSpecificConfig(file: TaggedFile): DetectedFailure[] {
  if (!file.intents.includes('config')) return [];
  const hasConfig = /config|process\.env|NODE_ENV/i.test(file.content);
  const singleEnv = !/development|production|staging|test/i.test(file.content) && hasConfig;
  if (singleEnv && file.relativePath.includes('config'))
    return runRule(
      file,
      /process\.env|config\s*[=:]/,
      'F4',
      'Config file without env-specific branching.',
      'Same config may be used in all environments; prod misuse or leaks.',
      'Security and correctness.',
      'config',
      'Low',
      5, 6, 6, 5
    );
  return [];
}

function F5_secretsCommittedToRepo(file: TaggedFile): DetectedFailure[] {
  const secretLike = /(password|secret|private_key|api_key)\s*[=:]\s*['"][^'"]{8,}['"]/i;
  return runRule(
    file,
    secretLike,
    'F5',
    'Secrets or long credentials in file (possible commit to repo).',
    'Committed secrets can leak via Git history or forks.',
    'Account and system compromise.',
    'config',
    'High',
    10, 8, 8, 9
  );
}

// --- Rule registry and runner ---

const ALL_RULES: ((file: TaggedFile) => DetectedFailure[])[] = [
  A1_missingInputValidation,
  A2_clientOnlyValidation,
  A3_arithmeticOnUserInput,
  A4_missingBoundaryChecks,
  A5_emptyCatch,
  A6_businessRulesOnlyFrontend,
  A7_clientFeatureFlagsOnly,
  B1_missingAuthMiddleware,
  B2_hardcodedSecrets,
  B3_missingAuthzAdminPayment,
  B4_noRateLimitExpensive,
  B5_fileUploadNoValidation,
  B6_directObjectNoOwnership,
  C1_asyncNoTryCatch,
  C2_promiseNoCatch,
  C3_networkNoTimeout,
  C4_retryNoCircuitBreaker,
  C5_missingGlobalErrorHandler,
  C6_unhandledRejection,
  D1_multiStepNoTransaction,
  D2_partialUpdateNoRollback,
  D3_dbWriteNoErrorHandling,
  D4_missingUniquenessConstraints,
  D5_concurrentWritesNoGuards,
  E1_infiniteLoaderNoErrorUI,
  E2_apiFailuresHidden,
  E3_optimisticNoRollback,
  E4_formsNoDebounceDisable,
  E5_blindTrustBackendSuccess,
  F1_servicesOnZeroZero,
  F2_debugEnabledProduction,
  F3_missingHttpsSecure,
  F4_missingEnvSpecificConfig,
  F5_secretsCommittedToRepo,
];

export function runAllRules(files: TaggedFile[]): DetectedFailure[] {
  const out: DetectedFailure[] = [];
  for (const file of files) {
    for (const rule of ALL_RULES) {
      const hits = rule(file);
      out.push(...hits);
    }
  }
  return out;
}

export { ALL_RULES };
