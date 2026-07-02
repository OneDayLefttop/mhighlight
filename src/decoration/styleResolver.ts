import type * as vscode from 'vscode';
import type { HighlightRule } from '../types';

export function toDecorationOptions(rule: HighlightRule): vscode.DecorationRenderOptions {
  return {
    backgroundColor: rule.backgroundColor,
    color: rule.color,
    overviewRulerColor: rule.backgroundColor,
    overviewRulerLane: 4,
    rangeBehavior: 1
  };
}

export function styleKey(rule: HighlightRule): string {
  return `${rule.backgroundColor}|${rule.color ?? ''}`;
}
