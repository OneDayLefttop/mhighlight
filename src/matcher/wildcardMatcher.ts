import type { HighlightRule } from '../types';
import type { IMatcher, MatchResult } from './types';

export function wildcardToRegExp(pattern: string): RegExp {
  let source = '';

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];

    if (char === '*') {
      source += '.*?';
    } else if (char === '?') {
      source += '.';
    } else if (char === '[') {
      const close = pattern.indexOf(']', index + 1);
      if (close > index) {
        source += pattern.slice(index, close + 1);
        index = close;
      } else {
        source += '\\[';
      }
    } else {
      source += escapeRegExp(char);
    }
  }

  return new RegExp(source, 'gu');
}

export class WildcardMatcher implements IMatcher {
  constructor(private readonly rule: HighlightRule) {}

  findMatches(documentText: string): MatchResult[] {
    if (!this.rule.pattern) {
      return [];
    }

    const flags = this.rule.caseSensitive ? 'gu' : 'giu';
    const base = wildcardToRegExp(this.rule.pattern);
    const regex = new RegExp(base.source, flags);
    return collectRegexMatches(regex, documentText);
  }
}

function collectRegexMatches(regex: RegExp, documentText: string): MatchResult[] {
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

function escapeRegExp(value: string): string {
  return value.replace(/[\\^$+?.()|{}]/g, '\\$&');
}
