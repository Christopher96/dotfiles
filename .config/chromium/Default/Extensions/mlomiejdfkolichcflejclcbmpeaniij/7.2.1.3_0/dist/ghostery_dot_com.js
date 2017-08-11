if(typeof browser!=='undefined'){chrome=browser;}
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

global.$ = global.jQuery = require('jquery');
require('./vendor/bootstrap_tooltip.js');
var msg = require('./utils/msg')('ghostery_dot_com'),
    sendMessage = msg.sendMessage,
    onMessage = msg.onMessage;

var GhosteryDotCom = function ($, window, document, undefined) {
	var productsPage = function () {
		var $installButton = $('.install-button').not('.disabled');
		$installButton.addClass('success').text('Installed ✓');
		$installButton.removeAttr('onclick');
		$('.success').on('click', function (e) {
			e.preventDefault();
		});
	};

	var appsPages = function () {
		var $appGlobalBlocking = $("#app-global-blocking"),
		    $blockingBox = $("#blockingbox"),
		    app_id = $blockingBox.data('id'),
		    alreadyLoaded = false,
		    tooltipTimeout;

		sendMessage("appsPageLoaded", {
			'id': app_id
		});

		onMessage.addListener(function (request, sender, sendResponse) {
			var name = request.name,
			    msg = request.message;

			if (name === 'appsPageData' && !alreadyLoaded) {
				alreadyLoaded = true;
				var blocked = msg.blocked;

				$("#ghosterybox").hide();
				$blockingBox.show();

				toggleBlocking(blocked, 0);

				$appGlobalBlocking.on("click", function () {
					blocked = !blocked;

					sendMessage("panelSelectedAppsUpdate", {
						'app_id': app_id,
						'app_selected': blocked
					});

					$('#global-blocking-control').tooltip('destroy').tooltip({
						trigger: 'manual',
						title: 'Tracker ' + (blocked ? 'blocked' : 'unblocked'),
						placement: 'bottom'
					}).tooltip('show');

					window.clearTimeout(tooltipTimeout);
					tooltipTimeout = window.setTimeout(function () {
						$('#global-blocking-control').tooltip('destroy');
					}, 1400);

					toggleBlocking(blocked, 'fast');
				});
			}
			return false;
		});
	};

	var toggleBlocking = function (blocked, duration) {
		if (!blocked) {
			$('#app-global-blocking').animate({ 'background-position-x': '-17px' }, {
				duration: duration,
				complete: function () {
					$(this).removeClass('blocked').addClass('unblocked');
					$(this).parent().removeClass('blocked').addClass('unblocked');
				}
			});
		} else {
			$('#app-global-blocking').animate({ 'background-position-x': '3px' }, {
				duration: duration,
				complete: function () {
					$(this).removeClass('unblocked').addClass('blocked');
					$(this).parent().removeClass('unblocked').addClass('blocked');
				}
			});
		}
	};

	var _initialize = function () {
		if ($('section.products-template').length) {
			productsPage();
		}

		if ($("#ghosterybox").length) {
			appsPages();
		}
	};

	return {
		init: function () {
			_initialize();
		}
	};
}(jQuery, window, document);

jQuery(document).ready(function ($) {
	GhosteryDotCom.init();
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./utils/msg":2,"./vendor/bootstrap_tooltip.js":3,"jquery":4}],2:[function(require,module,exports){
'use strict';

module.exports = function (origin) {
	var onMessage = chrome.runtime.onMessage;
	var DEBUG = chrome.runtime.getManifest().debug || false;
	var LOG = DEBUG && chrome.runtime.getManifest().log;
	var globals = require('../../../src/classes/Globals');
	var isEdge = globals.BROWSER_INFO.name === 'edge';

	function sendMessageInPromise(name, message) {
		if (isEdge) {
			return new Promise((resolve, reject) => {
				onMessage.addListener((request, sender, sendResponse) => {
					if (messageId === request.name) {
						resolve(request.message);
					}
					if (sendResponse) {
						sendResponse();
					}
				});
				var messageId = ("EDGE_" + window.performance.now()).replace('.', '_');
				chrome.runtime.sendMessage({
					origin: origin,
					name: name,
					message: message,
					messageId: messageId
				}, () => {});
			});
		} else {
			return new Promise(function (resolve, reject) {
				chrome.runtime.sendMessage({
					origin: origin,
					name: name,
					message: message
				}, function (response) {
					if (chrome.runtime.lastError) {
						log(chrome.runtime.lastError, origin, name, message);
						resolve(null);
					}
					resolve(response);
				});
			});
		}
	};

	function sendMessage(name, message, callback) {
		log(origin + ' sending to handler', name);
		return _sendMessageToHandler(name, origin, message, callback);
	};

	function sendMessageToBackground(name, message, callback) {
		log(origin + ' sending to background', name);
		return _sendMessageToHandler(name, '', message, callback);
	};

	function log(...args) {
		if (!LOG) {
			return false;
		}

		var errors = args.toString().toLowerCase().indexOf('error');

		args.unshift(new Date().toLocaleTimeString() + '\t');

		try {
			if (errors !== -1) {
				console.error.apply(console, args);
			} else {
				console.log.apply(console, args);
			}
		} catch (e) {
			if (errors !== -1) {
				console.error(args);
			} else {
				console.log(args);
			}
		}
	}

	function _sendMessageToHandler(name, origin, message, callback) {
		log('_sendMessageToHandler:' + origin + ' sending to background', name);

		var fallback = function () {};
		callback = callback ? callback : fallback;
		return chrome.runtime.sendMessage({
			origin: origin,
			name: name,
			message: message
		}, callback);
	};

	return {
		sendMessageInPromise: sendMessageInPromise,
		onMessage: onMessage,
		DEBUG: DEBUG,
		sendMessage: sendMessage,
		sendMessageToBackground: sendMessageToBackground,
		log: log,
		isEdge: isEdge
	};
};

},{"../../../src/classes/Globals":6}],3:[function(require,module,exports){
'use strict';

!function ($) {
  "use strict";

  $(function () {
    $.support.transition = function () {
      var transitionEnd = function () {
        var el = document.createElement('bootstrap'),
            transEndEventNames = {
          'WebkitTransition': 'webkitTransitionEnd',
          'MozTransition': 'transitionend',
          'OTransition': 'oTransitionEnd otransitionend',
          'transition': 'transitionend'
        },
            name;
        for (name in transEndEventNames) {
          if (el.style[name] !== undefined) {
            return transEndEventNames[name];
          }
        }
      }();
      return transitionEnd && {
        end: transitionEnd
      };
    }();
  });
}(window.jQuery);

!function ($) {

  "use strict";


  var Tooltip = function (element, options) {
    this.init('tooltip', element, options);
  };

  Tooltip.prototype = {

    constructor: Tooltip,

    init: function (type, element, options) {
      var eventIn, eventOut, triggers, trigger, i;

      this.type = type;
      this.$element = $(element);
      this.options = this.getOptions(options);
      this.enabled = true;

      triggers = this.options.trigger.split(' ');

      for (i = triggers.length; i--;) {
        trigger = triggers[i];
        if (trigger == 'click') {
          this.$element.on('click.' + this.type, this.options.selector, $.proxy(this.toggle, this));
        } else if (trigger != 'manual') {
          eventIn = trigger == 'hover' ? 'mouseenter' : 'focus';
          eventOut = trigger == 'hover' ? 'mouseleave' : 'blur';
          this.$element.on(eventIn + '.' + this.type, this.options.selector, $.proxy(this.enter, this));
          this.$element.on(eventOut + '.' + this.type, this.options.selector, $.proxy(this.leave, this));
        }
      }

      this.options.selector ? this._options = $.extend({}, this.options, { trigger: 'manual', selector: '' }) : this.fixTitle();
    },

    getOptions: function (options) {
      options = $.extend({}, $.fn[this.type].defaults, this.$element.data(), options);

      if (options.delay && typeof options.delay == 'number') {
        options.delay = {
          show: options.delay,
          hide: options.delay
        };
      }

      return options;
    },

    enter: function (e) {
      var defaults = $.fn[this.type].defaults,
          options = {},
          self;

      this._options && $.each(this._options, function (key, value) {
        if (defaults[key] != value) options[key] = value;
      }, this);

      self = $(e.currentTarget)[this.type](options).data(this.type);

      if (!self.options.delay || !self.options.delay.show) return self.show();

      clearTimeout(this.timeout);
      self.hoverState = 'in';
      this.timeout = setTimeout(function () {
        if (self.hoverState == 'in') self.show();
      }, self.options.delay.show);
    },

    leave: function (e) {
      var self = $(e.currentTarget)[this.type](this._options).data(this.type);

      if (this.timeout) clearTimeout(this.timeout);
      if (!self.options.delay || !self.options.delay.hide) return self.hide();

      self.hoverState = 'out';
      this.timeout = setTimeout(function () {
        if (self.hoverState == 'out') self.hide();
      }, self.options.delay.hide);
    },

    show: function () {
      var $tip,
          pos,
          actualWidth,
          actualHeight,
          placement,
          tp,
          e = $.Event('show');

      if (this.hasContent() && this.enabled) {
        this.$element.trigger(e);
        if (e.isDefaultPrevented()) return;
        $tip = this.tip();
        this.setContent();

        if (this.options.animation) {
          $tip.addClass('fade');
        }

        placement = typeof this.options.placement == 'function' ? this.options.placement.call(this, $tip[0], this.$element[0]) : this.options.placement;

        $tip.detach().css({ top: 0, left: 0, display: 'block' });

        this.options.container ? $tip.appendTo(this.options.container) : $tip.insertAfter(this.$element);

        pos = this.getPosition();

        actualWidth = $tip[0].offsetWidth;
        actualHeight = $tip[0].offsetHeight;

        switch (placement) {
          case 'bottom':
            tp = { top: pos.top + pos.height, left: pos.left + pos.width / 2 - actualWidth / 2 };
            break;
          case 'top':
            tp = { top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2 };
            break;
          case 'left':
            tp = { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth };
            break;
          case 'right':
            tp = { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width };
            break;
        }

        this.applyPlacement(tp, placement);
        this.$element.trigger('shown');
      }
    },

    applyPlacement: function (offset, placement) {
      var $tip = this.tip(),
          width = $tip[0].offsetWidth,
          height = $tip[0].offsetHeight,
          actualWidth,
          actualHeight,
          delta,
          replace;

      $tip.offset(offset).addClass(placement).addClass('in');

      actualWidth = $tip[0].offsetWidth;
      actualHeight = $tip[0].offsetHeight;

      if (placement == 'top' && actualHeight != height) {
        offset.top = offset.top + height - actualHeight;
        replace = true;
      }

      if (placement == 'bottom' || placement == 'top') {
        delta = 0;

        if (offset.left < 0) {
          delta = offset.left * -2;
          offset.left = 0;
          $tip.offset(offset);
          actualWidth = $tip[0].offsetWidth;
          actualHeight = $tip[0].offsetHeight;
        }

        this.replaceArrow(delta - width + actualWidth, actualWidth, 'left');
      } else {
        this.replaceArrow(actualHeight - height, actualHeight, 'top');
      }

      if (replace) $tip.offset(offset);
    },

    replaceArrow: function (delta, dimension, position) {
      this.arrow().css(position, delta ? 50 * (1 - delta / dimension) + "%" : '');
    },

    setContent: function () {
      var $tip = this.tip(),
          title = this.getTitle();

      $tip.find('.bs-tooltip-inner')[this.options.html ? 'html' : 'text'](title);
      $tip.removeClass('fade in top bottom left right');
    },

    hide: function () {
      var that = this,
          $tip = this.tip(),
          e = $.Event('hide');

      this.$element.trigger(e);
      if (e.isDefaultPrevented()) return;

      $tip.removeClass('in');

      function removeWithAnimation() {
        var timeout = setTimeout(function () {
          $tip.off($.support.transition.end).detach();
        }, 500);

        $tip.one($.support.transition.end, function () {
          clearTimeout(timeout);
          $tip.detach();
        });
      }

      $.support.transition && this.$tip.hasClass('fade') ? removeWithAnimation() : $tip.detach();

      this.$element.trigger('hidden');

      return this;
    },

    fixTitle: function () {
      var $e = this.$element;
      if ($e.attr('title') || typeof $e.attr('data-original-title') != 'string') {
        $e.attr('data-original-title', $e.attr('title') || '').attr('title', '');
      }
    },

    hasContent: function () {
      return this.getTitle();
    },

    getPosition: function () {
      var el = this.$element[0];
      return $.extend({}, typeof el.getBoundingClientRect == 'function' ? el.getBoundingClientRect() : {
        width: el.offsetWidth,
        height: el.offsetHeight
      }, this.$element.offset());
    },

    getTitle: function () {
      var title,
          $e = this.$element,
          o = this.options;

      title = $e.attr('data-original-title') || (typeof o.title == 'function' ? o.title.call($e[0]) : o.title);

      return title;
    },

    tip: function () {
      return this.$tip = this.$tip || $(this.options.template);
    },

    arrow: function () {
      return this.$arrow = this.$arrow || this.tip().find(".bs-tooltip-arrow");
    },

    validate: function () {
      if (!this.$element[0].parentNode) {
        this.hide();
        this.$element = null;
        this.options = null;
      }
    },

    enable: function () {
      this.enabled = true;
    },

    disable: function () {
      this.enabled = false;
    },

    toggleEnabled: function () {
      this.enabled = !this.enabled;
    },

    toggle: function (e) {
      var self = e ? $(e.currentTarget)[this.type](this._options).data(this.type) : this;
      self.tip().hasClass('in') ? self.hide() : self.show();
    },

    destroy: function () {
      this.hide().$element.off('.' + this.type).removeData(this.type);
    }

  };

  var old = $.fn.tooltip;

  $.fn.tooltip = function (option) {
    return this.each(function () {
      var $this = $(this),
          data = $this.data('tooltip'),
          options = typeof option == 'object' && option;
      if (!data) $this.data('tooltip', data = new Tooltip(this, options));
      if (typeof option == 'string') data[option]();
    });
  };

  $.fn.tooltip.Constructor = Tooltip;

  $.fn.tooltip.defaults = {
    animation: true,
    placement: 'top',
    selector: false,
    template: '<div class="bs-tooltip"><div class="bs-tooltip-arrow"></div><div class="bs-tooltip-inner"></div></div>',
    trigger: 'hover focus',
    title: '',
    delay: 0,
    html: false,
    container: false
  };

  $.fn.tooltip.noConflict = function () {
    $.fn.tooltip = old;
    return this;
  };
}(window.jQuery);

},{}],4:[function(require,module,exports){
!function(e,t){"object"==typeof module&&"object"==typeof module.exports?module.exports=e.document?t(e,!0):function(e){if(!e.document)throw new Error("jQuery requires a window with a document");return t(e)}:t(e)}("undefined"!=typeof window?window:this,function(e,t){function n(e){var t=!!e&&"length"in e&&e.length,n=ie.type(e);return"function"!==n&&!ie.isWindow(e)&&("array"===n||0===t||"number"==typeof t&&t>0&&t-1 in e)}function r(e,t,n){if(ie.isFunction(t))return ie.grep(e,function(e,r){return!!t.call(e,r,e)!==n});if(t.nodeType)return ie.grep(e,function(e){return e===t!==n});if("string"==typeof t){if(fe.test(t))return ie.filter(t,e,n);t=ie.filter(t,e)}return ie.grep(e,function(e){return Z.call(t,e)>-1!==n})}function i(e,t){for(;(e=e[t])&&1!==e.nodeType;);return e}function o(e){var t={};return ie.each(e.match(ve)||[],function(e,n){t[n]=!0}),t}function s(){G.removeEventListener("DOMContentLoaded",s),e.removeEventListener("load",s),ie.ready()}function a(){this.expando=ie.expando+a.uid++}function u(e,t,n){var r;if(void 0===n&&1===e.nodeType)if(r="data-"+t.replace(Ce,"-$&").toLowerCase(),"string"==typeof(n=e.getAttribute(r))){try{n="true"===n||"false"!==n&&("null"===n?null:+n+""===n?+n:Te.test(n)?ie.parseJSON(n):n)}catch(e){}we.set(e,t,n)}else n=void 0;return n}function l(e,t,n,r){var i,o=1,s=20,a=r?function(){return r.cur()}:function(){return ie.css(e,t,"")},u=a(),l=n&&n[3]||(ie.cssNumber[t]?"":"px"),c=(ie.cssNumber[t]||"px"!==l&&+u)&&Ee.exec(ie.css(e,t));if(c&&c[3]!==l){l=l||c[3],n=n||[],c=+u||1;do{o=o||".5",c/=o,ie.style(e,t,c+l)}while(o!==(o=a()/u)&&1!==o&&--s)}return n&&(c=+c||+u||0,i=n[1]?c+(n[1]+1)*n[2]:+n[2],r&&(r.unit=l,r.start=c,r.end=i)),i}function c(e,t){var n=void 0!==e.getElementsByTagName?e.getElementsByTagName(t||"*"):void 0!==e.querySelectorAll?e.querySelectorAll(t||"*"):[];return void 0===t||t&&ie.nodeName(e,t)?ie.merge([e],n):n}function f(e,t){for(var n=0,r=e.length;n<r;n++)be.set(e[n],"globalEval",!t||be.get(t[n],"globalEval"))}function p(e,t,n,r,i){for(var o,s,a,u,l,p,d=t.createDocumentFragment(),h=[],g=0,v=e.length;g<v;g++)if((o=e[g])||0===o)if("object"===ie.type(o))ie.merge(h,o.nodeType?[o]:o);else if(Le.test(o)){for(s=s||d.appendChild(t.createElement("div")),a=(De.exec(o)||["",""])[1].toLowerCase(),u=qe[a]||qe._default,s.innerHTML=u[1]+ie.htmlPrefilter(o)+u[2],p=u[0];p--;)s=s.lastChild;ie.merge(h,s.childNodes),s=d.firstChild,s.textContent=""}else h.push(t.createTextNode(o));for(d.textContent="",g=0;o=h[g++];)if(r&&ie.inArray(o,r)>-1)i&&i.push(o);else if(l=ie.contains(o.ownerDocument,o),s=c(d.appendChild(o),"script"),l&&f(s),n)for(p=0;o=s[p++];)Ae.test(o.type||"")&&n.push(o);return d}function d(){return!0}function h(){return!1}function g(){try{return G.activeElement}catch(e){}}function v(e,t,n,r,i,o){var s,a;if("object"==typeof t){"string"!=typeof n&&(r=r||n,n=void 0);for(a in t)v(e,a,n,r,t[a],o);return e}if(null==r&&null==i?(i=n,r=n=void 0):null==i&&("string"==typeof n?(i=r,r=void 0):(i=r,r=n,n=void 0)),!1===i)i=h;else if(!i)return e;return 1===o&&(s=i,i=function(e){return ie().off(e),s.apply(this,arguments)},i.guid=s.guid||(s.guid=ie.guid++)),e.each(function(){ie.event.add(this,t,i,r,n)})}function m(e,t){return ie.nodeName(e,"table")&&ie.nodeName(11!==t.nodeType?t:t.firstChild,"tr")?e.getElementsByTagName("tbody")[0]||e.appendChild(e.ownerDocument.createElement("tbody")):e}function y(e){return e.type=(null!==e.getAttribute("type"))+"/"+e.type,e}function x(e){var t=Me.exec(e.type);return t?e.type=t[1]:e.removeAttribute("type"),e}function b(e,t){var n,r,i,o,s,a,u,l;if(1===t.nodeType){if(be.hasData(e)&&(o=be.access(e),s=be.set(t,o),l=o.events)){delete s.handle,s.events={};for(i in l)for(n=0,r=l[i].length;n<r;n++)ie.event.add(t,i,l[i][n])}we.hasData(e)&&(a=we.access(e),u=ie.extend({},a),we.set(t,u))}}function w(e,t){var n=t.nodeName.toLowerCase();"input"===n&&je.test(e.type)?t.checked=e.checked:"input"!==n&&"textarea"!==n||(t.defaultValue=e.defaultValue)}function T(e,t,n,r){t=J.apply([],t);var i,o,s,a,u,l,f=0,d=e.length,h=d-1,g=t[0],v=ie.isFunction(g);if(v||d>1&&"string"==typeof g&&!re.checkClone&&Re.test(g))return e.each(function(i){var o=e.eq(i);v&&(t[0]=g.call(this,i,o.html())),T(o,t,n,r)});if(d&&(i=p(t,e[0].ownerDocument,!1,e,r),o=i.firstChild,1===i.childNodes.length&&(i=o),o||r)){for(s=ie.map(c(i,"script"),y),a=s.length;f<d;f++)u=i,f!==h&&(u=ie.clone(u,!0,!0),a&&ie.merge(s,c(u,"script"))),n.call(e[f],u,f);if(a)for(l=s[s.length-1].ownerDocument,ie.map(s,x),f=0;f<a;f++)u=s[f],Ae.test(u.type||"")&&!be.access(u,"globalEval")&&ie.contains(l,u)&&(u.src?ie._evalUrl&&ie._evalUrl(u.src):ie.globalEval(u.textContent.replace(Ie,"")))}return e}function C(e,t,n){for(var r,i=t?ie.filter(t,e):e,o=0;null!=(r=i[o]);o++)n||1!==r.nodeType||ie.cleanData(c(r)),r.parentNode&&(n&&ie.contains(r.ownerDocument,r)&&f(c(r,"script")),r.parentNode.removeChild(r));return e}function k(e,t){var n=ie(t.createElement(e)).appendTo(t.body),r=ie.css(n[0],"display");return n.detach(),r}function E(e){var t=G,n=$e[e];return n||(n=k(e,t),"none"!==n&&n||(We=(We||ie("<iframe frameborder='0' width='0' height='0'/>")).appendTo(t.documentElement),t=We[0].contentDocument,t.write(),t.close(),n=k(e,t),We.detach()),$e[e]=n),n}function N(e,t,n){var r,i,o,s,a=e.style;return n=n||Xe(e),s=n?n.getPropertyValue(t)||n[t]:void 0,""!==s&&void 0!==s||ie.contains(e.ownerDocument,e)||(s=ie.style(e,t)),n&&!re.pixelMarginRight()&&_e.test(s)&&Be.test(t)&&(r=a.width,i=a.minWidth,o=a.maxWidth,a.minWidth=a.maxWidth=a.width=s,s=n.width,a.width=r,a.minWidth=i,a.maxWidth=o),void 0!==s?s+"":s}function S(e,t){return{get:function(){return e()?void delete this.get:(this.get=t).apply(this,arguments)}}}function j(e){if(e in Je)return e;for(var t=e[0].toUpperCase()+e.slice(1),n=Qe.length;n--;)if((e=Qe[n]+t)in Je)return e}function D(e,t,n){var r=Ee.exec(t);return r?Math.max(0,r[2]-(n||0))+(r[3]||"px"):t}function A(e,t,n,r,i){for(var o=n===(r?"border":"content")?4:"width"===t?1:0,s=0;o<4;o+=2)"margin"===n&&(s+=ie.css(e,n+Ne[o],!0,i)),r?("content"===n&&(s-=ie.css(e,"padding"+Ne[o],!0,i)),"margin"!==n&&(s-=ie.css(e,"border"+Ne[o]+"Width",!0,i))):(s+=ie.css(e,"padding"+Ne[o],!0,i),"padding"!==n&&(s+=ie.css(e,"border"+Ne[o]+"Width",!0,i)));return s}function q(e,t,n){var r=!0,i="width"===t?e.offsetWidth:e.offsetHeight,o=Xe(e),s="border-box"===ie.css(e,"boxSizing",!1,o);if(i<=0||null==i){if(i=N(e,t,o),(i<0||null==i)&&(i=e.style[t]),_e.test(i))return i;r=s&&(re.boxSizingReliable()||i===e.style[t]),i=parseFloat(i)||0}return i+A(e,t,n||(s?"border":"content"),r,o)+"px"}function L(e,t){for(var n,r,i,o=[],s=0,a=e.length;s<a;s++)r=e[s],r.style&&(o[s]=be.get(r,"olddisplay"),n=r.style.display,t?(o[s]||"none"!==n||(r.style.display=""),""===r.style.display&&Se(r)&&(o[s]=be.access(r,"olddisplay",E(r.nodeName)))):(i=Se(r),"none"===n&&i||be.set(r,"olddisplay",i?n:ie.css(r,"display"))));for(s=0;s<a;s++)r=e[s],r.style&&(t&&"none"!==r.style.display&&""!==r.style.display||(r.style.display=t?o[s]||"":"none"));return e}function H(e,t,n,r,i){return new H.prototype.init(e,t,n,r,i)}function O(){return e.setTimeout(function(){Ke=void 0}),Ke=ie.now()}function F(e,t){var n,r=0,i={height:e};for(t=t?1:0;r<4;r+=2-t)n=Ne[r],i["margin"+n]=i["padding"+n]=e;return t&&(i.opacity=i.width=e),i}function P(e,t,n){for(var r,i=(I.tweeners[t]||[]).concat(I.tweeners["*"]),o=0,s=i.length;o<s;o++)if(r=i[o].call(n,t,e))return r}function R(e,t,n){var r,i,o,s,a,u,l,c=this,f={},p=e.style,d=e.nodeType&&Se(e),h=be.get(e,"fxshow");n.queue||(a=ie._queueHooks(e,"fx"),null==a.unqueued&&(a.unqueued=0,u=a.empty.fire,a.empty.fire=function(){a.unqueued||u()}),a.unqueued++,c.always(function(){c.always(function(){a.unqueued--,ie.queue(e,"fx").length||a.empty.fire()})})),1===e.nodeType&&("height"in t||"width"in t)&&(n.overflow=[p.overflow,p.overflowX,p.overflowY],l=ie.css(e,"display"),"inline"===("none"===l?be.get(e,"olddisplay")||E(e.nodeName):l)&&"none"===ie.css(e,"float")&&(p.display="inline-block")),n.overflow&&(p.overflow="hidden",c.always(function(){p.overflow=n.overflow[0],p.overflowX=n.overflow[1],p.overflowY=n.overflow[2]}));for(r in t)if(i=t[r],et.exec(i)){if(delete t[r],o=o||"toggle"===i,i===(d?"hide":"show")){if("show"!==i||!h||void 0===h[r])continue;d=!0}f[r]=h&&h[r]||ie.style(e,r)}else l=void 0;if(ie.isEmptyObject(f))"inline"===("none"===l?E(e.nodeName):l)&&(p.display=l);else{h?"hidden"in h&&(d=h.hidden):h=be.access(e,"fxshow",{}),o&&(h.hidden=!d),d?ie(e).show():c.done(function(){ie(e).hide()}),c.done(function(){var t;be.remove(e,"fxshow");for(t in f)ie.style(e,t,f[t])});for(r in f)s=P(d?h[r]:0,r,c),r in h||(h[r]=s.start,d&&(s.end=s.start,s.start="width"===r||"height"===r?1:0))}}function M(e,t){var n,r,i,o,s;for(n in e)if(r=ie.camelCase(n),i=t[r],o=e[n],ie.isArray(o)&&(i=o[1],o=e[n]=o[0]),n!==r&&(e[r]=o,delete e[n]),(s=ie.cssHooks[r])&&"expand"in s){o=s.expand(o),delete e[r];for(n in o)n in e||(e[n]=o[n],t[n]=i)}else t[r]=i}function I(e,t,n){var r,i,o=0,s=I.prefilters.length,a=ie.Deferred().always(function(){delete u.elem}),u=function(){if(i)return!1;for(var t=Ke||O(),n=Math.max(0,l.startTime+l.duration-t),r=n/l.duration||0,o=1-r,s=0,u=l.tweens.length;s<u;s++)l.tweens[s].run(o);return a.notifyWith(e,[l,o,n]),o<1&&u?n:(a.resolveWith(e,[l]),!1)},l=a.promise({elem:e,props:ie.extend({},t),opts:ie.extend(!0,{specialEasing:{},easing:ie.easing._default},n),originalProperties:t,originalOptions:n,startTime:Ke||O(),duration:n.duration,tweens:[],createTween:function(t,n){var r=ie.Tween(e,l.opts,t,n,l.opts.specialEasing[t]||l.opts.easing);return l.tweens.push(r),r},stop:function(t){var n=0,r=t?l.tweens.length:0;if(i)return this;for(i=!0;n<r;n++)l.tweens[n].run(1);return t?(a.notifyWith(e,[l,1,0]),a.resolveWith(e,[l,t])):a.rejectWith(e,[l,t]),this}}),c=l.props;for(M(c,l.opts.specialEasing);o<s;o++)if(r=I.prefilters[o].call(l,e,c,l.opts))return ie.isFunction(r.stop)&&(ie._queueHooks(l.elem,l.opts.queue).stop=ie.proxy(r.stop,r)),r;return ie.map(c,P,l),ie.isFunction(l.opts.start)&&l.opts.start.call(e,l),ie.fx.timer(ie.extend(u,{elem:e,anim:l,queue:l.opts.queue})),l.progress(l.opts.progress).done(l.opts.done,l.opts.complete).fail(l.opts.fail).always(l.opts.always)}function W(e){return e.getAttribute&&e.getAttribute("class")||""}function $(e){return function(t,n){"string"!=typeof t&&(n=t,t="*");var r,i=0,o=t.toLowerCase().match(ve)||[];if(ie.isFunction(n))for(;r=o[i++];)"+"===r[0]?(r=r.slice(1)||"*",(e[r]=e[r]||[]).unshift(n)):(e[r]=e[r]||[]).push(n)}}function B(e,t,n,r){function i(a){var u;return o[a]=!0,ie.each(e[a]||[],function(e,a){var l=a(t,n,r);return"string"!=typeof l||s||o[l]?s?!(u=l):void 0:(t.dataTypes.unshift(l),i(l),!1)}),u}var o={},s=e===gt;return i(t.dataTypes[0])||!o["*"]&&i("*")}function _(e,t){var n,r,i=ie.ajaxSettings.flatOptions||{};for(n in t)void 0!==t[n]&&((i[n]?e:r||(r={}))[n]=t[n]);return r&&ie.extend(!0,e,r),e}function X(e,t,n){for(var r,i,o,s,a=e.contents,u=e.dataTypes;"*"===u[0];)u.shift(),void 0===r&&(r=e.mimeType||t.getResponseHeader("Content-Type"));if(r)for(i in a)if(a[i]&&a[i].test(r)){u.unshift(i);break}if(u[0]in n)o=u[0];else{for(i in n){if(!u[0]||e.converters[i+" "+u[0]]){o=i;break}s||(s=i)}o=o||s}if(o)return o!==u[0]&&u.unshift(o),n[o]}function z(e,t,n,r){var i,o,s,a,u,l={},c=e.dataTypes.slice();if(c[1])for(s in e.converters)l[s.toLowerCase()]=e.converters[s];for(o=c.shift();o;)if(e.responseFields[o]&&(n[e.responseFields[o]]=t),!u&&r&&e.dataFilter&&(t=e.dataFilter(t,e.dataType)),u=o,o=c.shift())if("*"===o)o=u;else if("*"!==u&&u!==o){if(!(s=l[u+" "+o]||l["* "+o]))for(i in l)if(a=i.split(" "),a[1]===o&&(s=l[u+" "+a[0]]||l["* "+a[0]])){!0===s?s=l[i]:!0!==l[i]&&(o=a[0],c.unshift(a[1]));break}if(!0!==s)if(s&&e.throws)t=s(t);else try{t=s(t)}catch(e){return{state:"parsererror",error:s?e:"No conversion from "+u+" to "+o}}}return{state:"success",data:t}}function U(e,t,n,r){var i;if(ie.isArray(t))ie.each(t,function(t,i){n||yt.test(e)?r(e,i):U(e+"["+("object"==typeof i&&null!=i?t:"")+"]",i,n,r)});else if(n||"object"!==ie.type(t))r(e,t);else for(i in t)U(e+"["+i+"]",t[i],n,r)}function V(e){return ie.isWindow(e)?e:9===e.nodeType&&e.defaultView}var Y=[],G=e.document,Q=Y.slice,J=Y.concat,K=Y.push,Z=Y.indexOf,ee={},te=ee.toString,ne=ee.hasOwnProperty,re={},ie=function(e,t){return new ie.fn.init(e,t)},oe=function(e,t){return t.toUpperCase()};ie.fn=ie.prototype={jquery:"2.2.4",constructor:ie,selector:"",length:0,toArray:function(){return Q.call(this)},get:function(e){return null!=e?e<0?this[e+this.length]:this[e]:Q.call(this)},pushStack:function(e){var t=ie.merge(this.constructor(),e);return t.prevObject=this,t.context=this.context,t},each:function(e){return ie.each(this,e)},map:function(e){return this.pushStack(ie.map(this,function(t,n){return e.call(t,n,t)}))},slice:function(){return this.pushStack(Q.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},eq:function(e){var t=this.length,n=+e+(e<0?t:0);return this.pushStack(n>=0&&n<t?[this[n]]:[])},end:function(){return this.prevObject||this.constructor()},push:K,sort:Y.sort,splice:Y.splice},ie.extend=ie.fn.extend=function(){var e,t,n,r,i,o,s=arguments[0]||{},a=1,u=arguments.length,l=!1;for("boolean"==typeof s&&(l=s,s=arguments[a]||{},a++),"object"==typeof s||ie.isFunction(s)||(s={}),a===u&&(s=this,a--);a<u;a++)if(null!=(e=arguments[a]))for(t in e)n=s[t],r=e[t],s!==r&&(l&&r&&(ie.isPlainObject(r)||(i=ie.isArray(r)))?(i?(i=!1,o=n&&ie.isArray(n)?n:[]):o=n&&ie.isPlainObject(n)?n:{},s[t]=ie.extend(l,o,r)):void 0!==r&&(s[t]=r));return s},ie.extend({expando:"jQuery"+("2.2.4"+Math.random()).replace(/\D/g,""),isReady:!0,error:function(e){throw new Error(e)},noop:function(){},isFunction:function(e){return"function"===ie.type(e)},isArray:Array.isArray,isWindow:function(e){return null!=e&&e===e.window},isNumeric:function(e){var t=e&&e.toString();return!ie.isArray(e)&&t-parseFloat(t)+1>=0},isPlainObject:function(e){var t;if("object"!==ie.type(e)||e.nodeType||ie.isWindow(e))return!1;if(e.constructor&&!ne.call(e,"constructor")&&!ne.call(e.constructor.prototype||{},"isPrototypeOf"))return!1;for(t in e);return void 0===t||ne.call(e,t)},isEmptyObject:function(e){var t;for(t in e)return!1;return!0},type:function(e){return null==e?e+"":"object"==typeof e||"function"==typeof e?ee[te.call(e)]||"object":typeof e},globalEval:function(e){var t,n=eval;(e=ie.trim(e))&&(1===e.indexOf("use strict")?(t=G.createElement("script"),t.text=e,G.head.appendChild(t).parentNode.removeChild(t)):n(e))},camelCase:function(e){return e.replace(/^-ms-/,"ms-").replace(/-([\da-z])/gi,oe)},nodeName:function(e,t){return e.nodeName&&e.nodeName.toLowerCase()===t.toLowerCase()},each:function(e,t){var r,i=0;if(n(e))for(r=e.length;i<r&&!1!==t.call(e[i],i,e[i]);i++);else for(i in e)if(!1===t.call(e[i],i,e[i]))break;return e},trim:function(e){return null==e?"":(e+"").replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,"")},makeArray:function(e,t){var r=t||[];return null!=e&&(n(Object(e))?ie.merge(r,"string"==typeof e?[e]:e):K.call(r,e)),r},inArray:function(e,t,n){return null==t?-1:Z.call(t,e,n)},merge:function(e,t){for(var n=+t.length,r=0,i=e.length;r<n;r++)e[i++]=t[r];return e.length=i,e},grep:function(e,t,n){for(var r=[],i=0,o=e.length,s=!n;i<o;i++)!t(e[i],i)!==s&&r.push(e[i]);return r},map:function(e,t,r){var i,o,s=0,a=[];if(n(e))for(i=e.length;s<i;s++)null!=(o=t(e[s],s,r))&&a.push(o);else for(s in e)null!=(o=t(e[s],s,r))&&a.push(o);return J.apply([],a)},guid:1,proxy:function(e,t){var n,r,i;if("string"==typeof t&&(n=e[t],t=e,e=n),ie.isFunction(e))return r=Q.call(arguments,2),i=function(){return e.apply(t||this,r.concat(Q.call(arguments)))},i.guid=e.guid=e.guid||ie.guid++,i},now:Date.now,support:re}),"function"==typeof Symbol&&(ie.fn[Symbol.iterator]=Y[Symbol.iterator]),ie.each("Boolean Number String Function Array Date RegExp Object Error Symbol".split(" "),function(e,t){ee["[object "+t+"]"]=t.toLowerCase()});var se=function(e){function t(e,t,n,r){var i,o,s,a,l,f,p,d,h=t&&t.ownerDocument,g=t?t.nodeType:9;if(n=n||[],"string"!=typeof e||!e||1!==g&&9!==g&&11!==g)return n;if(!r&&((t?t.ownerDocument||t:M)!==A&&D(t),t=t||A,L)){if(11!==g&&(f=ge.exec(e)))if(i=f[1]){if(9===g){if(!(s=t.getElementById(i)))return n;if(s.id===i)return n.push(s),n}else if(h&&(s=h.getElementById(i))&&P(t,s)&&s.id===i)return n.push(s),n}else{if(f[2])return Q.apply(n,t.getElementsByTagName(e)),n;if((i=f[3])&&x.getElementsByClassName&&t.getElementsByClassName)return Q.apply(n,t.getElementsByClassName(i)),n}if(x.qsa&&!_[e+" "]&&(!H||!H.test(e))){if(1!==g)h=t,d=e;else if("object"!==t.nodeName.toLowerCase()){for((a=t.getAttribute("id"))?a=a.replace(me,"\\$&"):t.setAttribute("id",a=R),p=C(e),o=p.length,l=ce.test(a)?"#"+a:"[id='"+a+"']";o--;)p[o]=l+" "+c(p[o]);d=p.join(","),h=ve.test(e)&&u(t.parentNode)||t}if(d)try{return Q.apply(n,h.querySelectorAll(d)),n}catch(e){}finally{a===R&&t.removeAttribute("id")}}}return E(e.replace(oe,"$1"),t,n,r)}function n(){function e(n,r){return t.push(n+" ")>b.cacheLength&&delete e[t.shift()],e[n+" "]=r}var t=[];return e}function r(e){return e[R]=!0,e}function i(e){var t=A.createElement("div");try{return!!e(t)}catch(e){return!1}finally{t.parentNode&&t.parentNode.removeChild(t),t=null}}function o(e,t){for(var n=e.split("|"),r=n.length;r--;)b.attrHandle[n[r]]=t}function s(e,t){var n=t&&e,r=n&&1===e.nodeType&&1===t.nodeType&&(~t.sourceIndex||z)-(~e.sourceIndex||z);if(r)return r;if(n)for(;n=n.nextSibling;)if(n===t)return-1;return e?1:-1}function a(e){return r(function(t){return t=+t,r(function(n,r){for(var i,o=e([],n.length,t),s=o.length;s--;)n[i=o[s]]&&(n[i]=!(r[i]=n[i]))})})}function u(e){return e&&void 0!==e.getElementsByTagName&&e}function l(){}function c(e){for(var t=0,n=e.length,r="";t<n;t++)r+=e[t].value;return r}function f(e,t,n){var r=t.dir,i=n&&"parentNode"===r,o=W++;return t.first?function(t,n,o){for(;t=t[r];)if(1===t.nodeType||i)return e(t,n,o)}:function(t,n,s){var a,u,l,c=[I,o];if(s){for(;t=t[r];)if((1===t.nodeType||i)&&e(t,n,s))return!0}else for(;t=t[r];)if(1===t.nodeType||i){if(l=t[R]||(t[R]={}),u=l[t.uniqueID]||(l[t.uniqueID]={}),(a=u[r])&&a[0]===I&&a[1]===o)return c[2]=a[2];if(u[r]=c,c[2]=e(t,n,s))return!0}}}function p(e){return e.length>1?function(t,n,r){for(var i=e.length;i--;)if(!e[i](t,n,r))return!1;return!0}:e[0]}function d(e,n,r){for(var i=0,o=n.length;i<o;i++)t(e,n[i],r);return r}function h(e,t,n,r,i){for(var o,s=[],a=0,u=e.length,l=null!=t;a<u;a++)(o=e[a])&&(n&&!n(o,r,i)||(s.push(o),l&&t.push(a)));return s}function g(e,t,n,i,o,s){return i&&!i[R]&&(i=g(i)),o&&!o[R]&&(o=g(o,s)),r(function(r,s,a,u){var l,c,f,p=[],g=[],v=s.length,m=r||d(t||"*",a.nodeType?[a]:a,[]),y=!e||!r&&t?m:h(m,p,e,a,u),x=n?o||(r?e:v||i)?[]:s:y;if(n&&n(y,x,a,u),i)for(l=h(x,g),i(l,[],a,u),c=l.length;c--;)(f=l[c])&&(x[g[c]]=!(y[g[c]]=f));if(r){if(o||e){if(o){for(l=[],c=x.length;c--;)(f=x[c])&&l.push(y[c]=f);o(null,x=[],l,u)}for(c=x.length;c--;)(f=x[c])&&(l=o?K(r,f):p[c])>-1&&(r[l]=!(s[l]=f))}}else x=h(x===s?x.splice(v,x.length):x),o?o(null,s,x,u):Q.apply(s,x)})}function v(e){for(var t,n,r,i=e.length,o=b.relative[e[0].type],s=o||b.relative[" "],a=o?1:0,u=f(function(e){return e===t},s,!0),l=f(function(e){return K(t,e)>-1},s,!0),d=[function(e,n,r){var i=!o&&(r||n!==N)||((t=n).nodeType?u(e,n,r):l(e,n,r));return t=null,i}];a<i;a++)if(n=b.relative[e[a].type])d=[f(p(d),n)];else{if(n=b.filter[e[a].type].apply(null,e[a].matches),n[R]){for(r=++a;r<i&&!b.relative[e[r].type];r++);return g(a>1&&p(d),a>1&&c(e.slice(0,a-1).concat({value:" "===e[a-2].type?"*":""})).replace(oe,"$1"),n,a<r&&v(e.slice(a,r)),r<i&&v(e=e.slice(r)),r<i&&c(e))}d.push(n)}return p(d)}function m(e,n){var i=n.length>0,o=e.length>0,s=function(r,s,a,u,l){var c,f,p,d=0,g="0",v=r&&[],m=[],y=N,x=r||o&&b.find.TAG("*",l),w=I+=null==y?1:Math.random()||.1,T=x.length;for(l&&(N=s===A||s||l);g!==T&&null!=(c=x[g]);g++){if(o&&c){for(f=0,s||c.ownerDocument===A||(D(c),a=!L);p=e[f++];)if(p(c,s||A,a)){u.push(c);break}l&&(I=w)}i&&((c=!p&&c)&&d--,r&&v.push(c))}if(d+=g,i&&g!==d){for(f=0;p=n[f++];)p(v,m,s,a);if(r){if(d>0)for(;g--;)v[g]||m[g]||(m[g]=Y.call(u));m=h(m)}Q.apply(u,m),l&&!r&&m.length>0&&d+n.length>1&&t.uniqueSort(u)}return l&&(I=w,N=y),v};return i?r(s):s}var y,x,b,w,T,C,k,E,N,S,j,D,A,q,L,H,O,F,P,R="sizzle"+1*new Date,M=e.document,I=0,W=0,$=n(),B=n(),_=n(),X=function(e,t){return e===t&&(j=!0),0},z=1<<31,U={}.hasOwnProperty,V=[],Y=V.pop,G=V.push,Q=V.push,J=V.slice,K=function(e,t){for(var n=0,r=e.length;n<r;n++)if(e[n]===t)return n;return-1},Z="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",ee="[\\x20\\t\\r\\n\\f]",te="(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",ne="\\["+ee+"*("+te+")(?:"+ee+"*([*^$|!~]?=)"+ee+"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|("+te+"))|)"+ee+"*\\]",re=":("+te+")(?:\\((('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|((?:\\\\.|[^\\\\()[\\]]|"+ne+")*)|.*)\\)|)",ie=new RegExp(ee+"+","g"),oe=new RegExp("^"+ee+"+|((?:^|[^\\\\])(?:\\\\.)*)"+ee+"+$","g"),se=new RegExp("^"+ee+"*,"+ee+"*"),ae=new RegExp("^"+ee+"*([>+~]|"+ee+")"+ee+"*"),ue=new RegExp("="+ee+"*([^\\]'\"]*?)"+ee+"*\\]","g"),le=new RegExp(re),ce=new RegExp("^"+te+"$"),fe={ID:new RegExp("^#("+te+")"),CLASS:new RegExp("^\\.("+te+")"),TAG:new RegExp("^("+te+"|[*])"),ATTR:new RegExp("^"+ne),PSEUDO:new RegExp("^"+re),CHILD:new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+ee+"*(even|odd|(([+-]|)(\\d*)n|)"+ee+"*(?:([+-]|)"+ee+"*(\\d+)|))"+ee+"*\\)|)","i"),bool:new RegExp("^(?:"+Z+")$","i"),needsContext:new RegExp("^"+ee+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+ee+"*((?:-\\d)?\\d*)"+ee+"*\\)|)(?=[^-]|$)","i")},pe=/^(?:input|select|textarea|button)$/i,de=/^h\d$/i,he=/^[^{]+\{\s*\[native \w/,ge=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,ve=/[+~]/,me=/'|\\/g,ye=new RegExp("\\\\([\\da-f]{1,6}"+ee+"?|("+ee+")|.)","ig"),xe=function(e,t,n){var r="0x"+t-65536;return r!==r||n?t:r<0?String.fromCharCode(r+65536):String.fromCharCode(r>>10|55296,1023&r|56320)},be=function(){D()};try{Q.apply(V=J.call(M.childNodes),M.childNodes),V[M.childNodes.length].nodeType}catch(e){Q={apply:V.length?function(e,t){G.apply(e,J.call(t))}:function(e,t){for(var n=e.length,r=0;e[n++]=t[r++];);e.length=n-1}}}x=t.support={},T=t.isXML=function(e){var t=e&&(e.ownerDocument||e).documentElement;return!!t&&"HTML"!==t.nodeName},D=t.setDocument=function(e){var t,n,r=e?e.ownerDocument||e:M;return r!==A&&9===r.nodeType&&r.documentElement?(A=r,q=A.documentElement,L=!T(A),(n=A.defaultView)&&n.top!==n&&(n.addEventListener?n.addEventListener("unload",be,!1):n.attachEvent&&n.attachEvent("onunload",be)),x.attributes=i(function(e){return e.className="i",!e.getAttribute("className")}),x.getElementsByTagName=i(function(e){return e.appendChild(A.createComment("")),!e.getElementsByTagName("*").length}),x.getElementsByClassName=he.test(A.getElementsByClassName),x.getById=i(function(e){return q.appendChild(e).id=R,!A.getElementsByName||!A.getElementsByName(R).length}),x.getById?(b.find.ID=function(e,t){if(void 0!==t.getElementById&&L){var n=t.getElementById(e);return n?[n]:[]}},b.filter.ID=function(e){var t=e.replace(ye,xe);return function(e){return e.getAttribute("id")===t}}):(delete b.find.ID,b.filter.ID=function(e){var t=e.replace(ye,xe);return function(e){var n=void 0!==e.getAttributeNode&&e.getAttributeNode("id");return n&&n.value===t}}),b.find.TAG=x.getElementsByTagName?function(e,t){return void 0!==t.getElementsByTagName?t.getElementsByTagName(e):x.qsa?t.querySelectorAll(e):void 0}:function(e,t){var n,r=[],i=0,o=t.getElementsByTagName(e);if("*"===e){for(;n=o[i++];)1===n.nodeType&&r.push(n);return r}return o},b.find.CLASS=x.getElementsByClassName&&function(e,t){if(void 0!==t.getElementsByClassName&&L)return t.getElementsByClassName(e)},O=[],H=[],(x.qsa=he.test(A.querySelectorAll))&&(i(function(e){q.appendChild(e).innerHTML="<a id='"+R+"'></a><select id='"+R+"-\r\\' msallowcapture=''><option selected=''></option></select>",e.querySelectorAll("[msallowcapture^='']").length&&H.push("[*^$]="+ee+"*(?:''|\"\")"),e.querySelectorAll("[selected]").length||H.push("\\["+ee+"*(?:value|"+Z+")"),e.querySelectorAll("[id~="+R+"-]").length||H.push("~="),e.querySelectorAll(":checked").length||H.push(":checked"),e.querySelectorAll("a#"+R+"+*").length||H.push(".#.+[+~]")}),i(function(e){var t=A.createElement("input");t.setAttribute("type","hidden"),e.appendChild(t).setAttribute("name","D"),e.querySelectorAll("[name=d]").length&&H.push("name"+ee+"*[*^$|!~]?="),e.querySelectorAll(":enabled").length||H.push(":enabled",":disabled"),e.querySelectorAll("*,:x"),H.push(",.*:")})),(x.matchesSelector=he.test(F=q.matches||q.webkitMatchesSelector||q.mozMatchesSelector||q.oMatchesSelector||q.msMatchesSelector))&&i(function(e){x.disconnectedMatch=F.call(e,"div"),F.call(e,"[s!='']:x"),O.push("!=",re)}),H=H.length&&new RegExp(H.join("|")),O=O.length&&new RegExp(O.join("|")),t=he.test(q.compareDocumentPosition),P=t||he.test(q.contains)?function(e,t){var n=9===e.nodeType?e.documentElement:e,r=t&&t.parentNode;return e===r||!(!r||1!==r.nodeType||!(n.contains?n.contains(r):e.compareDocumentPosition&&16&e.compareDocumentPosition(r)))}:function(e,t){if(t)for(;t=t.parentNode;)if(t===e)return!0;return!1},X=t?function(e,t){if(e===t)return j=!0,0;var n=!e.compareDocumentPosition-!t.compareDocumentPosition;return n||(n=(e.ownerDocument||e)===(t.ownerDocument||t)?e.compareDocumentPosition(t):1,1&n||!x.sortDetached&&t.compareDocumentPosition(e)===n?e===A||e.ownerDocument===M&&P(M,e)?-1:t===A||t.ownerDocument===M&&P(M,t)?1:S?K(S,e)-K(S,t):0:4&n?-1:1)}:function(e,t){if(e===t)return j=!0,0;var n,r=0,i=e.parentNode,o=t.parentNode,a=[e],u=[t];if(!i||!o)return e===A?-1:t===A?1:i?-1:o?1:S?K(S,e)-K(S,t):0;if(i===o)return s(e,t);for(n=e;n=n.parentNode;)a.unshift(n);for(n=t;n=n.parentNode;)u.unshift(n);for(;a[r]===u[r];)r++;return r?s(a[r],u[r]):a[r]===M?-1:u[r]===M?1:0},A):A},t.matches=function(e,n){return t(e,null,null,n)},t.matchesSelector=function(e,n){if((e.ownerDocument||e)!==A&&D(e),n=n.replace(ue,"='$1']"),x.matchesSelector&&L&&!_[n+" "]&&(!O||!O.test(n))&&(!H||!H.test(n)))try{var r=F.call(e,n);if(r||x.disconnectedMatch||e.document&&11!==e.document.nodeType)return r}catch(e){}return t(n,A,null,[e]).length>0},t.contains=function(e,t){return(e.ownerDocument||e)!==A&&D(e),P(e,t)},t.attr=function(e,t){(e.ownerDocument||e)!==A&&D(e);var n=b.attrHandle[t.toLowerCase()],r=n&&U.call(b.attrHandle,t.toLowerCase())?n(e,t,!L):void 0;return void 0!==r?r:x.attributes||!L?e.getAttribute(t):(r=e.getAttributeNode(t))&&r.specified?r.value:null},t.error=function(e){throw new Error("Syntax error, unrecognized expression: "+e)},t.uniqueSort=function(e){var t,n=[],r=0,i=0;if(j=!x.detectDuplicates,S=!x.sortStable&&e.slice(0),e.sort(X),j){for(;t=e[i++];)t===e[i]&&(r=n.push(i));for(;r--;)e.splice(n[r],1)}return S=null,e},w=t.getText=function(e){var t,n="",r=0,i=e.nodeType;if(i){if(1===i||9===i||11===i){if("string"==typeof e.textContent)return e.textContent;for(e=e.firstChild;e;e=e.nextSibling)n+=w(e)}else if(3===i||4===i)return e.nodeValue}else for(;t=e[r++];)n+=w(t);return n},b=t.selectors={cacheLength:50,createPseudo:r,match:fe,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(e){return e[1]=e[1].replace(ye,xe),e[3]=(e[3]||e[4]||e[5]||"").replace(ye,xe),"~="===e[2]&&(e[3]=" "+e[3]+" "),e.slice(0,4)},CHILD:function(e){return e[1]=e[1].toLowerCase(),"nth"===e[1].slice(0,3)?(e[3]||t.error(e[0]),e[4]=+(e[4]?e[5]+(e[6]||1):2*("even"===e[3]||"odd"===e[3])),e[5]=+(e[7]+e[8]||"odd"===e[3])):e[3]&&t.error(e[0]),e},PSEUDO:function(e){var t,n=!e[6]&&e[2];return fe.CHILD.test(e[0])?null:(e[3]?e[2]=e[4]||e[5]||"":n&&le.test(n)&&(t=C(n,!0))&&(t=n.indexOf(")",n.length-t)-n.length)&&(e[0]=e[0].slice(0,t),e[2]=n.slice(0,t)),e.slice(0,3))}},filter:{TAG:function(e){var t=e.replace(ye,xe).toLowerCase();return"*"===e?function(){return!0}:function(e){return e.nodeName&&e.nodeName.toLowerCase()===t}},CLASS:function(e){var t=$[e+" "];return t||(t=new RegExp("(^|"+ee+")"+e+"("+ee+"|$)"))&&$(e,function(e){return t.test("string"==typeof e.className&&e.className||void 0!==e.getAttribute&&e.getAttribute("class")||"")})},ATTR:function(e,n,r){return function(i){var o=t.attr(i,e);return null==o?"!="===n:!n||(o+="","="===n?o===r:"!="===n?o!==r:"^="===n?r&&0===o.indexOf(r):"*="===n?r&&o.indexOf(r)>-1:"$="===n?r&&o.slice(-r.length)===r:"~="===n?(" "+o.replace(ie," ")+" ").indexOf(r)>-1:"|="===n&&(o===r||o.slice(0,r.length+1)===r+"-"))}},CHILD:function(e,t,n,r,i){var o="nth"!==e.slice(0,3),s="last"!==e.slice(-4),a="of-type"===t;return 1===r&&0===i?function(e){return!!e.parentNode}:function(t,n,u){var l,c,f,p,d,h,g=o!==s?"nextSibling":"previousSibling",v=t.parentNode,m=a&&t.nodeName.toLowerCase(),y=!u&&!a,x=!1;if(v){if(o){for(;g;){for(p=t;p=p[g];)if(a?p.nodeName.toLowerCase()===m:1===p.nodeType)return!1;h=g="only"===e&&!h&&"nextSibling"}return!0}if(h=[s?v.firstChild:v.lastChild],s&&y){for(p=v,f=p[R]||(p[R]={}),c=f[p.uniqueID]||(f[p.uniqueID]={}),l=c[e]||[],d=l[0]===I&&l[1],x=d&&l[2],p=d&&v.childNodes[d];p=++d&&p&&p[g]||(x=d=0)||h.pop();)if(1===p.nodeType&&++x&&p===t){c[e]=[I,d,x];break}}else if(y&&(p=t,f=p[R]||(p[R]={}),c=f[p.uniqueID]||(f[p.uniqueID]={}),l=c[e]||[],d=l[0]===I&&l[1],x=d),!1===x)for(;(p=++d&&p&&p[g]||(x=d=0)||h.pop())&&((a?p.nodeName.toLowerCase()!==m:1!==p.nodeType)||!++x||(y&&(f=p[R]||(p[R]={}),c=f[p.uniqueID]||(f[p.uniqueID]={}),c[e]=[I,x]),p!==t)););return(x-=i)===r||x%r==0&&x/r>=0}}},PSEUDO:function(e,n){var i,o=b.pseudos[e]||b.setFilters[e.toLowerCase()]||t.error("unsupported pseudo: "+e);return o[R]?o(n):o.length>1?(i=[e,e,"",n],b.setFilters.hasOwnProperty(e.toLowerCase())?r(function(e,t){for(var r,i=o(e,n),s=i.length;s--;)r=K(e,i[s]),e[r]=!(t[r]=i[s])}):function(e){return o(e,0,i)}):o}},pseudos:{not:r(function(e){var t=[],n=[],i=k(e.replace(oe,"$1"));return i[R]?r(function(e,t,n,r){for(var o,s=i(e,null,r,[]),a=e.length;a--;)(o=s[a])&&(e[a]=!(t[a]=o))}):function(e,r,o){return t[0]=e,i(t,null,o,n),t[0]=null,!n.pop()}}),has:r(function(e){return function(n){return t(e,n).length>0}}),contains:r(function(e){return e=e.replace(ye,xe),function(t){return(t.textContent||t.innerText||w(t)).indexOf(e)>-1}}),lang:r(function(e){return ce.test(e||"")||t.error("unsupported lang: "+e),e=e.replace(ye,xe).toLowerCase(),function(t){var n;do{if(n=L?t.lang:t.getAttribute("xml:lang")||t.getAttribute("lang"))return(n=n.toLowerCase())===e||0===n.indexOf(e+"-")}while((t=t.parentNode)&&1===t.nodeType);return!1}}),target:function(t){var n=e.location&&e.location.hash;return n&&n.slice(1)===t.id},root:function(e){return e===q},focus:function(e){return e===A.activeElement&&(!A.hasFocus||A.hasFocus())&&!!(e.type||e.href||~e.tabIndex)},enabled:function(e){return!1===e.disabled},disabled:function(e){return!0===e.disabled},checked:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&!!e.checked||"option"===t&&!!e.selected},selected:function(e){return e.parentNode&&e.parentNode.selectedIndex,!0===e.selected},empty:function(e){for(e=e.firstChild;e;e=e.nextSibling)if(e.nodeType<6)return!1;return!0},parent:function(e){return!b.pseudos.empty(e)},header:function(e){return de.test(e.nodeName)},input:function(e){return pe.test(e.nodeName)},button:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&"button"===e.type||"button"===t},text:function(e){var t;return"input"===e.nodeName.toLowerCase()&&"text"===e.type&&(null==(t=e.getAttribute("type"))||"text"===t.toLowerCase())},first:a(function(){return[0]}),last:a(function(e,t){return[t-1]}),eq:a(function(e,t,n){return[n<0?n+t:n]}),even:a(function(e,t){for(var n=0;n<t;n+=2)e.push(n);return e}),odd:a(function(e,t){for(var n=1;n<t;n+=2)e.push(n);return e}),lt:a(function(e,t,n){for(var r=n<0?n+t:n;--r>=0;)e.push(r);return e}),gt:a(function(e,t,n){for(var r=n<0?n+t:n;++r<t;)e.push(r);return e})}},b.pseudos.nth=b.pseudos.eq;for(y in{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})b.pseudos[y]=function(e){return function(t){
return"input"===t.nodeName.toLowerCase()&&t.type===e}}(y);for(y in{submit:!0,reset:!0})b.pseudos[y]=function(e){return function(t){var n=t.nodeName.toLowerCase();return("input"===n||"button"===n)&&t.type===e}}(y);return l.prototype=b.filters=b.pseudos,b.setFilters=new l,C=t.tokenize=function(e,n){var r,i,o,s,a,u,l,c=B[e+" "];if(c)return n?0:c.slice(0);for(a=e,u=[],l=b.preFilter;a;){r&&!(i=se.exec(a))||(i&&(a=a.slice(i[0].length)||a),u.push(o=[])),r=!1,(i=ae.exec(a))&&(r=i.shift(),o.push({value:r,type:i[0].replace(oe," ")}),a=a.slice(r.length));for(s in b.filter)!(i=fe[s].exec(a))||l[s]&&!(i=l[s](i))||(r=i.shift(),o.push({value:r,type:s,matches:i}),a=a.slice(r.length));if(!r)break}return n?a.length:a?t.error(e):B(e,u).slice(0)},k=t.compile=function(e,t){var n,r=[],i=[],o=_[e+" "];if(!o){for(t||(t=C(e)),n=t.length;n--;)o=v(t[n]),o[R]?r.push(o):i.push(o);o=_(e,m(i,r)),o.selector=e}return o},E=t.select=function(e,t,n,r){var i,o,s,a,l,f="function"==typeof e&&e,p=!r&&C(e=f.selector||e);if(n=n||[],1===p.length){if(o=p[0]=p[0].slice(0),o.length>2&&"ID"===(s=o[0]).type&&x.getById&&9===t.nodeType&&L&&b.relative[o[1].type]){if(!(t=(b.find.ID(s.matches[0].replace(ye,xe),t)||[])[0]))return n;f&&(t=t.parentNode),e=e.slice(o.shift().value.length)}for(i=fe.needsContext.test(e)?0:o.length;i--&&(s=o[i],!b.relative[a=s.type]);)if((l=b.find[a])&&(r=l(s.matches[0].replace(ye,xe),ve.test(o[0].type)&&u(t.parentNode)||t))){if(o.splice(i,1),!(e=r.length&&c(o)))return Q.apply(n,r),n;break}}return(f||k(e,p))(r,t,!L,n,!t||ve.test(e)&&u(t.parentNode)||t),n},x.sortStable=R.split("").sort(X).join("")===R,x.detectDuplicates=!!j,D(),x.sortDetached=i(function(e){return 1&e.compareDocumentPosition(A.createElement("div"))}),i(function(e){return e.innerHTML="<a href='#'></a>","#"===e.firstChild.getAttribute("href")})||o("type|href|height|width",function(e,t,n){if(!n)return e.getAttribute(t,"type"===t.toLowerCase()?1:2)}),x.attributes&&i(function(e){return e.innerHTML="<input/>",e.firstChild.setAttribute("value",""),""===e.firstChild.getAttribute("value")})||o("value",function(e,t,n){if(!n&&"input"===e.nodeName.toLowerCase())return e.defaultValue}),i(function(e){return null==e.getAttribute("disabled")})||o(Z,function(e,t,n){var r;if(!n)return!0===e[t]?t.toLowerCase():(r=e.getAttributeNode(t))&&r.specified?r.value:null}),t}(e);ie.find=se,ie.expr=se.selectors,ie.expr[":"]=ie.expr.pseudos,ie.uniqueSort=ie.unique=se.uniqueSort,ie.text=se.getText,ie.isXMLDoc=se.isXML,ie.contains=se.contains;var ae=function(e,t,n){for(var r=[],i=void 0!==n;(e=e[t])&&9!==e.nodeType;)if(1===e.nodeType){if(i&&ie(e).is(n))break;r.push(e)}return r},ue=function(e,t){for(var n=[];e;e=e.nextSibling)1===e.nodeType&&e!==t&&n.push(e);return n},le=ie.expr.match.needsContext,ce=/^<([\w-]+)\s*\/?>(?:<\/\1>|)$/,fe=/^.[^:#\[\.,]*$/;ie.filter=function(e,t,n){var r=t[0];return n&&(e=":not("+e+")"),1===t.length&&1===r.nodeType?ie.find.matchesSelector(r,e)?[r]:[]:ie.find.matches(e,ie.grep(t,function(e){return 1===e.nodeType}))},ie.fn.extend({find:function(e){var t,n=this.length,r=[],i=this;if("string"!=typeof e)return this.pushStack(ie(e).filter(function(){for(t=0;t<n;t++)if(ie.contains(i[t],this))return!0}));for(t=0;t<n;t++)ie.find(e,i[t],r);return r=this.pushStack(n>1?ie.unique(r):r),r.selector=this.selector?this.selector+" "+e:e,r},filter:function(e){return this.pushStack(r(this,e||[],!1))},not:function(e){return this.pushStack(r(this,e||[],!0))},is:function(e){return!!r(this,"string"==typeof e&&le.test(e)?ie(e):e||[],!1).length}});var pe,de=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/;(ie.fn.init=function(e,t,n){var r,i;if(!e)return this;if(n=n||pe,"string"==typeof e){if(!(r="<"===e[0]&&">"===e[e.length-1]&&e.length>=3?[null,e,null]:de.exec(e))||!r[1]&&t)return!t||t.jquery?(t||n).find(e):this.constructor(t).find(e);if(r[1]){if(t=t instanceof ie?t[0]:t,ie.merge(this,ie.parseHTML(r[1],t&&t.nodeType?t.ownerDocument||t:G,!0)),ce.test(r[1])&&ie.isPlainObject(t))for(r in t)ie.isFunction(this[r])?this[r](t[r]):this.attr(r,t[r]);return this}return i=G.getElementById(r[2]),i&&i.parentNode&&(this.length=1,this[0]=i),this.context=G,this.selector=e,this}return e.nodeType?(this.context=this[0]=e,this.length=1,this):ie.isFunction(e)?void 0!==n.ready?n.ready(e):e(ie):(void 0!==e.selector&&(this.selector=e.selector,this.context=e.context),ie.makeArray(e,this))}).prototype=ie.fn,pe=ie(G);var he=/^(?:parents|prev(?:Until|All))/,ge={children:!0,contents:!0,next:!0,prev:!0};ie.fn.extend({has:function(e){var t=ie(e,this),n=t.length;return this.filter(function(){for(var e=0;e<n;e++)if(ie.contains(this,t[e]))return!0})},closest:function(e,t){for(var n,r=0,i=this.length,o=[],s=le.test(e)||"string"!=typeof e?ie(e,t||this.context):0;r<i;r++)for(n=this[r];n&&n!==t;n=n.parentNode)if(n.nodeType<11&&(s?s.index(n)>-1:1===n.nodeType&&ie.find.matchesSelector(n,e))){o.push(n);break}return this.pushStack(o.length>1?ie.uniqueSort(o):o)},index:function(e){return e?"string"==typeof e?Z.call(ie(e),this[0]):Z.call(this,e.jquery?e[0]:e):this[0]&&this[0].parentNode?this.first().prevAll().length:-1},add:function(e,t){return this.pushStack(ie.uniqueSort(ie.merge(this.get(),ie(e,t))))},addBack:function(e){return this.add(null==e?this.prevObject:this.prevObject.filter(e))}}),ie.each({parent:function(e){var t=e.parentNode;return t&&11!==t.nodeType?t:null},parents:function(e){return ae(e,"parentNode")},parentsUntil:function(e,t,n){return ae(e,"parentNode",n)},next:function(e){return i(e,"nextSibling")},prev:function(e){return i(e,"previousSibling")},nextAll:function(e){return ae(e,"nextSibling")},prevAll:function(e){return ae(e,"previousSibling")},nextUntil:function(e,t,n){return ae(e,"nextSibling",n)},prevUntil:function(e,t,n){return ae(e,"previousSibling",n)},siblings:function(e){return ue((e.parentNode||{}).firstChild,e)},children:function(e){return ue(e.firstChild)},contents:function(e){return e.contentDocument||ie.merge([],e.childNodes)}},function(e,t){ie.fn[e]=function(n,r){var i=ie.map(this,t,n);return"Until"!==e.slice(-5)&&(r=n),r&&"string"==typeof r&&(i=ie.filter(r,i)),this.length>1&&(ge[e]||ie.uniqueSort(i),he.test(e)&&i.reverse()),this.pushStack(i)}});var ve=/\S+/g;ie.Callbacks=function(e){e="string"==typeof e?o(e):ie.extend({},e);var t,n,r,i,s=[],a=[],u=-1,l=function(){for(i=e.once,r=t=!0;a.length;u=-1)for(n=a.shift();++u<s.length;)!1===s[u].apply(n[0],n[1])&&e.stopOnFalse&&(u=s.length,n=!1);e.memory||(n=!1),t=!1,i&&(s=n?[]:"")},c={add:function(){return s&&(n&&!t&&(u=s.length-1,a.push(n)),function t(n){ie.each(n,function(n,r){ie.isFunction(r)?e.unique&&c.has(r)||s.push(r):r&&r.length&&"string"!==ie.type(r)&&t(r)})}(arguments),n&&!t&&l()),this},remove:function(){return ie.each(arguments,function(e,t){for(var n;(n=ie.inArray(t,s,n))>-1;)s.splice(n,1),n<=u&&u--}),this},has:function(e){return e?ie.inArray(e,s)>-1:s.length>0},empty:function(){return s&&(s=[]),this},disable:function(){return i=a=[],s=n="",this},disabled:function(){return!s},lock:function(){return i=a=[],n||(s=n=""),this},locked:function(){return!!i},fireWith:function(e,n){return i||(n=n||[],n=[e,n.slice?n.slice():n],a.push(n),t||l()),this},fire:function(){return c.fireWith(this,arguments),this},fired:function(){return!!r}};return c},ie.extend({Deferred:function(e){var t=[["resolve","done",ie.Callbacks("once memory"),"resolved"],["reject","fail",ie.Callbacks("once memory"),"rejected"],["notify","progress",ie.Callbacks("memory")]],n="pending",r={state:function(){return n},always:function(){return i.done(arguments).fail(arguments),this},then:function(){var e=arguments;return ie.Deferred(function(n){ie.each(t,function(t,o){var s=ie.isFunction(e[t])&&e[t];i[o[1]](function(){var e=s&&s.apply(this,arguments);e&&ie.isFunction(e.promise)?e.promise().progress(n.notify).done(n.resolve).fail(n.reject):n[o[0]+"With"](this===r?n.promise():this,s?[e]:arguments)})}),e=null}).promise()},promise:function(e){return null!=e?ie.extend(e,r):r}},i={};return r.pipe=r.then,ie.each(t,function(e,o){var s=o[2],a=o[3];r[o[1]]=s.add,a&&s.add(function(){n=a},t[1^e][2].disable,t[2][2].lock),i[o[0]]=function(){return i[o[0]+"With"](this===i?r:this,arguments),this},i[o[0]+"With"]=s.fireWith}),r.promise(i),e&&e.call(i,i),i},when:function(e){var t,n,r,i=0,o=Q.call(arguments),s=o.length,a=1!==s||e&&ie.isFunction(e.promise)?s:0,u=1===a?e:ie.Deferred(),l=function(e,n,r){return function(i){n[e]=this,r[e]=arguments.length>1?Q.call(arguments):i,r===t?u.notifyWith(n,r):--a||u.resolveWith(n,r)}};if(s>1)for(t=new Array(s),n=new Array(s),r=new Array(s);i<s;i++)o[i]&&ie.isFunction(o[i].promise)?o[i].promise().progress(l(i,n,t)).done(l(i,r,o)).fail(u.reject):--a;return a||u.resolveWith(r,o),u.promise()}});var me;ie.fn.ready=function(e){return ie.ready.promise().done(e),this},ie.extend({isReady:!1,readyWait:1,holdReady:function(e){e?ie.readyWait++:ie.ready(!0)},ready:function(e){(!0===e?--ie.readyWait:ie.isReady)||(ie.isReady=!0,!0!==e&&--ie.readyWait>0||(me.resolveWith(G,[ie]),ie.fn.triggerHandler&&(ie(G).triggerHandler("ready"),ie(G).off("ready"))))}}),ie.ready.promise=function(t){return me||(me=ie.Deferred(),"complete"===G.readyState||"loading"!==G.readyState&&!G.documentElement.doScroll?e.setTimeout(ie.ready):(G.addEventListener("DOMContentLoaded",s),e.addEventListener("load",s))),me.promise(t)},ie.ready.promise();var ye=function(e,t,n,r,i,o,s){var a=0,u=e.length,l=null==n;if("object"===ie.type(n)){i=!0;for(a in n)ye(e,t,a,n[a],!0,o,s)}else if(void 0!==r&&(i=!0,ie.isFunction(r)||(s=!0),l&&(s?(t.call(e,r),t=null):(l=t,t=function(e,t,n){return l.call(ie(e),n)})),t))for(;a<u;a++)t(e[a],n,s?r:r.call(e[a],a,t(e[a],n)));return i?e:l?t.call(e):u?t(e[0],n):o},xe=function(e){return 1===e.nodeType||9===e.nodeType||!+e.nodeType};a.uid=1,a.prototype={register:function(e,t){var n=t||{};return e.nodeType?e[this.expando]=n:Object.defineProperty(e,this.expando,{value:n,writable:!0,configurable:!0}),e[this.expando]},cache:function(e){if(!xe(e))return{};var t=e[this.expando];return t||(t={},xe(e)&&(e.nodeType?e[this.expando]=t:Object.defineProperty(e,this.expando,{value:t,configurable:!0}))),t},set:function(e,t,n){var r,i=this.cache(e);if("string"==typeof t)i[t]=n;else for(r in t)i[r]=t[r];return i},get:function(e,t){return void 0===t?this.cache(e):e[this.expando]&&e[this.expando][t]},access:function(e,t,n){var r;return void 0===t||t&&"string"==typeof t&&void 0===n?(r=this.get(e,t),void 0!==r?r:this.get(e,ie.camelCase(t))):(this.set(e,t,n),void 0!==n?n:t)},remove:function(e,t){var n,r,i,o=e[this.expando];if(void 0!==o){if(void 0===t)this.register(e);else{ie.isArray(t)?r=t.concat(t.map(ie.camelCase)):(i=ie.camelCase(t),t in o?r=[t,i]:(r=i,r=r in o?[r]:r.match(ve)||[])),n=r.length;for(;n--;)delete o[r[n]]}(void 0===t||ie.isEmptyObject(o))&&(e.nodeType?e[this.expando]=void 0:delete e[this.expando])}},hasData:function(e){var t=e[this.expando];return void 0!==t&&!ie.isEmptyObject(t)}};var be=new a,we=new a,Te=/^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,Ce=/[A-Z]/g;ie.extend({hasData:function(e){return we.hasData(e)||be.hasData(e)},data:function(e,t,n){return we.access(e,t,n)},removeData:function(e,t){we.remove(e,t)},_data:function(e,t,n){return be.access(e,t,n)},_removeData:function(e,t){be.remove(e,t)}}),ie.fn.extend({data:function(e,t){var n,r,i,o=this[0],s=o&&o.attributes;if(void 0===e){if(this.length&&(i=we.get(o),1===o.nodeType&&!be.get(o,"hasDataAttrs"))){for(n=s.length;n--;)s[n]&&(r=s[n].name,0===r.indexOf("data-")&&(r=ie.camelCase(r.slice(5)),u(o,r,i[r])));be.set(o,"hasDataAttrs",!0)}return i}return"object"==typeof e?this.each(function(){we.set(this,e)}):ye(this,function(t){var n,r;if(o&&void 0===t){if(void 0!==(n=we.get(o,e)||we.get(o,e.replace(Ce,"-$&").toLowerCase())))return n;if(r=ie.camelCase(e),void 0!==(n=we.get(o,r)))return n;if(void 0!==(n=u(o,r,void 0)))return n}else r=ie.camelCase(e),this.each(function(){var n=we.get(this,r);we.set(this,r,t),e.indexOf("-")>-1&&void 0!==n&&we.set(this,e,t)})},null,t,arguments.length>1,null,!0)},removeData:function(e){return this.each(function(){we.remove(this,e)})}}),ie.extend({queue:function(e,t,n){var r;if(e)return t=(t||"fx")+"queue",r=be.get(e,t),n&&(!r||ie.isArray(n)?r=be.access(e,t,ie.makeArray(n)):r.push(n)),r||[]},dequeue:function(e,t){t=t||"fx";var n=ie.queue(e,t),r=n.length,i=n.shift(),o=ie._queueHooks(e,t),s=function(){ie.dequeue(e,t)};"inprogress"===i&&(i=n.shift(),r--),i&&("fx"===t&&n.unshift("inprogress"),delete o.stop,i.call(e,s,o)),!r&&o&&o.empty.fire()},_queueHooks:function(e,t){var n=t+"queueHooks";return be.get(e,n)||be.access(e,n,{empty:ie.Callbacks("once memory").add(function(){be.remove(e,[t+"queue",n])})})}}),ie.fn.extend({queue:function(e,t){var n=2;return"string"!=typeof e&&(t=e,e="fx",n--),arguments.length<n?ie.queue(this[0],e):void 0===t?this:this.each(function(){var n=ie.queue(this,e,t);ie._queueHooks(this,e),"fx"===e&&"inprogress"!==n[0]&&ie.dequeue(this,e)})},dequeue:function(e){return this.each(function(){ie.dequeue(this,e)})},clearQueue:function(e){return this.queue(e||"fx",[])},promise:function(e,t){var n,r=1,i=ie.Deferred(),o=this,s=this.length,a=function(){--r||i.resolveWith(o,[o])};for("string"!=typeof e&&(t=e,e=void 0),e=e||"fx";s--;)(n=be.get(o[s],e+"queueHooks"))&&n.empty&&(r++,n.empty.add(a));return a(),i.promise(t)}});var ke=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,Ee=new RegExp("^(?:([+-])=|)("+ke+")([a-z%]*)$","i"),Ne=["Top","Right","Bottom","Left"],Se=function(e,t){return e=t||e,"none"===ie.css(e,"display")||!ie.contains(e.ownerDocument,e)},je=/^(?:checkbox|radio)$/i,De=/<([\w:-]+)/,Ae=/^$|\/(?:java|ecma)script/i,qe={option:[1,"<select multiple='multiple'>","</select>"],thead:[1,"<table>","</table>"],col:[2,"<table><colgroup>","</colgroup></table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:[0,"",""]};qe.optgroup=qe.option,qe.tbody=qe.tfoot=qe.colgroup=qe.caption=qe.thead,qe.th=qe.td;var Le=/<|&#?\w+;/;!function(){var e=G.createDocumentFragment(),t=e.appendChild(G.createElement("div")),n=G.createElement("input");n.setAttribute("type","radio"),n.setAttribute("checked","checked"),n.setAttribute("name","t"),t.appendChild(n),re.checkClone=t.cloneNode(!0).cloneNode(!0).lastChild.checked,t.innerHTML="<textarea>x</textarea>",re.noCloneChecked=!!t.cloneNode(!0).lastChild.defaultValue}();var He=/^key/,Oe=/^(?:mouse|pointer|contextmenu|drag|drop)|click/,Fe=/^([^.]*)(?:\.(.+)|)/;ie.event={global:{},add:function(e,t,n,r,i){var o,s,a,u,l,c,f,p,d,h,g,v=be.get(e);if(v)for(n.handler&&(o=n,n=o.handler,i=o.selector),n.guid||(n.guid=ie.guid++),(u=v.events)||(u=v.events={}),(s=v.handle)||(s=v.handle=function(t){return void 0!==ie&&ie.event.triggered!==t.type?ie.event.dispatch.apply(e,arguments):void 0}),t=(t||"").match(ve)||[""],l=t.length;l--;)a=Fe.exec(t[l])||[],d=g=a[1],h=(a[2]||"").split(".").sort(),d&&(f=ie.event.special[d]||{},d=(i?f.delegateType:f.bindType)||d,f=ie.event.special[d]||{},c=ie.extend({type:d,origType:g,data:r,handler:n,guid:n.guid,selector:i,needsContext:i&&ie.expr.match.needsContext.test(i),namespace:h.join(".")},o),(p=u[d])||(p=u[d]=[],p.delegateCount=0,f.setup&&!1!==f.setup.call(e,r,h,s)||e.addEventListener&&e.addEventListener(d,s)),f.add&&(f.add.call(e,c),c.handler.guid||(c.handler.guid=n.guid)),i?p.splice(p.delegateCount++,0,c):p.push(c),ie.event.global[d]=!0)},remove:function(e,t,n,r,i){var o,s,a,u,l,c,f,p,d,h,g,v=be.hasData(e)&&be.get(e);if(v&&(u=v.events)){for(t=(t||"").match(ve)||[""],l=t.length;l--;)if(a=Fe.exec(t[l])||[],d=g=a[1],h=(a[2]||"").split(".").sort(),d){for(f=ie.event.special[d]||{},d=(r?f.delegateType:f.bindType)||d,p=u[d]||[],a=a[2]&&new RegExp("(^|\\.)"+h.join("\\.(?:.*\\.|)")+"(\\.|$)"),s=o=p.length;o--;)c=p[o],!i&&g!==c.origType||n&&n.guid!==c.guid||a&&!a.test(c.namespace)||r&&r!==c.selector&&("**"!==r||!c.selector)||(p.splice(o,1),c.selector&&p.delegateCount--,f.remove&&f.remove.call(e,c));s&&!p.length&&(f.teardown&&!1!==f.teardown.call(e,h,v.handle)||ie.removeEvent(e,d,v.handle),delete u[d])}else for(d in u)ie.event.remove(e,d+t[l],n,r,!0);ie.isEmptyObject(u)&&be.remove(e,"handle events")}},dispatch:function(e){e=ie.event.fix(e);var t,n,r,i,o,s=[],a=Q.call(arguments),u=(be.get(this,"events")||{})[e.type]||[],l=ie.event.special[e.type]||{};if(a[0]=e,e.delegateTarget=this,!l.preDispatch||!1!==l.preDispatch.call(this,e)){for(s=ie.event.handlers.call(this,e,u),t=0;(i=s[t++])&&!e.isPropagationStopped();)for(e.currentTarget=i.elem,n=0;(o=i.handlers[n++])&&!e.isImmediatePropagationStopped();)e.rnamespace&&!e.rnamespace.test(o.namespace)||(e.handleObj=o,e.data=o.data,void 0!==(r=((ie.event.special[o.origType]||{}).handle||o.handler).apply(i.elem,a))&&!1===(e.result=r)&&(e.preventDefault(),e.stopPropagation()));return l.postDispatch&&l.postDispatch.call(this,e),e.result}},handlers:function(e,t){var n,r,i,o,s=[],a=t.delegateCount,u=e.target;if(a&&u.nodeType&&("click"!==e.type||isNaN(e.button)||e.button<1))for(;u!==this;u=u.parentNode||this)if(1===u.nodeType&&(!0!==u.disabled||"click"!==e.type)){for(r=[],n=0;n<a;n++)o=t[n],i=o.selector+" ",void 0===r[i]&&(r[i]=o.needsContext?ie(i,this).index(u)>-1:ie.find(i,this,null,[u]).length),r[i]&&r.push(o);r.length&&s.push({elem:u,handlers:r})}return a<t.length&&s.push({elem:this,handlers:t.slice(a)}),s},props:"altKey bubbles cancelable ctrlKey currentTarget detail eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function(e,t){return null==e.which&&(e.which=null!=t.charCode?t.charCode:t.keyCode),e}},mouseHooks:{props:"button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(e,t){var n,r,i,o=t.button;return null==e.pageX&&null!=t.clientX&&(n=e.target.ownerDocument||G,r=n.documentElement,i=n.body,e.pageX=t.clientX+(r&&r.scrollLeft||i&&i.scrollLeft||0)-(r&&r.clientLeft||i&&i.clientLeft||0),e.pageY=t.clientY+(r&&r.scrollTop||i&&i.scrollTop||0)-(r&&r.clientTop||i&&i.clientTop||0)),e.which||void 0===o||(e.which=1&o?1:2&o?3:4&o?2:0),e}},fix:function(e){if(e[ie.expando])return e;var t,n,r,i=e.type,o=e,s=this.fixHooks[i];for(s||(this.fixHooks[i]=s=Oe.test(i)?this.mouseHooks:He.test(i)?this.keyHooks:{}),r=s.props?this.props.concat(s.props):this.props,e=new ie.Event(o),t=r.length;t--;)n=r[t],e[n]=o[n];return e.target||(e.target=G),3===e.target.nodeType&&(e.target=e.target.parentNode),s.filter?s.filter(e,o):e},special:{load:{noBubble:!0},focus:{trigger:function(){if(this!==g()&&this.focus)return this.focus(),!1},delegateType:"focusin"},blur:{trigger:function(){if(this===g()&&this.blur)return this.blur(),!1},delegateType:"focusout"},click:{trigger:function(){if("checkbox"===this.type&&this.click&&ie.nodeName(this,"input"))return this.click(),!1},_default:function(e){return ie.nodeName(e.target,"a")}},beforeunload:{postDispatch:function(e){void 0!==e.result&&e.originalEvent&&(e.originalEvent.returnValue=e.result)}}}},ie.removeEvent=function(e,t,n){e.removeEventListener&&e.removeEventListener(t,n)},ie.Event=function(e,t){if(!(this instanceof ie.Event))return new ie.Event(e,t);e&&e.type?(this.originalEvent=e,this.type=e.type,this.isDefaultPrevented=e.defaultPrevented||void 0===e.defaultPrevented&&!1===e.returnValue?d:h):this.type=e,t&&ie.extend(this,t),this.timeStamp=e&&e.timeStamp||ie.now(),this[ie.expando]=!0},ie.Event.prototype={constructor:ie.Event,isDefaultPrevented:h,isPropagationStopped:h,isImmediatePropagationStopped:h,isSimulated:!1,preventDefault:function(){var e=this.originalEvent;this.isDefaultPrevented=d,e&&!this.isSimulated&&e.preventDefault()},stopPropagation:function(){var e=this.originalEvent;this.isPropagationStopped=d,e&&!this.isSimulated&&e.stopPropagation()},stopImmediatePropagation:function(){var e=this.originalEvent;this.isImmediatePropagationStopped=d,e&&!this.isSimulated&&e.stopImmediatePropagation(),this.stopPropagation()}},ie.each({mouseenter:"mouseover",mouseleave:"mouseout",pointerenter:"pointerover",pointerleave:"pointerout"},function(e,t){ie.event.special[e]={delegateType:t,bindType:t,handle:function(e){var n,r=this,i=e.relatedTarget,o=e.handleObj;return i&&(i===r||ie.contains(r,i))||(e.type=o.origType,n=o.handler.apply(this,arguments),e.type=t),n}}}),ie.fn.extend({on:function(e,t,n,r){return v(this,e,t,n,r)},one:function(e,t,n,r){return v(this,e,t,n,r,1)},off:function(e,t,n){var r,i;if(e&&e.preventDefault&&e.handleObj)return r=e.handleObj,ie(e.delegateTarget).off(r.namespace?r.origType+"."+r.namespace:r.origType,r.selector,r.handler),this;if("object"==typeof e){for(i in e)this.off(i,t,e[i]);return this}return!1!==t&&"function"!=typeof t||(n=t,t=void 0),!1===n&&(n=h),this.each(function(){ie.event.remove(this,e,n,t)})}});var Pe=/<script|<style|<link/i,Re=/checked\s*(?:[^=]|=\s*.checked.)/i,Me=/^true\/(.*)/,Ie=/^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;ie.extend({htmlPrefilter:function(e){return e.replace(/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:-]+)[^>]*)\/>/gi,"<$1></$2>")},clone:function(e,t,n){var r,i,o,s,a=e.cloneNode(!0),u=ie.contains(e.ownerDocument,e);if(!(re.noCloneChecked||1!==e.nodeType&&11!==e.nodeType||ie.isXMLDoc(e)))for(s=c(a),o=c(e),r=0,i=o.length;r<i;r++)w(o[r],s[r]);if(t)if(n)for(o=o||c(e),s=s||c(a),r=0,i=o.length;r<i;r++)b(o[r],s[r]);else b(e,a);return s=c(a,"script"),s.length>0&&f(s,!u&&c(e,"script")),a},cleanData:function(e){for(var t,n,r,i=ie.event.special,o=0;void 0!==(n=e[o]);o++)if(xe(n)){if(t=n[be.expando]){if(t.events)for(r in t.events)i[r]?ie.event.remove(n,r):ie.removeEvent(n,r,t.handle);n[be.expando]=void 0}n[we.expando]&&(n[we.expando]=void 0)}}}),ie.fn.extend({domManip:T,detach:function(e){return C(this,e,!0)},remove:function(e){return C(this,e)},text:function(e){return ye(this,function(e){return void 0===e?ie.text(this):this.empty().each(function(){1!==this.nodeType&&11!==this.nodeType&&9!==this.nodeType||(this.textContent=e)})},null,e,arguments.length)},append:function(){return T(this,arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){m(this,e).appendChild(e)}})},prepend:function(){return T(this,arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var t=m(this,e);t.insertBefore(e,t.firstChild)}})},before:function(){return T(this,arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this)})},after:function(){return T(this,arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this.nextSibling)})},empty:function(){for(var e,t=0;null!=(e=this[t]);t++)1===e.nodeType&&(ie.cleanData(c(e,!1)),e.textContent="");return this},clone:function(e,t){return e=null!=e&&e,t=null==t?e:t,this.map(function(){return ie.clone(this,e,t)})},html:function(e){return ye(this,function(e){var t=this[0]||{},n=0,r=this.length;if(void 0===e&&1===t.nodeType)return t.innerHTML;if("string"==typeof e&&!Pe.test(e)&&!qe[(De.exec(e)||["",""])[1].toLowerCase()]){e=ie.htmlPrefilter(e);try{for(;n<r;n++)t=this[n]||{},1===t.nodeType&&(ie.cleanData(c(t,!1)),t.innerHTML=e);t=0}catch(e){}}t&&this.empty().append(e)},null,e,arguments.length)},replaceWith:function(){var e=[];return T(this,arguments,function(t){var n=this.parentNode;ie.inArray(this,e)<0&&(ie.cleanData(c(this)),n&&n.replaceChild(t,this))},e)}}),ie.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(e,t){ie.fn[e]=function(e){for(var n,r=[],i=ie(e),o=i.length-1,s=0;s<=o;s++)n=s===o?this:this.clone(!0),ie(i[s])[t](n),K.apply(r,n.get());return this.pushStack(r)}});var We,$e={HTML:"block",BODY:"block"},Be=/^margin/,_e=new RegExp("^("+ke+")(?!px)[a-z%]+$","i"),Xe=function(t){var n=t.ownerDocument.defaultView;return n&&n.opener||(n=e),n.getComputedStyle(t)},ze=function(e,t,n,r){var i,o,s={};for(o in t)s[o]=e.style[o],e.style[o]=t[o];i=n.apply(e,r||[]);for(o in t)e.style[o]=s[o];return i},Ue=G.documentElement;!function(){function t(){a.style.cssText="-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;position:relative;display:block;margin:auto;border:1px;padding:1px;top:1%;width:50%",a.innerHTML="",Ue.appendChild(s);var t=e.getComputedStyle(a);n="1%"!==t.top,o="2px"===t.marginLeft,r="4px"===t.width,a.style.marginRight="50%",i="4px"===t.marginRight,Ue.removeChild(s)}var n,r,i,o,s=G.createElement("div"),a=G.createElement("div");a.style&&(a.style.backgroundClip="content-box",a.cloneNode(!0).style.backgroundClip="",re.clearCloneStyle="content-box"===a.style.backgroundClip,s.style.cssText="border:0;width:8px;height:0;top:0;left:-9999px;padding:0;margin-top:1px;position:absolute",s.appendChild(a),ie.extend(re,{pixelPosition:function(){return t(),n},boxSizingReliable:function(){return null==r&&t(),r},pixelMarginRight:function(){return null==r&&t(),i},reliableMarginLeft:function(){return null==r&&t(),o},reliableMarginRight:function(){var t,n=a.appendChild(G.createElement("div"));return n.style.cssText=a.style.cssText="-webkit-box-sizing:content-box;box-sizing:content-box;display:block;margin:0;border:0;padding:0",n.style.marginRight=n.style.width="0",a.style.width="1px",Ue.appendChild(s),t=!parseFloat(e.getComputedStyle(n).marginRight),Ue.removeChild(s),a.removeChild(n),t}}))}();var Ve=/^(none|table(?!-c[ea]).+)/,Ye={position:"absolute",visibility:"hidden",display:"block"},Ge={letterSpacing:"0",fontWeight:"400"},Qe=["Webkit","O","Moz","ms"],Je=G.createElement("div").style;ie.extend({cssHooks:{opacity:{get:function(e,t){if(t){var n=N(e,"opacity");return""===n?"1":n}}}},cssNumber:{animationIterationCount:!0,columnCount:!0,fillOpacity:!0,flexGrow:!0,flexShrink:!0,fontWeight:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{float:"cssFloat"},style:function(e,t,n,r){if(e&&3!==e.nodeType&&8!==e.nodeType&&e.style){var i,o,s,a=ie.camelCase(t),u=e.style;if(t=ie.cssProps[a]||(ie.cssProps[a]=j(a)||a),s=ie.cssHooks[t]||ie.cssHooks[a],void 0===n)return s&&"get"in s&&void 0!==(i=s.get(e,!1,r))?i:u[t];o=typeof n,"string"===o&&(i=Ee.exec(n))&&i[1]&&(n=l(e,t,i),o="number"),null!=n&&n===n&&("number"===o&&(n+=i&&i[3]||(ie.cssNumber[a]?"":"px")),re.clearCloneStyle||""!==n||0!==t.indexOf("background")||(u[t]="inherit"),s&&"set"in s&&void 0===(n=s.set(e,n,r))||(u[t]=n))}},css:function(e,t,n,r){var i,o,s,a=ie.camelCase(t);return t=ie.cssProps[a]||(ie.cssProps[a]=j(a)||a),s=ie.cssHooks[t]||ie.cssHooks[a],s&&"get"in s&&(i=s.get(e,!0,n)),void 0===i&&(i=N(e,t,r)),"normal"===i&&t in Ge&&(i=Ge[t]),""===n||n?(o=parseFloat(i),!0===n||isFinite(o)?o||0:i):i}}),ie.each(["height","width"],function(e,t){ie.cssHooks[t]={get:function(e,n,r){if(n)return Ve.test(ie.css(e,"display"))&&0===e.offsetWidth?ze(e,Ye,function(){return q(e,t,r)}):q(e,t,r)},set:function(e,n,r){var i,o=r&&Xe(e),s=r&&A(e,t,r,"border-box"===ie.css(e,"boxSizing",!1,o),o);return s&&(i=Ee.exec(n))&&"px"!==(i[3]||"px")&&(e.style[t]=n,n=ie.css(e,t)),D(e,n,s)}}}),ie.cssHooks.marginLeft=S(re.reliableMarginLeft,function(e,t){if(t)return(parseFloat(N(e,"marginLeft"))||e.getBoundingClientRect().left-ze(e,{marginLeft:0},function(){return e.getBoundingClientRect().left}))+"px"}),ie.cssHooks.marginRight=S(re.reliableMarginRight,function(e,t){if(t)return ze(e,{display:"inline-block"},N,[e,"marginRight"])}),ie.each({margin:"",padding:"",border:"Width"},function(e,t){ie.cssHooks[e+t]={expand:function(n){for(var r=0,i={},o="string"==typeof n?n.split(" "):[n];r<4;r++)i[e+Ne[r]+t]=o[r]||o[r-2]||o[0];return i}},Be.test(e)||(ie.cssHooks[e+t].set=D)}),ie.fn.extend({css:function(e,t){return ye(this,function(e,t,n){var r,i,o={},s=0;if(ie.isArray(t)){for(r=Xe(e),i=t.length;s<i;s++)o[t[s]]=ie.css(e,t[s],!1,r);return o}return void 0!==n?ie.style(e,t,n):ie.css(e,t)},e,t,arguments.length>1)},show:function(){return L(this,!0)},hide:function(){return L(this)},toggle:function(e){return"boolean"==typeof e?e?this.show():this.hide():this.each(function(){Se(this)?ie(this).show():ie(this).hide()})}}),ie.Tween=H,H.prototype={constructor:H,init:function(e,t,n,r,i,o){this.elem=e,this.prop=n,this.easing=i||ie.easing._default,this.options=t,this.start=this.now=this.cur(),this.end=r,this.unit=o||(ie.cssNumber[n]?"":"px")},cur:function(){var e=H.propHooks[this.prop];return e&&e.get?e.get(this):H.propHooks._default.get(this)},run:function(e){var t,n=H.propHooks[this.prop];return this.options.duration?this.pos=t=ie.easing[this.easing](e,this.options.duration*e,0,1,this.options.duration):this.pos=t=e,this.now=(this.end-this.start)*t+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),n&&n.set?n.set(this):H.propHooks._default.set(this),this}},H.prototype.init.prototype=H.prototype,H.propHooks={_default:{get:function(e){var t;return 1!==e.elem.nodeType||null!=e.elem[e.prop]&&null==e.elem.style[e.prop]?e.elem[e.prop]:(t=ie.css(e.elem,e.prop,""),t&&"auto"!==t?t:0)},set:function(e){ie.fx.step[e.prop]?ie.fx.step[e.prop](e):1!==e.elem.nodeType||null==e.elem.style[ie.cssProps[e.prop]]&&!ie.cssHooks[e.prop]?e.elem[e.prop]=e.now:ie.style(e.elem,e.prop,e.now+e.unit)}}},H.propHooks.scrollTop=H.propHooks.scrollLeft={set:function(e){e.elem.nodeType&&e.elem.parentNode&&(e.elem[e.prop]=e.now)}},ie.easing={linear:function(e){return e},swing:function(e){return.5-Math.cos(e*Math.PI)/2},_default:"swing"},ie.fx=H.prototype.init,ie.fx.step={};var Ke,Ze,et=/^(?:toggle|show|hide)$/,tt=/queueHooks$/;ie.Animation=ie.extend(I,{tweeners:{"*":[function(e,t){var n=this.createTween(e,t);return l(n.elem,e,Ee.exec(t),n),n}]},tweener:function(e,t){ie.isFunction(e)?(t=e,e=["*"]):e=e.match(ve);for(var n,r=0,i=e.length;r<i;r++)n=e[r],I.tweeners[n]=I.tweeners[n]||[],I.tweeners[n].unshift(t)},prefilters:[R],prefilter:function(e,t){t?I.prefilters.unshift(e):I.prefilters.push(e)}}),ie.speed=function(e,t,n){var r=e&&"object"==typeof e?ie.extend({},e):{complete:n||!n&&t||ie.isFunction(e)&&e,duration:e,easing:n&&t||t&&!ie.isFunction(t)&&t};return r.duration=ie.fx.off?0:"number"==typeof r.duration?r.duration:r.duration in ie.fx.speeds?ie.fx.speeds[r.duration]:ie.fx.speeds._default,null!=r.queue&&!0!==r.queue||(r.queue="fx"),r.old=r.complete,r.complete=function(){ie.isFunction(r.old)&&r.old.call(this),r.queue&&ie.dequeue(this,r.queue)},r},ie.fn.extend({fadeTo:function(e,t,n,r){return this.filter(Se).css("opacity",0).show().end().animate({opacity:t},e,n,r)},animate:function(e,t,n,r){var i=ie.isEmptyObject(e),o=ie.speed(t,n,r),s=function(){var t=I(this,ie.extend({},e),o);(i||be.get(this,"finish"))&&t.stop(!0)};return s.finish=s,i||!1===o.queue?this.each(s):this.queue(o.queue,s)},stop:function(e,t,n){var r=function(e){var t=e.stop;delete e.stop,t(n)};return"string"!=typeof e&&(n=t,t=e,e=void 0),t&&!1!==e&&this.queue(e||"fx",[]),this.each(function(){var t=!0,i=null!=e&&e+"queueHooks",o=ie.timers,s=be.get(this);if(i)s[i]&&s[i].stop&&r(s[i]);else for(i in s)s[i]&&s[i].stop&&tt.test(i)&&r(s[i]);for(i=o.length;i--;)o[i].elem!==this||null!=e&&o[i].queue!==e||(o[i].anim.stop(n),t=!1,o.splice(i,1));!t&&n||ie.dequeue(this,e)})},finish:function(e){return!1!==e&&(e=e||"fx"),this.each(function(){var t,n=be.get(this),r=n[e+"queue"],i=n[e+"queueHooks"],o=ie.timers,s=r?r.length:0;for(n.finish=!0,ie.queue(this,e,[]),i&&i.stop&&i.stop.call(this,!0),t=o.length;t--;)o[t].elem===this&&o[t].queue===e&&(o[t].anim.stop(!0),o.splice(t,1));for(t=0;t<s;t++)r[t]&&r[t].finish&&r[t].finish.call(this);delete n.finish})}}),ie.each(["toggle","show","hide"],function(e,t){var n=ie.fn[t];ie.fn[t]=function(e,r,i){return null==e||"boolean"==typeof e?n.apply(this,arguments):this.animate(F(t,!0),e,r,i)}}),ie.each({slideDown:F("show"),slideUp:F("hide"),slideToggle:F("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(e,t){ie.fn[e]=function(e,n,r){return this.animate(t,e,n,r)}}),ie.timers=[],ie.fx.tick=function(){var e,t=0,n=ie.timers;for(Ke=ie.now();t<n.length;t++)(e=n[t])()||n[t]!==e||n.splice(t--,1);n.length||ie.fx.stop(),Ke=void 0},ie.fx.timer=function(e){ie.timers.push(e),e()?ie.fx.start():ie.timers.pop()},ie.fx.interval=13,ie.fx.start=function(){
Ze||(Ze=e.setInterval(ie.fx.tick,ie.fx.interval))},ie.fx.stop=function(){e.clearInterval(Ze),Ze=null},ie.fx.speeds={slow:600,fast:200,_default:400},ie.fn.delay=function(t,n){return t=ie.fx?ie.fx.speeds[t]||t:t,n=n||"fx",this.queue(n,function(n,r){var i=e.setTimeout(n,t);r.stop=function(){e.clearTimeout(i)}})},function(){var e=G.createElement("input"),t=G.createElement("select"),n=t.appendChild(G.createElement("option"));e.type="checkbox",re.checkOn=""!==e.value,re.optSelected=n.selected,t.disabled=!0,re.optDisabled=!n.disabled,e=G.createElement("input"),e.value="t",e.type="radio",re.radioValue="t"===e.value}();var nt,rt=ie.expr.attrHandle;ie.fn.extend({attr:function(e,t){return ye(this,ie.attr,e,t,arguments.length>1)},removeAttr:function(e){return this.each(function(){ie.removeAttr(this,e)})}}),ie.extend({attr:function(e,t,n){var r,i,o=e.nodeType;if(3!==o&&8!==o&&2!==o)return void 0===e.getAttribute?ie.prop(e,t,n):(1===o&&ie.isXMLDoc(e)||(t=t.toLowerCase(),i=ie.attrHooks[t]||(ie.expr.match.bool.test(t)?nt:void 0)),void 0!==n?null===n?void ie.removeAttr(e,t):i&&"set"in i&&void 0!==(r=i.set(e,n,t))?r:(e.setAttribute(t,n+""),n):i&&"get"in i&&null!==(r=i.get(e,t))?r:(r=ie.find.attr(e,t),null==r?void 0:r))},attrHooks:{type:{set:function(e,t){if(!re.radioValue&&"radio"===t&&ie.nodeName(e,"input")){var n=e.value;return e.setAttribute("type",t),n&&(e.value=n),t}}}},removeAttr:function(e,t){var n,r,i=0,o=t&&t.match(ve);if(o&&1===e.nodeType)for(;n=o[i++];)r=ie.propFix[n]||n,ie.expr.match.bool.test(n)&&(e[r]=!1),e.removeAttribute(n)}}),nt={set:function(e,t,n){return!1===t?ie.removeAttr(e,n):e.setAttribute(n,n),n}},ie.each(ie.expr.match.bool.source.match(/\w+/g),function(e,t){var n=rt[t]||ie.find.attr;rt[t]=function(e,t,r){var i,o;return r||(o=rt[t],rt[t]=i,i=null!=n(e,t,r)?t.toLowerCase():null,rt[t]=o),i}});var it=/^(?:input|select|textarea|button)$/i,ot=/^(?:a|area)$/i;ie.fn.extend({prop:function(e,t){return ye(this,ie.prop,e,t,arguments.length>1)},removeProp:function(e){return this.each(function(){delete this[ie.propFix[e]||e]})}}),ie.extend({prop:function(e,t,n){var r,i,o=e.nodeType;if(3!==o&&8!==o&&2!==o)return 1===o&&ie.isXMLDoc(e)||(t=ie.propFix[t]||t,i=ie.propHooks[t]),void 0!==n?i&&"set"in i&&void 0!==(r=i.set(e,n,t))?r:e[t]=n:i&&"get"in i&&null!==(r=i.get(e,t))?r:e[t]},propHooks:{tabIndex:{get:function(e){var t=ie.find.attr(e,"tabindex");return t?parseInt(t,10):it.test(e.nodeName)||ot.test(e.nodeName)&&e.href?0:-1}}},propFix:{for:"htmlFor",class:"className"}}),re.optSelected||(ie.propHooks.selected={get:function(e){var t=e.parentNode;return t&&t.parentNode&&t.parentNode.selectedIndex,null},set:function(e){var t=e.parentNode;t&&(t.selectedIndex,t.parentNode&&t.parentNode.selectedIndex)}}),ie.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){ie.propFix[this.toLowerCase()]=this});ie.fn.extend({addClass:function(e){var t,n,r,i,o,s,a,u=0;if(ie.isFunction(e))return this.each(function(t){ie(this).addClass(e.call(this,t,W(this)))});if("string"==typeof e&&e)for(t=e.match(ve)||[];n=this[u++];)if(i=W(n),r=1===n.nodeType&&(" "+i+" ").replace(/[\t\r\n\f]/g," ")){for(s=0;o=t[s++];)r.indexOf(" "+o+" ")<0&&(r+=o+" ");a=ie.trim(r),i!==a&&n.setAttribute("class",a)}return this},removeClass:function(e){var t,n,r,i,o,s,a,u=0;if(ie.isFunction(e))return this.each(function(t){ie(this).removeClass(e.call(this,t,W(this)))});if(!arguments.length)return this.attr("class","");if("string"==typeof e&&e)for(t=e.match(ve)||[];n=this[u++];)if(i=W(n),r=1===n.nodeType&&(" "+i+" ").replace(/[\t\r\n\f]/g," ")){for(s=0;o=t[s++];)for(;r.indexOf(" "+o+" ")>-1;)r=r.replace(" "+o+" "," ");a=ie.trim(r),i!==a&&n.setAttribute("class",a)}return this},toggleClass:function(e,t){var n=typeof e;return"boolean"==typeof t&&"string"===n?t?this.addClass(e):this.removeClass(e):ie.isFunction(e)?this.each(function(n){ie(this).toggleClass(e.call(this,n,W(this),t),t)}):this.each(function(){var t,r,i,o;if("string"===n)for(r=0,i=ie(this),o=e.match(ve)||[];t=o[r++];)i.hasClass(t)?i.removeClass(t):i.addClass(t);else void 0!==e&&"boolean"!==n||(t=W(this),t&&be.set(this,"__className__",t),this.setAttribute&&this.setAttribute("class",t||!1===e?"":be.get(this,"__className__")||""))})},hasClass:function(e){var t,n,r=0;for(t=" "+e+" ";n=this[r++];)if(1===n.nodeType&&(" "+W(n)+" ").replace(/[\t\r\n\f]/g," ").indexOf(t)>-1)return!0;return!1}});ie.fn.extend({val:function(e){var t,n,r,i=this[0];{if(arguments.length)return r=ie.isFunction(e),this.each(function(n){var i;1===this.nodeType&&(i=r?e.call(this,n,ie(this).val()):e,null==i?i="":"number"==typeof i?i+="":ie.isArray(i)&&(i=ie.map(i,function(e){return null==e?"":e+""})),(t=ie.valHooks[this.type]||ie.valHooks[this.nodeName.toLowerCase()])&&"set"in t&&void 0!==t.set(this,i,"value")||(this.value=i))});if(i)return(t=ie.valHooks[i.type]||ie.valHooks[i.nodeName.toLowerCase()])&&"get"in t&&void 0!==(n=t.get(i,"value"))?n:(n=i.value,"string"==typeof n?n.replace(/\r/g,""):null==n?"":n)}}}),ie.extend({valHooks:{option:{get:function(e){var t=ie.find.attr(e,"value");return null!=t?t:ie.trim(ie.text(e)).replace(/[\x20\t\r\n\f]+/g," ")}},select:{get:function(e){for(var t,n,r=e.options,i=e.selectedIndex,o="select-one"===e.type||i<0,s=o?null:[],a=o?i+1:r.length,u=i<0?a:o?i:0;u<a;u++)if(n=r[u],(n.selected||u===i)&&(re.optDisabled?!n.disabled:null===n.getAttribute("disabled"))&&(!n.parentNode.disabled||!ie.nodeName(n.parentNode,"optgroup"))){if(t=ie(n).val(),o)return t;s.push(t)}return s},set:function(e,t){for(var n,r,i=e.options,o=ie.makeArray(t),s=i.length;s--;)r=i[s],(r.selected=ie.inArray(ie.valHooks.option.get(r),o)>-1)&&(n=!0);return n||(e.selectedIndex=-1),o}}}}),ie.each(["radio","checkbox"],function(){ie.valHooks[this]={set:function(e,t){if(ie.isArray(t))return e.checked=ie.inArray(ie(e).val(),t)>-1}},re.checkOn||(ie.valHooks[this].get=function(e){return null===e.getAttribute("value")?"on":e.value})});var st=/^(?:focusinfocus|focusoutblur)$/;ie.extend(ie.event,{trigger:function(t,n,r,i){var o,s,a,u,l,c,f,p=[r||G],d=ne.call(t,"type")?t.type:t,h=ne.call(t,"namespace")?t.namespace.split("."):[];if(s=a=r=r||G,3!==r.nodeType&&8!==r.nodeType&&!st.test(d+ie.event.triggered)&&(d.indexOf(".")>-1&&(h=d.split("."),d=h.shift(),h.sort()),l=d.indexOf(":")<0&&"on"+d,t=t[ie.expando]?t:new ie.Event(d,"object"==typeof t&&t),t.isTrigger=i?2:3,t.namespace=h.join("."),t.rnamespace=t.namespace?new RegExp("(^|\\.)"+h.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,t.result=void 0,t.target||(t.target=r),n=null==n?[t]:ie.makeArray(n,[t]),f=ie.event.special[d]||{},i||!f.trigger||!1!==f.trigger.apply(r,n))){if(!i&&!f.noBubble&&!ie.isWindow(r)){for(u=f.delegateType||d,st.test(u+d)||(s=s.parentNode);s;s=s.parentNode)p.push(s),a=s;a===(r.ownerDocument||G)&&p.push(a.defaultView||a.parentWindow||e)}for(o=0;(s=p[o++])&&!t.isPropagationStopped();)t.type=o>1?u:f.bindType||d,c=(be.get(s,"events")||{})[t.type]&&be.get(s,"handle"),c&&c.apply(s,n),(c=l&&s[l])&&c.apply&&xe(s)&&(t.result=c.apply(s,n),!1===t.result&&t.preventDefault());return t.type=d,i||t.isDefaultPrevented()||f._default&&!1!==f._default.apply(p.pop(),n)||!xe(r)||l&&ie.isFunction(r[d])&&!ie.isWindow(r)&&(a=r[l],a&&(r[l]=null),ie.event.triggered=d,r[d](),ie.event.triggered=void 0,a&&(r[l]=a)),t.result}},simulate:function(e,t,n){var r=ie.extend(new ie.Event,n,{type:e,isSimulated:!0});ie.event.trigger(r,null,t)}}),ie.fn.extend({trigger:function(e,t){return this.each(function(){ie.event.trigger(e,t,this)})},triggerHandler:function(e,t){var n=this[0];if(n)return ie.event.trigger(e,t,n,!0)}}),ie.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),function(e,t){ie.fn[t]=function(e,n){return arguments.length>0?this.on(t,null,e,n):this.trigger(t)}}),ie.fn.extend({hover:function(e,t){return this.mouseenter(e).mouseleave(t||e)}}),re.focusin="onfocusin"in e,re.focusin||ie.each({focus:"focusin",blur:"focusout"},function(e,t){var n=function(e){ie.event.simulate(t,e.target,ie.event.fix(e))};ie.event.special[t]={setup:function(){var r=this.ownerDocument||this,i=be.access(r,t);i||r.addEventListener(e,n,!0),be.access(r,t,(i||0)+1)},teardown:function(){var r=this.ownerDocument||this,i=be.access(r,t)-1;i?be.access(r,t,i):(r.removeEventListener(e,n,!0),be.remove(r,t))}}});var at=e.location,ut=ie.now(),lt=/\?/;ie.parseJSON=function(e){return JSON.parse(e+"")},ie.parseXML=function(t){var n;if(!t||"string"!=typeof t)return null;try{n=(new e.DOMParser).parseFromString(t,"text/xml")}catch(e){n=void 0}return n&&!n.getElementsByTagName("parsererror").length||ie.error("Invalid XML: "+t),n};var ct=/([?&])_=[^&]*/,ft=/^(.*?):[ \t]*([^\r\n]*)$/gm,pt=/^(?:about|app|app-storage|.+-extension|file|res|widget):$/,dt=/^(?:GET|HEAD)$/,ht={},gt={},vt="*/".concat("*"),mt=G.createElement("a");mt.href=at.href,ie.extend({active:0,lastModified:{},etag:{},ajaxSettings:{url:at.href,type:"GET",isLocal:pt.test(at.protocol),global:!0,processData:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",accepts:{"*":vt,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/\bxml\b/,html:/\bhtml/,json:/\bjson\b/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"},converters:{"* text":String,"text html":!0,"text json":ie.parseJSON,"text xml":ie.parseXML},flatOptions:{url:!0,context:!0}},ajaxSetup:function(e,t){return t?_(_(e,ie.ajaxSettings),t):_(ie.ajaxSettings,e)},ajaxPrefilter:$(ht),ajaxTransport:$(gt),ajax:function(t,n){function r(t,n,r,a){var l,f,y,x,w,C=n;2!==b&&(b=2,u&&e.clearTimeout(u),i=void 0,s=a||"",T.readyState=t>0?4:0,l=t>=200&&t<300||304===t,r&&(x=X(p,T,r)),x=z(p,x,T,l),l?(p.ifModified&&(w=T.getResponseHeader("Last-Modified"),w&&(ie.lastModified[o]=w),(w=T.getResponseHeader("etag"))&&(ie.etag[o]=w)),204===t||"HEAD"===p.type?C="nocontent":304===t?C="notmodified":(C=x.state,f=x.data,y=x.error,l=!y)):(y=C,!t&&C||(C="error",t<0&&(t=0))),T.status=t,T.statusText=(n||C)+"",l?g.resolveWith(d,[f,C,T]):g.rejectWith(d,[T,C,y]),T.statusCode(m),m=void 0,c&&h.trigger(l?"ajaxSuccess":"ajaxError",[T,p,l?f:y]),v.fireWith(d,[T,C]),c&&(h.trigger("ajaxComplete",[T,p]),--ie.active||ie.event.trigger("ajaxStop")))}"object"==typeof t&&(n=t,t=void 0),n=n||{};var i,o,s,a,u,l,c,f,p=ie.ajaxSetup({},n),d=p.context||p,h=p.context&&(d.nodeType||d.jquery)?ie(d):ie.event,g=ie.Deferred(),v=ie.Callbacks("once memory"),m=p.statusCode||{},y={},x={},b=0,w="canceled",T={readyState:0,getResponseHeader:function(e){var t;if(2===b){if(!a)for(a={};t=ft.exec(s);)a[t[1].toLowerCase()]=t[2];t=a[e.toLowerCase()]}return null==t?null:t},getAllResponseHeaders:function(){return 2===b?s:null},setRequestHeader:function(e,t){var n=e.toLowerCase();return b||(e=x[n]=x[n]||e,y[e]=t),this},overrideMimeType:function(e){return b||(p.mimeType=e),this},statusCode:function(e){var t;if(e)if(b<2)for(t in e)m[t]=[m[t],e[t]];else T.always(e[T.status]);return this},abort:function(e){var t=e||w;return i&&i.abort(t),r(0,t),this}};if(g.promise(T).complete=v.add,T.success=T.done,T.error=T.fail,p.url=((t||p.url||at.href)+"").replace(/#.*$/,"").replace(/^\/\//,at.protocol+"//"),p.type=n.method||n.type||p.method||p.type,p.dataTypes=ie.trim(p.dataType||"*").toLowerCase().match(ve)||[""],null==p.crossDomain){l=G.createElement("a");try{l.href=p.url,l.href=l.href,p.crossDomain=mt.protocol+"//"+mt.host!=l.protocol+"//"+l.host}catch(e){p.crossDomain=!0}}if(p.data&&p.processData&&"string"!=typeof p.data&&(p.data=ie.param(p.data,p.traditional)),B(ht,p,n,T),2===b)return T;c=ie.event&&p.global,c&&0==ie.active++&&ie.event.trigger("ajaxStart"),p.type=p.type.toUpperCase(),p.hasContent=!dt.test(p.type),o=p.url,p.hasContent||(p.data&&(o=p.url+=(lt.test(o)?"&":"?")+p.data,delete p.data),!1===p.cache&&(p.url=ct.test(o)?o.replace(ct,"$1_="+ut++):o+(lt.test(o)?"&":"?")+"_="+ut++)),p.ifModified&&(ie.lastModified[o]&&T.setRequestHeader("If-Modified-Since",ie.lastModified[o]),ie.etag[o]&&T.setRequestHeader("If-None-Match",ie.etag[o])),(p.data&&p.hasContent&&!1!==p.contentType||n.contentType)&&T.setRequestHeader("Content-Type",p.contentType),T.setRequestHeader("Accept",p.dataTypes[0]&&p.accepts[p.dataTypes[0]]?p.accepts[p.dataTypes[0]]+("*"!==p.dataTypes[0]?", "+vt+"; q=0.01":""):p.accepts["*"]);for(f in p.headers)T.setRequestHeader(f,p.headers[f]);if(p.beforeSend&&(!1===p.beforeSend.call(d,T,p)||2===b))return T.abort();w="abort";for(f in{success:1,error:1,complete:1})T[f](p[f]);if(i=B(gt,p,n,T)){if(T.readyState=1,c&&h.trigger("ajaxSend",[T,p]),2===b)return T;p.async&&p.timeout>0&&(u=e.setTimeout(function(){T.abort("timeout")},p.timeout));try{b=1,i.send(y,r)}catch(e){if(!(b<2))throw e;r(-1,e)}}else r(-1,"No Transport");return T},getJSON:function(e,t,n){return ie.get(e,t,n,"json")},getScript:function(e,t){return ie.get(e,void 0,t,"script")}}),ie.each(["get","post"],function(e,t){ie[t]=function(e,n,r,i){return ie.isFunction(n)&&(i=i||r,r=n,n=void 0),ie.ajax(ie.extend({url:e,type:t,dataType:i,data:n,success:r},ie.isPlainObject(e)&&e))}}),ie._evalUrl=function(e){return ie.ajax({url:e,type:"GET",dataType:"script",async:!1,global:!1,throws:!0})},ie.fn.extend({wrapAll:function(e){var t;return ie.isFunction(e)?this.each(function(t){ie(this).wrapAll(e.call(this,t))}):(this[0]&&(t=ie(e,this[0].ownerDocument).eq(0).clone(!0),this[0].parentNode&&t.insertBefore(this[0]),t.map(function(){for(var e=this;e.firstElementChild;)e=e.firstElementChild;return e}).append(this)),this)},wrapInner:function(e){return ie.isFunction(e)?this.each(function(t){ie(this).wrapInner(e.call(this,t))}):this.each(function(){var t=ie(this),n=t.contents();n.length?n.wrapAll(e):t.append(e)})},wrap:function(e){var t=ie.isFunction(e);return this.each(function(n){ie(this).wrapAll(t?e.call(this,n):e)})},unwrap:function(){return this.parent().each(function(){ie.nodeName(this,"body")||ie(this).replaceWith(this.childNodes)}).end()}}),ie.expr.filters.hidden=function(e){return!ie.expr.filters.visible(e)},ie.expr.filters.visible=function(e){return e.offsetWidth>0||e.offsetHeight>0||e.getClientRects().length>0};var yt=/\[\]$/,xt=/^(?:submit|button|image|reset|file)$/i,bt=/^(?:input|select|textarea|keygen)/i;ie.param=function(e,t){var n,r=[],i=function(e,t){t=ie.isFunction(t)?t():null==t?"":t,r[r.length]=encodeURIComponent(e)+"="+encodeURIComponent(t)};if(void 0===t&&(t=ie.ajaxSettings&&ie.ajaxSettings.traditional),ie.isArray(e)||e.jquery&&!ie.isPlainObject(e))ie.each(e,function(){i(this.name,this.value)});else for(n in e)U(n,e[n],t,i);return r.join("&").replace(/%20/g,"+")},ie.fn.extend({serialize:function(){return ie.param(this.serializeArray())},serializeArray:function(){return this.map(function(){var e=ie.prop(this,"elements");return e?ie.makeArray(e):this}).filter(function(){var e=this.type;return this.name&&!ie(this).is(":disabled")&&bt.test(this.nodeName)&&!xt.test(e)&&(this.checked||!je.test(e))}).map(function(e,t){var n=ie(this).val();return null==n?null:ie.isArray(n)?ie.map(n,function(e){return{name:t.name,value:e.replace(/\r?\n/g,"\r\n")}}):{name:t.name,value:n.replace(/\r?\n/g,"\r\n")}}).get()}}),ie.ajaxSettings.xhr=function(){try{return new e.XMLHttpRequest}catch(e){}};var wt={0:200,1223:204},Tt=ie.ajaxSettings.xhr();re.cors=!!Tt&&"withCredentials"in Tt,re.ajax=Tt=!!Tt,ie.ajaxTransport(function(t){var n,r;if(re.cors||Tt&&!t.crossDomain)return{send:function(i,o){var s,a=t.xhr();if(a.open(t.type,t.url,t.async,t.username,t.password),t.xhrFields)for(s in t.xhrFields)a[s]=t.xhrFields[s];t.mimeType&&a.overrideMimeType&&a.overrideMimeType(t.mimeType),t.crossDomain||i["X-Requested-With"]||(i["X-Requested-With"]="XMLHttpRequest");for(s in i)a.setRequestHeader(s,i[s]);n=function(e){return function(){n&&(n=r=a.onload=a.onerror=a.onabort=a.onreadystatechange=null,"abort"===e?a.abort():"error"===e?"number"!=typeof a.status?o(0,"error"):o(a.status,a.statusText):o(wt[a.status]||a.status,a.statusText,"text"!==(a.responseType||"text")||"string"!=typeof a.responseText?{binary:a.response}:{text:a.responseText},a.getAllResponseHeaders()))}},a.onload=n(),r=a.onerror=n("error"),void 0!==a.onabort?a.onabort=r:a.onreadystatechange=function(){4===a.readyState&&e.setTimeout(function(){n&&r()})},n=n("abort");try{a.send(t.hasContent&&t.data||null)}catch(e){if(n)throw e}},abort:function(){n&&n()}}}),ie.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/\b(?:java|ecma)script\b/},converters:{"text script":function(e){return ie.globalEval(e),e}}}),ie.ajaxPrefilter("script",function(e){void 0===e.cache&&(e.cache=!1),e.crossDomain&&(e.type="GET")}),ie.ajaxTransport("script",function(e){if(e.crossDomain){var t,n;return{send:function(r,i){t=ie("<script>").prop({charset:e.scriptCharset,src:e.url}).on("load error",n=function(e){t.remove(),n=null,e&&i("error"===e.type?404:200,e.type)}),G.head.appendChild(t[0])},abort:function(){n&&n()}}}});var Ct=[],kt=/(=)\?(?=&|$)|\?\?/;ie.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var e=Ct.pop()||ie.expando+"_"+ut++;return this[e]=!0,e}}),ie.ajaxPrefilter("json jsonp",function(t,n,r){var i,o,s,a=!1!==t.jsonp&&(kt.test(t.url)?"url":"string"==typeof t.data&&0===(t.contentType||"").indexOf("application/x-www-form-urlencoded")&&kt.test(t.data)&&"data");if(a||"jsonp"===t.dataTypes[0])return i=t.jsonpCallback=ie.isFunction(t.jsonpCallback)?t.jsonpCallback():t.jsonpCallback,a?t[a]=t[a].replace(kt,"$1"+i):!1!==t.jsonp&&(t.url+=(lt.test(t.url)?"&":"?")+t.jsonp+"="+i),t.converters["script json"]=function(){return s||ie.error(i+" was not called"),s[0]},t.dataTypes[0]="json",o=e[i],e[i]=function(){s=arguments},r.always(function(){void 0===o?ie(e).removeProp(i):e[i]=o,t[i]&&(t.jsonpCallback=n.jsonpCallback,Ct.push(i)),s&&ie.isFunction(o)&&o(s[0]),s=o=void 0}),"script"}),ie.parseHTML=function(e,t,n){if(!e||"string"!=typeof e)return null;"boolean"==typeof t&&(n=t,t=!1),t=t||G;var r=ce.exec(e),i=!n&&[];return r?[t.createElement(r[1])]:(r=p([e],t,i),i&&i.length&&ie(i).remove(),ie.merge([],r.childNodes))};var Et=ie.fn.load;ie.fn.load=function(e,t,n){if("string"!=typeof e&&Et)return Et.apply(this,arguments);var r,i,o,s=this,a=e.indexOf(" ");return a>-1&&(r=ie.trim(e.slice(a)),e=e.slice(0,a)),ie.isFunction(t)?(n=t,t=void 0):t&&"object"==typeof t&&(i="POST"),s.length>0&&ie.ajax({url:e,type:i||"GET",dataType:"html",data:t}).done(function(e){o=arguments,s.html(r?ie("<div>").append(ie.parseHTML(e)).find(r):e)}).always(n&&function(e,t){s.each(function(){n.apply(this,o||[e.responseText,t,e])})}),this},ie.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(e,t){ie.fn[t]=function(e){return this.on(t,e)}}),ie.expr.filters.animated=function(e){return ie.grep(ie.timers,function(t){return e===t.elem}).length},ie.offset={setOffset:function(e,t,n){var r,i,o,s,a,u,l,c=ie.css(e,"position"),f=ie(e),p={};"static"===c&&(e.style.position="relative"),a=f.offset(),o=ie.css(e,"top"),u=ie.css(e,"left"),l=("absolute"===c||"fixed"===c)&&(o+u).indexOf("auto")>-1,l?(r=f.position(),s=r.top,i=r.left):(s=parseFloat(o)||0,i=parseFloat(u)||0),ie.isFunction(t)&&(t=t.call(e,n,ie.extend({},a))),null!=t.top&&(p.top=t.top-a.top+s),null!=t.left&&(p.left=t.left-a.left+i),"using"in t?t.using.call(e,p):f.css(p)}},ie.fn.extend({offset:function(e){if(arguments.length)return void 0===e?this:this.each(function(t){ie.offset.setOffset(this,e,t)});var t,n,r=this[0],i={top:0,left:0},o=r&&r.ownerDocument;if(o)return t=o.documentElement,ie.contains(t,r)?(i=r.getBoundingClientRect(),n=V(o),{top:i.top+n.pageYOffset-t.clientTop,left:i.left+n.pageXOffset-t.clientLeft}):i},position:function(){if(this[0]){var e,t,n=this[0],r={top:0,left:0};return"fixed"===ie.css(n,"position")?t=n.getBoundingClientRect():(e=this.offsetParent(),t=this.offset(),ie.nodeName(e[0],"html")||(r=e.offset()),r.top+=ie.css(e[0],"borderTopWidth",!0),r.left+=ie.css(e[0],"borderLeftWidth",!0)),{top:t.top-r.top-ie.css(n,"marginTop",!0),left:t.left-r.left-ie.css(n,"marginLeft",!0)}}},offsetParent:function(){return this.map(function(){for(var e=this.offsetParent;e&&"static"===ie.css(e,"position");)e=e.offsetParent;return e||Ue})}}),ie.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(e,t){var n="pageYOffset"===t;ie.fn[e]=function(r){return ye(this,function(e,r,i){var o=V(e);if(void 0===i)return o?o[t]:e[r];o?o.scrollTo(n?o.pageXOffset:i,n?i:o.pageYOffset):e[r]=i},e,r,arguments.length)}}),ie.each(["top","left"],function(e,t){ie.cssHooks[t]=S(re.pixelPosition,function(e,n){if(n)return n=N(e,t),_e.test(n)?ie(e).position()[t]+"px":n})}),ie.each({Height:"height",Width:"width"},function(e,t){ie.each({padding:"inner"+e,content:t,"":"outer"+e},function(n,r){ie.fn[r]=function(r,i){var o=arguments.length&&(n||"boolean"!=typeof r),s=n||(!0===r||!0===i?"margin":"border");return ye(this,function(t,n,r){var i;return ie.isWindow(t)?t.document.documentElement["client"+e]:9===t.nodeType?(i=t.documentElement,Math.max(t.body["scroll"+e],i["scroll"+e],t.body["offset"+e],i["offset"+e],i["client"+e])):void 0===r?ie.css(t,n,s):ie.style(t,n,r,s)},t,o?r:void 0,o,null)}})}),ie.fn.extend({bind:function(e,t,n){return this.on(e,null,t,n)},unbind:function(e,t){return this.off(e,null,t)},delegate:function(e,t,n,r){return this.on(t,e,n,r)},undelegate:function(e,t,n){return 1===arguments.length?this.off(e,"**"):this.off(t,e||"**",n)},size:function(){return this.length}}),ie.fn.andSelf=ie.fn.addBack,"function"==typeof define&&define.amd&&define("jquery",[],function(){return ie});var Nt=e.jQuery,St=e.$;return ie.noConflict=function(t){return e.$===ie&&(e.$=St),t&&e.jQuery===ie&&(e.jQuery=Nt),ie},t||(e.jQuery=e.$=ie),ie});

},{}],5:[function(require,module,exports){
/**
 * UAParser.js v0.7.12
 * Lightweight JavaScript-based User-Agent string parser
 * https://github.com/faisalman/ua-parser-js
 *
 * Copyright © 2012-2016 Faisal Salman <fyzlman@gmail.com>
 * Dual licensed under GPLv2 & MIT
 */

(function (window, undefined) {

    'use strict';

    //////////////
    // Constants
    /////////////


    var LIBVERSION  = '0.7.12',
        EMPTY       = '',
        UNKNOWN     = '?',
        FUNC_TYPE   = 'function',
        UNDEF_TYPE  = 'undefined',
        OBJ_TYPE    = 'object',
        STR_TYPE    = 'string',
        MAJOR       = 'major', // deprecated
        MODEL       = 'model',
        NAME        = 'name',
        TYPE        = 'type',
        VENDOR      = 'vendor',
        VERSION     = 'version',
        ARCHITECTURE= 'architecture',
        CONSOLE     = 'console',
        MOBILE      = 'mobile',
        TABLET      = 'tablet',
        SMARTTV     = 'smarttv',
        WEARABLE    = 'wearable',
        EMBEDDED    = 'embedded';


    ///////////
    // Helper
    //////////


    var util = {
        extend : function (regexes, extensions) {
            var margedRegexes = {};
            for (var i in regexes) {
                if (extensions[i] && extensions[i].length % 2 === 0) {
                    margedRegexes[i] = extensions[i].concat(regexes[i]);
                } else {
                    margedRegexes[i] = regexes[i];
                }
            }
            return margedRegexes;
        },
        has : function (str1, str2) {
          if (typeof str1 === "string") {
            return str2.toLowerCase().indexOf(str1.toLowerCase()) !== -1;
          } else {
            return false;
          }
        },
        lowerize : function (str) {
            return str.toLowerCase();
        },
        major : function (version) {
            return typeof(version) === STR_TYPE ? version.replace(/[^\d\.]/g,'').split(".")[0] : undefined;
        },
        trim : function (str) {
          return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        }
    };


    ///////////////
    // Map helper
    //////////////


    var mapper = {

        rgx : function () {

            var result, i = 0, j, k, p, q, matches, match, args = arguments;

            // loop through all regexes maps
            while (i < args.length && !matches) {

                var regex = args[i],       // even sequence (0,2,4,..)
                    props = args[i + 1];   // odd sequence (1,3,5,..)

                // construct object barebones
                if (typeof result === UNDEF_TYPE) {
                    result = {};
                    for (p in props) {
                        if (props.hasOwnProperty(p)){
                            q = props[p];
                            if (typeof q === OBJ_TYPE) {
                                result[q[0]] = undefined;
                            } else {
                                result[q] = undefined;
                            }
                        }
                    }
                }

                // try matching uastring with regexes
                j = k = 0;
                while (j < regex.length && !matches) {
                    matches = regex[j++].exec(this.getUA());
                    if (!!matches) {
                        for (p = 0; p < props.length; p++) {
                            match = matches[++k];
                            q = props[p];
                            // check if given property is actually array
                            if (typeof q === OBJ_TYPE && q.length > 0) {
                                if (q.length == 2) {
                                    if (typeof q[1] == FUNC_TYPE) {
                                        // assign modified match
                                        result[q[0]] = q[1].call(this, match);
                                    } else {
                                        // assign given value, ignore regex match
                                        result[q[0]] = q[1];
                                    }
                                } else if (q.length == 3) {
                                    // check whether function or regex
                                    if (typeof q[1] === FUNC_TYPE && !(q[1].exec && q[1].test)) {
                                        // call function (usually string mapper)
                                        result[q[0]] = match ? q[1].call(this, match, q[2]) : undefined;
                                    } else {
                                        // sanitize match using given regex
                                        result[q[0]] = match ? match.replace(q[1], q[2]) : undefined;
                                    }
                                } else if (q.length == 4) {
                                        result[q[0]] = match ? q[3].call(this, match.replace(q[1], q[2])) : undefined;
                                }
                            } else {
                                result[q] = match ? match : undefined;
                            }
                        }
                    }
                }
                i += 2;
            }
            return result;
        },

        str : function (str, map) {

            for (var i in map) {
                // check if array
                if (typeof map[i] === OBJ_TYPE && map[i].length > 0) {
                    for (var j = 0; j < map[i].length; j++) {
                        if (util.has(map[i][j], str)) {
                            return (i === UNKNOWN) ? undefined : i;
                        }
                    }
                } else if (util.has(map[i], str)) {
                    return (i === UNKNOWN) ? undefined : i;
                }
            }
            return str;
        }
    };


    ///////////////
    // String map
    //////////////


    var maps = {

        browser : {
            oldsafari : {
                version : {
                    '1.0'   : '/8',
                    '1.2'   : '/1',
                    '1.3'   : '/3',
                    '2.0'   : '/412',
                    '2.0.2' : '/416',
                    '2.0.3' : '/417',
                    '2.0.4' : '/419',
                    '?'     : '/'
                }
            }
        },

        device : {
            amazon : {
                model : {
                    'Fire Phone' : ['SD', 'KF']
                }
            },
            sprint : {
                model : {
                    'Evo Shift 4G' : '7373KT'
                },
                vendor : {
                    'HTC'       : 'APA',
                    'Sprint'    : 'Sprint'
                }
            }
        },

        os : {
            windows : {
                version : {
                    'ME'        : '4.90',
                    'NT 3.11'   : 'NT3.51',
                    'NT 4.0'    : 'NT4.0',
                    '2000'      : 'NT 5.0',
                    'XP'        : ['NT 5.1', 'NT 5.2'],
                    'Vista'     : 'NT 6.0',
                    '7'         : 'NT 6.1',
                    '8'         : 'NT 6.2',
                    '8.1'       : 'NT 6.3',
                    '10'        : ['NT 6.4', 'NT 10.0'],
                    'RT'        : 'ARM'
                }
            }
        }
    };


    //////////////
    // Regex map
    /////////////


    var regexes = {

        browser : [[

            // Presto based
            /(opera\smini)\/([\w\.-]+)/i,                                       // Opera Mini
            /(opera\s[mobiletab]+).+version\/([\w\.-]+)/i,                      // Opera Mobi/Tablet
            /(opera).+version\/([\w\.]+)/i,                                     // Opera > 9.80
            /(opera)[\/\s]+([\w\.]+)/i                                          // Opera < 9.80
            ], [NAME, VERSION], [

            /(opios)[\/\s]+([\w\.]+)/i                                          // Opera mini on iphone >= 8.0
            ], [[NAME, 'Opera Mini'], VERSION], [

            /\s(opr)\/([\w\.]+)/i                                               // Opera Webkit
            ], [[NAME, 'Opera'], VERSION], [

            // Mixed
            /(kindle)\/([\w\.]+)/i,                                             // Kindle
            /(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?([\w\.]+)*/i,
                                                                                // Lunascape/Maxthon/Netfront/Jasmine/Blazer

            // Trident based
            /(avant\s|iemobile|slim|baidu)(?:browser)?[\/\s]?([\w\.]*)/i,
                                                                                // Avant/IEMobile/SlimBrowser/Baidu
            /(?:ms|\()(ie)\s([\w\.]+)/i,                                        // Internet Explorer

            // Webkit/KHTML based
            /(rekonq)\/([\w\.]+)*/i,                                            // Rekonq
            /(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi|iridium|phantomjs)\/([\w\.-]+)/i
                                                                                // Chromium/Flock/RockMelt/Midori/Epiphany/Silk/Skyfire/Bolt/Iron/Iridium/PhantomJS
            ], [NAME, VERSION], [

            /(trident).+rv[:\s]([\w\.]+).+like\sgecko/i                         // IE11
            ], [[NAME, 'IE'], VERSION], [

            /(edge)\/((\d+)?[\w\.]+)/i                                          // Microsoft Edge
            ], [NAME, VERSION], [

            /(yabrowser)\/([\w\.]+)/i                                           // Yandex
            ], [[NAME, 'Yandex'], VERSION], [

            /(comodo_dragon)\/([\w\.]+)/i                                       // Comodo Dragon
            ], [[NAME, /_/g, ' '], VERSION], [

            /(micromessenger)\/([\w\.]+)/i                                      // WeChat
            ], [[NAME, 'WeChat'], VERSION], [

            /xiaomi\/miuibrowser\/([\w\.]+)/i                                   // MIUI Browser
            ], [VERSION, [NAME, 'MIUI Browser']], [

            /\swv\).+(chrome)\/([\w\.]+)/i                                      // Chrome WebView
            ], [[NAME, /(.+)/, '$1 WebView'], VERSION], [

            /android.+samsungbrowser\/([\w\.]+)/i,
            /android.+version\/([\w\.]+)\s+(?:mobile\s?safari|safari)*/i        // Android Browser
            ], [VERSION, [NAME, 'Android Browser']], [

            /(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?([\w\.]+)/i,
                                                                                // Chrome/OmniWeb/Arora/Tizen/Nokia
            /(qqbrowser)[\/\s]?([\w\.]+)/i
                                                                                // QQBrowser
            ], [NAME, VERSION], [

            /(uc\s?browser)[\/\s]?([\w\.]+)/i,
            /ucweb.+(ucbrowser)[\/\s]?([\w\.]+)/i,
            /juc.+(ucweb)[\/\s]?([\w\.]+)/i
                                                                                // UCBrowser
            ], [[NAME, 'UCBrowser'], VERSION], [

            /(dolfin)\/([\w\.]+)/i                                              // Dolphin
            ], [[NAME, 'Dolphin'], VERSION], [

            /((?:android.+)crmo|crios)\/([\w\.]+)/i                             // Chrome for Android/iOS
            ], [[NAME, 'Chrome'], VERSION], [

            /;fbav\/([\w\.]+);/i                                                // Facebook App for iOS
            ], [VERSION, [NAME, 'Facebook']], [

            /fxios\/([\w\.-]+)/i                                                // Firefox for iOS
            ], [VERSION, [NAME, 'Firefox']], [

            /version\/([\w\.]+).+?mobile\/\w+\s(safari)/i                       // Mobile Safari
            ], [VERSION, [NAME, 'Mobile Safari']], [

            /version\/([\w\.]+).+?(mobile\s?safari|safari)/i                    // Safari & Safari Mobile
            ], [VERSION, NAME], [

            /webkit.+?(mobile\s?safari|safari)(\/[\w\.]+)/i                     // Safari < 3.0
            ], [NAME, [VERSION, mapper.str, maps.browser.oldsafari.version]], [

            /(konqueror)\/([\w\.]+)/i,                                          // Konqueror
            /(webkit|khtml)\/([\w\.]+)/i
            ], [NAME, VERSION], [

            // Gecko based
            /(navigator|netscape)\/([\w\.-]+)/i                                 // Netscape
            ], [[NAME, 'Netscape'], VERSION], [
            /(swiftfox)/i,                                                      // Swiftfox
            /(icedragon|iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo|conkeror)[\/\s]?([\w\.\+]+)/i,
                                                                                // IceDragon/Iceweasel/Camino/Chimera/Fennec/Maemo/Minimo/Conkeror
            /(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix)\/([\w\.-]+)/i,
                                                                                // Firefox/SeaMonkey/K-Meleon/IceCat/IceApe/Firebird/Phoenix
            /(mozilla)\/([\w\.]+).+rv\:.+gecko\/\d+/i,                          // Mozilla

            // Other
            /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir)[\/\s]?([\w\.]+)/i,
                                                                                // Polaris/Lynx/Dillo/iCab/Doris/Amaya/w3m/NetSurf/Sleipnir
            /(links)\s\(([\w\.]+)/i,                                            // Links
            /(gobrowser)\/?([\w\.]+)*/i,                                        // GoBrowser
            /(ice\s?browser)\/v?([\w\._]+)/i,                                   // ICE Browser
            /(mosaic)[\/\s]([\w\.]+)/i                                          // Mosaic
            ], [NAME, VERSION]

            /* /////////////////////
            // Media players BEGIN
            ////////////////////////

            , [

            /(apple(?:coremedia|))\/((\d+)[\w\._]+)/i,                          // Generic Apple CoreMedia
            /(coremedia) v((\d+)[\w\._]+)/i
            ], [NAME, VERSION], [

            /(aqualung|lyssna|bsplayer)\/((\d+)?[\w\.-]+)/i                     // Aqualung/Lyssna/BSPlayer
            ], [NAME, VERSION], [

            /(ares|ossproxy)\s((\d+)[\w\.-]+)/i                                 // Ares/OSSProxy
            ], [NAME, VERSION], [

            /(audacious|audimusicstream|amarok|bass|core|dalvik|gnomemplayer|music on console|nsplayer|psp-internetradioplayer|videos)\/((\d+)[\w\.-]+)/i,
                                                                                // Audacious/AudiMusicStream/Amarok/BASS/OpenCORE/Dalvik/GnomeMplayer/MoC
                                                                                // NSPlayer/PSP-InternetRadioPlayer/Videos
            /(clementine|music player daemon)\s((\d+)[\w\.-]+)/i,               // Clementine/MPD
            /(lg player|nexplayer)\s((\d+)[\d\.]+)/i,
            /player\/(nexplayer|lg player)\s((\d+)[\w\.-]+)/i                   // NexPlayer/LG Player
            ], [NAME, VERSION], [
            /(nexplayer)\s((\d+)[\w\.-]+)/i                                     // Nexplayer
            ], [NAME, VERSION], [

            /(flrp)\/((\d+)[\w\.-]+)/i                                          // Flip Player
            ], [[NAME, 'Flip Player'], VERSION], [

            /(fstream|nativehost|queryseekspider|ia-archiver|facebookexternalhit)/i
                                                                                // FStream/NativeHost/QuerySeekSpider/IA Archiver/facebookexternalhit
            ], [NAME], [

            /(gstreamer) souphttpsrc (?:\([^\)]+\)){0,1} libsoup\/((\d+)[\w\.-]+)/i
                                                                                // Gstreamer
            ], [NAME, VERSION], [

            /(htc streaming player)\s[\w_]+\s\/\s((\d+)[\d\.]+)/i,              // HTC Streaming Player
            /(java|python-urllib|python-requests|wget|libcurl)\/((\d+)[\w\.-_]+)/i,
                                                                                // Java/urllib/requests/wget/cURL
            /(lavf)((\d+)[\d\.]+)/i                                             // Lavf (FFMPEG)
            ], [NAME, VERSION], [

            /(htc_one_s)\/((\d+)[\d\.]+)/i                                      // HTC One S
            ], [[NAME, /_/g, ' '], VERSION], [

            /(mplayer)(?:\s|\/)(?:(?:sherpya-){0,1}svn)(?:-|\s)(r\d+(?:-\d+[\w\.-]+){0,1})/i
                                                                                // MPlayer SVN
            ], [NAME, VERSION], [

            /(mplayer)(?:\s|\/|[unkow-]+)((\d+)[\w\.-]+)/i                      // MPlayer
            ], [NAME, VERSION], [

            /(mplayer)/i,                                                       // MPlayer (no other info)
            /(yourmuze)/i,                                                      // YourMuze
            /(media player classic|nero showtime)/i                             // Media Player Classic/Nero ShowTime
            ], [NAME], [

            /(nero (?:home|scout))\/((\d+)[\w\.-]+)/i                           // Nero Home/Nero Scout
            ], [NAME, VERSION], [

            /(nokia\d+)\/((\d+)[\w\.-]+)/i                                      // Nokia
            ], [NAME, VERSION], [

            /\s(songbird)\/((\d+)[\w\.-]+)/i                                    // Songbird/Philips-Songbird
            ], [NAME, VERSION], [

            /(winamp)3 version ((\d+)[\w\.-]+)/i,                               // Winamp
            /(winamp)\s((\d+)[\w\.-]+)/i,
            /(winamp)mpeg\/((\d+)[\w\.-]+)/i
            ], [NAME, VERSION], [

            /(ocms-bot|tapinradio|tunein radio|unknown|winamp|inlight radio)/i  // OCMS-bot/tap in radio/tunein/unknown/winamp (no other info)
                                                                                // inlight radio
            ], [NAME], [

            /(quicktime|rma|radioapp|radioclientapplication|soundtap|totem|stagefright|streamium)\/((\d+)[\w\.-]+)/i
                                                                                // QuickTime/RealMedia/RadioApp/RadioClientApplication/
                                                                                // SoundTap/Totem/Stagefright/Streamium
            ], [NAME, VERSION], [

            /(smp)((\d+)[\d\.]+)/i                                              // SMP
            ], [NAME, VERSION], [

            /(vlc) media player - version ((\d+)[\w\.]+)/i,                     // VLC Videolan
            /(vlc)\/((\d+)[\w\.-]+)/i,
            /(xbmc|gvfs|xine|xmms|irapp)\/((\d+)[\w\.-]+)/i,                    // XBMC/gvfs/Xine/XMMS/irapp
            /(foobar2000)\/((\d+)[\d\.]+)/i,                                    // Foobar2000
            /(itunes)\/((\d+)[\d\.]+)/i                                         // iTunes
            ], [NAME, VERSION], [

            /(wmplayer)\/((\d+)[\w\.-]+)/i,                                     // Windows Media Player
            /(windows-media-player)\/((\d+)[\w\.-]+)/i
            ], [[NAME, /-/g, ' '], VERSION], [

            /windows\/((\d+)[\w\.-]+) upnp\/[\d\.]+ dlnadoc\/[\d\.]+ (home media server)/i
                                                                                // Windows Media Server
            ], [VERSION, [NAME, 'Windows']], [

            /(com\.riseupradioalarm)\/((\d+)[\d\.]*)/i                          // RiseUP Radio Alarm
            ], [NAME, VERSION], [

            /(rad.io)\s((\d+)[\d\.]+)/i,                                        // Rad.io
            /(radio.(?:de|at|fr))\s((\d+)[\d\.]+)/i
            ], [[NAME, 'rad.io'], VERSION]

            //////////////////////
            // Media players END
            ////////////////////*/

        ],

        cpu : [[

            /(?:(amd|x(?:(?:86|64)[_-])?|wow|win)64)[;\)]/i                     // AMD64
            ], [[ARCHITECTURE, 'amd64']], [

            /(ia32(?=;))/i                                                      // IA32 (quicktime)
            ], [[ARCHITECTURE, util.lowerize]], [

            /((?:i[346]|x)86)[;\)]/i                                            // IA32
            ], [[ARCHITECTURE, 'ia32']], [

            // PocketPC mistakenly identified as PowerPC
            /windows\s(ce|mobile);\sppc;/i
            ], [[ARCHITECTURE, 'arm']], [

            /((?:ppc|powerpc)(?:64)?)(?:\smac|;|\))/i                           // PowerPC
            ], [[ARCHITECTURE, /ower/, '', util.lowerize]], [

            /(sun4\w)[;\)]/i                                                    // SPARC
            ], [[ARCHITECTURE, 'sparc']], [

            /((?:avr32|ia64(?=;))|68k(?=\))|arm(?:64|(?=v\d+;))|(?=atmel\s)avr|(?:irix|mips|sparc)(?:64)?(?=;)|pa-risc)/i
                                                                                // IA64, 68K, ARM/64, AVR/32, IRIX/64, MIPS/64, SPARC/64, PA-RISC
            ], [[ARCHITECTURE, util.lowerize]]
        ],

        device : [[

            /\((ipad|playbook);[\w\s\);-]+(rim|apple)/i                         // iPad/PlayBook
            ], [MODEL, VENDOR, [TYPE, TABLET]], [

            /applecoremedia\/[\w\.]+ \((ipad)/                                  // iPad
            ], [MODEL, [VENDOR, 'Apple'], [TYPE, TABLET]], [

            /(apple\s{0,1}tv)/i                                                 // Apple TV
            ], [[MODEL, 'Apple TV'], [VENDOR, 'Apple']], [

            /(archos)\s(gamepad2?)/i,                                           // Archos
            /(hp).+(touchpad)/i,                                                // HP TouchPad
            /(hp).+(tablet)/i,                                                  // HP Tablet
            /(kindle)\/([\w\.]+)/i,                                             // Kindle
            /\s(nook)[\w\s]+build\/(\w+)/i,                                     // Nook
            /(dell)\s(strea[kpr\s\d]*[\dko])/i                                  // Dell Streak
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /(kf[A-z]+)\sbuild\/[\w\.]+.*silk\//i                               // Kindle Fire HD
            ], [MODEL, [VENDOR, 'Amazon'], [TYPE, TABLET]], [
            /(sd|kf)[0349hijorstuw]+\sbuild\/[\w\.]+.*silk\//i                  // Fire Phone
            ], [[MODEL, mapper.str, maps.device.amazon.model], [VENDOR, 'Amazon'], [TYPE, MOBILE]], [

            /\((ip[honed|\s\w*]+);.+(apple)/i                                   // iPod/iPhone
            ], [MODEL, VENDOR, [TYPE, MOBILE]], [
            /\((ip[honed|\s\w*]+);/i                                            // iPod/iPhone
            ], [MODEL, [VENDOR, 'Apple'], [TYPE, MOBILE]], [

            /(blackberry)[\s-]?(\w+)/i,                                         // BlackBerry
            /(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|huawei|meizu|motorola|polytron)[\s_-]?([\w-]+)*/i,
                                                                                // BenQ/Palm/Sony-Ericsson/Acer/Asus/Dell/Huawei/Meizu/Motorola/Polytron
            /(hp)\s([\w\s]+\w)/i,                                               // HP iPAQ
            /(asus)-?(\w+)/i                                                    // Asus
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /\(bb10;\s(\w+)/i                                                   // BlackBerry 10
            ], [MODEL, [VENDOR, 'BlackBerry'], [TYPE, MOBILE]], [
                                                                                // Asus Tablets
            /android.+(transfo[prime\s]{4,10}\s\w+|eeepc|slider\s\w+|nexus 7|padfone)/i
            ], [MODEL, [VENDOR, 'Asus'], [TYPE, TABLET]], [

            /(sony)\s(tablet\s[ps])\sbuild\//i,                                  // Sony
            /(sony)?(?:sgp.+)\sbuild\//i
            ], [[VENDOR, 'Sony'], [MODEL, 'Xperia Tablet'], [TYPE, TABLET]], [
            /(?:sony)?(?:(?:(?:c|d)\d{4})|(?:so[-l].+))\sbuild\//i
            ], [[VENDOR, 'Sony'], [MODEL, 'Xperia Phone'], [TYPE, MOBILE]], [

            /\s(ouya)\s/i,                                                      // Ouya
            /(nintendo)\s([wids3u]+)/i                                          // Nintendo
            ], [VENDOR, MODEL, [TYPE, CONSOLE]], [

            /android.+;\s(shield)\sbuild/i                                      // Nvidia
            ], [MODEL, [VENDOR, 'Nvidia'], [TYPE, CONSOLE]], [

            /(playstation\s[34portablevi]+)/i                                   // Playstation
            ], [MODEL, [VENDOR, 'Sony'], [TYPE, CONSOLE]], [

            /(sprint\s(\w+))/i                                                  // Sprint Phones
            ], [[VENDOR, mapper.str, maps.device.sprint.vendor], [MODEL, mapper.str, maps.device.sprint.model], [TYPE, MOBILE]], [

            /(lenovo)\s?(S(?:5000|6000)+(?:[-][\w+]))/i                         // Lenovo tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /(htc)[;_\s-]+([\w\s]+(?=\))|\w+)*/i,                               // HTC
            /(zte)-(\w+)*/i,                                                    // ZTE
            /(alcatel|geeksphone|huawei|lenovo|nexian|panasonic|(?=;\s)sony)[_\s-]?([\w-]+)*/i
                                                                                // Alcatel/GeeksPhone/Huawei/Lenovo/Nexian/Panasonic/Sony
            ], [VENDOR, [MODEL, /_/g, ' '], [TYPE, MOBILE]], [

            /(nexus\s9)/i                                                       // HTC Nexus 9
            ], [MODEL, [VENDOR, 'HTC'], [TYPE, TABLET]], [

            /(nexus\s6p)/i                                                      // Huawei Nexus 6P
            ], [MODEL, [VENDOR, 'Huawei'], [TYPE, MOBILE]], [

            /(microsoft);\s(lumia[\s\w]+)/i                                     // Microsoft Lumia
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /[\s\(;](xbox(?:\sone)?)[\s\);]/i                                   // Microsoft Xbox
            ], [MODEL, [VENDOR, 'Microsoft'], [TYPE, CONSOLE]], [
            /(kin\.[onetw]{3})/i                                                // Microsoft Kin
            ], [[MODEL, /\./g, ' '], [VENDOR, 'Microsoft'], [TYPE, MOBILE]], [

                                                                                // Motorola
            /\s(milestone|droid(?:[2-4x]|\s(?:bionic|x2|pro|razr))?(:?\s4g)?)[\w\s]+build\//i,
            /mot[\s-]?(\w+)*/i,
            /(XT\d{3,4}) build\//i,
            /(nexus\s6)/i
            ], [MODEL, [VENDOR, 'Motorola'], [TYPE, MOBILE]], [
            /android.+\s(mz60\d|xoom[\s2]{0,2})\sbuild\//i
            ], [MODEL, [VENDOR, 'Motorola'], [TYPE, TABLET]], [

            /hbbtv\/\d+\.\d+\.\d+\s+\([\w\s]*;\s*(\w[^;]*);([^;]*)/i            // HbbTV devices
            ], [[VENDOR, util.trim], [MODEL, util.trim], [TYPE, SMARTTV]], [

            /hbbtv.+maple;(\d+)/i
            ], [[MODEL, /^/, 'SmartTV'], [VENDOR, 'Samsung'], [TYPE, SMARTTV]], [

            /\(dtv[\);].+(aquos)/i                                              // Sharp
            ], [MODEL, [VENDOR, 'Sharp'], [TYPE, SMARTTV]], [

            /android.+((sch-i[89]0\d|shw-m380s|gt-p\d{4}|gt-n\d+|sgh-t8[56]9|nexus 10))/i,
            /((SM-T\w+))/i
            ], [[VENDOR, 'Samsung'], MODEL, [TYPE, TABLET]], [                  // Samsung
            /smart-tv.+(samsung)/i
            ], [VENDOR, [TYPE, SMARTTV], MODEL], [
            /((s[cgp]h-\w+|gt-\w+|galaxy\snexus|sm-\w[\w\d]+))/i,
            /(sam[sung]*)[\s-]*(\w+-?[\w-]*)*/i,
            /sec-((sgh\w+))/i
            ], [[VENDOR, 'Samsung'], MODEL, [TYPE, MOBILE]], [

            /sie-(\w+)*/i                                                       // Siemens
            ], [MODEL, [VENDOR, 'Siemens'], [TYPE, MOBILE]], [

            /(maemo|nokia).*(n900|lumia\s\d+)/i,                                // Nokia
            /(nokia)[\s_-]?([\w-]+)*/i
            ], [[VENDOR, 'Nokia'], MODEL, [TYPE, MOBILE]], [

            /android\s3\.[\s\w;-]{10}(a\d{3})/i                                 // Acer
            ], [MODEL, [VENDOR, 'Acer'], [TYPE, TABLET]], [

            /android\s3\.[\s\w;-]{10}(lg?)-([06cv9]{3,4})/i                     // LG Tablet
            ], [[VENDOR, 'LG'], MODEL, [TYPE, TABLET]], [
            /(lg) netcast\.tv/i                                                 // LG SmartTV
            ], [VENDOR, MODEL, [TYPE, SMARTTV]], [
            /(nexus\s[45])/i,                                                   // LG
            /lg[e;\s\/-]+(\w+)*/i
            ], [MODEL, [VENDOR, 'LG'], [TYPE, MOBILE]], [

            /android.+(ideatab[a-z0-9\-\s]+)/i                                  // Lenovo
            ], [MODEL, [VENDOR, 'Lenovo'], [TYPE, TABLET]], [

            /linux;.+((jolla));/i                                               // Jolla
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /((pebble))app\/[\d\.]+\s/i                                         // Pebble
            ], [VENDOR, MODEL, [TYPE, WEARABLE]], [

            /android.+;\s(glass)\s\d/i                                          // Google Glass
            ], [MODEL, [VENDOR, 'Google'], [TYPE, WEARABLE]], [

            /android.+(\w+)\s+build\/hm\1/i,                                    // Xiaomi Hongmi 'numeric' models
            /android.+(hm[\s\-_]*note?[\s_]*(?:\d\w)?)\s+build/i,               // Xiaomi Hongmi
            /android.+(mi[\s\-_]*(?:one|one[\s_]plus|note lte)?[\s_]*(?:\d\w)?)\s+build/i    // Xiaomi Mi
            ], [[MODEL, /_/g, ' '], [VENDOR, 'Xiaomi'], [TYPE, MOBILE]], [

            /android.+a000(1)\s+build/i                                         // OnePlus
            ], [MODEL, [VENDOR, 'OnePlus'], [TYPE, MOBILE]], [

            /\s(tablet)[;\/]/i,                                                 // Unidentifiable Tablet
            /\s(mobile)(?:[;\/]|\ssafari)/i                                     // Unidentifiable Mobile
            ], [[TYPE, util.lowerize], VENDOR, MODEL]

            /*//////////////////////////
            // TODO: move to string map
            ////////////////////////////

            /(C6603)/i                                                          // Sony Xperia Z C6603
            ], [[MODEL, 'Xperia Z C6603'], [VENDOR, 'Sony'], [TYPE, MOBILE]], [
            /(C6903)/i                                                          // Sony Xperia Z 1
            ], [[MODEL, 'Xperia Z 1'], [VENDOR, 'Sony'], [TYPE, MOBILE]], [

            /(SM-G900[F|H])/i                                                   // Samsung Galaxy S5
            ], [[MODEL, 'Galaxy S5'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G7102)/i                                                       // Samsung Galaxy Grand 2
            ], [[MODEL, 'Galaxy Grand 2'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G530H)/i                                                       // Samsung Galaxy Grand Prime
            ], [[MODEL, 'Galaxy Grand Prime'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G313HZ)/i                                                      // Samsung Galaxy V
            ], [[MODEL, 'Galaxy V'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-T805)/i                                                        // Samsung Galaxy Tab S 10.5
            ], [[MODEL, 'Galaxy Tab S 10.5'], [VENDOR, 'Samsung'], [TYPE, TABLET]], [
            /(SM-G800F)/i                                                       // Samsung Galaxy S5 Mini
            ], [[MODEL, 'Galaxy S5 Mini'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-T311)/i                                                        // Samsung Galaxy Tab 3 8.0
            ], [[MODEL, 'Galaxy Tab 3 8.0'], [VENDOR, 'Samsung'], [TYPE, TABLET]], [

            /(R1001)/i                                                          // Oppo R1001
            ], [MODEL, [VENDOR, 'OPPO'], [TYPE, MOBILE]], [
            /(X9006)/i                                                          // Oppo Find 7a
            ], [[MODEL, 'Find 7a'], [VENDOR, 'Oppo'], [TYPE, MOBILE]], [
            /(R2001)/i                                                          // Oppo YOYO R2001
            ], [[MODEL, 'Yoyo R2001'], [VENDOR, 'Oppo'], [TYPE, MOBILE]], [
            /(R815)/i                                                           // Oppo Clover R815
            ], [[MODEL, 'Clover R815'], [VENDOR, 'Oppo'], [TYPE, MOBILE]], [
             /(U707)/i                                                          // Oppo Find Way S
            ], [[MODEL, 'Find Way S'], [VENDOR, 'Oppo'], [TYPE, MOBILE]], [

            /(T3C)/i                                                            // Advan Vandroid T3C
            ], [MODEL, [VENDOR, 'Advan'], [TYPE, TABLET]], [
            /(ADVAN T1J\+)/i                                                    // Advan Vandroid T1J+
            ], [[MODEL, 'Vandroid T1J+'], [VENDOR, 'Advan'], [TYPE, TABLET]], [
            /(ADVAN S4A)/i                                                      // Advan Vandroid S4A
            ], [[MODEL, 'Vandroid S4A'], [VENDOR, 'Advan'], [TYPE, MOBILE]], [

            /(V972M)/i                                                          // ZTE V972M
            ], [MODEL, [VENDOR, 'ZTE'], [TYPE, MOBILE]], [

            /(i-mobile)\s(IQ\s[\d\.]+)/i                                        // i-mobile IQ
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /(IQ6.3)/i                                                          // i-mobile IQ IQ 6.3
            ], [[MODEL, 'IQ 6.3'], [VENDOR, 'i-mobile'], [TYPE, MOBILE]], [
            /(i-mobile)\s(i-style\s[\d\.]+)/i                                   // i-mobile i-STYLE
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /(i-STYLE2.1)/i                                                     // i-mobile i-STYLE 2.1
            ], [[MODEL, 'i-STYLE 2.1'], [VENDOR, 'i-mobile'], [TYPE, MOBILE]], [

            /(mobiistar touch LAI 512)/i                                        // mobiistar touch LAI 512
            ], [[MODEL, 'Touch LAI 512'], [VENDOR, 'mobiistar'], [TYPE, MOBILE]], [

            /////////////
            // END TODO
            ///////////*/

        ],

        engine : [[

            /windows.+\sedge\/([\w\.]+)/i                                       // EdgeHTML
            ], [VERSION, [NAME, 'EdgeHTML']], [

            /(presto)\/([\w\.]+)/i,                                             // Presto
            /(webkit|trident|netfront|netsurf|amaya|lynx|w3m)\/([\w\.]+)/i,     // WebKit/Trident/NetFront/NetSurf/Amaya/Lynx/w3m
            /(khtml|tasman|links)[\/\s]\(?([\w\.]+)/i,                          // KHTML/Tasman/Links
            /(icab)[\/\s]([23]\.[\d\.]+)/i                                      // iCab
            ], [NAME, VERSION], [

            /rv\:([\w\.]+).*(gecko)/i                                           // Gecko
            ], [VERSION, NAME]
        ],

        os : [[

            // Windows based
            /microsoft\s(windows)\s(vista|xp)/i                                 // Windows (iTunes)
            ], [NAME, VERSION], [
            /(windows)\snt\s6\.2;\s(arm)/i,                                     // Windows RT
            /(windows\sphone(?:\sos)*)[\s\/]?([\d\.\s]+\w)*/i,                  // Windows Phone
            /(windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i
            ], [NAME, [VERSION, mapper.str, maps.os.windows.version]], [
            /(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i
            ], [[NAME, 'Windows'], [VERSION, mapper.str, maps.os.windows.version]], [

            // Mobile/Embedded OS
            /\((bb)(10);/i                                                      // BlackBerry 10
            ], [[NAME, 'BlackBerry'], VERSION], [
            /(blackberry)\w*\/?([\w\.]+)*/i,                                    // Blackberry
            /(tizen)[\/\s]([\w\.]+)/i,                                          // Tizen
            /(android|webos|palm\sos|qnx|bada|rim\stablet\sos|meego|contiki)[\/\s-]?([\w\.]+)*/i,
                                                                                // Android/WebOS/Palm/QNX/Bada/RIM/MeeGo/Contiki
            /linux;.+(sailfish);/i                                              // Sailfish OS
            ], [NAME, VERSION], [
            /(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]+)*/i                 // Symbian
            ], [[NAME, 'Symbian'], VERSION], [
            /\((series40);/i                                                    // Series 40
            ], [NAME], [
            /mozilla.+\(mobile;.+gecko.+firefox/i                               // Firefox OS
            ], [[NAME, 'Firefox OS'], VERSION], [

            // Console
            /(nintendo|playstation)\s([wids34portablevu]+)/i,                   // Nintendo/Playstation

            // GNU/Linux based
            /(mint)[\/\s\(]?(\w+)*/i,                                           // Mint
            /(mageia|vectorlinux)[;\s]/i,                                       // Mageia/VectorLinux
            /(joli|[kxln]?ubuntu|debian|[open]*suse|gentoo|(?=\s)arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk|linpus)[\/\s-]?(?!chrom)([\w\.-]+)*/i,
                                                                                // Joli/Ubuntu/Debian/SUSE/Gentoo/Arch/Slackware
                                                                                // Fedora/Mandriva/CentOS/PCLinuxOS/RedHat/Zenwalk/Linpus
            /(hurd|linux)\s?([\w\.]+)*/i,                                       // Hurd/Linux
            /(gnu)\s?([\w\.]+)*/i                                               // GNU
            ], [NAME, VERSION], [

            /(cros)\s[\w]+\s([\w\.]+\w)/i                                       // Chromium OS
            ], [[NAME, 'Chromium OS'], VERSION],[

            // Solaris
            /(sunos)\s?([\w\.]+\d)*/i                                           // Solaris
            ], [[NAME, 'Solaris'], VERSION], [

            // BSD based
            /\s([frentopc-]{0,4}bsd|dragonfly)\s?([\w\.]+)*/i                   // FreeBSD/NetBSD/OpenBSD/PC-BSD/DragonFly
            ], [NAME, VERSION],[

            /(haiku)\s(\w+)/i                                                  // Haiku
            ], [NAME, VERSION],[

            /(ip[honead]+)(?:.*os\s([\w]+)*\slike\smac|;\sopera)/i              // iOS
            ], [[NAME, 'iOS'], [VERSION, /_/g, '.']], [

            /(mac\sos\sx)\s?([\w\s\.]+\w)*/i,
            /(macintosh|mac(?=_powerpc)\s)/i                                    // Mac OS
            ], [[NAME, 'Mac OS'], [VERSION, /_/g, '.']], [

            // Other
            /((?:open)?solaris)[\/\s-]?([\w\.]+)*/i,                            // Solaris
            /(aix)\s((\d)(?=\.|\)|\s)[\w\.]*)*/i,                               // AIX
            /(plan\s9|minix|beos|os\/2|amigaos|morphos|risc\sos|openvms)/i,
                                                                                // Plan9/Minix/BeOS/OS2/AmigaOS/MorphOS/RISCOS/OpenVMS
            /(unix)\s?([\w\.]+)*/i                                              // UNIX
            ], [NAME, VERSION]
        ]
    };


    /////////////////
    // Constructor
    ////////////////


    var UAParser = function (uastring, extensions) {

        if (!(this instanceof UAParser)) {
            return new UAParser(uastring, extensions).getResult();
        }

        var ua = uastring || ((window && window.navigator && window.navigator.userAgent) ? window.navigator.userAgent : EMPTY);
        var rgxmap = extensions ? util.extend(regexes, extensions) : regexes;

        this.getBrowser = function () {
            var browser = mapper.rgx.apply(this, rgxmap.browser);
            browser.major = util.major(browser.version);
            return browser;
        };
        this.getCPU = function () {
            return mapper.rgx.apply(this, rgxmap.cpu);
        };
        this.getDevice = function () {
            return mapper.rgx.apply(this, rgxmap.device);
        };
        this.getEngine = function () {
            return mapper.rgx.apply(this, rgxmap.engine);
        };
        this.getOS = function () {
            return mapper.rgx.apply(this, rgxmap.os);
        };
        this.getResult = function() {
            return {
                ua      : this.getUA(),
                browser : this.getBrowser(),
                engine  : this.getEngine(),
                os      : this.getOS(),
                device  : this.getDevice(),
                cpu     : this.getCPU()
            };
        };
        this.getUA = function () {
            return ua;
        };
        this.setUA = function (uastring) {
            ua = uastring;
            return this;
        };
        return this;
    };

    UAParser.VERSION = LIBVERSION;
    UAParser.BROWSER = {
        NAME    : NAME,
        MAJOR   : MAJOR, // deprecated
        VERSION : VERSION
    };
    UAParser.CPU = {
        ARCHITECTURE : ARCHITECTURE
    };
    UAParser.DEVICE = {
        MODEL   : MODEL,
        VENDOR  : VENDOR,
        TYPE    : TYPE,
        CONSOLE : CONSOLE,
        MOBILE  : MOBILE,
        SMARTTV : SMARTTV,
        TABLET  : TABLET,
        WEARABLE: WEARABLE,
        EMBEDDED: EMBEDDED
    };
    UAParser.ENGINE = {
        NAME    : NAME,
        VERSION : VERSION
    };
    UAParser.OS = {
        NAME    : NAME,
        VERSION : VERSION
    };


    ///////////
    // Export
    //////////


    // check js environment
    if (typeof(exports) !== UNDEF_TYPE) {
        // nodejs env
        if (typeof module !== UNDEF_TYPE && module.exports) {
            exports = module.exports = UAParser;
        }
        exports.UAParser = UAParser;
    } else {
        // requirejs env (optional)
        if (typeof(define) === FUNC_TYPE && define.amd) {
            define(function () {
                return UAParser;
            });
        } else {
            // browser env
            window.UAParser = UAParser;
        }
    }

    // jQuery/Zepto specific (optional)
    // Note:
    //   In AMD env the global scope should be kept clean, but jQuery is an exception.
    //   jQuery always exports to global scope, unless jQuery.noConflict(true) is used,
    //   and we should catch that.
    var $ = window.jQuery || window.Zepto;
    if (typeof $ !== UNDEF_TYPE) {
        var parser = new UAParser();
        $.ua = parser.getResult();
        $.ua.get = function() {
            return parser.getUA();
        };
        $.ua.set = function (uastring) {
            parser.setUA(uastring);
            var result = parser.getResult();
            for (var prop in result) {
                $.ua[prop] = result[prop];
            }
        };
    }

})(typeof window === 'object' ? window : this);

},{}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _uaParserJs = require('ua-parser-js');

var _uaParserJs2 = _interopRequireDefault(_uaParserJs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Globals {
	constructor() {
		this.DEBUG = chrome.runtime.getManifest().debug || false;
		this.LOG = this.DEBUG && chrome.runtime.getManifest().log;
		this.EXTENSION_NAME = chrome.runtime.getManifest().name || 'Ghostery';
		this.EXTENSION_VERSION = chrome.runtime.getManifest().version;
		this.BROWSER_INFO = { displayName: '', name: '', token: '', version: '', os: 'other' };

		this.JUST_INSTALLED = false;
		this.JUST_UPGRADED = false;
		this.HOTFIX = false;
		this.LET_REDIRECTS_THROUGH = false;
		this.C2P_LOADED = false;
		this.NOTIFICATIONS_LOADED = false;
		this.hotfix_alert_shown = false;
		this.upgrade_alert_shown = false;

		this.GHOSTERY_DOMAIN = this.DEBUG ? 'ghosterystage' : 'ghostery';
		this.METRICS_SUB_DOMAIN = this.DEBUG ? 'staging-d' : 'd';
		this.CMP_SUB_DOMAIN = this.DEBUG ? 'staging-cmp-cdn' : 'cmp-cdn';
		this.CDN_SUB_DOMAIN = this.DEBUG ? 'staging-cdn' : 'cdn';

		this.REDIRECT_MAP = new Map();
		this.BLOCKED_REDIRECT_DATA = {};
		this.EXCLUDES = ["extension.ghostery.com", "extension.ghosterystage.com", "extension.ghosterydev.com", "signon.ghostery.com", "signon.ghosterystage.com", "account.ghostery.com", "account.ghosterystage.com"];

		this.SYNC_ARRAY = ['enable_autoupdate', 'show_tracker_urls', 'enable_click2play', 'enable_click2play_social', 'toggle_individual_trackers', 'ignore_first_party', 'block_by_default', 'show_alert', 'alert_expanded', 'alert_bubble_timeout', 'alert_bubble_pos', 'hide_alert_trusted', 'show_cmp', 'notify_upgrade_updates', 'notify_hotfix_updates', 'notify_library_updates', 'reload_banner_status', 'trackers_banner_status', 'show_badge', 'ghostrank', 'ghostrank_dismissed', 'enable_metrics', 'metrics_dismissed', 'enable_human_web', 'human_web_dismissed', 'account_dismissed', 'tour_alert_dismissed', 'import_callout_dismissed', 'site_whitelist', 'site_blacklist', 'selected_app_ids', 'site_specific_blocks', 'site_specific_unblocks'];

		this.buildBrowserInfo();
	}

	buildBrowserInfo() {
		var ua = (0, _uaParserJs2.default)(navigator.userAgent),
		    browser = ua.browser.name.toLowerCase(),
		    version = ua.browser.version,
		    platform = ua.os.name.toLowerCase();

		if (browser.includes('edge')) {
			this.BROWSER_INFO.displayName = 'Edge';
			this.BROWSER_INFO.name = 'edge';
			this.BROWSER_INFO.token = 'ed';
		} else if (browser.includes('opera')) {
			this.BROWSER_INFO.displayName = 'Opera';
			this.BROWSER_INFO.name = 'opera';
			this.BROWSER_INFO.token = 'op';
		} else if (browser.includes('chrome')) {
			this.BROWSER_INFO.displayName = 'Chrome';
			this.BROWSER_INFO.name = 'chrome';
			this.BROWSER_INFO.token = 'ch';
		} else if (browser.includes('firefox')) {
			this.BROWSER_INFO.displayName = 'Firefox';
			this.BROWSER_INFO.name = 'firefox';
			this.BROWSER_INFO.token = 'ff';
		} else if (browser.includes('yandex')) {
			this.BROWSER_INFO.displayName = 'Yandex';
			this.BROWSER_INFO.name = 'yandex';
			this.BROWSER_INFO.token = 'yx';
		}

		if (platform.includes('mac')) {
			this.BROWSER_INFO.os = 'mac';
		} else if (platform.includes('win')) {
			this.BROWSER_INFO.os = 'win';
		} else if (platform.includes('linux')) {
			this.BROWSER_INFO.os = 'linux';
		} else if (platform.includes('android')) {
			this.BROWSER_INFO.os = 'android';
		}

		this.BROWSER_INFO.version = version;
	}
}

exports.default = new Globals();
module.exports = exports['default'];

},{"ua-parser-js":5}]},{},[1])

//# sourceMappingURL=ghostery_dot_com.js.map
