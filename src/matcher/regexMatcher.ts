import type { HighlightRule } from '../types';
import type { IMatcher, MatchResult } from './types';

export class RegexMatcher implements IMatcher {
  constructor(private readonly rule: HighlightRule) {}

  findMatches(documentText: string): MatchResult[] {
    if (!this.rule.pattern) {
      return [];
    }

    let regex: RegExp;
    try {
      regex = new RegExp(this.rule.pattern, this.rule.caseSensitive ? 'gu' : 'giu');
    } catch {
      return [];
    }

    const matches: MatchResult[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(documentText)) !== null) {
      if (match[0].length === 0) {
        regex.lastIndex += 1;
        continue;
      }

      matches.push({ start: match.index, end: match.index + match[0].length });
    }

    return matches;
  }
}
