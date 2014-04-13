var VERSION = 2.16,
	VERSION_TEXT = '2.1.6';

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {

	if (tab.url.indexOf("wikipedia.org/wiki/") == -1) return;

	if (typeof localStorage['version'] == 'undefined' || parseFloat(localStorage['version']) < VERSION) {
		chrome.pageAction.setIcon({
			tabId: tabId,
			path: 'img/16_new.png'
		});
		chrome.pageAction.setTitle({
			tabId: tabId,
			title: "See what's new in version " + VERSION_TEXT
		});
	}
	chrome.pageAction.show(tabId);

	chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
		/**
		 * Store in local storage next information.
		 * 	zoomEnabled 0|1
		 * 	questionMarks 0|1
		 * 	hintsHistoryEnabled 0|1
		 * 	featuredArticles [{name: 'Article name', url: 'http://test.com'}, ...]
		 */
		if (request.localstorage) {
			localStorage.zoomEnabled = (typeof localStorage.zoomEnabled != 'undefined') ? parseInt(localStorage.zoomEnabled) : 1
			localStorage.questionMarks = (typeof localStorage.questionMarks != 'undefined') ? parseInt(localStorage.questionMarks) : 1
			localStorage.hintsHistoryEnabled = (typeof localStorage.hintsHistoryEnabled != 'undefined') ? parseInt(localStorage.hintsHistoryEnabled) : 1,
			localStorage.recursiveHints = (typeof localStorage.recursiveHints != 'undefined') ? parseInt(localStorage.recursiveHints) : 1
			sendResponse(localStorage);
		}

		/**
		 * Save to localStoarage.
		 */
		else if (request.save) {

			var r = request.save;

			// workaround. bug in chrome: event fired twice.
			var check = localStorage._h || 0;
			if (check == request._h) return;
			else localStorage._h = request._h;

			// Remember data
			var data = JSON.parse(localStorage[r.key] || '{}');
			
			if (!r.value.remove) {
				data[r.value.uid] = r.value;
			}
			else {
				// remove from local storage
				var key;
				for (var i in data) {
					if (data[i].title === r.value['title']) {
						key = i;
						break;
					}
				}
				delete data[key];
			}
			
			localStorage[r.key] = JSON.stringify(data);
			
			sendResponse({
				featured: localStorage[r.key]
			});
		}

		/**
		 * Change action icon.
		 */
		else if (request.method == 'changeIcon') {
			chrome.pageAction.setIcon({
				tabId: tabId,
				path: 'img/16.png'
			});
		}
	});
});