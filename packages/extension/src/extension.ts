// =============================================================================
//  ███╗   ██╗ ██████╗ ██████╗ ███████╗██╗    ██╗ █████╗ ██╗   ██╗███████╗
//  ████╗  ██║██╔═══██╗██╔══██╗██╔════╝██║    ██║██╔══██╗██║   ██║██╔════╝
//  ██╔██╗ ██║██║   ██║██║  ██║█████╗  ██║ █╗ ██║███████║██║   ██║█████╗
//  ██║╚██╗██║██║   ██║██║  ██║██╔══╝  ██║███╗██║██╔══██║╚██╗ ██╔╝██╔══╝
//  ██║ ╚████║╚██████╔╝██████╔╝███████╗╚███╔███╔╝██║  ██║ ╚████╔╝ ███████╗
//  ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝  ╚═══╝  ╚══════╝
//  nodewave VS Code Extension — Extension Host Entry
// =============================================================================

import * as vscode from 'vscode';
import { NodewaveExplorerProvider } from './sidebar/NodewaveExplorerProvider';
import { NodewaveStatusBar } from './statusbar/StatusBarItem';
import { registerCommands } from './commands';

export async function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  // Sidebar Explorer
  const explorerProvider = new NodewaveExplorerProvider(workspaceRoot);
  vscode.window.registerTreeDataProvider('nodewave.explorer', explorerProvider);

  // Status bar
  const statusBar = new NodewaveStatusBar(context);
  await statusBar.init(workspaceRoot);

  // Commands
  registerCommands(context, explorerProvider, statusBar, workspaceRoot);

  // Auto-refresh sidebar when files change
  const watcher = vscode.workspace.createFileSystemWatcher('**/nodewave.config.js');
  watcher.onDidChange(() => explorerProvider.refresh());
  watcher.onDidCreate(() => explorerProvider.refresh());
  context.subscriptions.push(watcher);

  vscode.window.setStatusBarMessage('$(wave) nodewave ready', 3000);
}

export function deactivate() {}
