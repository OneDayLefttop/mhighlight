import type { FuzzyConfig, HighlightRule } from '../types';
import { FuzzyMatcher } from './fuzzyMatcher';
import { RegexMatcher } from './regexMatcher';
import { StringMatcher } from './stringMatcher';
import { TsFuzzyEngine } from './tsFuzzyEngine';
import type { IFuzzyEngine, IMatcher } from './types';
import { WildcardMatcher } from './wildcardMatcher';

export class DefaultMatcherFactory {
  constructor(
    private readonly getFuzzyDefaults: () => FuzzyConfig,
    private readonly fuzzyEngine: IFuzzyEngine = new TsFuzzyEngine()
  ) {}

  create(rule: HighlightRule): IMatcher {
    switch (rule.matchType) {
      case 'wildcard':
        return new WildcardMatcher(rule);
      case 'regex':
        return new RegexMatcher(rule);
      case 'fuzzy':
        return new FuzzyMatcher({ ...rule, mode: 'manual' }, this.getFuzzyDefaults(), this.fuzzyEngine);
      case 'string':
      default:
        return new StringMatcher(rule);
    }
  }
}
