import * as vscode from 'vscode';
import { getFuzzyDefaults } from '../config/fuzzyDefaults';
import { exportRules, importRules } from '../config/io';
import { getOpenFileContexts, getTargetTextDocument } from '../editorContext';
import type { HighlightEngine } from '../highlighter/highlightEngine';
import type { RuleStore } from '../highlighter/ruleStore';
import type { HighlightRule } from '../types';
import type { ExtensionToPanelMessage, PanelToExtensionMessage } from './messageProtocol';

export class HighlightPanel implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly ruleStore: RuleStore,
    private readonly highlightEngine: HighlightEngine
  ) {
    this.disposables.push(
      this.ruleStore.onDidChangeRules((rules) => this.post({ type: 'rulesUpdated', rules })),
      vscode.window.onDidChangeActiveTextEditor(() => this.postFileContext()),
      vscode.window.onDidChangeVisibleTextEditors(() => this.postFileContext()),
      vscode.window.tabGroups.onDidChangeTabs(() => this.postFileContext()),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('mhighlight.fuzzyDefaults')) {
          this.post({ type: 'fuzzyDefaultsUpdated', defaults: getFuzzyDefaults() });
        }
      })
    );
  }

  show(): void {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
      this.syncAll();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'mhighlight.panel',
      'MHighlight',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
      }
    );

    this.panel.webview.html = this.renderHtml(this.panel.webview);
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
    this.panel.webview.onDidReceiveMessage((message: PanelToExtensionMessage) => {
      void this.handleMessage(message);
    });
    this.syncAll();
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.panel?.dispose();
  }

  private async handleMessage(message: PanelToExtensionMessage): Promise<void> {
    switch (message.type) {
      case 'getRules':
        this.syncAll();
        break;
      case 'addRule':
        this.ruleStore.add(normalizeIncomingRule(message.rule));
        break;
      case 'updateRule':
        this.ruleStore.update(normalizeIncomingRule(message.rule));
        break;
      case 'deleteRule':
        this.deleteRule(message.id);
        break;
      case 'toggleRule':
        this.toggleRule(message.id, message.enabled);
        break;
      case 'triggerManual':
        await vscode.commands.executeCommand('mhighlight.triggerManual');
        break;
      case 'clearHighlights':
        await vscode.commands.executeCommand('mhighlight.clear');
        break;
      case 'importRules':
        await vscode.commands.executeCommand('mhighlight.importRules');
        break;
      case 'exportRules':
        await vscode.commands.executeCommand('mhighlight.exportRules');
        break;
    }
  }

  async importRulesFromFile(): Promise<void> {
    const rules = await importRules();
    if (rules) {
      this.ruleStore.replaceAll(rules);
      this.post({ type: 'fuzzyDefaultsUpdated', defaults: getFuzzyDefaults() });
    }
  }

  async exportRulesToFile(): Promise<void> {
    await exportRules(this.ruleStore.all(), getFuzzyDefaults());
  }

  private toggleRule(id: string, enabled: boolean): void {
    const rule = this.ruleStore.all().find((item) => item.id === id);
    if (!rule) {
      return;
    }

    this.ruleStore.update({ ...rule, enabled });
  }

  private deleteRule(id: string): void {
    const rule = this.ruleStore.all().find((item) => item.id === id);
    if (rule) {
      this.highlightEngine.clearRule(rule);
    }

    this.ruleStore.delete(id);
  }

  private syncAll(): void {
    this.post({ type: 'rulesUpdated', rules: this.ruleStore.all() });
    this.post({ type: 'fuzzyDefaultsUpdated', defaults: getFuzzyDefaults() });
    this.postFileContext();
  }

  private postFileContext(): void {
    const document = getTargetTextDocument();
    this.post({ type: 'openFilesContext', files: getOpenFileContexts() });
    this.post({
      type: 'activeFileContext',
      filePath: document?.uri.fsPath,
      fileName: document?.fileName.split(/[\\/]/).pop()
    });
  }

  private post(message: ExtensionToPanelMessage): void {
    void this.panel?.webview.postMessage(message);
  }

  private renderHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'webview.css'));
    const nonce = getNonce();

    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>MHighlight</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function normalizeIncomingRule(rule: HighlightRule): HighlightRule {
  return {
    ...rule,
    id: rule.id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    fileName: rule.fileName ?? rule.filePath?.split(/[\\/]/).pop(),
    mode: rule.matchType === 'fuzzy' ? 'manual' : rule.mode
  };
}

function getNonce(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let value = '';
  for (let index = 0; index < 32; index += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return value;
}
