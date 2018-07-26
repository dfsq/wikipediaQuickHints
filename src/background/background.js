/**
 * Listen for events from options page (page_action.html) and save to local storage.
 */

const { version } = chrome.runtime.getManifest();

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === 'showPageAction') {
    chrome.pageAction.show(sender.tab.id);
  }

  sendResponse()
})
