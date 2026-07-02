import { describe, expect, it } from 'vitest';
import { TsFuzzyEngine } from '../../src/matcher/tsFuzzyEngine';
import type { FuzzyConfig } from '../../src/types';

describe('TsFuzzyEngine', () => {
  const config: FuzzyConfig = {
    kmerSize: 3,
    maxErrorRate: 0.25,
    minMatchLength: 8,
    xDrop: 10,
    allowIndel: false
  };

  it('finds close ungapped matches with mismatches', () => {
    const engine = new TsFuzzyEngine();

    const matches = engine.search('xx hello wurld yy', 'hello world', config, false);

    expect(matches).toEqual([{ start: 3, end: 14, score: expect.any(Number) }]);
  });

  it('rejects patterns shorter than the minimum length', () => {
    const engine = new TsFuzzyEngine();

    expect(engine.search('abcdef', 'abc', config, true)).toEqual([]);
  });

  it('merges overlapping candidate ranges', () => {
    const engine = new TsFuzzyEngine();

    const matches = engine.search('abcdeXghij abcdeYghij', 'abcdefghij', config, true);

    expect(matches).toEqual([
      { start: 0, end: 10, score: expect.any(Number) },
      { start: 11, end: 21, score: expect.any(Number) }
    ]);
  });

  it('returns one continuous range for insertion matches when indels are enabled', () => {
    const engine = new TsFuzzyEngine();
    const indelConfig: FuzzyConfig = { ...config, kmerSize: 3, minMatchLength: 6, allowIndel: true };

    const matches = engine.search('xx abcXdef yy', 'abcdef', indelConfig, true);

    expect(matches).toEqual([{ start: 3, end: 10, score: expect.any(Number) }]);
  });

  it('returns one continuous range for deletion matches when indels are enabled', () => {
    const engine = new TsFuzzyEngine();
    const indelConfig: FuzzyConfig = { ...config, kmerSize: 3, minMatchLength: 6, allowIndel: true };

    const matches = engine.search('xx abdef yy', 'abcdef', indelConfig, true);

    expect(matches).toEqual([{ start: 3, end: 8, score: expect.any(Number) }]);
  });
});
