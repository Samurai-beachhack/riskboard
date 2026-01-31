/**
 * Unit tests: failure detection rules (per category)
 */

import { runAllRules, ALL_RULES } from './index';
import { TaggedFile } from '../types';

function makeFile(relativePath: string, content: string, intents: string[] = ['backend']): TaggedFile {
  return {
    path: `/root/${relativePath}`,
    relativePath,
    intents: intents as TaggedFile['intents'],
    content,
    extension: relativePath.includes('.') ? relativePath.split('.').pop()! : '',
  };
}

describe('rules – business-critical (A)', () => {
  it('A5: detects empty catch', () => {
    const file = makeFile('handler.js', 'try { x(); } catch (e) {}');
    const out = runAllRules([file]);
    expect(out.some((f) => f.ruleId === 'A5')).toBe(true);
  });

  it('A6: detects business rules in frontend', () => {
    const file = makeFile('Checkout.tsx', 'const price = 99; const total = price * qty;', ['frontend']);
    const out = runAllRules([file]);
    expect(out.some((f) => f.ruleId === 'A6')).toBe(true);
  });
});

describe('rules – security (B)', () => {
  it('B2: detects hardcoded secrets', () => {
    const file = makeFile('config.js', 'const api_key = "sk_live_12345";');
    const out = runAllRules([file]);
    expect(out.some((f) => f.ruleId === 'B2')).toBe(true);
  });

  it('B1: detects routes without auth (backend)', () => {
    const file = makeFile('server.js', 'app.get("/api", (req, res) => res.json(req.body));');
    const out = runAllRules([file]);
    expect(out.some((f) => f.ruleId === 'B1')).toBe(true);
  });
});

describe('rules – reliability (C)', () => {
  it('C2: detects .then without .catch', () => {
    const file = makeFile('api.js', 'fetch(url).then(r => r.json());');
    const out = runAllRules([file]);
    expect(out.some((f) => f.ruleId === 'C2')).toBe(true);
  });
});

describe('rules – database (D)', () => {
  it('D1: detects multi-step writes without transaction', () => {
    const file = makeFile('repo.js', 'await User.create({}); await Order.create({});', ['backend', 'db']);
    const out = runAllRules([file]);
    expect(out.some((f) => f.ruleId === 'D1')).toBe(true);
  });
});

describe('rules – frontend (E)', () => {
  it('E1: detects loader without error UI', () => {
    const file = makeFile('Page.tsx', 'const [loading, setLoading] = useState(true); return loading ? <Loader /> : null;', ['frontend']);
    const out = runAllRules([file]);
    expect(out.some((f) => f.ruleId === 'E1')).toBe(true);
  });
});

describe('rules – config (F)', () => {
  it('F1: detects 0.0.0.0', () => {
    const file = makeFile('config.js', 'host: "0.0.0.0"', ['config']);
    const out = runAllRules([file]);
    expect(out.some((f) => f.ruleId === 'F1')).toBe(true);
  });

  it('F2: detects debug in prod', () => {
    const file = makeFile('config.js', 'debug: true', ['config']);
    const out = runAllRules([file]);
    expect(out.some((f) => f.ruleId === 'F2')).toBe(true);
  });
});

describe('rules – count', () => {
  it('implements at least 25 rules', () => {
    expect(ALL_RULES.length).toBeGreaterThanOrEqual(25);
  });
});
