import type { FuzzyConfig, HighlightRule } from '../types';

export interface MatchResult {
  start: number;
  end: number;
  score?: number;
}

export interface IMatcher {
  findMatches(documentText: string): MatchResult[];
}

export interface IFuzzyEngine {
  search(documentText: string, pattern: string, config: FuzzyConfig, caseSensitive: boolean): MatchResult[];
}

export type MatcherFactory = (rule: HighlightRule) => IMatcher;
