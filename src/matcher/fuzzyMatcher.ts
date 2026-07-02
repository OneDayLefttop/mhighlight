import type { FuzzyConfig, HighlightRule } from '../types';
import type { IFuzzyEngine, IMatcher, MatchResult } from './types';

export class FuzzyMatcher implements IMatcher {
  constructor(
    private readonly rule: HighlightRule,
    private readonly defaults: FuzzyConfig,
    private readonly engine: IFuzzyEngine
  ) {}

  findMatches(documentText: string): MatchResult[] {
    const config = { ...this.defaults, ...this.rule.fuzzyConfig };
    return this.engine.search(documentText, this.rule.pattern, config, this.rule.caseSensitive);
  }
}
