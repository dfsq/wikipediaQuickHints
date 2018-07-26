/**
 * Main content script of the extenstion.
 */

const { version } = chrome.runtime.getManifest()

chrome.runtime.sendMessage({ type: 'showPageAction' })
