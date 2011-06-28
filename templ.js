/**
 * Copyright (c) 2011 Aliaksandr Astashenkau
 * @author-website http://dfsq.info
 * @license MIT License
 */
(function() {
	this.Templ = function(tmplStr, tmplData) {
		var id = 1;
		var tokens = {};

		var proccessMarkers = function(str) {
			var i = 0;
			while (i < str.length) {
				if (str.charAt(i) + str.charAt(i+1) == '{{') {
					var id = getId();
					var end = str.indexOf('}}', i);
					var buffer = str.slice(i+2, end).replace(/(^\s*)|(\s*$)/g, '').split('|');
					tokens[id] = {
						buffer: buffer.shift(),
						modif: buffer
					};
					str = replaceWith(str, '{__' + id + '}', i, end+2);
				}
				i++;
			}
			return str;
		};

		var proccessControls = function(str, i, lookingFor, exprDescr) {
			var from = i;
			while (i < str.length) {
				if (str.charAt(i) + str.charAt(i+1) == '{%') {
					var expr = str.slice(i+2, str.indexOf('%}', i));

					if (lookingFor && expr.match(lookingFor)) {
						var id = getId();
						var start = from - 2;
						var end = i + expr.length + 4;
						tokens[id] = {
							buffer: str.slice(start, end),
							expr: exprDescr
						};
						return replaceWith(str, '{__' + id + '}', start, end);
					}
					else {
						var exprFor = expr.match(/\s*for\s+((?:\w+\s*,)?\s*\w+)\s+in\s+(\w+)\s*/i);
						if (exprFor) {
							str = proccessControls(str, i+2, /\s*endfor\s*/i, {
								type: 'for',
								elem: exprFor[1],
								list: exprFor[2]
							});
						}
						else {
							var exprIf = expr.match(/\s*if\s+(.+)\s*/i);
							if (exprIf) {
								str = proccessControls(str, i+2, /\s*endif\s*/i, {
									type: 'if',
									cond: exprIf[1]
								});
							}
						}
					}
				}
				i++;
			}
			return str;
		};

		var parse = function(str, data) {
			str = str.replace(/{__(\d+?)}/g, function(a, b) {
				var token = tokens[b];
				if (!token.expr) {
					var repl = evl(data, tokens[b].buffer, 'TEMPL ERROR: Undefined variable "' + tokens[b].buffer + '".');
					if (token.modif.length) {
						for (var i in token.modif) {
							var modif = token.modif[i];
							var params = [];
							var check = token.modif[i].match(/(\w+)\(([\s\S]+)\)/);
							if (check) {
								modif  = check[1];
								params = check[2].split(/\s*,\s*/);
								with (data) for (var j in params) {
									params[j] = eval(params[j]);
								}
							}
							params.unshift(repl);
							modif = Templ.modifiers[modif] || window[modif];

							if (typeof modif != 'function') {
								throw new Error('TEMPL ERROR: Unknown modifier "' + token.modif[i] + '".');
							}

							repl = modif.apply(this, params);
						}
					}
					return repl;
				}
				else {
					switch (token.expr.type) {
						case 'if':
							var cond = evl(data, token.expr.cond, 'TEMPL ERROR: invalid condition: ' + token.expr.cond + '.');
							var block = token.buffer.match(cond
								? /{%\s*if\s+.+?\s*%}([\s\S]*?){%/i
								: /{%\s*else\s*%}([\s\S]*?){%/i
							);
							return block ? parse(block[1], data) : '';

						case 'for':
							var loopData = data[token.expr.list];
							if (typeof loopData == 'undefined') {
								throw new Error('TEMPL ERROR: Undefined list "' + token.expr.list + '".');
							}
							if (hasElements(loopData)) {
								var block = token.buffer.match(/{%\s*for.*?\s*%}([\s\S]*?){%/i);
								if (block) {
									var key;
									var elem = token.expr.elem;
									var split = elem.split(/\s*,\s*/);
									if (split.length == 2) {
										key = split[0];
										elem = split[1];
									}

									var subStr = '';
									for (var k in loopData) {
										var tmpObj = {};
										if (key) tmpObj[key] = k;
										tmpObj[elem] = loopData[k];
										subStr += parse(block[1], tmpObj);
									}
									return subStr;
								}
								return '';
							}
							else {
								var block = token.buffer.match(/{%\s*else\s*%}([\s\S]*?){%/i);
								return block ? parse(block[1], loopData) : '';
							}
					}
				}
			});
			return str;
		};

		var tokenize = function(str) {
			return proccessControls(proccessMarkers(str), 0);
		};

		var evl = function(data, buffer, err) {
			var ret;
			with (data) try {
				ret = eval(buffer);
			}
			catch (e) {
				try {
					with (tmplData) {
						ret = eval(buffer);
					}
				}
				catch (e) {
					throw new Error(err);
				}
			}
			return ret;
		};

		var getId = function() {
			return id++;
		};

		var replaceWith = function(str, replace, start, end) {
			return str.substr(0, start) + replace + str.substr(end);
		};

		var hasElements = function(obj) {
			if (obj.hasOwnProperty('length')) return Boolean(obj.length);
			for (var k in obj) {
				if (obj.hasOwnProperty(k)) return true;
			}
			return false;
		};

		var init = function() {
			return parse(tokenize(tmplStr), tmplData);
		};

		return init();
	};

	this.Templ.modifiers = {};

	this.Templ.addModifiers = function(obj) {
		for (var i in obj) this.modifiers[i] = obj[i];
	};
})();