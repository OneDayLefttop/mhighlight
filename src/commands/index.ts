import * as vscode from 'vscode';
import { getTargetTextEditor } from '../editorContext';
import type { HighlightEngine } from '../highlighter/highlightEngine';
import type { HighlightPanel } from '../panel/highlightPanel';

export function registerCommands(
  context: vscode.ExtensionContext,
  panel: HighlightPanel,
  highlightEngine: HighlightEngine
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
    vscode.commands.registerCommand('mhighlight.clear', () => highlightEngine.clear()),
    vscode.commands.registerCommand('mhighlight.importRules', async () => {
      await panel.importRulesFromFile();
    }),
    vscode.commands.registerCommand('mhighlight.exportRules', async () => {
      await panel.exportRulesToFile();
    })
  );
}
