// =============================================================================
//  NODEWAVE — Extension — Project Settings WebView Panel (Property Pages)
// =============================================================================

import * as vscode from 'vscode';
import { loadConfig, saveConfig } from '@nodewave/core';

export class SettingsPanel {
  static currentPanel: SettingsPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;

  static createOrShow(extensionUri: vscode.Uri, cwd: string) {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    if (SettingsPanel.currentPanel) {
      SettingsPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'nodewaveSettings',
      'nodewave: Project Settings',
      column,
      { enableScripts: true }
    );

    SettingsPanel.currentPanel = new SettingsPanel(panel, cwd);
  }

  private constructor(panel: vscode.WebviewPanel, private readonly cwd: string) {
    this._panel = panel;
    this._update();

    this._panel.webview.onDidReceiveMessage(async (msg: { command: string; config: Record<string, unknown> }) => {
      if (msg.command === 'save') {
        try {
          // Merge with existing config
          const existing = await loadConfig(cwd);
          if (existing) {
            const updated = { ...existing, ...msg.config as Record<string, unknown> };
            await saveConfig(updated as Parameters<typeof saveConfig>[0], cwd);
            vscode.window.showInformationMessage('nodewave: Settings saved ✓');
          }
        } catch (e) {
          vscode.window.showErrorMessage(`nodewave: Failed to save settings: ${e}`);
        }
      }
    });

    this._panel.onDidDispose(() => { SettingsPanel.currentPanel = undefined; });
  }

  private async _update() {
    const config = await loadConfig(this.cwd).catch(() => null);

    this._panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>nodewave: Settings</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; max-width: 600px; }
    h1 { font-size: 1.4rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1rem; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid var(--vscode-widget-border); padding-bottom: 4px; }
    label { display: block; margin-bottom: 0.25rem; font-size: 0.82rem; opacity: 0.75; }
    input, select { width: 100%; padding: 5px 8px; margin-bottom: 0.85rem; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 3px; font-size: 0.88rem; box-sizing: border-box; }
    button { background: #00b4d8; color: white; border: none; padding: 7px 18px; border-radius: 4px; cursor: pointer; }
    .wave { color: #00b4d8; }
    .no-config { color: var(--vscode-notificationsWarningIcon-foreground); }
  </style>
</head>
<body>
  <h1><span class="wave">🌊</span> nodewave — Project Settings</h1>
  ${!config ? '<p class="no-config">⚠ No nodewave.config.js found. Run <code>nodewave config</code> in the terminal to create one.</p>' : ''}

  <h2>Project</h2>
  <label>Name</label>
  <input type="text" id="project" value="${config?.project ?? ''}" />
  <label>Type</label>
  <select id="type">
    <option value="nextjs-app" ${config?.type === 'nextjs-app' ? 'selected' : ''}>Next.js App Router</option>
    <option value="nextjs-pages" ${config?.type === 'nextjs-pages' ? 'selected' : ''}>Next.js Pages Router</option>
    <option value="express" ${config?.type === 'express' ? 'selected' : ''}>Express</option>
    <option value="fastify" ${config?.type === 'fastify' ? 'selected' : ''}>Fastify</option>
  </select>

  <h2>Deployment</h2>
  <label>Target</label>
  <select id="target">
    <option value="vercel" ${config?.target === 'vercel' ? 'selected' : ''}>▲ Vercel</option>
    <option value="netlify" ${config?.target === 'netlify' ? 'selected' : ''}>◆ Netlify</option>
    <option value="railway" ${config?.target === 'railway' ? 'selected' : ''}>🚂 Railway</option>
  </select>
  <label>Region</label>
  <input type="text" id="region" value="${config?.deploy.region ?? 'iad1'}" />
  <label>Node.js Version</label>
  <input type="text" id="nodeVersion" value="${config?.deploy.nodeVersion ?? '22'}" />

  <h2>Build</h2>
  <label>Build Command</label>
  <input type="text" id="buildCommand" value="${config?.build.command ?? ''}" />
  <label>Output Directory</label>
  <input type="text" id="outputDir" value="${config?.build.output ?? ''}" />

  <br/>
  <button onclick="saveSettings()">Save Settings</button>

  <script>
    const vscode = acquireVsCodeApi();
    function saveSettings() {
      vscode.postMessage({ command: 'save', config: {
        project: document.getElementById('project').value,
        type: document.getElementById('type').value,
        target: document.getElementById('target').value,
        deploy: {
          region: document.getElementById('region').value,
          nodeVersion: document.getElementById('nodeVersion').value,
        },
        build: {
          command: document.getElementById('buildCommand').value,
          output: document.getElementById('outputDir').value,
        },
      }});
    }
  </script>
</body>
</html>`;
  }
}
