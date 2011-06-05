/**********************************************************************
 * Copyright (C) 2010-2011 by Aliaksandr Astashenkau
 * Email: dfsq.dfsq@gmail.com
 * @version 1.45
 * All rights reserved.
 **********************************************************************/

var delay = (function() {
	var timer = 0;
	return function(callback, ms) {
		clearTimeout(timer);
		timer = setTimeout(callback, ms);
	}
})();

function wikipediaQuickHints() {

	var hintOver = false;

	var init = function() {
		createCSSRules();
		processLinks();

		getStorage({
			what: 'zoomEnabled',
			callback: function(response) {
				if (response.zoomEnabled) {
					processImages();
				}
			}
		});
	};

	/** **********************************************************************************************************************************
	 * Create CSS rules.
	 */
	var createCSSRules = function() {
		insertRule('div.hintDescr {position: fixed; width: 300px; display: block; background-color: #FFF; z-index: 10000; border: 1px #AAA solid; padding: 5px 6px; text-align: justify; font-size: 11px; color: #000; line-height: 15px; top: 2px; right: 3px; -webkit-box-shadow: #666 2px 2px 3px;}');
		insertRule('div.hintDescr div.more {text-align: right;}');
		insertRule('div.hintDescr div.more a {color: #0645AD;}');
		insertRule('div.hintDescr div.more a:visited {color: #0645AD;}');
		insertRule('div.hintDescr br:first-child {display: none;}');
		insertRule('a.image {position: relative; display: inline-block;}');
		insertRule('a.image div.hintZoom {position: absolute; top: 2px; right: 2px; height: 16px !important; width: 16px !important; border: 1px #FFF solid; opacity: 0.2; background: url(data:image/gif;base64,R0lGODlhDwAPALMAANnZ2ZaWlqOjoxUVFXR0dISEhFpaWjg4OLS0tPX19QoKCv///87OziMjI+3t7R0dHSH5BAAAAAAALAAAAAAPAA8AAARNcMhJa1VqYEsNYsGRWUqwJMDiHKSxII9ioKSwiFpxj5IiJDENYUdRDAuYB8PRsChfgRSBN1E0fosskqNpNFwr6kWBeIkvB8aW22O7BxEAOw==)}');
		insertRule('a.image:hover div.hintZoom {opacity: 1;}');
		insertRule('#hintOverlay {text-align: center; z-index: 1000; position: fixed; top: 0; left: 0; background-color: rgba(0, 0, 0, 0.5); width: 100%; height: 100%;}');
		insertRule('#hintOverlay .hintImgCont {position: absolute; top: 50%; left: 50%; background-color: #F9F9F9; border: 1px solid #CCC; padding: 5px; display: inline-block;}');
		insertRule('#hintOverlay .hintImgCont img {border: 1px solid #CCC;}');
	};

	var insertRule = function(rule) {
		if (document.styleSheets.length == 0) {
			var style = document.createElement('style');
			style.setAttribute('type', 'text/css');
			style.setAttribute('media', 'screen');
			document.getElementsByTagName('head')[0].appendChild(style);
		}
		var sheet = document.styleSheets[0];
		sheet.insertRule(rule, 0);
	};

	/** **********************************************************************************************************************************
	 * Links hovering initialization.
	 */
	var processLinks = function() {
		var a = document.getElementsByTagName('a');
		for (var i=0; i<a.length; i++) {
			var href = a[i].getAttribute('href');
			if (!href || href.search('/wiki/') == -1 || href.search('/wiki/') != 0 || /(.jpe?g|.gif|.png|.svg)$/i.test(href)) continue;
			a[i].removeAttribute('title');
			a[i].onmouseover = function(e) {
				linkOver(e, this);
			};
			a[i].onmouseout = function(e) {
				linkOut(e, this);
			};
			a[i].style.cursor = 'help';
		}
	};

	var linkOver = function(e, obj) {
		obj.setAttribute('over', '1');
		getStorage({
			what: 'controlButtonUse',
			callback: function(response) {
				hideAll();
				if (response.controlButtonUse == '1') {
					if (!switchControl(e, response.controlButton)) return false;
					_linkOver(obj);
				}
				else {
					delay(function() {
						_linkOver(obj);
					}, 300);
				}
			}
		});
	};

	var _linkOver = function(obj) {
		if (!obj.hasAttribute('over')) return false;

		var hint = document.getElementById(obj.getAttribute('hintId'));
		if (hint && hint.className == 'hintDescr') {
			showHint(hint, obj);
		}
		else {
			getDefinition(obj.href, function(text) {
				var div = createHint(text, obj);
				obj.setAttribute('hintId', div.id);
				showHint(div, obj);
			});
		}
	};

	var linkOut = function(e, obj) {
		obj.removeAttribute('over');
		getStorage({
			what: 'controlButtonUse',
			callback: function(response) {
				var hint = document.getElementById(obj.getAttribute('hintId'));
				if (!hint) return false;
				if (response.controlButtonUse == '1' && switchControl(e, response.controlButton)) return false;

				delay(function() {
					if (!hintOver) hideHint(hint);
				}, 300);
			}
		});
	};

	var switchControl = function(e, controlButton) {
		switch (controlButton) {
			case '1':
				if (!e.shiftKey) return false;
				break;

			case '2':
				if (!e.ctrlKey) return false;
				break;

			case '3':
				if (!e.altKey) return false;
				break;
		}

		return true;
	};

	var showHint = function(div, linkObj) {
		getStorage({
			what: 'showPlace',
			callback: function(response) {
				var showPlace = response.showPlace;
				if (typeof response.showPlace == 'undefined') showPlace = '1';

				switch (showPlace) {
					case '1':
						var pos = findPosition(linkObj);
						with (div.style) {
							position = 'absolute';
							left = pos[0] + 'px';
							top = (pos[1] + 17) + 'px';
							display = 'block';
						}
						break;

					case '2':
						with (div.style) {
							position = 'fixed';
							top = '2px';
							right = '3px';
							left = 'auto';
							display = 'block';
						}
						break;
				}

				document.getElementsByTagName('body')[0].appendChild(div);
			}
		});
	};

	var findPosition = function(obj) {
		var curLeft = curTop = 0;
		do {
			curLeft += obj.offsetLeft;
			curTop += obj.offsetTop;
		}
		while (obj = obj.offsetParent);

		curLeft = fixLeftPos(curLeft);
		return [curLeft, curTop];
	};

	var fixLeftPos = function(curLeft) {
		if (curLeft + 300 + 25 >= window.innerWidth) curLeft = window.innerWidth - 335;
		return curLeft;
	};

	var hideHint = function(hint) {
		hint.style.display = 'none';
	};

	var hideAll = function() {
		var hints = document.getElementsByClassName('hintDescr');
		for (var i=0; i<hints.length; i++) {
			hints[i].style.display = 'none';
		}
		hintOver = false;
	};

	var getDefinition = function(url, callback) {
		var xmlHttpReq = new XMLHttpRequest();
		xmlHttpReq.open('GET', url, true);
		xmlHttpReq.onreadystatechange = function() {
			if (xmlHttpReq.readyState == 4 && xmlHttpReq.status == 200) {
				var html = xmlHttpReq.responseXML;
				var par = html.querySelectorAll('#bodyContent > p');
				var textPar = getFirstPar(par);
				if (textPar) {
					callback.call(this, textPar.innerHTML);
				}
				else {
					callback.call(this, null);
				}
			}
		};
		xmlHttpReq.overrideMimeType('text/xml');
	    xmlHttpReq.send(null);
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

	var createHint = function(text, obj) {
		if (!text) {
			text = 'Can not get definition for this term. Some articles do not have appropriate structure.';
		}
		text += '<div class="more"><a href="' + obj.href + '" target="_blank">Read article</a></div>';

		var div = document.createElement('div');
		div.onmouseover = function() {
			hintOver = true;
		};
		div.onmouseout = function(e) {
			var _this = this;
			getStorage({
				what: 'controlButtonUse',
				callback: function(response) {
					if (response.controlButtonUse == '1' && switchControl(e, response.controlButton)) return false;

					var tg = e.srcElement;
					if (tg.nodeName != 'DIV' || tg.className == 'more') return;
					var reltg = e.relatedTarget;
					while (reltg != tg && reltg.nodeName != 'BODY') reltg = reltg.parentNode;
					if (reltg == tg) return;

					hintOver = false;
					hideHint(_this);
				}
			});
		};

		div.id = getId();
		div.className = 'hintDescr';
		div.innerHTML = text;

		return div;
	};

	/** **********************************************************************************************************************************
	 * Images zooming.
	 */
	var processImages = function() {
		var dataAImg = document.querySelectorAll('#content a.image');
		for (var i = 0; i < dataAImg.length; i++) {
			var zoom = document.createElement('div');
			zoom.className = 'hintZoom';
			zoom.onclick = function(e) {
				e.stopPropagation();
				e.preventDefault();

				var url = this.parentNode.href;
				getImage(url, function(imgObj) {
					createOverlay();

					var img = document.createElement('img');
					var dim = getImageDimentions(imgObj.width, imgObj.height);
					img.width  = dim.width;
					img.height = dim.height;
					img.src = imgObj.src;

					var overlay = document.querySelector('#hintOverlay .hintImgCont');
					with (overlay.style) {
						marginLeft = -((dim.width + 14)/2) + 'px';
						marginTop = -((dim.height + 14)/2) + 'px';
					}
					overlay.appendChild(img);
				});
			};
			dataAImg[i].appendChild(zoom);
		}
	};

	var getImageDimentions = function(width, height) {
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

	var getImage = function(url, callback) {
		var xmlHttpReq = new XMLHttpRequest();
		xmlHttpReq.open('GET', url, true);
		xmlHttpReq.onreadystatechange = function() {
			if (xmlHttpReq.readyState == 4 && xmlHttpReq.status == 200) {
				var html = xmlHttpReq.responseXML;
				var imgObj = html.querySelector('#file a img');
				callback.call(this, imgObj);
			}
		};
		xmlHttpReq.overrideMimeType('text/xml');
	    xmlHttpReq.send(null);
	};

	var createOverlay = function() {
		hideAll();

		var over = document.createElement('div');
		over.id = 'hintOverlay';
		over.onclick = removeOverlay;
		document.body.addEventListener('keydown', removeByEsc, false);

		var imgCont = document.createElement('div');
		imgCont.className = 'hintImgCont';

		over.appendChild(imgCont);
		document.body.appendChild(over);
	};

	var removeOverlay = function() {
		var over = document.getElementById('hintOverlay');
		over.parentNode.removeChild(over);
		document.body.removeEventListener('keydown', removeByEsc, false);
	};

	var removeByEsc = function(e) {
		if (e.keyCode == 27) {
			removeOverlay();
		}
	};

	/** **********************************************************************************************************************************
	 * Additional methods.
	 */
	var getStorage = function(options) {
		chrome.extension.sendRequest({localstorage: options.what}, options.callback);
	};

	var getId = function() {
		var tempId = new Date().getTime();
		return 'hintId_' + tempId;
	};

	/**
	 * Run initialization.
	 */
	init();

	return {
		enableZoom: function() {
			var zooms = document.getElementsByClassName('hintZoom');
			if (zooms.length == 0) {
				processImages();
			}
			else {
				for (var i=0; i<zooms.length; i++) {
					zooms[i].style.display = 'block';
				}
			}
		},

		disableZoom: function() {
			var zooms = document.getElementsByClassName('hintZoom');
			for (var i=0; i<zooms.length; i++) {
				zooms[i].style.display = 'none';
			}
		}
	};
}

var wiki = new wikipediaQuickHints();

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	parseInt(request.zoomEnabled) ? wiki.enableZoom() : wiki.disableZoom();
	sendResponse({});
});