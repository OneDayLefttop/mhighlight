import * as vscode from 'vscode';
import { getTargetTextEditor } from '../editorContext';
import type { HighlightEngine } from '../highlighter/highlightEngine';
import type { RuleStore } from '../highlighter/ruleStore';
import type { HighlightPanel } from '../panel/highlightPanel';
import type { HighlightRule } from '../types';

export function registerCommands(
  context: vscode.ExtensionContext,
  panel: HighlightPanel,
  highlightEngine: HighlightEngine,
  ruleStore: RuleStore
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('mhighlight.openPanel', () => panel.show()),
    vscode.commands.registerCommand('mhighlight.triggerManual', () => {
      const editor = getTargetTextEditor();
      if (!editor) {
        void vscode.window.showInformationMessage('MHighlight: no active editor.');
        return;
      }
      highlightEngine.applyManual(editor);
    }),
    vscode.commands.registerCommand('mhighlight.addSelectionToFileRules', () => {
      const editor = getTargetTextEditor();
      if (!editor) {
        void vscode.window.showInformationMessage('MHighlight: no active editor.');
        return;
      }

      const selections = editor.selections
        .map((selection) => editor.document.getText(selection).trim())
        .filter((text) => text.length > 0);
      const uniqueSelections = [...new Set(selections)];

      if (uniqueSelections.length === 0) {
        void vscode.window.showInformationMessage('MHighlight: select text before adding a File rule.');
        return;
      }

      for (const selectedText of uniqueSelections) {
        ruleStore.add(createSelectionRule(editor.document, selectedText));
      }

      highlightEngine.applyAuto(editor);
      void vscode.window.showInformationMessage(
        uniqueSelections.length === 1
          ? 'MHighlight: added selection to File rules.'
          : `MHighlight: added ${uniqueSelections.length} selections to File rules.`
      );
    }),
    vscode.commands.registerCommand('mhighlight.clear', () => highlightEngine.clear()),
    vscode.commands.registerCommand('mhighlight.importRules', async () => {
      await panel.importRulesFromFile();
    }),
    vscode.commands.registerCommand('mhighlight.exportRules', async () => {
      await panel.exportRulesToFile();
    })
  );
}

function createSelectionRule(document: vscode.TextDocument, selectedText: string): HighlightRule {
  const filePath = document.uri.fsPath || document.uri.path;
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    name: selectedText.length > 32 ? `${selectedText.slice(0, 29)}...` : selectedText,
    scope: 'file',
    filePath,
    fileName: filePath.split(/[\\/]/).pop() ?? filePath,
    matchType: 'string',
    pattern: selectedText,
    backgroundColor: 'rgba(255, 214, 10, 0.35)',
    caseSensitive: false,
    enabled: true,
    mode: 'auto'
  };
}
