import { Finding, EnrichedFinding, ContextSignals } from './types';

export function enrichContext(findings: Finding[]): EnrichedFinding[] {
  return findings.map((finding) => {
    const context = extractSignals(finding);
    const exposureScore = calculateExposure(context, finding.severity);
    return { ...finding, context, exposureScore };
  });
}

function extractSignals(finding: Finding): ContextSignals {
  const lowerFile = finding.file.toLowerCase();
  const lowerCode = (finding.codeSnippet || '').toLowerCase();
  const lowerMsg = finding.message.toLowerCase();

  const isPayment =
    lowerFile.includes('stripe') ||
    lowerFile.includes('payment') ||
    lowerCode.includes('checkout') ||
    lowerCode.includes('billing');

  const isAdmin =
    lowerFile.includes('admin') ||
    lowerFile.includes('dashboard') ||
    lowerMsg.includes('admin');

  const isAuth =
    lowerFile.includes('auth') ||
    lowerFile.includes('login') ||
    lowerFile.includes('jwt') ||
    lowerCode.includes('password') ||
    lowerCode.includes('token');

  const isPublicFacing =
    lowerFile.includes('api/') ||
    lowerFile.includes('controllers/') ||
    lowerFile.includes('routes/') ||
    lowerFile.includes('public/');

  const modifiesDatabase =
    lowerCode.includes('insert') ||
    lowerCode.includes('update') ||
    lowerCode.includes('delete') ||
    lowerCode.includes('save()');

  return { isPayment, isAdmin, isAuth, isPublicFacing, modifiesDatabase };
}

function calculateExposure(context: ContextSignals, severity: string): number {
  let score = 0;
  if (severity === 'ERROR') score += 5;
  if (severity === 'WARNING') score += 3;

  if (context.isPayment) score += 4;
  if (context.isAuth) score += 3;
  if (context.isAdmin) score += 3;
  if (context.isPublicFacing) score += 2;
  if (context.modifiesDatabase) score += 2;

  return Math.min(score, 10);
}
