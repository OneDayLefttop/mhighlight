import * as vscode from 'vscode';
import type { FileContext } from './types';

export function getTargetTextEditor(): vscode.TextEditor | undefined {
  return vscode.window.activeTextEditor ?? vscode.window.visibleTextEditors[0];
}

export function getTargetTextDocument(): vscode.TextDocument | undefined {
  return getTargetTextEditor()?.document;
}

export function getOpenFileContexts(): FileContext[] {
  const files = new Map<string, FileContext>();

  const addUri = (uri: vscode.Uri | undefined): void => {
    if (!uri) {
      return;
    }

    const filePath = uri.fsPath || uri.path;
    if (!filePath || files.has(filePath)) {
      return;
    }

    files.set(filePath, {
      filePath,
      fileName: filePath.split(/[\\/]/).pop() ?? filePath
    });
  };

  addUri(getTargetTextDocument()?.uri);
  for (const editor of vscode.window.visibleTextEditors) {
    addUri(editor.document.uri);
  }
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      if (tab.input instanceof vscode.TabInputText) {
        addUri(tab.input.uri);
      }
    }
  }

  return [...files.values()];
}
