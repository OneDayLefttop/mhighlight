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

  it('rejects isolated k-mer fragments instead of accepting partial query matches', () => {
    const engine = new TsFuzzyEngine();
    const fullQueryConfig: FuzzyConfig = { ...config, kmerSize: 7, minMatchLength: 8 };

    const matches = engine.search('xx GCTCTTCC yy', 'TCAGACGTGTGCTCTTCCATCT', fullQueryConfig, true);

    expect(matches).toEqual([]);
  });

  it('covers the whole query-aligned span when indels appear in sequence text', () => {
    const engine = new TsFuzzyEngine();
    const indelConfig: FuzzyConfig = { ...config, kmerSize: 7, minMatchLength: 8, allowIndel: true };

    const matches = engine.search('xx TCAGACGTGTGCTCTTCC-ATCT yy', 'TCAGACGTGTGCTCTTCCATCT', indelConfig, true);

    expect(matches).toEqual([{ start: 3, end: 26, score: expect.any(Number) }]);
  });

  it('does not include formatting whitespace before a gapped sequence candidate', () => {
    const engine = new TsFuzzyEngine();
    const indelConfig: FuzzyConfig = { ...config, kmerSize: 7, minMatchLength: 8, allowIndel: true };

    const text = 'Query  646  CAG-CGTGTGCTCTTCCGATCT  666';
    const matches = engine.search(text, 'TCAGACGTGTGCTCTTCCGATCT', indelConfig, true);

    expect(matches).toEqual([{ start: 12, end: 34, score: expect.any(Number) }]);
    expect(text[matches[0].start]).toBe('C');
    expect(text[matches[0].end]).toBe(' ');
  });

  it('finds full BLAST-like fuzzy spans with terminal bases and mixed indels', () => {
    const engine = new TsFuzzyEngine();
    const indelConfig: FuzzyConfig = { ...config, kmerSize: 7, maxErrorRate: 0.2, minMatchLength: 8, allowIndel: true };
    const pattern = 'TCAGACGTGTGCTCTTCCATCT';
    const text = [
      'Query  526  TCAGACGTGTGCTCTTCC-ATCT  547',
      'Sbjct  23   TCAGACGTGTGCTCTTCCGATCT  1',
      'Query  646  CAG-CGTGTGCTCTTCCGATCT  666',
      'Sbjct  22   CAGACGTGTGCTCTTCCGATCT  1'
    ].join('\n');

    const matches = engine.search(text, pattern, indelConfig, true);
    const matchedText = matches.map((match) => text.slice(match.start, match.end));

    expect(matchedText).toEqual([
      'TCAGACGTGTGCTCTTCC-ATCT',
      'TCAGACGTGTGCTCTTCCGATCT',
      'CAG-CGTGTGCTCTTCCGATCT',
      'CAGACGTGTGCTCTTCCGATCT'
    ]);
    expect(matchedText[0].endsWith('T')).toBe(true);
  });
});
