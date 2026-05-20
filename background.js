importScripts("seed-prompts.js");
importScripts("seed-image-prompts.js");
importScripts("seed-qiaomu-prompts.js");
importScripts("storage.js");

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  self.QuickPromptStore.ensureSeedData();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return false;
  }

  if (message.type === "OPEN_SIDE_PANEL") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      try {
        const tab = tabs[0];
        if (tab && tab.id) {
          await chrome.sidePanel.open({ tabId: tab.id });
        } else if (sender.tab && sender.tab.id) {
          await chrome.sidePanel.open({ tabId: sender.tab.id });
        } else {
          await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
        }
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, error: error.message });
      }
    });
    return true;
  }

  if (message.type === "GET_QUICK_PROMPTS") {
    Promise.all([self.QuickPromptStore.getItems(), self.QuickPromptStore.getSettings()])
      .then(([items, settings]) => sendResponse({ ok: true, items, settings }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "RECORD_USAGE") {
    self.QuickPromptStore.recordUsage(message.id)
      .then((item) => sendResponse({ ok: true, item }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});
