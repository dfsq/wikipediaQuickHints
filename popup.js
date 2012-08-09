/**
 * Current version.
 */
var VERSION = 2.0;

/**
 * MVC structure implementation.
 */
var POPUP = {};

POPUP.Utils = {
	Paging: function(opt) {
		// TODO: paging for opbjects. Not so obvious like with arrays..
		return {
			total: opt.total,
			page:  opt.page,
			prev:  opt.page > 1 ? opt.page - 1 : false,
			next:  opt.total > opt.page * opt.perPage ? opt.page + 1 : false,
			offset: (opt.page - 1) * opt.perPage
		};
	}
};

POPUP.Controller = function() {

	/**
	 * For featured articles we need some sort of paging.
	 */
	var RECORDS_PER_PAGE = 5;

	/**
	 * Model component.
	 * @type {POPUP.Model}
	 */
	var model = new POPUP.Model();

	/**
	 * View component.
	 * @type {POPUP.View}
	 */
	var view = new POPUP.View();

	/**
	 * Initialization.
	 */
	var __init = function() {

		var version = model.getStorage('version');
		(typeof version == 'undefined' || parseFloat(version) < VERSION)
			? __page('news', VERSION)
			: __page('home');

		// Delegate click events
		document.getElementById('wiki').addEventListener('click', function (e) {
			var src = e.srcElement;
			if (src.nodeName == 'IMG') src = src.parentNode;

			var action = src.dataset['action'];
			action && processAction(action);
		}, false);
	},

	processAction = function(action) {
		
		var params = action.split('|');
		switch (params[0]) {
			case 'close':
				__close();
				break;
			
			case 'open':
				chrome.tabs.create({url: params[1]});
				break;
			
			default:
				__page.apply(this, params);
				break;
		}
	},

	/**
	 * Show specified page.
	 */
	__page = function() {
		var args = Array.prototype.slice.call(arguments);
		actions[args.shift()].apply(this, args);
	},

	/**
	 * Close popup window.
	 */
	__close = function() {
		window.close();
	},

	/**
	 * Close new screen.
	 */
	__newsClose = function() {
		model.updateStorage('version', VERSION);
		chrome.extension.sendRequest({method: 'changeIcon'});
		__page('home');
	},

	/**
	 * Page actions.
	 * @type {Object}
	 */
	actions = {
		/**
		 * Home page.
		 * @param {Number} page
		 */
		home: function(page) {
			page = page ? parseInt(page) : 1;
			var featured = JSON.parse(model.getStorage('featured') || '{}');
			view.display('tpl-home', {
				test: {name: 'ad'},
				featured: featured,
				hintsHistory: parseInt(model.getStorage('hintsHistoryEnabled')),
				hints: []
			});
			
			// Init pagination plugin
//			$('#wiki .featured-list').cssPages({
//				firstPage: page,
//				itemsPerPage: 3,
//				next: '#wiki .next',
//				prev: '#wiki .prev'
//			});
		},
		
		/**
		 * Display news after update.
		 * @param version
		 */
		news: function(version) {
			view.display('tpl-news', {
				version: version.toPrecision(2)
			});
		},

		/**
		 * Settings page.
		 * @param saveData
		 */
		settings: function(saveData) {
			
			var storage = model.getStorage();

			if (saveData) {
				if (parseInt(storage.zoomEnabled) != saveData.zoomEnabled) {
					chrome.tabs.getSelected(null, function(tab) {
						chrome.tabs.sendRequest(tab.id, {
							action: 'zoomEnabled',
							value: saveData.zoomEnabled
						});
					});
				}

				for (var key in saveData) {
					model.updateStorage(key, saveData[key]);
				}

				return __page('home');
			}

			view.display('tpl-settings', storage);
		},

		/**
		 * Remove from storage.
		 * @param key
		 * @param index
		 */
		remove: function(key, uid) {
			model.removeFromCollection(key, uid);
			__page('home');
		}
	};

	return {
		init: __init,
		page: __page,
		close: __close,
		newsClose: __newsClose
	};
};

POPUP.Model = function() {
	var storage = chrome.extension.getBackgroundPage().localStorage;
//	var storage = {
//		zoomEnabled: "1",
//		hintsHistoryEnabled: "1",
//		recursiveHints: "1",
//		version: "2",
//		featured: '{"1342124281711":{"title":"Rage (игра)","href":"http://ru.wikipedia.org/wiki/Rage_(%D0%B8%D0%B3%D1%80%D0%B0)","uid":1342124281711}}'
//	};
	return {
		getStorage: function(key) {
			return typeof key != 'undefined' ? storage[key] : storage;
		},

		/**
		 * TODO: Save to local strorage, then call trigger in content script
		 * to update LinksProccessor _cacheData.
		 */
		updateStorage: function(key, value) {
			storage[key] = value;
		},

		removeFromCollection: function(key, uid) {
			var collection = JSON.parse(storage[key]) || [];
			delete collection[uid];
			storage[key] = JSON.stringify(collection);

			chrome.tabs.getSelected(null, function(tab) {
				chrome.tabs.sendRequest(tab.id, {
					action: 'updateCache',
					value:  {
						key: key,
						obj: collection
					}
				});
			});
		}
	};
};

POPUP.View = function() {
	var container = document.getElementById('wiki');
	return {
		display: function(tplName, data) {
			var tpl = document.getElementById(tplName).innerHTML;
			container.innerHTML = Ashe.parse(tpl, data);
		}
	};
};

/**
 * Run popup code.
 */
new POPUP.Controller().init();