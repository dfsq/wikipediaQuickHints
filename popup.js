/**
 * Current version.
 */
var _VERSION = 2.0;

/**
 * MVC structure implementation.
 */
var POPUP = {};

POPUP.Utils = {
	Paging: function(init) {
		return {
			total: init.total,
			page: init.page,
			prev: init.page > 1 ? init.page - 1 : false,
			next: init.total > init.page * init.perPage ? init.page + 1 : false,
			offset: (init.page - 1) * init.perPage
		};
	}
};

POPUP.Controller = function() {

	/**
	 * For featured articles we need some sort of paging.
	 */
	var RECORDS_PER_PAGE = 5;

	return {
		/**
		 * Initialization.
		 */
		init: function() {
			this.model = new POPUP.Model();
			this.view  = new POPUP.View();

			var version = this.model.getStorage('version');
			(typeof version == 'undefined' || parseFloat(version) < _VERSION) ? this.page('news', _VERSION) : this.page('home');
		},

		/**
		 * Show specified page.
		 */
		page: function() {
			var args = Array.prototype.slice.call(arguments);
			this[args.shift() + 'Action'].apply(this, args);
		},

		/**
		 * Close popup window.
		 */
		closePopup: function() {
			window.close();
		},

		/**
		 * Display news after update.
		 * @param version
		 */
		newsAction: function(version) {
			this.view.display('tpl_news', {
				version: version.toPrecision(2)
			});
		},

		newsCloseAction: function() {
			this.model.updateStorage('version', _VERSION);
			chrome.extension.sendRequest({method: 'changeIcon'});
			this.page('home');
		},

		/**
		 * Actions goes here.
		 */
		homeAction: function(page) {
			page = page ? parseInt(page) : 1;
			var featured = JSON.parse(this.model.getStorage('featured') || '[]');
			var paging = new POPUP.Utils.Paging({
				total: featured.length,
				page: page,
				perPage: RECORDS_PER_PAGE
			});

			this.view.display('tpl_home', {
				paging: paging,
				links:  featured.splice(paging.offset, RECORDS_PER_PAGE),
				hintsHistory: this.model.getStorage('hintsHistoryEnabled'),
				hints: []
			});
		},

		settingsAction: function(saveData) {
			var storage = this.model.getStorage();

			if (saveData) {
				if (parseInt(storage.zoomEnabled) != saveData.zoomEnabled) {
					chrome.tabs.getSelected(null, function(tab) {
						chrome.tabs.sendRequest(tab.id, {
							action: 'zoomEnabled',
							value:  saveData.zoomEnabled
						});
					});
				}

				for (var key in saveData) {
					this.model.updateStorage(key, saveData[key]);
				}

				return this.page('home');
			}

			this.view.display('tpl_settings', storage);
		},

		removeAction: function(key, index) {
			this.model.removeFromCollection(key, index);
			this.page('home');
		}
	};
};

POPUP.Model = function() {
//	var storage = chrome.extension.getBackgroundPage().localStorage;
	var storage = {
		zoomEnabled: "1",
		hintsHistoryEnabled: "1",
		recursiveHints: "1",
		version: "2",
		featured: '[{"title":"Position (vector)","href":"http://en.wikipedia.org/wiki/Position_(vector)"},{"title":"Force","href":"http://en.wikipedia.org/wiki/Force"},{"title":"Vector space","href":"http://en.wikipedia.org/wiki/Vector_space"},{"title":"Negation","href":"http://en.wikipedia.org/wiki/Negation"},{"title":"Euclidean norm","href":"http://en.wikipedia.org/wiki/Euclidean_norm"},{"title":"Magnitude (mathematics)","href":"http://en.wikipedia.org/wiki/Magnitude_(mathematics)"}]'
	};
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

		removeFromCollection: function(key, index) {
			var collection = JSON.parse(storage[key]) || [];
			collection.splice(index, 1);
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
			container.innerHTML = Templ(tpl, data || {});
		}
	};
};
