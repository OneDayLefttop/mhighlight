import type { PanelToExtensionMessage } from './types';

declare global {
  interface Window {
    acquireVsCodeApi?: <State = unknown>() => { postMessage(message: PanelToExtensionMessage): void; getState(): State; setState(state: State): void };
  }
}

const vscode = window.acquireVsCodeApi?.();

export function postMessage(message: PanelToExtensionMessage): void {
  vscode?.postMessage(message);
}
