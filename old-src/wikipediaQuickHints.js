/********************************************************************************
* Copyright (C) 2010-2012 by Aliaksandr Astashenkau
* Email: dfsq.dfsq@gmail.com
* @version 2.2.0
* All rights reserved.
********************************************************************************/


/** *****************************************************************************
* Utils object.
*/
var _ = {
	one: function(sel) {
		return document.getElementById(sel);
	},

	all: function(sel, ctx) {
		ctx = (typeof ctx === 'undefined') ? document : ctx;
		return ctx.querySelectorAll(sel);
	},

	create: function(sel, props) {
		var el = document.createElement(sel);
		if (typeof props === 'object') {
			for (var a in props) {
				el[a] = props[a];
			}
		}
		return el;
	},

	xhr: function(url, callback) {
		var xhr = new XMLHttpRequest();
		xhr.onload = function() {
			callback(this.responseXML);
		};
		xhr.open("GET", url);
		xhr.responseType = "document";
		xhr.send();
	},

	delay: {
		timer: 0,
		start: function(callback, ms) {
			clearTimeout(this.timer);
			this.timer = setTimeout(callback, ms);
		}
	},

	getUID: function() {
		return +new Date();
	},
	
	uniqueID: function() {
		return 'hintId_' + _.getUID();
	},

	tpl: function(str, map) {
		return str.replace(/{([^{}]*)}/g, function(a, b) {
			return map[b] || '';
		});
	},

	inArray: function(needle, haystack, key) {
		return !!~this.findIndexInArray(needle, haystack, key);
	},

	findIndexInArray: function(needle, haystack, key) {
		for (var i in haystack) {
			if (haystack[i][key] === needle) return i;
		}
		return -1;
	}
};


/** *****************************************************************************
* Core factory object.
*/
var WikipediaQuickHints = function() {

	var communicator,
		imageProccessor,
		linksProccessor,

	__init = function() {
	
		communicator    = new Communicator();
		linksProccessor = new LinksProccessor(communicator);
		imageProccessor = new ImagesProccessor();

		communicator.getStorage(function(storage) {
			if (parseInt(storage.zoomEnabled)) {
				imageProccessor.run();
			}
		});

		var _this = this;
		communicator.addListeners({
			zoomEnabled: function(is) {
				!!parseInt(is) ? _this.enableZoom() : _this.disableZoom();
			},
			questionMarks: function(is) {
				_this.questionMarks(is);
			}
		});
	},
	
	__enableZoom = function() {
		var zooms = _.all('.hintZoom');
		if (zooms.length === 0) {
			imageProccessor.run();
		}
		else {
			for (var i = 0; i < zooms.length; i++) {
				zooms[i].style.display = 'block';
			}
		}
	},
	
	__disableZoom = function() {
		var zooms = _.all('.hintZoom');
		for (var i = 0; i < zooms.length; i++) {
			zooms[i].style.display = 'none';
		}
	},
	
	__questionMarks = function(is) {
		var links = _.all('a.hintLink');
		for (var i = 0; i < links.length; i++) {
			links[i].className = is ? 'hintLink' : 'hintLink noIcon';
		}
	};
	
	return {
		init: __init,
		enableZoom: __enableZoom,
		disableZoom: __disableZoom,
		questionMarks: __questionMarks
	};
};


/** *****************************************************************************
* Object responsible for links hover hints proccessing.
*/
var LinksProccessor = function(communicator) {
	/**
	 * Timeout before showing a hint.
	 * @type {Number} In miliseconds.
	 */
	var SHOW_TIMEOUT = 400;
	
	/**
	 * @linkId [hintId attribute of the link] - currently hovered link.
	 * If link is not hovered linkId = null.
	 * @hintId [id attribute of the hint] - currently hovered hint. If
	 * hint is not hovered hintId = null.
	 * @topHint [id attribute of the hint] - hint which is currently on the very top
	 * If only one hint is hovered it's the same as @hintId
	 */
	var _activeState = {
		linkId: null,
		hintId: null,
		topHint: null
	};

	/**
	 * Cache data from localStorage, reduce number of requests to background page.
	 *    featured: Array, list of featured articles.
	 */
	var _cacheData = {
		featured: [],
		recursiveHints: 1,
		questionMarks: 1
	};

	var init = function() {
		initCache(function() {
		  const body = document.querySelector('.mw-body')
      initLinks(body)
    });
	};

	var initCache = function(callback) {
		communicator.getStorage(function(obj) {
			_cacheData.featured = JSON.parse(obj.featured || '[]');
			_cacheData.recursiveHints = +obj.recursiveHints;
			_cacheData.questionMarks = +obj.questionMarks;
			
			callback();
		});

		communicator.addListeners({
			updateCache: function(res) {
				_cacheData[res.key] = res.obj;
			}
		});
	};

	var initLinks = function(ctx) {
		var a = _.all('a', ctx);
		for (var i=0; i<a.length; i++) {
			var href = a[i].getAttribute('href');
			
			if (!href || href.search('/wiki/') === -1 || href.search('/wiki/') !== 0 || /(.jpe?g|.gif|.png|.svg)$/i.test(href)) continue;

			a[i].className = _cacheData.questionMarks ? 'hintLink' : 'hintLink noIcon';
			a[i].setAttribute('reltitle', a[i].getAttribute('title'));
			a[i].removeAttribute('title');
			a[i].addEventListener('mouseover', linkOver, false);
			a[i].addEventListener('mouseout', linkOut, false);
		}
	};

	var linkOver = function(e) {
		
		var a = e.srcElement,
			hint = _.one(a.getAttribute('hintId'));

		if (_activeState.topHint && _activeState.topHint !== a.getAttribute('hintid')) {
			hideHint(_activeState.topHint);
		}

		a.setAttribute('over', '1');

		_.delay.start(function() {
			if (!a.getAttribute('over')) {
				return;
			}
			if (hint) {
				showHint(hint);
			}
			else {
				getDefinition(a.href, function(text, image) {
					hint = createHint({text: text, image: image, link: a});
					a.setAttribute('hintId', hint.id);
					showHint(hint);
				});
			}
		}, SHOW_TIMEOUT);
	};

	var showHint = function(hint) {
		_activeState.linkId = _activeState.topHint = hint.id;

		// If unmarked we need to check presence in _cacheData.featured
		var unmark = hint.querySelector('.mark.inactive');
		if (unmark) {
			if (!_.inArray(hint.getAttribute('rel'), _cacheData.featured, 'title')) {
				unmark.className = 'mark';
				unmark.innerText = 'Mark article';
			}
		}

		hint.style.display = 'block';
	};

	var getDefinition = function(url, callback) {
		
		var text, image;
		
		_.xhr(url, function(xml) {
			try {
				text = getText(xml);
				image = getImage(xml);
			}
			catch (e) {
				// Error occurred..
			}
			callback(text, image);
		});
	};

	/**
	 * Query XML to get the text data. 
	 * @param xml
	 */
	var getText = function(xml) {
    var query = `
      #bodyContent [lang] #mw-content-text > div.mw-parser-output > p,
      #bodyContent #mw-content-text > div.mw-parser-output > p,
      #bodyContent [lang] > ul:first-of-type
    `;
		return getFirstPar(xml.querySelectorAll(query));
	};

	var getFirstPar = function(nodes) {
		if (!nodes.length) return false;

		var i = 0, p = nodes[i];

		while (/^(\s*|<br\s?.*?\/?>)*$/.test(p.innerHTML) || p.querySelector('#coordinates')) {
			p = nodes[++i];
		}

		return nodes[i+1].nodeName === 'ul' ? p.innerHTML + nodes[i+1].outerHTML : p.innerHTML;
	};
	
	var getImage = function(xml) {
		var query = 
			'#bodyContent table.infobox .image img,' +
			'#bodyContent .thumb .image img',
		image = xml.querySelector(query);
		return image ? image.src : null;
	};

	/**
	 * @param {Object} param
	 * @param {String} param.text HTML content to show.
	 * @param {HTMLAnchorElement} param.link Hovered link element.
	 * @param {String} param.image SRC of the image to show.
	 * @return {XML|Node}
	 */
	var createHint = function(param) {
		
		var pos = findPosition(param.link),
		div = _.create('div', {
			id: _.uniqueID(),
			className: 'hintDescr',
			innerHTML: prepareHint(param),
			onmouseover: function() {
				_activeState.hintId = this.id;
			},
			onmouseout: function(e) {
				var tg = e.srcElement;
				if (
					tg.nodeName !== 'DIV' ||
					tg.className === 'more' ||
					tg.className === 'content' ||
					tg.className === 'image') return;
				var reltg = e.relatedTarget;
				while (reltg !== tg && reltg.nodeName !== 'BODY') reltg = reltg.parentNode;
				if (reltg === tg) return;

				_activeState.hintId = null;
				hideHint(this.id);
			}
		});

		div.setAttribute('rel', param.link.getAttribute('reltitle'));

		// Mark article as featured
		div.querySelector('.mark').addEventListener('click', function(e) {
			if (this.className.match(/\binactive\b/)) {
				unmarkArticle(param.link.getAttribute('reltitle'), param.link.href, e);
			}
			else {
				markArticle(param.link.getAttribute('reltitle'), param.link.href, e);
			}
		}, false);

		div.style.left = pos[0] + 'px';
		div.style.top = (pos[1] + param.link.offsetHeight - 1) + 'px';

		// initialize links inside
		if (_cacheData.recursiveHints) {
			initLinks(div);
		}

		return _.all('body')[0].appendChild(div);
	};

	var prepareHint = function(param) {
		
		var template =
			"<div class='content'>{image}{text}</div>" +
			"<div class='more'>" +
				"<a class='mark {inactive}'>{marktext}</span>" +
				"<a class='read' href='{href}' target='_blank'>Read article</a>" +
			"</div>",

		mark = _.inArray(param.link.getAttribute('reltitle'), _cacheData.featured, 'title') ? 'inactive' : '';

		return _.tpl(template, {
			image: param.image ? '<div class="image"><img src="' + param.image + '"></div>' : '',
			text: param.text || 'Can\'t get definition for this term. Some articles do not have appropriate structure.',
			href: param.link.href,
			inactive: mark,
			marktext: mark ? 'Unmark article' : 'Mark article'
		});
	};

	// TODO: make use of obj.getBoundingClientRect()
	var findPosition = function(obj) {
		var curLeft = 0,
			curTop = 0;
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
			_.delay.start(function() {
				hideHint(hintId);
			}, SHOW_TIMEOUT);
		}
	};

	var hideHint = function(hintId) {
		if (hintId === _activeState.hintId) return;
		_.one(hintId).style.display = 'none';
	};

  /**
   * Remember link to Featured articles.
   * @param title
   * @param href
   * @param e
   */
	var markArticle = function(title, href, e) {
		communicator.setStorage('featured', {title: title, href: href}, function(data) {
			e.srcElement.innerText = 'Unmark article';
			e.srcElement.className = 'mark inactive';
			_cacheData.featured = JSON.parse(data.featured);
		});
	};
	
	var unmarkArticle = function(title, href, e) {
		communicator.setStorage('featured', {title: title, remove: 1}, function(data) {
			e.srcElement.innerText = 'Mark article';
			e.srcElement.className = 'mark';
			_cacheData.featured = JSON.parse(data.featured);
		})
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
		_.xhr(url, function(xml) {

			var imgObj = xml.querySelector('#file a img');
			
			var	attrs = imgObj.attributes,
				getAttr = function(name) {
					return attrs.getNamedItem(name).nodeValue;
				},
				dim = getDimentions(+getAttr('width'), +getAttr('height')),
				img = _.create('img', {
					src: getAttr('src'),
					width:  dim.width,
					height: dim.height
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
		if (e.keyCode === 27) {
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

	var c = chrome.extension,
		listeners = {};

	c.onRequest.addListener(function(request, sender, sendResponse) {
		sendResponse({});
		listeners[request.action](request.value);
	});

	var __getResource = function(path) {
		return c.getURL(path);
	},
	
	__getStorage = function(callback) {
		c.sendRequest({localstorage: 1}, callback);
	},
	
	__addListeners =  function(obs) {
		for (var key in obs) {
			listeners[key] = obs[key];
		}
	},

	/**
	 * Remember to localStorage.
	 * @param {String} key Name of the key in storage.
	 * @param {Object|*} value Data to store.
	 * @param {function} callback function.
	 */
	__setStorage = function(key, value, callback) {
		
		if (typeof value === 'object') {
			value.uid = _.getUID();
		}
		
		var data = {
			save: {key: key, value: value},
			_h: _.getUID()
		};
		c.sendRequest(data, callback);
	};
	
	return {
		getResource: __getResource,
		getStorage:  __getStorage,
		setStorage:  __setStorage,
		addListeners: __addListeners
	};
};


/** *****************************************************************************
* Run application ...
*/
new WikipediaQuickHints().init();
