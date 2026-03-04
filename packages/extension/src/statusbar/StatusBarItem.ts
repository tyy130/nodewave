// =============================================================================
//  NODEWAVE — Extension — Status Bar Item
// =============================================================================

import * as vscode from 'vscode';
import { loadConfig } from '@nodewave/core';

const TARGET_ICONS: Record<string, string> = {
  vercel: '▲',
  netlify: '◆',
  railway: '🚂',
};

export class NodewaveStatusBar {
  private targetItem: vscode.StatusBarItem;
  private deployItem: vscode.StatusBarItem;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.targetItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.deployItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);

    this.targetItem.command = 'nodewave.switchTarget';
    this.deployItem.command = 'nodewave.deploy';
    this.deployItem.text = '$(rocket) Deploy';
    this.deployItem.tooltip = 'nodewave: Deploy project';

    context.subscriptions.push(this.targetItem, this.deployItem);
  }

  async init(workspaceRoot?: string): Promise<void> {
    await this.update(workspaceRoot);
  }

  async update(workspaceRoot?: string): Promise<void> {
    if (!workspaceRoot) {
      this.targetItem.hide();
      this.deployItem.hide();
      return;
    }

    try {
      const config = await loadConfig(workspaceRoot);
      const target = config?.target ?? 'vercel';
      const icon = TARGET_ICONS[target] ?? '?';

      this.targetItem.text = `$(wave) ${icon} ${target}`;
      this.targetItem.tooltip = `nodewave: targeting ${target} — click to switch`;
      this.targetItem.show();
      this.deployItem.show();
    } catch {
      this.targetItem.hide();
      this.deployItem.hide();
    }
  }
}
