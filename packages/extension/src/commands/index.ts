// =============================================================================
//  NODEWAVE — Extension — Command Registrations
// =============================================================================

import * as vscode from 'vscode';
import * as path from 'path';
import { WizardPanel } from '../webviews/wizard/WizardPanel';
import { SettingsPanel } from '../webviews/settings/SettingsPanel';
import { UpgradePanel } from '../webviews/upgrade/UpgradePanel';
import type { NodewaveExplorerProvider } from '../sidebar/NodewaveExplorerProvider';
import type { NodewaveStatusBar } from '../statusbar/StatusBarItem';

export function registerCommands(
  context: vscode.ExtensionContext,
  explorer: NodewaveExplorerProvider,
  statusBar: NodewaveStatusBar,
  workspaceRoot?: string
) {
  const cwd = workspaceRoot ?? '';

  const runInTerminal = (cmd: string) => {
    const terminal = vscode.window.createTerminal('nodewave');
    terminal.show();
    terminal.sendText(cmd);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('nodewave.newProject', () => {
      WizardPanel.createOrShow(context.extensionUri, cwd);
    }),

    vscode.commands.registerCommand('nodewave.build', () => {
      runInTerminal(`nodewave build --cwd "${cwd}"`);
    }),

    vscode.commands.registerCommand('nodewave.dev', () => {
      runInTerminal(`nodewave dev --cwd "${cwd}"`);
    }),

    vscode.commands.registerCommand('nodewave.deploy', () => {
      runInTerminal(`nodewave deploy --cwd "${cwd}"`);
    }),

    vscode.commands.registerCommand('nodewave.harvest', async () => {
      const spinner = vscode.window.setStatusBarMessage('$(sync~spin) Harvesting project...');
      runInTerminal(`nodewave harvest --cwd "${cwd}"`);
      setTimeout(() => spinner.dispose(), 3000);
      explorer.refresh();
    }),

    vscode.commands.registerCommand('nodewave.upgrade', () => {
      UpgradePanel.createOrShow(context.extensionUri, cwd);
    }),

    vscode.commands.registerCommand('nodewave.addPackage', async () => {
      const pkg = await vscode.window.showInputBox({
        prompt: 'Package name to add (e.g. tailwindcss, prisma)',
        placeHolder: 'package-name',
      });
      if (pkg) {
        runInTerminal(`nodewave add ${pkg} --cwd "${cwd}"`);
      }
    }),

    vscode.commands.registerCommand('nodewave.openSettings', () => {
      SettingsPanel.createOrShow(context.extensionUri, cwd);
    }),

    vscode.commands.registerCommand('nodewave.showStatus', () => {
      runInTerminal(`nodewave status --cwd "${cwd}"`);
    }),

    vscode.commands.registerCommand('nodewave.switchTarget', async () => {
      const choice = await vscode.window.showQuickPick([
        { label: '▲ Vercel', value: 'vercel' },
        { label: '◆ Netlify', value: 'netlify' },
        { label: '🚂 Railway', value: 'railway' },
      ], { placeHolder: 'Select deployment target' });

      if (choice) {
        runInTerminal(`nodewave config --cwd "${cwd}"`);
        await statusBar.update(cwd);
      }
    }),

    vscode.commands.registerCommand('nodewave.refresh', () => {
      explorer.refresh();
      statusBar.update(cwd);
    })
  );
}
