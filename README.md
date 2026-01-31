# ZeroHour for Trae AI

**ZeroHour for Trae AI** is a native, AI-powered Static Application Security Testing (SAST) prioritization engine designed specifically for the Trae IDE.

It ingests findings from Semgrep, enriches them with project context (e.g., "Is this a payment module?", "Is this public-facing?"), and uses **Groq AI (Llama 3)** to rank them by **real business risk** directly within your Trae workflow.

## Features

- **Trae Native Integration**: Runs directly within Trae as a VS Code-compatible extension.
- **AI-Powered Prioritization**: Filters out noise and highlights critical risks.
- **Context-Aware**: Understands if code is auth-related, payment-related, or public-facing.
- **One-Click AI Fixes**: Apply fixes instantly with the "Fix with ZeroHour AI" lightbulb action.
- **Continuous Security**: Scan and fix iteratively without leaving your editor.

## Getting Started in Trae

### 1. Installation
ZeroHour for Trae AI is designed to be run as a local extension.

```bash
cd extension
npm install
npm run compile
```

Then, launch the extension from the "Run and Debug" panel in Trae.

### 2. Usage
1. Open your project in Trae.
2. Run the command **"ZeroHour: Analyze Risks"**.
3. View prioritized risks in the **Output Panel** ("ZeroHour (Trae Edition)").
4. Navigate to any file with a warning.
5. Click the **Lightbulb icon** and select **"Fix with ZeroHour AI"**.

## Configuration
Create a `.env` file in your project root:
```env
GROQ_API_KEY=gsk_...
```

## Architecture
- **Core Engine**: TypeScript-based analysis logic (shared with CLI).
- **Extension**: Wraps the core engine for Trae/VS Code.
- **AI**: Powered by Groq (Llama 3) for speed and accuracy.
