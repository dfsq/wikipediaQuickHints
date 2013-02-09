/********************************************************************************
* Copyright (C) 2010-2012 by Aliaksandr Astashenkau
* Email: dfsq.dfsq@gmail.com
* @version 2.0
* All rights reserved.
********************************************************************************/

/**
 * Current version.
 */
var VERSION = 2.15;

/**
 * MVC structure implementation.
 */
var POPUP = {};

POPUP.Controller = function() {

	/**
	 * For featured articles we need some sort of paging.
	 */
	var RECORDS_PER_PAGE = 5,

	/**
	 * Model component.
	 * @type {POPUP.Model}
	 */
	model = new POPUP.Model(),

	/**
	 * View component.
	 * @type {POPUP.View}
	 */
	view = new POPUP.View(),

	/**
	 * Dispatch actions by data-action attribute.
	 */
	processAction = function(action) {
		
		var params = action.split('|');
		switch (params[0]) {
			case 'close':
				close();
				break;
			
			case 'open':
				chrome.tabs.create({url: params[1]});
				break;
			
			default:
				toPage.apply(this, params);
				break;
		}
	},

	/**
	 * Show specified page.
	 */
	toPage = function() {
		var args = Array.prototype.slice.call(arguments);
		actions[args.shift()].apply(this, args);
	},

	/**
	 * Close popup window.
	 */
	close = function() {
		window.close();
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
				featured: featured,
				hintsHistory: parseInt(model.getStorage('hintsHistoryEnabled')),
				hints: []
			});
			
			// Init pagination plugin
			$('#wiki .featured-list').cssPages({
				firstPage: page,
				itemsPerPage: RECORDS_PER_PAGE,
				next: '#wiki .next',
				prev: '#wiki .prev'
			});
		},
		
		/**
		 * Display news after update.
		 * @param version
		 */
		news: function(version) {
			view.display('tpl-news', {
				version: version
			});
		},

		/**
		 * Settings page.
		 * @param save
		 */
		settings: function(save) {
			
			var storage = model.getStorage();
			
			if (save) {
				var zoomEnabled = +document.getElementById('image_zooming').checked;
				if (parseInt(storage.zoomEnabled) != zoomEnabled) {
					chrome.tabs.getSelected(null, function(tab) {
						chrome.tabs.sendRequest(tab.id, {
							action: 'zoomEnabled',
							value: zoomEnabled
						});
					});
				}
				model.updateStorage('zoomEnabled', zoomEnabled);
				
				var questionMarks = +document.getElementById('question-marks').checked;
				if (+storage.questionMarks != questionMarks) {
					chrome.tabs.getSelected(null, function(tab) {
						chrome.tabs.sendRequest(tab.id, {
							action: 'questionMarks',
							value: questionMarks
						});
					});
				}
				model.updateStorage('questionMarks', questionMarks);

				return toPage('home');
			}

			view.display('tpl-settings', {
				zoomEnabled: !!+storage.zoomEnabled,
				questionMarks: !!+storage.questionMarks
			});
		},

		/**
		 * Remove from storage.
		 * @param key
		 * @param index
		 */
		remove: function(key, uid) {
			model.removeFromCollection(key, uid);
			toPage('home');
		},
		
		closeNews: function() {
			model.updateStorage('version', VERSION);
			chrome.extension.sendRequest({method: 'changeIcon'});
			toPage('home');
		}
	};
	
	/**
	 * Initialization.
	 */
	this.init = function() {

		var version = model.getStorage('version');
		(typeof version == 'undefined' || parseFloat(version) < VERSION)
			? toPage('news', VERSION)
			: toPage('home');

		// Delegate click events
		document.getElementById('wiki').addEventListener('click', function (e) {
			var src = e.srcElement;
			if (src.nodeName == 'IMG') src = src.parentNode;

			var action = src.dataset['action'];
			action && processAction(action);
		}, false);
	}
};

POPUP.Model = function() {
	var storage = chrome.extension.getBackgroundPage().localStorage;
	return {
		getStorage: function(key) {
			return typeof key != 'undefined' ? storage[key] : storage;
		},

		/**
		 * Update LinksProccessor _cacheData.
		 */
		updateStorage: function(key, value) {
			storage[key] = value;
			chrome.tabs.getSelected(null, function(tab) {
				chrome.tabs.sendRequest(tab.id, {
					action: 'updateCache',
					value:  {
						key: key,
						obj: value
					}
				});
			});
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