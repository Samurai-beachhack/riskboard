# ZeroHour for Trae AI

This directory contains the source code for the ZeroHour extension, specifically optimized for Trae AI.

## Setup

1.  Navigate to this directory:
    ```bash
    cd extension
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Compile the extension:
    ```bash
    npm run compile
    ```

## Running in Trae

1.  Open this project in Trae AI.
2.  Press `F5` to launch the Extension Development Host.
3.  In the new window, open a project with a `findings.json` file.
4.  Run the command: `ZeroHour: Analyze Risks`.

## Architecture

This extension reuses the core logic from the parent `zerohour` CLI tool by importing directly from `../src/api`, providing a native Trae experience.
