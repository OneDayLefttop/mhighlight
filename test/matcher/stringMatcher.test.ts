import { describe, expect, it } from 'vitest';
import { StringMatcher } from '../../src/matcher/stringMatcher';
import type { HighlightRule } from '../../src/types';

describe('StringMatcher', () => {
  it('finds case-insensitive matches', () => {
    const matcher = new StringMatcher(rule({ pattern: 'hello', caseSensitive: false }));

    expect(matcher.findMatches('Hello hello')).toEqual([
      { start: 0, end: 5 },
      { start: 6, end: 11 }
    ]);
  });
});

function rule(patch: Partial<HighlightRule>): HighlightRule {
  return {
    id: 'rule',
    name: 'rule',
    scope: 'global',
    matchType: 'string',
    pattern: '',
    backgroundColor: '#ffff00',
    caseSensitive: false,
    enabled: true,
    mode: 'auto',
    ...patch
  };
}
