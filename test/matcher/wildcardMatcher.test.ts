import { describe, expect, it } from 'vitest';
import { WildcardMatcher, wildcardToRegExp } from '../../src/matcher/wildcardMatcher';
import type { HighlightRule } from '../../src/types';

describe('WildcardMatcher', () => {
  it('converts glob-like wildcards to regex', () => {
    const regex = wildcardToRegExp('foo?.[tj]s');

    expect(regex.test('foo1.ts')).toBe(true);
    regex.lastIndex = 0;
    expect(regex.test('foo2.js')).toBe(true);
  });

  it('finds wildcard ranges', () => {
    const matcher = new WildcardMatcher(rule({ pattern: 'ab*ef' }));

    expect(matcher.findMatches('xx abcdef yy abZZef')).toEqual([
      { start: 3, end: 9 },
      { start: 13, end: 19 }
    ]);
  });
});

function rule(patch: Partial<HighlightRule>): HighlightRule {
  return {
    id: 'rule',
    name: 'rule',
    scope: 'global',
    matchType: 'wildcard',
    pattern: '',
    backgroundColor: '#ffff00',
    caseSensitive: false,
    enabled: true,
    mode: 'auto',
    ...patch
  };
}
