import * as vscode from 'vscode';
import type { FuzzyConfig, HighlightRule, ImportExportPayload } from '../types';
import { saveFuzzyDefaults } from './fuzzyDefaults';

export async function exportRules(rules: HighlightRule[], fuzzyDefaults: FuzzyConfig): Promise<void> {
  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file('mhighlight-rules.json'),
    filters: { JSON: ['json'] }
  });
  if (!uri) {
    return;
  }

  const payload: ImportExportPayload = {
    version: 1,
    rules,
    fuzzyDefaults
  };
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(payload, null, 2), 'utf8'));
}

export async function importRules(): Promise<HighlightRule[] | undefined> {
  const uris = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: { JSON: ['json'] }
  });
  const uri = uris?.[0];
  if (!uri) {
    return undefined;
  }

  const raw = await vscode.workspace.fs.readFile(uri);
  const payload = JSON.parse(Buffer.from(raw).toString('utf8')) as ImportExportPayload;
  if (payload.fuzzyDefaults) {
    await saveFuzzyDefaults(payload.fuzzyDefaults);
  }
  return Array.isArray(payload.rules) ? payload.rules : [];
}
