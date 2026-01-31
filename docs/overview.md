# Overview
 
## What it is
ZeroHour is a **decision layer on top of SAST**.

It helps teams decide **what to fix first**, not find vulnerabilities.

---

## The Idea
Instead of scanning for everything, ZeroHour asks:

> If this fails, what breaks the business first?

---

## Problem

Security and analysis tools produce:
- Too many findings
- No prioritization
- No business impact context

Teams waste time fixing low-impact issues.

---

## How it works (high level)

1. Statically scans a codebase
2. Extracts structural failure signals
3. Estimates failure impact
4. Forces prioritization
5. Outputs only the **top 10 issues**

---

## Target Users

- Developers
- Security learners
- Code reviewers
- Hackathon judges (non-technical)

---

## Typical Use Case

1. Run ZeroHour on a codebase
2. See top failure-prone areas
3. Decide where to focus
4. Run SAST tools next

---

## What makes it different
- Failure-first, not vulnerability-first
- Deterministic output
- Explainable reasoning
- Terminal-native
- Designed to complement SAST, not replace it

---

## Current status
Prototype built during a hackathon.

Focus: clarity, prioritization, and decision-making.
