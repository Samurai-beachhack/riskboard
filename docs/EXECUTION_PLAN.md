# ZeroHour – Execution Plan

## Goal (Non-Negotiable)

Ship a **working CLI** that:

1. Analyzes a codebase
2. Finds **failure-prone areas**
3. Outputs **Top 3 business-impact failures**
4. Explains **why it matters + how to fix**

If this works end-to-end, the project is useful even without prizes.

---

## Scope Lock (Critical)

### ❌ Explicitly NOT Doing

- Full SAST
- Multi-language analysis
- ML / AI
- High accuracy tuning
- Dashboards / UI

### ✅ Doing

- Opinionated analysis
- Heuristic-based detection
- Deterministic output
- Business-focused explanations

---

## First 3 Core Features (ONLY THESE)

### Core Feature 1: Failure Surface Detection

**What can break the system**

Strict scope:

- HTTP handlers / controllers
- Entry-point functions
- External boundaries:
  - Payment
  - Auth
  - User input
  - File I/O
  - Network calls

Implementation:

- Regex + lightweight AST
- Language: **JavaScript only**

Output example:
Detected 12 failure surfaces


---

### Core Feature 2: Impact Scoring

**Rank by business damage, not severity**

Scoring factors:

- User-facing?
- Critical path? (auth, payment, writes)
- Catastrophic failure? (crash, data loss, denial)

Hardcoded priority:
```
payment > auth > data write > read > internal
```

Output:
```
Ranked failure surfaces by impact
```

---

### Core Feature 3: Top-3 Output

**Forced prioritization**

Final CLI output:

- Exactly **3 issues**
- Each includes:
  - What fails
  - Why it matters (business)
  - How it fails (technical)
  - How to fix (actionable)

If this works, ZeroHour’s core idea is proven.

---

## Stack (Minimal, Fast)

### Language
- **Node.js (JS over TS for speed)**

### CLI
- `commander` or `process.argv`

### Parsing
- `fs`, `glob`
- Regex
- Optional: `@babel/parser` if needed

### Output
- Plain text
- Optional JSON flag

No DB. No config. No plugins.

---

## Repo Structure (Freeze)

```
zerohour/
├─ src/
│  ├─ index.js            # CLI entry
│  ├─ scanner/
│  │  ├─ discover.js      # failure surface detection
│  │  └─ classify.js      # type: payment/auth/etc
│  ├─ scoring/
│  │  └─ score.js
│  ├─ explain/
│  │  └─ translate.js
│  └─ output/
│     └─ printer.js
├─ examples/
├─ README.md
```


---

## Execution Reality

- Clear problem
- Clear differentiation
- Working demo

Why ZeroHour stands out:

- Everyone has scanners
- Nobody has **decision clarity**
- Top-3 constraint is memorable
- Terminal-native builds trust

---

## Definition of Done

Before submission:

- `failfast analyze ./example-app`
- [X] Produces **3 ranked issues**
- [X] Output is readable
- [X] Works offline

If this is met, the project is successful even outside the hackathon.

