import * as vscode from 'vscode';
import type { HighlightRule } from '../types';
import { styleKey, toDecorationOptions } from './styleResolver';

export class DecorationManager implements vscode.Disposable {
  private readonly decorationsByStyle = new Map<string, vscode.TextEditorDecorationType>();

  getDecoration(rule: HighlightRule): vscode.TextEditorDecorationType {
    const key = styleKey(rule);
    const existing = this.decorationsByStyle.get(key);
    if (existing) {
      return existing;
    }

    const decoration = vscode.window.createTextEditorDecorationType(toDecorationOptions(rule));
    this.decorationsByStyle.set(key, decoration);
    return decoration;
  }

  clearEditor(editor: vscode.TextEditor): void {
    for (const decoration of this.decorationsByStyle.values()) {
      editor.setDecorations(decoration, []);
    }
  }

  dispose(): void {
    for (const decoration of this.decorationsByStyle.values()) {
      decoration.dispose();
    }
    this.decorationsByStyle.clear();
  }
}
