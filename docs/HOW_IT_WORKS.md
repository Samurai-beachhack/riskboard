# How ZeroHour Works

This document describes how ZeroHour analyzes a codebase and produces the TOP 3 failure risks, including file discovery, intent inference, rule-based detection, ranking, and output features.

---

## 1. Overview

ZeroHour is a **terminal-based, context-aware failure predictor**. It:

1. **Recursively scans** a directory for analyzable files (no hardcoded folder names).
2. **Infers file intent** using heuristics (frontend, backend, db, config, shared).
3. **Runs 34 rule-based detectors** across six failure categories.
4. **Ranks** all findings by a composite score (business impact, exposure, likelihood, ease of abuse).
5. **Outputs only the TOP 3** with Risk Story, Blast Radius, Decision Trace, and “What Changed Since Last Run.”

It does **not** perform full static analysis, use ML, or replace SAST. It uses **rule-based detection** and **heuristic inference** to prioritize **business-breaking failure paths**.

---

## 2. End-to-End Flow

When you run `zerohour analyze` (or `./zerohour analyze -C <dir>`):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CLI (index.ts)                                                             │
│  • Resolves rootDir (-C / --cwd, default: current directory)                │
│  • Calls pipeline; passes ranked TOP 3 + delta to printer                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Discover (scanner/discover.ts)                                          │
│  • glob() over rootDir for analyzable extensions                            │
│  • Ignore: node_modules, .git, dist, build, .next, coverage, *.min.js, etc. │
│  • Output: list of absolute file paths                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. Classify (scanner/classify.ts)                                          │
│  • For each path: read file content, infer intents from content + extension │
│  • Intents: frontend | backend | db | config | shared (multiple allowed)    │
│  • Output: TaggedFile[] (path, relativePath, intents, content, extension)   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. Run rules (rules/index.ts)                                              │
│  • For each TaggedFile, run all 34 rule functions                           │
│  • Each rule returns DetectedFailure[] (or [])                              │
│  • Output: flat list of all DetectedFailure (file, line, ruleId, scores…)   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  4. Rank (scoring/score.ts)                                                     │
│  • composite = businessImpact×1.5 + exposure×1.2 + likelihood×1 + abuseEase×0.8 │
│  • Sort by composite desc; tie-break by ruleId+file                             │
│  • Output: TOP 3 DetectedFailure                                            	  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5. Delta (delta.ts)                                                        │
│  • Load .zerohour-last.json from rootDir (if exists)                        │
│  • Compare current TOP 3 with last run by key (file:line:ruleId)            │
│  • new = in current not in last; gone = in last not in current; same = both │
│  • Save current TOP 3 to .zerohour-last.json for next run                   │
│  • Output: DeltaResult { new, gone, same, hasLastRun }                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│  6. Print (output/printer.ts)                                                  │
│  • For each of TOP 3: title, file:line, why, scenario, Risk Story (3 steps),   │
│    Blast radius, Decision trace (score formula + values), Fix now, confidence  │
│  • If hasLastRun: “What changed since last run” (new / resolved / unchanged)   │
│  • Optional: wrap in boxen (--no-box for plain text)                           │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. File Discovery

**Module:** `src/scanner/discover.ts`

- **Input:** `rootDir` (resolved from `-C` / `--cwd`).
- **Behavior:**
  - Uses `glob` with a pattern built from **analyzable extensions**:  
    `.js`, `.jsx`, `.ts`, `.tsx`, `.vue`, `.svelte`, `.html`, `.css`, `.sql`, `.prisma`, `.env`, `.env.*`, `.yaml`, `.yml`, `Dockerfile`.
  - **Ignores:** `node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`, `*.min.js`, `*.bundle.js`, `package-lock.json`, `yarn.lock`.
  - Filters out filenames ending in `.min.js` or `.bundle.js`.
- **Output:** Array of absolute file paths under `rootDir`.

Folder structure is **not** hardcoded; only extensions and ignore list are fixed.

---

## 4. File Intent Inference (Classify)

**Module:** `src/scanner/classify.ts`

Each file is tagged with one or more **intents**: `frontend` | `backend` | `db` | `config` | `shared`.  
Intent is inferred from **file content and extension** using weak signals (no fixed folder names).

### Frontend

- **Extensions:** `.jsx`, `.tsx`, `.vue`, `.svelte`, `.html`, `.css`
- **Dependencies:** content matches `react`, `next`, `vue`, `angular`, `vite`, `svelte`
- **Patterns:** JSX-like tags (`<CapitalLetter`), `useState`/`useEffect`/`useContext`, `loading`/`error`/`setLoading`/`setError`

### Backend

- **Patterns:** `.get(`, `.post(`, `app.use`, `router.get`, `middleware`, `express`/`fastify`/`nestjs`/`flask`/`django`, `req.body`/`req.params`/`req.query`

### Database

- **Extensions:** `.sql`; paths containing `migration`; `.prisma`
- **Patterns:** `prisma`, `mongoose`, `sequelize`, `typeorm`, `knex`, `transaction`, `commit`, `rollback`, `migration`

### Config

- **Extensions:** `.env`, `.yaml`, `.yml`; basename `Dockerfile`
- **Patterns:** `0.0.0.0`, `debug = true`, `NODE_ENV`, `secret`, `password`, `api_key`

### Shared

- Applied when a file has **multiple intents** or when **no other intent** matches (so it is still considered for rules that treat “shared” or general code).

**Output:** For each path, a `TaggedFile`: `{ path, relativePath, intents, content, extension }`.  
`relativePath` is from `rootDir` (used in reports).

---

## 5. Failure Detection Rules

**Module:** `src/rules/index.ts` (+ `src/rules/helpers.ts`)

- **Input:** `TaggedFile[]` (path, intents, content, etc.).
- **Process:** For each file, **every rule function** is run. Each rule returns an array of `DetectedFailure` (often 0 or more per file).
- **Output:** A single flat list of all `DetectedFailure`.

Rules are **pure functions**: they use **regex/pattern matching** on file content and sometimes **intent** (e.g. “only run on backend”). They do **not** use a full AST or ML.

Each `DetectedFailure` includes:

- `ruleId`, `file`, `line`
- `detectionExplanation`, `whyItMatters`, `businessImpact`
- `confidence`: High | Medium | Low
- `category`: business-critical | security | reliability | database | frontend | config
- **Scores (1–10):** `businessImpactScore`, `exposureScore`, `likelihoodScore`, `abuseEaseScore`

### Rule Categories (34 rules)

| Category        | Rule IDs | Focus |
|----------------|----------|--------|
| **A. Business-critical** | A1–A7 | Input validation, client-only validation, arithmetic on user input, boundary checks, empty catch, business rules only in frontend, client-only feature flags |
| **B. Security**         | B1–B6 | Auth middleware, hardcoded secrets, authz on admin/payment, rate limiting, file upload validation, ownership check (IDOR) |
| **C. Reliability**     | C1–C6 | Async/try-catch, promise `.catch`, network timeouts, retries/circuit breaker, global error handler, unhandled rejections |
| **D. Database**        | D1–D5 | Multi-step writes/transactions, partial updates/rollback, DB error handling, uniqueness constraints, concurrent writes |
| **E. Frontend**        | E1–E5 | Loaders without error UI, API failures hidden, optimistic UI without rollback, forms without debounce/disable, blind trust in backend |
| **F. Config**           | F1–F5 | 0.0.0.0 binding, debug in production, HTTPS/secure flags, env-specific config, secrets in repo |

Rules use **pattern matching** (e.g. `catch\s*\([^)]*\)\s*\{\s*\}` for empty catch) and **intent checks** (e.g. “backend” for route handlers). Line numbers come from the first (or all) matching line(s) in the file.

---

## 6. Ranking

**Module:** `src/scoring/score.ts`

- **Input:** Full list of `DetectedFailure`.
- **Formula (per finding):**  
  `composite = businessImpactScore×1.5 + exposureScore×1.2 + likelihoodScore×1.0 + abuseEaseScore×0.8`
- **Sort:** By `composite` **descending**. Ties broken by `(ruleId + file)` string comparison so order is deterministic.
- **Output:** **Exactly the top 3** findings (or fewer if there are fewer than 3).

So “how the score was calculated” is: the four numeric scores and the weights above. The **Decision Trace** in the report shows this formula and the actual numbers for each of the TOP 3.

---

## 7. Output: Risk Story, Blast Radius, Decision Trace

**Module:** `src/output/printer.ts` (text) and `src/explain/translate.ts` (copy).

For **each of the TOP 3** the report includes:

### Standard fields

- **Title** (e.g. “Missing input validation on public API”)
- **File:line** (relative path and line)
- **Why this matters** (bullets)
- **Failure scenario** (one paragraph)
- **Fix now** (bullets)
- **Confidence** (High / Medium / Low)

### Risk Story (3 steps)

- **How this becomes an incident:** three steps (trigger → escalation → incident).
- Text is defined per rule in `translate.ts` via `riskStorySteps(f)`.

### Blast radius

- Short **text chain** of what is affected (e.g. “API layer → business logic → data/service”).
- Defined per rule in `translate.ts` via `blastRadiusText(f)`.

### Decision trace (score)

- Shows the **ranking formula** and the **four score components** plus the **composite** for that finding, e.g.:  
  `businessImpact×1.5 (8) + exposure×1.2 (9) + likelihood×1 (8) + abuseEase×0.8 (7) = 36.4`

So “how the score was calculated” is visible per finding in the report.

---

## 8. What Changed Since Last Run (Delta)

**Module:** `src/delta.ts`

- **Storage:** A file `.zerohour-last.json` is stored **inside the analyzed directory** (the same `rootDir` used for the scan), e.g. `examples/sample-app/.zerohour-last.json` when you run `zerohour analyze -C examples/sample-app`.

### Snapshot format

- **When:** Written **after** every `analyze` run (with the current TOP 3).
- **Contents:** `{ cwd, timestamp, findings }` where each finding is `{ file, line, ruleId }` (relative path).

### Delta logic

- **Load:** Before printing, ZeroHour tries to load `.zerohour-last.json` from `rootDir`.
- **Key:** A finding is identified by `file:line:ruleId` (relative path).
- **Compare:**
  - **New:** In current TOP 3, not in last snapshot.
  - **Gone:** In last snapshot, not in current TOP 3 (e.g. fixed or outranked).
  - **Same:** In both (same file, line, and rule).
- **Save:** After computing delta, the **current** TOP 3 is written to `.zerohour-last.json` for the next run.

So “what changed since last run” is: new risks, resolved risks, and unchanged risks, based on the previous run in the **same directory**. The report section is only shown when a last run exists (`hasLastRun`).

---

## 9. CLI

**Module:** `src/index.ts` (Commander).

- **Command:** `zerohour analyze` (or `./zerohour analyze` from project root).
- **Options:**
  - `-C, --cwd <dir>` — Directory to analyze (default: current directory).
  - `--no-box` — Plain text output (no boxen border).
- **Global:** `--help`, `--version`.

The binary can be run as:

- `./zerohour analyze` (from repo root after `npm run build`).
- `zerohour analyze` if the repo is on PATH or linked via `npm link`.

---

## 10. File Layout (source)

| Path | Role |
|------|------|
| `src/index.ts` | CLI entry; runs discover → classify → rules → rank → delta → print. |
| `src/types.ts` | Shared types: `FileIntent`, `TaggedFile`, `DetectedFailure`, `FailureCategory`, etc. |
| `src/scanner/discover.ts` | Recursive file discovery (glob + ignore). |
| `src/scanner/classify.ts` | File intent inference; produces `TaggedFile[]`. |
| `src/rules/index.ts` | 34 rule functions; `runAllRules(files)` returns all `DetectedFailure`. |
| `src/rules/helpers.ts` | Line-finding and `createFailure()` for rules. |
| `src/scoring/score.ts` | `rankFailures()`: composite score, sort, TOP 3. |
| `src/delta.ts` | Load/save `.zerohour-last.json`; `computeDelta(rootDir, top3)`. |
| `src/explain/translate.ts` | Human-readable text: scenario, fix bullets, title, Risk Story steps, Blast radius. |
| `src/output/printer.ts` | Formats TOP 3 + delta (Risk Story, Blast Radius, Decision Trace, “What changed”). |
| `bin/zerohour.js` | Thin wrapper that `require()`s `dist/index.js` (for npm bin). |
| `zerohour` (root) | Script run as `./zerohour`; invokes `dist/index.js`. |

---

## 11. Summary

| Step | What happens |
|------|----------------|
| **Discover** | Glob for analyzable extensions under `rootDir`; respect ignore list. |
| **Classify** | Infer frontend/backend/db/config/shared from content + extension. |
| **Rules** | Run 34 rule-based detectors on each file; collect all findings. |
| **Rank** | Compute composite score; sort; take TOP 3; tie-break by ruleId+file. |
| **Delta** | Load last TOP 3 from `.zerohour-last.json`; compute new/gone/same; save current TOP 3. |
| **Print** | For each of TOP 3: title, file:line, why, scenario, Risk Story (3 steps), Blast radius, Decision trace (score), fix, confidence; then “What changed since last run” if applicable. |

All of this is **deterministic**, **rule-based**, and **explainable**: every finding has a rule ID, file, line, and an explicit score breakdown (Decision Trace) and incident story (Risk Story).
