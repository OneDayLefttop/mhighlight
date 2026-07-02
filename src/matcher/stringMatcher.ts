import type { HighlightRule } from '../types';
import type { IMatcher, MatchResult } from './types';

export class StringMatcher implements IMatcher {
  constructor(private readonly rule: HighlightRule) {}

  findMatches(documentText: string): MatchResult[] {
    const pattern = this.rule.pattern;
    if (!pattern) {
      return [];
    }

    const haystack = this.rule.caseSensitive ? documentText : documentText.toLocaleLowerCase();
    const needle = this.rule.caseSensitive ? pattern : pattern.toLocaleLowerCase();
    const matches: MatchResult[] = [];
    let fromIndex = 0;

    while (fromIndex <= haystack.length) {
      const index = haystack.indexOf(needle, fromIndex);
      if (index < 0) {
        break;
      }

      matches.push({ start: index, end: index + pattern.length });
      fromIndex = index + Math.max(needle.length, 1);
    }

    return matches;
  }
}
