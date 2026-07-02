import * as vscode from 'vscode';
import type { HighlightRule } from '../types';

export class RuleStore implements vscode.Disposable {
  private readonly rules = new Map<string, HighlightRule>();
  private readonly changeEmitter = new vscode.EventEmitter<HighlightRule[]>();

  readonly onDidChangeRules = this.changeEmitter.event;

  all(): HighlightRule[] {
    return [...this.rules.values()];
  }

  add(rule: HighlightRule): void {
    const normalized = normalizeRule(rule);
    this.rules.set(normalized.id, normalized);
    this.emit();
  }

  update(rule: HighlightRule): void {
    const normalized = normalizeRule(rule);
    this.rules.set(normalized.id, normalized);
    this.emit();
  }

  delete(id: string): void {
    this.rules.delete(id);
    this.emit();
  }

  replaceAll(rules: HighlightRule[]): void {
    this.rules.clear();
    for (const rule of rules) {
      const normalized = normalizeRule(rule);
      this.rules.set(normalized.id, normalized);
    }
    this.emit();
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }

  private emit(): void {
    this.changeEmitter.fire(this.all());
  }
}

function normalizeRule(rule: HighlightRule): HighlightRule {
  const matchType = rule.matchType ?? 'string';
  return {
    ...rule,
    id: rule.id || cryptoId(),
    name: rule.name || rule.pattern || 'Untitled rule',
    matchType,
    scope: rule.scope ?? 'global',
    fileName: rule.fileName ?? rule.filePath?.split(/[\\/]/).pop(),
    backgroundColor: rule.backgroundColor || 'rgba(255, 214, 10, 0.35)',
    caseSensitive: rule.caseSensitive ?? false,
    enabled: rule.enabled ?? true,
    mode: matchType === 'fuzzy' ? 'manual' : rule.mode ?? 'auto'
  };
}

function cryptoId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
