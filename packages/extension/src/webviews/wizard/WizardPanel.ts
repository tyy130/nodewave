// =============================================================================
//  NODEWAVE — Extension — New Project Wizard WebView Panel
// =============================================================================

import * as vscode from 'vscode';

export class WizardPanel {
  static currentPanel: WizardPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;

  static createOrShow(extensionUri: vscode.Uri, cwd: string) {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    if (WizardPanel.currentPanel) {
      WizardPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'nodewaveWizard',
      'nodewave: New Project',
      column,
      { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist', 'webviews')] }
    );

    WizardPanel.currentPanel = new WizardPanel(panel, extensionUri, cwd);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, private readonly cwd: string) {
    this._panel = panel;
    this._panel.webview.html = this._getHtml(extensionUri);

    this._panel.webview.onDidReceiveMessage(async (msg: { command: string; data: Record<string, string> }) => {
      if (msg.command === 'init') {
        const { name, type, target, pm } = msg.data;
        const terminal = vscode.window.createTerminal('nodewave init');
        terminal.show();
        terminal.sendText(`nodewave init ${name} --type ${type} --target ${target}`);
        this._panel.dispose();
      }
    });

    this._panel.onDidDispose(() => { WizardPanel.currentPanel = undefined; });
  }

  private _getHtml(extensionUri: vscode.Uri): string {
    const scriptUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webviews', 'wizard.js')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>nodewave: New Project</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; }
    h1 { font-size: 1.4rem; margin-bottom: 1rem; }
    .wave { color: #00b4d8; }
    label { display: block; margin-bottom: 0.25rem; font-size: 0.85rem; opacity: 0.8; }
    input, select { width: 100%; padding: 6px 8px; margin-bottom: 1rem; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; font-size: 0.9rem; box-sizing: border-box; }
    button { background: #00b4d8; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-size: 0.9rem; }
    button:hover { background: #0096b4; }
  </style>
</head>
<body>
  <h1><span class="wave">🌊</span> nodewave — New Project</h1>
  <label>Project name</label>
  <input type="text" id="name" value="my-app" />
  <label>Project type</label>
  <select id="type">
    <option value="nextjs-app">Next.js App Router (full-stack)</option>
    <option value="nextjs-pages">Next.js Pages Router</option>
    <option value="express">Express API</option>
    <option value="fastify">Fastify API</option>
  </select>
  <label>Deployment target</label>
  <select id="target">
    <option value="vercel">▲ Vercel</option>
    <option value="netlify">◆ Netlify</option>
    <option value="railway">🚂 Railway</option>
  </select>
  <label>Package manager</label>
  <select id="pm">
    <option value="pnpm">pnpm (recommended)</option>
    <option value="npm">npm</option>
    <option value="yarn">yarn</option>
    <option value="bun">bun</option>
  </select>
  <button onclick="createProject()">Create Project</button>
  <script>
    const vscode = acquireVsCodeApi();
    function createProject() {
      vscode.postMessage({ command: 'init', data: {
        name: document.getElementById('name').value,
        type: document.getElementById('type').value,
        target: document.getElementById('target').value,
        pm: document.getElementById('pm').value,
      }});
    }
  </script>
</body>
</html>`;
  }
}
