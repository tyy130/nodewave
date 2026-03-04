// =============================================================================
//  NODEWAVE — Extension — Sidebar TreeView Provider
// =============================================================================

import * as vscode from 'vscode';
import * as path from 'path';
import {
  loadConfig,
  harvest,
  detectProjectType,
} from '@nodewave/core';
import type { HarvestResult } from '@nodewave/core';

export class NodewaveExplorerProvider implements vscode.TreeDataProvider<NodewaveItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<NodewaveItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private harvestCache: HarvestResult | null = null;

  constructor(private readonly workspaceRoot: string | undefined) {}

  refresh(): void {
    this.harvestCache = null;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: NodewaveItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: NodewaveItem): Promise<NodewaveItem[]> {
    if (!this.workspaceRoot) {
      return [new NodewaveItem('No workspace open', vscode.TreeItemCollapsibleState.None, 'info')];
    }

    if (!element) {
      return this.getRootItems();
    }

    switch (element.contextValue) {
      case 'routes-root': return this.getRouteItems();
      case 'env-root': return this.getEnvItems();
      case 'deployments-root': return this.getDeploymentItems();
      default: return [];
    }
  }

  private async getHarvest(): Promise<HarvestResult | null> {
    if (this.harvestCache) return this.harvestCache;
    try {
      this.harvestCache = await harvest(this.workspaceRoot!);
      return this.harvestCache;
    } catch {
      return null;
    }
  }

  private async getRootItems(): Promise<NodewaveItem[]> {
    const [config, typeResult, harvestResult] = await Promise.all([
      loadConfig(this.workspaceRoot!).catch(() => null),
      detectProjectType(this.workspaceRoot!).catch(() => ({ type: 'unknown', framework: 'unknown', version: null })),
      this.getHarvest(),
    ]);

    const targetIcons: Record<string, string> = { vercel: '▲', netlify: '◆', railway: '🚂' };
    const target = config?.target ?? 'not configured';
    const targetIcon = targetIcons[target] ?? '?';

    return [
      new NodewaveItem(
        `${harvestResult?.projectName ?? 'Project'} — ${typeResult.framework}`,
        vscode.TreeItemCollapsibleState.None,
        'project',
        `${typeResult.type} • ${target}`,
        new vscode.ThemeIcon('package')
      ),
      new NodewaveItem(
        `Target: ${targetIcon} ${target}`,
        vscode.TreeItemCollapsibleState.None,
        'target',
        'Click status bar to change',
        new vscode.ThemeIcon('cloud-upload')
      ),
      new NodewaveItem(
        `Routes (${harvestResult?.routes.length ?? 0})`,
        vscode.TreeItemCollapsibleState.Collapsed,
        'routes-root',
        undefined,
        new vscode.ThemeIcon('symbol-method')
      ),
      new NodewaveItem(
        `Environment Variables`,
        vscode.TreeItemCollapsibleState.Collapsed,
        'env-root',
        undefined,
        new vscode.ThemeIcon('symbol-variable')
      ),
      new NodewaveItem(
        `Deployments`,
        vscode.TreeItemCollapsibleState.Collapsed,
        'deployments-root',
        undefined,
        new vscode.ThemeIcon('rocket')
      ),
    ];
  }

  private async getRouteItems(): Promise<NodewaveItem[]> {
    const h = await this.getHarvest();
    if (!h || h.routes.length === 0) {
      return [new NodewaveItem('No routes detected', vscode.TreeItemCollapsibleState.None, 'info')];
    }
    return h.routes.map(r => new NodewaveItem(r, vscode.TreeItemCollapsibleState.None, 'route', undefined, new vscode.ThemeIcon('symbol-file')));
  }

  private async getEnvItems(): Promise<NodewaveItem[]> {
    const h = await this.getHarvest();
    if (!h) return [];

    const items: NodewaveItem[] = [];

    for (const key of h.envVars.defined) {
      const isUsed = h.envVars.usedInSource.includes(key);
      items.push(new NodewaveItem(key, vscode.TreeItemCollapsibleState.None, 'env-defined',
        isUsed ? 'Used in source' : 'Defined (unused)',
        new vscode.ThemeIcon(isUsed ? 'check' : 'circle-slash')));
    }

    for (const key of h.envVars.missing) {
      items.push(new NodewaveItem(key, vscode.TreeItemCollapsibleState.None, 'env-missing',
        '⚠ Used in source but not defined in .env',
        new vscode.ThemeIcon('warning')));
    }

    if (items.length === 0) {
      return [new NodewaveItem('No env vars detected', vscode.TreeItemCollapsibleState.None, 'info')];
    }

    return items;
  }

  private async getDeploymentItems(): Promise<NodewaveItem[]> {
    const config = await loadConfig(this.workspaceRoot!).catch(() => null);
    if (!config) {
      return [new NodewaveItem('Run nodewave deploy to set up', vscode.TreeItemCollapsibleState.None, 'info')];
    }

    return [
      new NodewaveItem(
        `Target: ${config.target}`,
        vscode.TreeItemCollapsibleState.None,
        'deploy-target',
        `Run: nodewave deploy --target ${config.target}`,
        new vscode.ThemeIcon('rocket')
      ),
    ];
  }
}

export class NodewaveItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    description?: string,
    iconPath?: vscode.ThemeIcon
  ) {
    super(label, collapsibleState);
    this.description = description;
    this.iconPath = iconPath;
    this.contextValue = contextValue;
  }
}
