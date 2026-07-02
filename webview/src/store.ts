import { create } from 'zustand';
import type { FileContext, FuzzyConfig, HighlightRule } from './types';

interface HighlightState {
  rules: HighlightRule[];
  fuzzyDefaults: FuzzyConfig;
  openFiles: FileContext[];
  fileName?: string;
  filePath?: string;
  setRules: (rules: HighlightRule[]) => void;
  setFuzzyDefaults: (defaults: FuzzyConfig) => void;
  setOpenFiles: (files: FileContext[]) => void;
  setActiveFile: (fileName?: string, filePath?: string) => void;
}

export const useHighlightStore = create<HighlightState>((set) => ({
  rules: [],
  fuzzyDefaults: {
    kmerSize: 5,
    maxErrorRate: 0.2,
    minMatchLength: 8,
    xDrop: 10,
    allowIndel: true
  },
  openFiles: [],
  setRules: (rules) => set({ rules }),
  setFuzzyDefaults: (fuzzyDefaults) => set({ fuzzyDefaults }),
  setOpenFiles: (openFiles) => set({ openFiles }),
  setActiveFile: (fileName, filePath) => set({ fileName, filePath })
}));
