/**
 * Template engine.
 */
(function() {
	var cache = {};
	this.tmpl = function(str, data) {
		try {
			var func = cache[str];
			if (!func) {
				var strFunc =
					"var p=[], print=function() {p.push.apply(p,arguments);};" +
					"with(obj) {p.push('" +
						str	.replace(/[\r\t\n]/g, " ")
							.replace(/'(?=[^%]*%})/g, "\t")
							.split("'").join("\\'")
							.split("\t").join("'")
							.replace(/:\s*%}/g, '{ %}')
							.replace(/(endfor|endif)\s*%}/g, '} %}')
							.replace(/{%\s*else\s*%}/g, '{% } else { %}')
							.replace(/{{(.+?)}}/g, "',$1,'")
							.split("{%").join("');")
							.split("%}").join("p.push('")
						+ "');}return p.join('');";
				func = new Function("obj", strFunc);
				cache[str] = func;
			}
			return func(data);
		}
		catch (e) {
			return "TMPL ERROR: " + e.message;
		}
	}
})();


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
			this.page('home');
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
				links: featured.splice(paging.offset, RECORDS_PER_PAGE)
			});
		},

		settingsAction: function(saveData) {
			var storage = this.model.getStorage();

			if (saveData) {

				if (parseInt(storage.zoomEnabled) != saveData.zoomEnabled) {
					chrome.tabs.getSelected(null, function(tab) {
						chrome.tabs.sendRequest(tab.id, {zoomEnabled: saveData.zoomEnabled});
					});
				}

				for (var key in saveData) {
					this.model.updateStorage(key, saveData[key]);
				}
				this.closePopup();
			}

			this.view.display('tpl_settings', storage);
		}
	};
};

POPUP.Model = function() {
	var storage = chrome.extension.getBackgroundPage().localStorage;
//	var storage = {
//		zoomEnabled: "1",
//		hintsHistoryEnabled: "1",
//		featured: '[{"title":"Евклидово пространство","href":"http://ru.wikipedia.org/wiki/Евклидово_пространство"},{"title":"Трёхмерное пространство","href":"http://ru.wikipedia.org/wiki/Трёхмерное_пространство"},{"title":"Нормированное пространство","href":"http://ru.wikipedia.org/wiki/Нормированное_пространство"},{"title":"Векторное пространство","href":"http://ru.wikipedia.org/wiki/Векторное_пространство"},{"title":"Метрическое пространство","href":"http://ru.wikipedia.org/wiki/Метрическое_пространство"},{"title":"Пространство с мерой","href":"http://ru.wikipedia.org/wiki/Пространство_с_мерой"}]'
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