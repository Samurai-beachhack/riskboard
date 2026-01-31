# ZeroHour

ZeroHour is a terminal-native CLI that answers one question:

> **What breaks the business first if this code fails?**

It is **not a SAST replacement**.  
It is the **decision layer before SAST**.

---

## What Problem It Solves

Modern SAST tools:
- Generate hundreds of findings
- Treat all issues as equal
- Lack business or failure impact context

Teams know *what is wrong*  
They do **not know what to fix first**

---

## What ZeroHour Does

ZeroHour analyzes a codebase and outputs:

- **Only the top 5 issues**
- Ranked by **failure impact**
- Explained in **business consequences**

It focuses on:
- Failure-prone areas
- Single-point-of-failure logic
- Risk concentration, not volume

---


## Core Principles

- Failure-first, not vulnerability-first
- Forced prioritization (Top 5 only)
- Business impact over technical noise
- Deterministic and auditable logic
- Terminal-only workflow

---

## How It Fits With SAST

**SAST tools**
- Find what is wrong

**ZeroHour**
- Decides what matters first

Recommended flow:
ZeroHour → Decide priorities → SAST → Fix

---

## Usage

After building the project:

```bash
# Analyze current directory
./zerohour analyze

# Analyze a specific directory
./zerohour analyze -C examples/sample-app

# Plain output (no box UI)
./zerohour analyze --no-box

Optional ways to run:
npm run analyze
npm run analyze -- -C examples/sample-app
npx zerohour analyze
npm link && zerohour analyze
To run from anywhere:
export PATH="/path/to/zerohour:$PATH"
zerohour analyze
```

---

## Documentation
- 📄 **Git Workflow:** [GIT_WORKFLOW.md](./GIT_WORKFLOW.md "Git Workflow markdown")
- 📄 **Execution Plan:** [EXECUTION_PLAN.md](./EXECUTION_PLAN.md "Execution Plan markdown")
- 📄 **How it works (detail):** [docs/HOW_IT_WORKS.md](./docs/HOW_IT_WORKS.md "Detailed Documentation")

---

## Contributing

Before making any changes, read the Git workflow:  
[GIT_WORKFLOW.md](./GIT_WORKFLOW.md "Detailed Git Workflow docs")

---

## Project Status

Prototype built during a hackathon.
Logic and scope may evolve.

---

## Contributors
Built during the [BeachHack](https://beachhack.in "Beach Hack hackthon website") Hackathon.

<p align="center">
  <a href="https://github.com/Samurai-beachhack/zerohour/graphs/contributors">
    <img
      src="https://contrib.rocks/image?repo=Samurai-beachhack/zerohour&size=80&columns=10&bg=transparent"
      alt="Contributors"
    />
  </a>
</p>


