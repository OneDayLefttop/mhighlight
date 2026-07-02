import * as vscode from 'vscode';
import { getFuzzyDefaults } from './config/fuzzyDefaults';
import { registerCommands } from './commands';
import { DecorationManager } from './decoration/decorationManager';
import { HighlightEngine } from './highlighter/highlightEngine';
import { RuleStore } from './highlighter/ruleStore';
import { DefaultMatcherFactory } from './matcher/factory';
import { HighlightPanel } from './panel/highlightPanel';

export function activate(context: vscode.ExtensionContext): void {
  const ruleStore = new RuleStore();
  const decorationManager = new DecorationManager();
  const matcherFactory = new DefaultMatcherFactory(getFuzzyDefaults);
  const highlightEngine = new HighlightEngine(ruleStore, decorationManager, matcherFactory);
  const panel = new HighlightPanel(context, ruleStore);

  context.subscriptions.push(ruleStore, decorationManager, highlightEngine, panel);
  registerCommands(context, panel, highlightEngine);
  highlightEngine.applyAutoToVisibleEditors();
}

export function deactivate(): void {
  // VS Code disposes context subscriptions automatically.
}
