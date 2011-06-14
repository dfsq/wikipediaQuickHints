/********************************************************************************
* Copyright (C) 2010-2011 by Aliaksandr Astashenkau
* Email: dfsq.dfsq@gmail.com
* @version 2.0
* All rights reserved.
********************************************************************************/

/** *****************************************************************************
* Utils object.
*/
var _ = {
	one: function(sel) {
		return document.getElementById(sel);
	},

	all: function(sel) {
		return document.querySelectorAll(sel);
	},

	create: function(sel, props) {
		var el = document.createElement(sel);
		if (typeof props == 'object') {
			for (var a in props) {
				el[a] = props[a];
			}
		}
		return el;
	},

	xhr: function(url, callback) {
		var x = new XMLHttpRequest();
		x.onreadystatechange = function() {
			x.readyState ^ 4 || callback(x);
		};
		x.open('get', url);
		x.overrideMimeType('text/xml');
		x.send();
	},

	delay: (function() {
		var timer = 0;
		return function(callback, ms) {
			clearTimeout(timer);
			timer = setTimeout(callback, ms);
		}
	})(),

	uniqueID: function() {
		return 'hintId_' + new Date().getTime();
	},

	tpl: function(str, map) {
		return str.replace(/{([^{}]*)}/g, function(a, b) {
			return map[b] || '';
		});
	},

	inArray: function(needle, haystack, key) {
		return (this.findIndexInArray(needle, haystack, key) != -1);
	},

	findIndexInArray: function(needle, haystack, key) {
		for (var i in haystack) {
			if (haystack[i][key] == needle) return i;
		}
		return -1;
	}
};


/** *****************************************************************************
* Core factory object.
*/
var WikipediaQuickHints = function() {

	var communicator;
	var imageProccessor;
	var linksProccessor;

	return {
		create: function() {

			communicator = new Communicator();
			new CSSRules(communicator);
			linksProccessor = new LinksProccessor(communicator);
			imageProccessor = new ImagesProccessor();

			communicator.getStorage(function(storage) {
				if (parseInt(storage.zoomEnabled)) {
					imageProccessor.run();
				}
			});

			var _this = this;
			communicator.zoomChange(function(zoomEnabled) {
				zoomEnabled ? _this.enableZoom() : _this.disableZoom();
			});
		},

		enableZoom: function() {
			var zooms = _.all('.hintZoom');
			if (zooms.length == 0) {
				imageProccessor.run();
			}
			else {
				for (var i=0; i<zooms.length; i++) {
					zooms[i].style.display = 'block';
				}
			}
		},

		disableZoom: function() {
			var zooms = _.all('.hintZoom');
			for (var i=0; i<zooms.length; i++) {
				zooms[i].style.display = 'none';
			}
		}
	};
};


/** *****************************************************************************
* Object responsible for creating CSS definitions.
* Note. This is done because we can't refer to local extension images from
* CSS file (chrome bug for CSS messages).
*/
var CSSRules = function(communicator) {
	with (document.styleSheets[0]) {
		insertRule('div.hintDescr div.more a.mark {background: url(' + communicator.getResource('img/star.png') + ') no-repeat 0 2px;}');
		insertRule('div.hintDescr div.more a.mark.inactive {background-image: url(' + communicator.getResource('img/star_inactive.png') + ');}');
		insertRule('a.image div.hintZoom {background: url(' + communicator.getResource('img/zoom.gif') + ') no-repeat 0 0;}');
	}
};

/** *****************************************************************************
* Object responsible for links hover hints proccessing.
*/
var LinksProccessor = function(communicator) {

	/**
	 * linkId [hintId attribute of the link] - currently hovered link.
	 *    If link is not hovered linkId = null.
	 * hintId [id attribute of the hint] - currently hovered hint. If
	 *    hint is not hovered hintId = null.
	 */
	var _activeState = {
		linkId: null,
		hintId: null
	};

	/**
	 * Cache data from localStorage, reduce number of requests to background page.
	 *    featured: Array, list of featured articles.
	 */
	var _cacheData = {
		featured: []
	};

	var init = function() {
		initCache();
		initLinks();
	};

	var initCache = function() {
		communicator.getStorage(function(obj) {
			_cacheData.featured = JSON.parse(obj.featured || '[]');
		});
	};

	var initLinks = function() {
		var a = _.all('a');
		for (var i=0; i<a.length; i++) {
			var href = a[i].getAttribute('href');
			if (!href || href.search('/wiki/') == -1 || href.search('/wiki/') != 0 || /(.jpe?g|.gif|.png|.svg)$/i.test(href)) continue;

			a[i].setAttribute('reltitle', a[i].getAttribute('title'));
			a[i].removeAttribute('title');
			a[i].addEventListener('mouseover', linkOver, false);
			a[i].addEventListener('mouseout', linkOut, false);
		}
	};

	var linkOver = function(e) {
		var a = e.srcElement;
		var hint = _.one(a.getAttribute('hintId'));

		a.setAttribute('over', 1);

		_.delay(function() {
			if (!a.getAttribute('over')) {
				return;
			}
			if (hint) {
				showHint(hint, a);
			}
			else {
				getDefinition(a.href, function(text) {
					hint = createHint(text, a);
					a.setAttribute('hintId', hint.id);
					showHint(hint, a);
				});
			}
		}, 300);
	};

	var showHint = function(hint, a) {
		_activeState.linkId = hint.id;
		hint.style.display = 'block';
	};

	var getDefinition = function(url, callback) {
		_.xhr(url, function(x) {
			var par = x.responseXML.querySelectorAll('#bodyContent > p');
			var node = getFirstPar(par);
			callback(node ? node.innerHTML : null);
		});
	};

	var getFirstPar = function(col) {
		var i = 0;
		var p = col[i];

		if (!col.length) return false;

		while (/^(\s*|<br\s?.*?\/?>)*$/.test(p.innerHTML)) {
			p = col[++i];
		}

		if (i == 0 && p.querySelector('#coordinates')) {
			p = col[1];
		}

		return p;
	};

	var createHint = function(text, a) {
		var pos = findPosition(a);
		var div = _.create('div', {
			id: _.uniqueID(),
			className: 'hintDescr',
			innerHTML: prepareHint(text, a),
			onmouseover: function() {
				_activeState.hintId = this.id;
			},
			onmouseout: function(e) {
				var tg = e.srcElement;
				if (tg.nodeName != 'DIV' || tg.className == 'hintCont' || tg.className == 'more') return;
				var reltg = e.relatedTarget;
				while (reltg != tg && reltg.nodeName != 'BODY') reltg = reltg.parentNode;
				if (reltg == tg) return;

				_activeState.hintId = null;
				hideHint(this.id);
			}
		});

		// Mark article as featured
		div.querySelector('.mark').addEventListener('click', function(e) {
			markArticle(a.getAttribute('reltitle'), a.href, e);
		}, false);

		div.style.left = pos[0] + 'px';
		div.style.top = (pos[1] + 17) + 'px';

		return _.all('body')[0].appendChild(div);
	};

	var prepareHint = function(text, a) {
		if (!text) {
			text = 'Can not get definition for this term. Some articles do not have appropriate structure.';
		}

		var template =
			"<div class='hintCont'>{text}</div>" +
			"<div class='more'>" +
				"<a class='mark {inactive}'>Mark article</span>" +
				"<a href='{href}' target='_blank'>Read article</a>" +
			"</div>";

		return _.tpl(template, {
			text: text,
			href: a.href,
			inactive: _.inArray(a.getAttribute('reltitle'), _cacheData.featured, 'title') ? 'inactive' : ''
		});
	};

	var findPosition = function(obj) {
		var curLeft = 0;
		var curTop = 0;
		do {
			curLeft += obj.offsetLeft;
			curTop += obj.offsetTop;
		}
		while (obj = obj.offsetParent);

		curLeft = (function(left) {
			if (left + 300 + 25 >= window.innerWidth) left = window.innerWidth - 335;
			return left;
		})(curLeft);

		return [curLeft, curTop];
	};

	var linkOut = function(e) {
		var a = e.srcElement;
		a.removeAttribute('over');
		_activeState.linkId = null;

		var hintId = a.getAttribute('hintId');
		if (hintId) {
			_.delay(function() {
				hideHint(hintId);
			}, 300);
		}
	};

	var hideHint = function(hintId) {
		if (hintId == _activeState.hintId) return;
		_.one(hintId).style.display = 'none';
	};

	/**
	 * Remember link to Featured articles.
	 * @param title
	 * @param href
	 */
	var markArticle = function(title, href, e) {
		communicator.setStorage('featured', {
			title: title,
			href:  href,
			index: _.findIndexInArray(title, _cacheData.featured, 'title')
		}, function(obj) {
			_cacheData.featured = obj.featured;
			e.srcElement.className = obj.removed ? 'mark' : 'mark inactive';
		});
	};

	init();
};


/** *****************************************************************************
* Object responsible for image zooming initialization and proccessing.
*/
var ImagesProccessor = function() {

	var init = function() {
		var as = _.all('#content a.image');
		for (var i = 0; i < as.length; i++) {
			var zoom = _.create('div', {
				className: 'hintZoom',
				onclick: clickHandler
			});
			as[i].appendChild(zoom);
		}
	};

	var clickHandler = function(e) {
		e.stopPropagation();
		e.preventDefault();

		var url = this.parentNode.href;
		_.xhr(url, function(x) {

			var imgObj = x.responseXML.querySelector('#file a img');
			var dim = getDimentions(imgObj.width, imgObj.height);

			var img = _.create('img', {
				width: dim.width,
				height: dim.height,
				src: imgObj.src
			});

			var overlay = createOverlay();
			overlay.style.marginLeft = -((dim.width + 14)/2) + 'px';
			overlay.style.marginTop = -((dim.height + 14)/2) + 'px';

			overlay.appendChild(img);
		});
	};

	var createOverlay = function() {
		var over = _.create('div', {
			id: 'hintOverlay',
			onclick: removeOverlay
		});
		document.body.addEventListener('keydown', removeByEsc, false);

		var imgCont = _.create('div', {
			className: 'hintImgCont'
		});

		over.appendChild(imgCont);
		document.body.appendChild(over);

		return imgCont;
	};

	var removeOverlay = function() {
		var over = _.one('hintOverlay');
		over.parentNode.removeChild(over);
		document.body.removeEventListener('keydown', removeByEsc, false);
	};

	var removeByEsc = function(e) {
		if (e.keyCode == 27) {
			removeOverlay();
		}
	};

	var getDimentions = function(width, height) {
		var dim = {};
		var W = window.innerWidth;
		var H = window.innerHeight;
		var k = width/height;
		var K = W/H;
		var flag = false;
		var padding = 50;

		if (window.innerWidth <= width + padding) {
			dim.width = window.innerWidth - padding;
			flag = true;
		}
		else dim.width = width;

		if (window.innerHeight <= height + padding) {
			dim.height = window.innerHeight - padding;
			flag = true;
		}
		else dim.height = height;

		if (!flag) return dim;

		if (K >= 1 && k < 1) {
			dim.height = H - padding;
			dim.width = Math.round(dim.height * k);
		}
		else if (K >= 1 && k >= 1) {
			if (K >= k) {
				dim.height = H - padding;
				dim.width = Math.round(dim.height * k);
			}
			else {
				dim.width = W - padding;
				dim.height = Math.round(dim.width/k);
			}
		}
		else if (K < 1 && k >= 1) {
			dim.width = W - padding;
			dim.height = Math.round(dim.width/k);
		}
		else if (K < 1 && k < 1) {
			if (K < k) {
				dim.width = W - padding;
				dim.height = Math.round(dim.width/k);
			}
			else {
				dim.height = H - padding;
				dim.width = Math.round(dim.height * k);
			}
		}

		return dim;
	};

	return {
		run: function() {
			init();
		}
	}
};


/** *****************************************************************************
* Object handling communication with chrome background page.
*/
var Communicator = function() {
	var c = chrome.extension;
	return {
		zoomChange: function(callback) {
			c.onRequest.addListener(function(request, sender, sendResponse) {
				callback(!!parseInt(request.zoomEnabled));
				sendResponse({});
			});
		},

		getResource: function(path) {
			return c.getURL(path);
		},

		getStorage: function(callback) {
			c.sendRequest({localstorage: 1}, callback);
		},

		setStorage: function(key, value, callback) {
			c.sendRequest({
				save: {
					key: key,
					value: value
				},
				_h: new Date().getTime()
			}, callback);
		}
	};
};


/** *****************************************************************************
* Run application ...
*/
new WikipediaQuickHints().create();