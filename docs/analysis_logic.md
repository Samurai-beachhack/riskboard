# Analysis Logic

This document explains **how ZeroHour decides what matters first**.

---

## Core Question

> If this code fails, **what breaks the business first?**

All logic exists to answer this.

---

## Analysis Pipeline

1. **Semgrep** scans the codebase and produces structured findings  
2. Findings are **normalized** into a unified internal format  
3. **Grok** analyzes the normalized data to infer impact, priority, and context  
4. ZeroHour enforces **forced prioritization** and prepares output  
5. Optional AI generates **fix or remediation suggestions**

---

## What Is Analyzed

ZeroHour analyzes **failure-prone conditions derived from SAST findings**, including:

- Single points of failure
- Highly reused or central logic
- Orchestration and control-flow hubs
- Tight coupling across modules
- Missing or weak error-handling in critical paths
- Findings that correlate across files or components

The focus is **failure impact**, not rule severity.

---

## What Is NOT Analyzed

ZeroHour does NOT directly analyze:
- Source code syntax or semantics
- CVEs or vulnerability databases
- Dependency versions
- Runtime behavior
- Production metrics

Raw detection is delegated to **Semgrep**.

---

## Failure Signals

Failure impact is inferred using signals such as:

- Finding concentration in critical paths
- Cross-file dependency relationships
- Fan-in and fan-out imbalance
- Failure propagation potential
- Lack of isolation or recovery boundaries

Signals are derived from **structured findings**, not raw code parsing.

---

## Failure Impact Estimation

Impact estimation considers:

- How widely a finding affects the system
- Whether failure propagates or is contained
- Whether the issue blocks core workflows
- Whether meaningful recovery paths exist

ZeroHour does not expose numeric risk scores.

---

## Forced Prioritization Rule

- Output is limited to the **top 10 issues** by default
- Remaining findings are discarded unless explicitly requested

This constraint is intentional.

ZeroHour optimizes for **decision clarity**, not completeness.

---

## Explainability

Each reported issue includes:

- Why it matters
- How failure propagates
- What breaks if it fails
- Where to look in the code
- Optional remediation guidance

Reasoning is explicit and human-readable.

---

## Role of AI

AI is used to:
- Interpret and correlate findings
- Provide context-aware explanations
- Suggest possible fixes or mitigations

AI does NOT:
- Perform scanning
- Modify code automatically
- Replace human judgment

---

## Determinism and Variability

- Prioritization rules are deterministic
- Ordering logic is stable for identical inputs
- Explanations and fix suggestions may vary

---

## Known Limitations

- Dependent on Semgrep rule quality
- Static analysis only
- AI-generated fixes require human review
- Business intent cannot be inferred directly

These limits are explicit by design.

