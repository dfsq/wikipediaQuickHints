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

POPUP.Controller = function() {
	return {
		/**
		 * Initialization.
		 */
		init: function() {
			this.model = new POPUP.Model();
			this.view  = new POPUP.View();
			this.show('home');
		},

		/**
		 * Show specified page.
		 */
		show: function(sectionName) {
			this[sectionName + 'Action'].call(this);
		},

		/**
		 * Actions goes here.
		 */
		homeAction: function() {
			var featured = JSON.parse(this.model.getStorage('featured'));
			this.view.display('tpl_home', {
				links: featured
			});
		},

		settingsAction: function() {
			this.view.display('tpl_settings');
		}
	};
};

POPUP.Model = function() {
	var storage = chrome.extension.getBackgroundPage().localStorage;
	return {
		getStorage: function(key) {
			return typeof key != 'undefined' ? storage[key] : storage;
		},

		/**
		 * Save to local strorage, then call trigger in content script
		 * to update LinksProccessor _cacheData.
		 */
		updateStorage: function() {}
	};
};

POPUP.View = function() {
	var container = document.getElementById('wiki');
	return {
		display: function(tplName, data) {
			var tpl = document.getElementById(tplName).innerHTML;
			container.innerHTML = tmpl(tpl, data || {});
		}
	};
};