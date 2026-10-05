/**
 * Background Service Worker for Manifest V3.
 * Manages tab audio capture and relays shortcut commands to content scripts.
 */

chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      if (command === "toggle-hud") {
        chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE_HUD" });
      } else if (command === "force-query") {
        chrome.tabs.sendMessage(tabs[0].id, { type: "FORCE_QUERY" });
      }
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_TAB_STREAM_ID") {
    chrome.tabCapture.getMediaStreamId({ targetTabId: sender.tab?.id }, (streamId) => {
      sendResponse({ streamId });
    });
    return true; // asynchronous response
  }
});
