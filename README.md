# ZeroHour

- 📄 **Git Workflow:** [GIT_WORKFLOW.md](./GIT_WORKFLOW.md)
- 📄 **Execution Plan:** [EXECUTION_PLAN.md](./EXECUTION_PLAN.md)

ZeroHour is a terminal-native CLI that identifies **what breaks the business first** in a codebase.

It is **not a SAST replacement**.  
It is the **decision layer before SAST**.

---

## Problem

Modern SAST tools are powerful, but they:
- Produce hundreds of findings
- Lack business context
- Do not help teams decide what to fix *today*

Teams know *what is wrong*, but not *what hurts first*.

---

## What ZeroHour Does

ZeroHour analyzes a codebase and outputs:

- **Only the top 3 issues**
- Ranked by **failure impact**
- Translated into **business consequences**

It answers:
> “What breaks first if this fails?”

---

## Core Principles

- **Failure-first, not vulnerability-first**
- **Forced prioritization (Top 3 only)**
- **Business context built-in**
- **Explainable results**
  - Why this matters
  - How it fails
  - How to fix it
- **No ML guessing**
  - Deterministic and auditable
- **Terminal-native**
  - No dashboards
  - No setup

---

## How It Fits With SAST

SAST tools are important. ZeroHour does not replace them.

**SAST**
- Finds what is wrong

**ZeroHour**
- Decides what matters first

ZeroHour runs **before** SAST triage to focus effort where impact is highest.

---

## Usage

```bash
failfast analyze
```
---

## Contributing

Before making any changes, read the Git workflow:  
[GIT_WORKFLOW.md](./GIT_WORKFLOW.md)

---

## Team
Built during the BeachHack Hackathon.

- **Raakesh** (@Rakesh173)
- **Adhil Ameen** (@aadhi13)
- **Mathew** (@)
- **Sangeeth** (@)
