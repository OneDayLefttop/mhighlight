import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { postMessage } from './api';
import { useHighlightStore } from './store';
import type { ExtensionToPanelMessage } from './types';
import './styles.css';

window.addEventListener('message', (event: MessageEvent<ExtensionToPanelMessage>) => {
  const store = useHighlightStore.getState();
  const message = event.data;

  if (message.type === 'rulesUpdated') {
    store.setRules(message.rules);
  } else if (message.type === 'fuzzyDefaultsUpdated') {
    store.setFuzzyDefaults(message.defaults);
  } else if (message.type === 'activeFileContext') {
    store.setActiveFile(message.fileName, message.filePath);
  } else if (message.type === 'openFilesContext') {
    store.setOpenFiles(message.files);
  }
});

postMessage({ type: 'getRules' });

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
