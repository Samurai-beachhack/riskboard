# ZeroHour – Execution Plan

This document defines **what to build, in what order, and why**, based on the
current ZeroHour architecture.

Scope is constrained to ship a **working decision-layer system on top of SAST**
with CLI and SDK support.

---

## Goal (Non-Negotiable)

Ship a system that:

1. Runs **Semgrep** to collect structured findings
2. Normalizes findings into a unified internal dataset
3. Uses **Grok** to reason about failure impact and priority
4. Outputs **Top 10 issues by default**
5. Explains **why they matter** and **how to address them**
6. Optionally generates **AI-assisted fix suggestions**
7. Exposes the same capabilities via a **CLI and SDK**

Anything outside this is out of scope.

---

## Core Assumptions

- ZeroHour does **not** scan code directly
- Semgrep is the source of raw analysis data
- AI is used for reasoning and guidance, not detection
- Prioritization rules are enforced by ZeroHour
- CLI is a consumer of the core SDK

---

## Phase 1 — Foundation

### 1. CLI Skeleton
- `zerohour analyze` command
- Argument parsing (path, output mode, limits)
- Exit codes and error handling

Deliverable:
- CLI executes reliably on a sample project

---

### 2. Semgrep Integration
- Execute Semgrep against a target project
- Capture findings in structured form (JSON)

Deliverable:
- Reliable acquisition of raw Semgrep findings

---

## Phase 2 — Data Normalization

### 3. Findings Normalizer
- Convert Semgrep output into a unified internal schema
- Deduplicate and enrich findings with context

Deliverable:
- Clean, consistent dataset for reasoning

---

## Phase 3 — Reasoning and Prioritization

### 4. Grok Reasoning Layer
- Analyze normalized findings
- Infer failure impact and propagation
- Correlate related issues across files

Deliverable:
- Ranked list of findings with contextual explanations

---

### 5. Forced Prioritization
- Enforce default **Top 10** output
- Allow full output only when explicitly requested

Deliverable:
- Deterministic, decision-focused result set

---

## Phase 4 — Remediation Guidance

### 6. AI-Assisted Fix Generation
- Generate suggested fixes or mitigation guidance
- Ensure output is advisory and non-destructive

Deliverable:
- Human-readable remediation suggestions

---

## Phase 5 — Output and Integration

### 7. Reporting Layer
- CLI output (boxed and plain text)
- Structured output for programmatic use (JSON)

Deliverable:
- Clear, explainable output suitable for decisions

---

### 8. SDK Development
- Expose core functionality as a reusable SDK
- Enable integration into CI/CD and existing tools

Deliverable:
- Stable SDK API used by the CLI

---

## Phase 6 — Validation

### 9. Sanity and Consistency Testing
- Run against multiple sample projects
- Verify:
  - Stable prioritization
  - Clear explanations
  - No overwhelming output

Deliverable:
- Confidence in decision quality and usability

---

## Explicitly Out of Scope

These are intentionally excluded:

- Writing custom SAST rules
- CVE databases
- Dependency scanning
- Automatic code modification
- Runtime or production analysis
- Dashboards or UI layers

---

## Success Criteria

ZeroHour is successful if:

- Semgrep findings are reliably processed
- Top 10 prioritization is enforced by default
- Explanations are understandable without source code expertise
- CLI and SDK produce consistent results

---

## Failure Conditions

The project fails if:

- ZeroHour behaves like a scanner instead of a decision layer
- Output becomes unbounded or noisy
- AI replaces, rather than assists, human judgment
- Architecture diverges from Semgrep → Reasoning → Decision

---

## Notes

This plan optimizes for:
- Architectural correctness
- Honest scope
- Decision clarity over completeness

Any change that weakens the **decision-layer role** is rejected.

