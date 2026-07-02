import * as vscode from 'vscode';
import type { HighlightMode, HighlightRule } from '../types';
import { DecorationManager } from '../decoration/decorationManager';
import { DefaultMatcherFactory } from '../matcher/factory';
import type { MatchResult } from '../matcher/types';
import { wildcardToRegExp } from '../matcher/wildcardMatcher';
import type { RuleStore } from './ruleStore';

const LARGE_DOCUMENT_THRESHOLD = 200 * 1024;
const CHANGE_DEBOUNCE_MS = 300;

export class HighlightEngine implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly ruleStore: RuleStore,
    private readonly decorationManager: DecorationManager,
    private readonly matcherFactory: DefaultMatcherFactory
  ) {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.applyAuto(editor);
        }
      }),
      vscode.window.onDidChangeVisibleTextEditors((editors) => {
        for (const editor of editors) {
          this.applyAuto(editor);
        }
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        for (const editor of vscode.window.visibleTextEditors) {
          if (editor.document === event.document) {
            this.clearMode(editor, 'manual');
            this.scheduleAuto(editor);
          }
        }
      }),
      this.ruleStore.onDidChangeRules(() => this.applyAutoToVisibleEditors())
    );
  }

  applyAutoToVisibleEditors(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.applyAuto(editor);
    }
  }

  applyAuto(editor: vscode.TextEditor): void {
    const rules = this.ruleStore
      .all()
      .filter((rule) => rule.enabled && rule.mode === 'auto' && this.matchesScope(rule, editor.document));
    this.applyRules(editor, rules, 'auto');
  }

  applyManual(editor: vscode.TextEditor): void {
    const rules = this.ruleStore
      .all()
      .filter((rule) => rule.enabled && rule.mode === 'manual' && this.matchesScope(rule, editor.document));
    this.applyRules(editor, rules, 'manual');
  }

  clear(editor?: vscode.TextEditor): void {
    if (editor) {
      this.decorationManager.clearEditor(editor);
      return;
    }

    for (const visibleEditor of vscode.window.visibleTextEditors) {
      this.decorationManager.clearEditor(visibleEditor);
    }
  }

  clearRule(rule: HighlightRule): void {
    const decoration = this.decorationManager.getDecoration(rule);
    for (const editor of vscode.window.visibleTextEditors) {
      if (this.matchesScope(rule, editor.document)) {
        editor.setDecorations(decoration, []);
      }
    }
  }

  dispose(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private scheduleAuto(editor: vscode.TextEditor): void {
    const key = editor.document.uri.toString();
    const existing = this.timers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.timers.delete(key);
      this.applyAuto(editor);
    }, CHANGE_DEBOUNCE_MS);
    this.timers.set(key, timer);
  }

  private applyRules(editor: vscode.TextEditor, rules: HighlightRule[], mode: HighlightMode): void {
    const textWindow = getSearchWindow(editor);

    for (const rule of this.ruleStore.all()) {
      if (rule.mode !== mode || !this.matchesScope(rule, editor.document)) {
        continue;
      }

      const decoration = this.decorationManager.getDecoration(rule);
      if (!rules.some((activeRule) => activeRule.id === rule.id)) {
        editor.setDecorations(decoration, []);
      }
    }

    for (const rule of rules) {
      const matcher = this.matcherFactory.create(rule);
      const matches = matcher.findMatches(textWindow.text);
      const ranges = toRanges(editor.document, matches, textWindow.offset);
      editor.setDecorations(this.decorationManager.getDecoration(rule), ranges);
    }
  }

  private clearMode(editor: vscode.TextEditor, mode: HighlightMode): void {
    for (const rule of this.ruleStore.all()) {
      if (rule.mode === mode && this.matchesScope(rule, editor.document)) {
        editor.setDecorations(this.decorationManager.getDecoration(rule), []);
      }
    }
  }

  private matchesScope(rule: HighlightRule, document: vscode.TextDocument): boolean {
    if (rule.scope === 'global') {
      return true;
    }

    if (rule.filePath) {
      const rulePath = normalizeFilePath(rule.filePath);
      const documentPath = normalizeFilePath(document.uri.fsPath);
      return rulePath === documentPath;
    }

    if (!rule.filePattern) {
      return false;
    }

    const path = document.uri.fsPath.replace(/\\/g, '/');
    const basename = path.split('/').pop() ?? path;
    const regex = wildcardToRegExp(rule.filePattern);
    regex.lastIndex = 0;
    return regex.test(path) || regex.test(basename);
  }
}

function normalizeFilePath(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function getSearchWindow(editor: vscode.TextEditor): { text: string; offset: number } {
  const document = editor.document;
  if (document.getText().length <= LARGE_DOCUMENT_THRESHOLD || editor.visibleRanges.length === 0) {
    return { text: document.getText(), offset: 0 };
  }

  const first = editor.visibleRanges[0];
  const last = editor.visibleRanges[editor.visibleRanges.length - 1];
  const startLine = Math.max(0, first.start.line - 50);
  const endLine = Math.min(document.lineCount - 1, last.end.line + 50);
  const start = new vscode.Position(startLine, 0);
  const end = document.lineAt(endLine).range.end;
  const range = new vscode.Range(start, end);
  return { text: document.getText(range), offset: document.offsetAt(start) };
}

function toRanges(document: vscode.TextDocument, matches: MatchResult[], offset: number): vscode.Range[] {
  return matches
    .filter((match) => match.end > match.start)
    .map((match) => new vscode.Range(document.positionAt(offset + match.start), document.positionAt(offset + match.end)));
}
