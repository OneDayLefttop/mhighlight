import * as vscode from 'vscode';
import type { FuzzyConfig } from '../types';

const SECTION = 'mhighlight.fuzzyDefaults';

export function getFuzzyDefaults(): FuzzyConfig {
  const config = vscode.workspace.getConfiguration(SECTION);
  return {
    kmerSize: config.get('kmerSize', 5),
    maxErrorRate: config.get('maxErrorRate', 0.2),
    minMatchLength: config.get('minMatchLength', 8),
    xDrop: config.get('xDrop', 10),
    allowIndel: config.get('allowIndel', true)
  };
}

export async function saveFuzzyDefaults(defaults: FuzzyConfig): Promise<void> {
  const config = vscode.workspace.getConfiguration(SECTION);
  await config.update('kmerSize', defaults.kmerSize, vscode.ConfigurationTarget.Global);
  await config.update('maxErrorRate', defaults.maxErrorRate, vscode.ConfigurationTarget.Global);
  await config.update('minMatchLength', defaults.minMatchLength, vscode.ConfigurationTarget.Global);
  await config.update('xDrop', defaults.xDrop, vscode.ConfigurationTarget.Global);
  await config.update('allowIndel', defaults.allowIndel, vscode.ConfigurationTarget.Global);
}
