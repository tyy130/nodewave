// =============================================================================
//  NODEWAVE — Extension — Upgrade Wizard WebView Panel
// =============================================================================

import * as vscode from 'vscode';

export class UpgradePanel {
  static currentPanel: UpgradePanel | undefined;
  private readonly _panel: vscode.WebviewPanel;

  static createOrShow(extensionUri: vscode.Uri, cwd: string) {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    if (UpgradePanel.currentPanel) {
      UpgradePanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'nodewaveUpgrade',
      'nodewave: Upgrade Project',
      column,
      { enableScripts: true }
    );

    UpgradePanel.currentPanel = new UpgradePanel(panel, cwd);
  }

  private constructor(panel: vscode.WebviewPanel, private readonly cwd: string) {
    this._panel = panel;
    this._panel.webview.html = this._getHtml();

    this._panel.webview.onDidReceiveMessage(async (msg: { command: string; upgrade: string }) => {
      if (msg.command === 'upgrade') {
        const terminal = vscode.window.createTerminal('nodewave upgrade');
        terminal.show();
        terminal.sendText(`nodewave upgrade --cwd "${cwd}"`);
        this._panel.dispose();
      }
    });

    this._panel.onDidDispose(() => { UpgradePanel.currentPanel = undefined; });
  }

  private _getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>nodewave: Upgrade</title>
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 20px; max-width: 600px; }
    h1 { font-size: 1.4rem; margin-bottom: 0.5rem; }
    .wave { color: #00b4d8; }
    .option { border: 1px solid var(--vscode-widget-border); border-radius: 6px; padding: 14px; margin-bottom: 12px; cursor: pointer; transition: border-color 0.15s; }
    .option:hover { border-color: #00b4d8; }
    .option h3 { margin: 0 0 4px; font-size: 0.95rem; }
    .option p { margin: 0; font-size: 0.82rem; opacity: 0.75; }
    button { background: #00b4d8; color: white; border: none; padding: 7px 18px; border-radius: 4px; cursor: pointer; margin-top: 8px; }
    .selected { border-color: #00b4d8; background: rgba(0,180,216,0.08); }
    label { display: flex; align-items: flex-start; gap: 10px; }
    input[type=radio] { margin-top: 3px; }
  </style>
</head>
<body>
  <h1><span class="wave">🌊</span> nodewave — Upgrade Project</h1>
  <p style="opacity:0.7; font-size:0.88rem; margin-bottom:1.5rem;">Select an upgrade path to apply to your project.</p>

  <label class="option" onclick="select('pages-to-app')">
    <input type="radio" name="upgrade" value="pages-to-app" />
    <div>
      <h3>Pages Router → App Router</h3>
      <p>Migrate from Next.js Pages Router to the modern App Router. Moves pages/ → app/, converts getServerSideProps to server components.</p>
    </div>
  </label>

  <label class="option" onclick="select('cjs-to-esm')">
    <input type="radio" name="upgrade" value="cjs-to-esm" />
    <div>
      <h3>CommonJS → ES Modules</h3>
      <p>Convert require() → import, module.exports → export default. Sets "type": "module" in package.json.</p>
    </div>
  </label>

  <label class="option" onclick="select('next-version')">
    <input type="radio" name="upgrade" value="next-version" />
    <div>
      <h3>Bump Next.js to Latest</h3>
      <p>Update next, react, and react-dom to the latest compatible versions in package.json.</p>
    </div>
  </label>

  <button onclick="applyUpgrade()">Apply Upgrade in Terminal</button>

  <script>
    const vscode = acquireVsCodeApi();
    let selected = null;
    function select(val) { selected = val; }
    function applyUpgrade() {
      if (!selected) { alert('Select an upgrade path first'); return; }
      vscode.postMessage({ command: 'upgrade', upgrade: selected });
    }
  </script>
</body>
</html>`;
  }
}
