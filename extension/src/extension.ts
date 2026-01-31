import * as vscode from 'vscode';
import * as path from 'path';
import { analyzeFindingsFile } from '../../src/api';
import { AnalysisResult, EnrichedFinding } from '../../src/types';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    console.log('ZeroHour extension is now active!');

    outputChannel = vscode.window.createOutputChannel("ZeroHour Analysis");
    context.subscriptions.push(outputChannel);

    let disposable = vscode.commands.registerCommand('zerohour.analyze', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('Please open a folder first.');
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;
        const findingsPath = path.join(rootPath, 'findings.json');

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "ZeroHour Security Scan",
            cancellable: false
        }, async (progress) => {
            try {
                outputChannel.clear();
                outputChannel.show();
                outputChannel.appendLine(`Starting analysis for: ${rootPath}`);

                const result = await analyzeFindingsFile(findingsPath, (msg) => {
                    progress.report({ message: msg });
                    outputChannel.appendLine(`[STATUS] ${msg}`);
                });

                // Display Results in Output Channel
                outputChannel.appendLine('\n--- ANALYSIS COMPLETE ---\n');
                
                if (result.topRisks.length === 0 && result.allFindings.length === 0) {
                    vscode.window.showInformationMessage('✅ ZeroHour: No risks found!');
                    outputChannel.appendLine('No findings to report.');
                } else {
                    vscode.window.showWarningMessage(`⚠️ ZeroHour: Found ${result.topRisks.length} critical risks.`);
                    
                    outputChannel.appendLine('=== TOP CRITICAL RISKS ===');
                    result.topRisks.forEach((risk, index) => {
                        outputChannel.appendLine(`\n${index + 1}. [${risk.confidence}] ${risk.title}`);
                        outputChannel.appendLine(`   File: ${risk.originalFinding.file}:${risk.originalFinding.line}`);
                        outputChannel.appendLine(`   Impact: ${risk.impact}`);
                        outputChannel.appendLine(`   Fix: ${risk.fix}`);
                    });

                    outputChannel.appendLine('\n=== ALL FINDINGS ===');
                    result.allFindings.forEach((f, i) => {
                        outputChannel.appendLine(`${i + 1}. [${f.severity}] ${f.message} (${f.file}:${f.line})`);
                    });
                }

            } catch (error: any) {
                vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
                outputChannel.appendLine(`[ERROR] ${error.message}`);
            }
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
