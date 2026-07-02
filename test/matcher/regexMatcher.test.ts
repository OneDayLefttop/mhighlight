import { describe, expect, it } from 'vitest';
import { RegexMatcher } from '../../src/matcher/regexMatcher';
import type { HighlightRule } from '../../src/types';

describe('RegexMatcher', () => {
  it('returns ranges for regex matches', () => {
    const matcher = new RegexMatcher(rule({ pattern: 'a\\d+' }));

    expect(matcher.findMatches('a12 b a7')).toEqual([
      { start: 0, end: 3 },
      { start: 6, end: 8 }
    ]);
  });

  it('ignores invalid regex patterns', () => {
    const matcher = new RegexMatcher(rule({ pattern: '(' }));

    expect(matcher.findMatches('anything')).toEqual([]);
  });
});

function rule(patch: Partial<HighlightRule>): HighlightRule {
  return {
    id: 'rule',
    name: 'rule',
    scope: 'global',
    matchType: 'regex',
    pattern: '',
    backgroundColor: '#ffff00',
    caseSensitive: false,
    enabled: true,
    mode: 'auto',
    ...patch
  };
}
