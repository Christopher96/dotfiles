if(typeof browser!=='undefined'){chrome=browser;}
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Backbone = require('backbone'),
    Models = require('../models/Models'),
    t = chrome.i18n.getMessage;

var Collections = {
	Categories: Backbone.Collection.extend({
		model: Models.Category,
		comparator: function (category) {
			return -1 * category.get('num_total');
		},

		buildCollectionData: function (bugdb, selectedApps) {
			var appId,
			    category,
			    blocked,
			    categories = {},
			    categoryName,
			    categoryArray = [];

			for (appId in bugdb.apps) {
				if (bugdb.apps.hasOwnProperty(appId)) {
					category = bugdb.apps[appId].cat;
					if (!t('category_' + category)) {
						category = 'uncategorized';
					}
					blocked = selectedApps.hasOwnProperty(appId);

					if (categories[category] && categories[category].trackers[bugdb.apps[appId].name]) {
						continue;
					}

					if (categories.hasOwnProperty(category)) {
						categories[category].num_total++;
						if (blocked) {
							categories[category].num_blocked++;
						}
					} else {
						categories[category] = {
							id: category,
							name: t('category_' + category),
							description: t('category_' + category + '_desc'),
							img_name: category === 'advertising' ? 'adv' : category === 'social_media' ? 'smed' : category,
							num_total: 1,
							num_blocked: blocked ? 1 : 0,
							trackers: {}
						};
					}
					categories[category].trackers[bugdb.apps[appId].name] = {
						id: appId,
						name: bugdb.apps[appId].name,
						description: '',
						blocked: blocked,
						shouldShow: true,
						catId: category
					};
				}
			}

			for (categoryName in categories) {
				if (categories.hasOwnProperty(categoryName)) {
					categoryArray.push(categories[categoryName]);
				}
			}

			this.reset(categoryArray);
		}
	}),
	Trackers: Backbone.Collection.extend({
		model: Models.Tracker,
		comparator: function (category) {
			return category.get('name').toLowerCase();
		},

		buildCollectionData: function (trackers) {
			var trackerName,
			    trackersArray = [];
			for (trackerName in trackers) {
				if (trackers.hasOwnProperty(trackerName)) {
					trackersArray.push(trackers[trackerName]);
				}
			}

			this.reset(trackersArray);
		},
		resetCollectionBlocked: function () {
			this.models.forEach(function (model) {
				model.set('blocked', false);
				model.set('shouldShow', true);
			});
			return this.models.length;
		},
		setCollectionBlocked: function (appIds = {}) {
			var count = 0;
			this.models.forEach(function (model) {
				if (appIds && appIds.hasOwnProperty(model.get('id'))) {
					count++;
					model.set('blocked', true);
				} else {
					model.set('blocked', false);
				}
			});
			return count;
		},
		searchCollection: function (query) {
			var count = 0;
			this.models.forEach(function (model) {
				if (model.get('name').toLowerCase().indexOf(query.toLowerCase()) >= 0) {
					count++;
					model.set('shouldShow', true);
				} else {
					model.set('shouldShow', false);
				}
			});
			return count;
		},
		searchBlocked: function () {
			var count = 0;
			this.models.forEach(function (model) {
				if (model.get('blocked')) {
					count++;
					model.set('shouldShow', true);
				} else {
					model.set('shouldShow', false);
				}
			});
			return count;
		},
		searchUnblocked: function () {
			var count = 0;
			this.models.forEach(function (model) {
				if (!model.get('blocked')) {
					count++;
					model.set('shouldShow', true);
				} else {
					model.set('shouldShow', false);
				}
			});
			return count;
		},
		searchAppIds: function (appIds) {
			var count = 0;
			this.models.forEach(function (model) {
				if (appIds && appIds.indexOf(parseInt(model.get('id'))) > -1) {
					count++;
					model.set('shouldShow', true);
				} else {
					model.set('shouldShow', false);
				}
			});
			return count;
		}
	})
};

module.exports = Collections;

},{"../models/Models":2,"backbone":9}],2:[function(require,module,exports){
'use strict';

var Backbone = require('backbone');

var Models = {
	Category: Backbone.Model.extend({
		defaults: {
			id: '',
			name: '',
			description: '',
			img_name: '',
			num_total: 0,
			num_shown: 0,
			num_blocked: 0
		},
		idAttribute: 'id'
	}),
	Tracker: Backbone.Model.extend({
		defaults: {
			id: '',
			name: '',
			description: '',
			blocked: false,
			shouldShow: true,
			catId: ''
		},
		idAttribute: 'name'
	})
};

module.exports = Models;

},{"backbone":9}],3:[function(require,module,exports){
'use strict';

var $ = require('jquery'),
    moment = require('moment/min/moment-with-locales.min.js'),
    Collections = require('./collections/Collections'),
    CategoriesView = require('./views/Categories'),
    msg = require('../utils/msg')('settings'),
    t = chrome.i18n.getMessage,
    sendMessage = msg.sendMessage,
    sendMessageInPromise = msg.sendMessageInPromise,
    onMessage = msg.onMessage,
    log = msg.log,
    isEdge = msg.isEdge,
    alertTimeout,
    SYNC_SET,
    LANGUAGE = 'en',
    AB_TESTS = {},
    FROM_SETTINGS_UPDATE = false;

var GeneralSettings = function (window, document, undefined) {
	var data = {
		enable_autoupdate: {
			type: 'checkbox',
			el: $('#option-auto-update'),
			value: true
		},
		bugs_last_checked: {
			type: 'date',
			el: $('#option-last-updated'),
			value: ''
		},
		bugs_last_updated: {
			type: 'date',
			value: new Date()
		},
		updateNow: {
			type: 'update-link',
			el: $('#option-update-now')
		},
		show_tracker_urls: {
			type: 'checkbox',
			el: $('#conf-show_tracker_urls'),
			value: true
		},
		enable_click2play: {
			type: 'checkbox',
			el: $('#option-show-feature'),
			value: true
		},
		enable_click2play_social: {
			type: 'checkbox',
			el: $('#option-replace-social'),
			value: true
		},
		toggle_individual_trackers: {
			type: 'checkbox',
			el: $('#conf-toggle_individual_trackers'),
			value: true
		},
		ignore_first_party: {
			type: 'checkbox',
			el: $('#option-third-party'),
			value: true
		},
		block_by_default: {
			type: 'checkbox',
			el: $('#option-block-new'),
			value: false
		},
		show_alert: {
			type: 'checkbox',
			el: $('#option-show-alert'),
			value: false
		},
		alert_bubble_timeout: {
			type: 'select',
			el: $('#dismiss-after'),
			value: '15'
		},
		alert_bubble_pos: {
			type: 'select',
			el: $('#display-in'),
			value: 'br'
		},
		hide_alert_trusted: {
			type: 'checkbox',
			el: $('#conf-hide_alert_trusted'),
			value: false
		},
		show_cmp: {
			type: 'checkbox',
			el: $('#option-allow-messages'),
			value: false
		},
		notify_upgrade_updates: {
			type: 'checkbox',
			el: $('#option-allow-upgrade-notifications'),
			value: true
		},
		notify_hotfix_updates: {
			type: 'checkbox',
			el: $('#option-allow-hotfix-notifications'),
			value: false
		},
		notify_library_updates: {
			type: 'checkbox',
			el: $('#option-notify-new'),
			value: false
		},
		reload_banner_status: {
			type: 'checkbox',
			el: $('#conf-reload_banner_status'),
			value: true
		},
		trackers_banner_status: {
			type: 'checkbox',
			el: $('#conf-trackers_banner_status'),
			value: true
		},
		show_badge: {
			type: 'checkbox',
			el: $('#conf-show_badge'),
			value: true
		},
		ghostrank: {
			type: 'checkbox',
			el: $('#option-ghostrank-enable'),
			value: false
		},
		enable_metrics: {
			type: 'checkbox',
			el: $('#conf-enable_metrics'),
			value: false
		},
		enable_human_web: {
			type: 'checkbox',
			el: $('#conf-enable_human_web'),
			value: true
		},
		ghostrankModal: {
			type: 'modal',
			elOptIn: $('.modal-ghostrank-opt-in'),
			elOptOut: $('.modal-ghostrank-opt-out')
		},
		metricsModal: {
			type: 'modal',
			elOptIn: $('.modal-metrics-opt-in'),
			elOptOut: $('.modal-metrics-opt-out')
		},
		humanWebModal: {
			type: 'modal',
			elOptIn: $('.modal-human-web-opt-in'),
			elOptOut: $('.modal-human-web-opt-out')
		},
		account_dismissed: {
			type: 'modal',
			elCreateAcct: $('.modal-account-create'),
			elSignIn: $('.modal-account-sign-in'),
			elNoThanks: $('.modal-account-no-thanks'),
			value: false
		},
		tour_alert_dismissed: {
			type: 'callout',
			elClose: $('.start-tour-callout .btn-yestour, .start-tour-callout .btn-notour, .start-tour-callout .close-button'),
			value: false
		},
		import_callout_dismissed: {
			type: 'callout',
			value: true
		},

		tagSettings: {
			type: 'view',
			view: new CategoriesView({
				collection: new Collections.Categories(),
				el: $('#blocking-options #categories-table')
			}),
			newAppIds: [],
			elInput: $('#blocking-options .search-box input'),
			elBlock: $('#blocking-options #block-all'),
			elUnblock: $('#blocking-options #unblock-all'),
			elClear: $('#blocking-options #clear-trackers'),
			elCalloutImport: $('#blocking-options #callout-import'),
			elCalloutImportClose: $('#blocking-options #callout-import .close-button'),
			elCalloutClear: $('#blocking-options #callout-clear'),
			elCalloutBlock: $('#blocking-options #callout-block'),
			elCalloutUnblock: $('#blocking-options #callout-unblock'),
			elFilterParent: $('#blocking-options #filter-parent'),
			elFilterAll: $('#blocking-options #filter-all'),
			elFilterBlocked: $('#blocking-options #filter-blocked'),
			elFilterUnblocked: $('#blocking-options #filter-unblocked'),
			elFilterNew: $('#blocking-options #filter-new'),
			elCategoriesCollapse: $('#blocking-options #cats-collapse'),
			elCategoriesExpand: $('#blocking-options #cats-expand')
		},

		site_whitelist: {
			type: 'array',
			elButton: $('#trusted-sites .sites-input-box i'),
			elInput: $('#trusted-sites .sites-input-box input'),
			elList: $('#trusted-sites .sites-list'),
			elAlert: $('#trusted-sites .callout'),
			textErrorDuplicate: t('whitelist_error_duplicate_url'),
			textErrorOtherList: t('whitelist_error_blacklist_url'),
			value: []
		},
		site_blacklist: {
			type: 'array',
			elButton: $('#restricted-sites .sites-input-box i'),
			elInput: $('#restricted-sites .sites-input-box input'),
			elList: $('#restricted-sites .sites-list'),
			elAlert: $('#restricted-sites .callout'),
			textErrorDuplicate: t('blacklist_error_duplicate_url'),
			textErrorOtherList: t('blacklist_error_whitelist_url'),
			value: []
		},

		browser: {
			type: 'text',
			el: $('#about #browser-name'),
			value: ''
		},
		version: {
			type: 'text',
			el: $('#about #browser-version'),
			value: ''
		},
		licenses: {
			el: $('#about #about-accordion'),
			value: [{
				id: 1,
				packageName: 'Backbone.js',
				licenseLink: 'http://www.opensource.org/licenses/mit-license.php',
				licenseText: ['//     Backbone.js 1.2.3', '', '//     (c) 2010-2012 Jeremy Ashkenas, DocumentCloud Inc.', '//     Backbone may be freely distributed under the MIT license.', '//     For all details and documentation:', '//     http://backbonejs.org'].join('<br>')
			}, {
				id: 2,
				packageName: 'D3',
				licenseLink: 'https://github.com/mbostock/d3/blob/master/LICENSE',
				licenseText: ['Copyright (c) 2010-2015, Michael Bostock', 'All rights reserved.', '', 'Redistribution and use in source and binary forms, with or without', 'modification, are permitted provided that the following conditions are met:', '' + '* Redistributions of source code must retain the above copyright notice, this', 'list of conditions and the following disclaimer.', '', '* Redistributions in binary form must reproduce the above copyright notice,', 'this list of conditions and the following disclaimer in the documentation', 'and/or other materials provided with the distribution.', '', '* The name Michael Bostock may not be used to endorse or promote products', 'derived from this software without specific prior written permission.', '', 'THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"', 'AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE', 'IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE', 'DISCLAIMED. IN NO EVENT SHALL MICHAEL BOSTOCK BE LIABLE FOR ANY DIRECT,', 'INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,', 'BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,', 'DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY', 'OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING', 'NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,', 'EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.'].join('<br>')
			}, {
				id: 3,
				packageName: 'jQuery',
				licenseLink: 'http://jquery.org/license',
				licenseText: ['/*!', ' * jQuery JavaScript Library v2.1.4', ' * http://jquery.com/', ' *', ' * Copyright 2011, John Resig', ' * Dual licensed under the MIT or GPL Version 2 licenses.', ' * http://jquery.org/license', ' *', ' * Includes Sizzle.js', ' * http://sizzlejs.com/', ' * Copyright 2011, The Dojo Foundation', ' * Released under the MIT, BSD, and GPL Licenses.', ' *', ' * Date: Wed Mar 21 12:46:34 2012 -0700', ' */'].join('<br>')
			}, {
				id: 4,
				packageName: 'Moment.js',
				licenseLink: 'http://www.opensource.org/licenses/mit-license.php',
				licenseText: ['//! moment.js', '//! version : 2.10.6', '//! authors : Tim Wood, Iskren Chernev, Moment.js contributors', '//! license : MIT', '//! momentjs.com'].join('<br>')
			}, {
				id: 5,
				packageName: 'Underscore.js',
				licenseLink: 'http://www.opensource.org/licenses/mit-license.php',
				licenseText: ['//     Underscore.js 1.8.3', '//     http://underscorejs.org', '//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.', '//     Underscore may be freely distributed under the MIT license.'].join('<br>')
			}, {
				id: 6,
				packageName: 'Clamp.js',
				licenseLink: 'http://sam.zoy.org/wtfpl/',
				licenseText: ['/*!', '* Clamp.js 0.5.1', '*', '* Copyright 2011-2013, Joseph Schmitt http://joe.sh', '* Released under the WTFPL license', '* http://sam.zoy.org/wtfpl/', '*/'].join('<br>')
			}, {
				id: 7,
				packageName: 'jQuery animateNumber',
				licenseLink: 'https://github.com/aishek/jquery-animateNumber/blob/master/LICENSE',
				licenseText: ['The MIT License (MIT)', '', 'Copyright (c) 2013 Alexandr Borisov', '', 'Permission is hereby granted, free of charge, to any person obtaining a copy of', 'this software and associated documentation files (the "Software"), to deal in', 'the Software without restriction, including without limitation the rights to', 'use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of', 'the Software, and to permit persons to whom the Software is furnished to do so,', 'subject to the following conditions:', '', 'The above copyright notice and this permission notice shall be included in all', 'copies or substantial portions of the Software.', '', 'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR', 'IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS', 'FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR', 'COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER', 'IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN', 'CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.'].join('<br>')
			}, {
				id: 8,
				packageName: "Bootstrap",
				licenseLink: 'https://github.com/twbs/bootstrap/blob/master/LICENSE',
				licenseText: ['/*!', '* Bootstrap v3.3.5 (http://getbootstrap.com)', '* Copyright 2011-2015 Twitter, Inc.', '* Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)', '*//*! normalize.css v3.0.3 | MIT License | github.com/necolas/normalize.css */'].join('<br>')
			}, {
				id: 9,
				packageName: "Foundation",
				licenseLink: "https://github.com/zurb/foundation-sites/blob/master/LICENSE",
				licenseText: ["Copyright (c) 2013-2016 ZURB, inc.", "", "MIT License", "", "Permission is hereby granted, free of charge, to any person obtaining", "a copy of this software and associated documentation files (the", "\"Software\"), to deal in the Software without restriction, including", "without limitation the rights to use, copy, modify, merge, publish,", "distribute, sublicense, and/or sell copies of the Software, and to", "permit persons to whom the Software is furnished to do so, subject to", "the following conditions:", "", "The above copyright notice and this permission notice shall be", "included in all copies or substantial portions of the Software.", "", "THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND,", "EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF", "MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND", "NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE", "LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION", "OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION", "WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE."].join('<br>')
			}, {
				id: 10,
				packageName: "Sails",
				licenseLink: "https://github.com/balderdashy/sails/blob/master/LICENSE.md",
				licenseText: ["The MIT License (MIT)", "--", "", "Copyright © 2012-2016 Mike McNeil & Balderdash Design Co.", "", "Permission is hereby granted, free of charge, to any person obtaining", "a copy of this software and associated documentation files (the", "\"Software\"), to deal in the Software without restriction, including", "without limitation the rights to use, copy, modify, merge, publish,", "distribute, sublicense, and/or sell copies of the Software, and to", "permit persons to whom the Software is furnished to do so, subject to", "the following conditions:", "", "The above copyright notice and this permission notice shall be", "included in all copies or substantial portions of the Software.", "", "THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND,", "EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF", "MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND", "NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE", "LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION", "OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION", "WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE."].join('<br>')
			}]
		}
	};
	var oldSettings = {};

	var getSettings = function () {
		const settings = {};
		SYNC_SET.forEach(key => {
			if (data[key] !== undefined) {
				settings[key] = data[key].value;
			}
		});
		return {
			conf: settings,
			prefs: {
				bugs_last_checked: data.bugs_last_checked.value
			}
		};
	};
	var setSettings = function (message) {
		SYNC_SET.forEach(key => {
			if (!data.hasOwnProperty(key)) {
				data[key] = {};
			}
			if (message.conf[key] !== undefined && key !== 'reload_banner_status' && key !== 'trackers_banner_status') {
				data[key].value = message.conf[key];
			}
		});

		data.login_info = { value: message.login_info };

		if (!AB_TESTS.hasOwnProperty("human_web") || isEdge) {
			data.enable_human_web.el.parent().hide();
		} else {
			data.enable_human_web.el.parent().show();
		}

		data.reload_banner_status.value = message.conf.reload_banner_status.show;
		data.trackers_banner_status.value = message.conf.trackers_banner_status.show;

		data.bugs_last_checked.value = message.prefs.bugs_last_checked;
		data.bugs_last_updated.value = message.prefs.bugs_last_updated;

		data.browser.value = message.browser;
		data.version.value = message.version;

		oldSettings = getSettings();
	};
	var emitSettings = function (showCallout = true) {
		var settings = getSettings();
		if (showCallout) {
			alertTimeout = setTimeout(function () {
				setAlertClasses('saving');
			}, 750);
		}
		sendMessageInPromise('update_settings', settings).then(() => {
			if (showCallout) {
				setAlertClasses('saved');
				alertTimeout = setTimeout(setAlertClasses, 750);
			}

			if (AB_TESTS.hasOwnProperty("human_web") && !isEdge) {
				sendMessage('onHWSettingChanged', settings.conf.enable_human_web);
			}
			oldSettings = getSettings();
		}).catch(err => {
			setAlertClasses('error');
			alertTimeout = setTimeout(setAlertClasses, 750);
		});
	};
	var setAlertClasses = function (cls) {
		clearTimeout(alertTimeout);
		$('.alert-messages').removeClass('saved saving');
		if (cls) {
			$('.alert-messages').addClass(cls);
		}
	};

	class ModalHandler {
		constructor(data) {
			this.data = data;
			this.getNumberOfDotsCalled = false;
			this.modalIndex = 0;
			this.numDots = 0;
			this.dotIndex = 0;

			this.modals = {
				welcome: $('#welcome_modal_v1_display'),
				metrics: $('#metrics_modal_display'),
				human_web: $('#human_web_modal_display'),
				account: $('#account_modal_display'),
				learn: $('#learn_more_modal_display'),
				learn_human_web: $('#learn_more_human_web_modal_display')
			};
		}

		setData(data) {
			this.data = data;
		}

		showModal(name) {
			var openFoundation = false;
			Object.keys(this.modals).forEach(key => {
				if (this.modals.hasOwnProperty(key)) {
					if (key === name) {
						openFoundation = true;
						this.modals[key].css('display', '');
					} else {
						this.modals[key].css('display', 'none');
					}
				}
			});
			if (openFoundation) {
				window.dispatchEvent(new window.Event('openModalFoundation'));
			} else {
				window.dispatchEvent(new window.Event('closeModalFoundation'));
			}
		}

		getNumberOfDots() {
			if (this.getNumberOfDotsCalled) {
				return;
			}
			this.getNumberOfDotsCalled = true;
			let numDots = 0;

			if (this.runGhostrank()) {
				numDots++;
			}
			if (this.runMetrics()) {
				numDots++;
			}
			if (this.runHumanWeb()) {
				numDots++;
			}
			if (this.runAccount()) {
				numDots++;
			}
			this.numDots = numDots;
			this.dotIndex = 1;
		}

		renderDots(id) {
			if (this.numDots > 1) {
				let divEl = $('#' + id + ' div.location-container');
				divEl.empty();
				if (divEl) {
					let count = 0;
					let width = 14 * this.numDots - 6;
					let html = '<svg height="8" width="' + width + '">';
					while (++count <= this.numDots) {
						if (count === this.dotIndex) {
							html += '<circle cx="' + (4 + 14 * (count - 1)) + '" cy="4" r="4" stroke="none" fill="#4a4a4a" />';
						} else {
							html += '<circle cx="' + (4 + 14 * (count - 1)) + '" cy="4" r="4" stroke="none" fill="#d8d8d8" />';
						}
					}
					html += '</svg>';

					divEl.append(html);
				}
			}

			this.dotIndex++;
		}

		runGhostrank() {
			return !this.data.ghostrank_dismissed.value;
		}

		runMetrics() {
			return !this.data.metrics_dismissed.value;
		}

		runHumanWeb() {
			return !this.data.human_web_dismissed.value && AB_TESTS.hasOwnProperty("human_web") && !isEdge;
		}

		runAccount() {
			return !this.data.account_dismissed.value && !this.data.login_info.value.logged_in;
		}
		renderModal() {
			this.getNumberOfDots();
			this.modalIndex++;

			if (this.modalIndex === 1) {
				if (this.runGhostrank()) {
					this.showModal('welcome');
					this.renderDots('welcome_modal_v1_display');
					let that = this;
					$('.learn_more_modal').click(function () {
						that.showModal('learn');
						$('.back_to_welcome').click(function () {
							that.showModal('welcome');
						});
					});
				} else {
					this.renderModal();
				}
			} else if (this.modalIndex === 2) {
				if (this.runMetrics()) {
					this.showModal('metrics');
					this.renderDots('metrics_modal_display');
				} else {
					this.renderModal();
				}
			} else if (this.modalIndex === 3) {
				if (this.runHumanWeb()) {
					this.showModal('human_web');
					this.renderDots('human_web_modal_display');
					let that = this;
					$('.learn_more_human_web_modal').click(function () {
						that.showModal('learn_human_web');
						$('.back_to_human_web').click(function () {
							that.showModal('human_web');
						});
					});
				} else {
					this.renderModal();
				}
			} else if (this.modalIndex === 4) {
				if (this.runAccount()) {
					this.showModal('account');
					this.renderDots('account_modal_display');
				} else {
					this.renderModal();
				}
			} else {
				this.showModal();
			}
		}
	}

	var modalHandler = new ModalHandler(data);

	var updatePageGeneral = function (runModal = true) {
		SYNC_SET.forEach(key => {
			if (data[key] !== undefined && data[key].el !== undefined) {
				if (data[key].type === 'select') {
					let selection = data[key].el.children('[value="' + data[key].value + '"]');
					if (selection) {
						selection.prop('selected', true);
					}
				} else {
					data[key].el.prop('checked', data[key].value);
				}
			}
		});

		if (!FROM_SETTINGS_UPDATE) {
			data.bugs_last_checked.el.text(!!data.bugs_last_checked.value.getDate || typeof data.bugs_last_checked.value === 'string' ? t('library_updated_on', data.bugs_last_checked.value) : t('library_never_updated'));
			if (runModal) {
				modalHandler.renderModal();
			}
		} else {
			FROM_SETTINGS_UPDATE = false;
		}

		moment.locale(LANGUAGE.replace('_', '-').toLowerCase());
	};
	var setTextUpdateNow = function (status) {
		switch (status) {
			case 'update-now':
				data.updateNow.el.text(t('library_update_now_link'));
				emitSettings(false);
				break;
			case 'success':
				data.updateNow.el.text(t('library_update_successful'));
				data.bugs_last_checked.el.text(t('library_updated_on', moment().format('LLL')));
				emitSettings(false);
				break;
			case 'fail':
				data.updateNow.el.text(t('library_update_failed'));
				break;
			case 'no-change':
				data.updateNow.el.text(t('library_update_already_updated'));
				data.bugs_last_checked.el.text(t('library_updated_on', moment().format('LLL')));
				emitSettings(false);
				break;
		}
	};

	var populateTagSettings = function (bugs, selectedApps) {
		data.tagSettings.view.collection.buildCollectionData(bugs, selectedApps);
		data.tagSettings.view.render();
	};
	var setTableCallouts = function (status) {
		data.tagSettings.elCalloutImport.addClass('hide');
		data.tagSettings.elCalloutClear.addClass('hide');
		data.tagSettings.elCalloutBlock.addClass('hide');
		data.tagSettings.elCalloutUnblock.addClass('hide');
		data.import_callout_dismissed.value = true;
		emitSettings(false);

		if (status === 'clear') {
			data.tagSettings.elCalloutClear.removeClass('hide').attr('style', '');
		} else if (status === 'block') {
			data.tagSettings.elCalloutBlock.removeClass('hide').attr('style', '');
			data.block_by_default.value = true;
			updatePageGeneral();
			emitSettings();
		} else if (status === 'unblock') {
			data.tagSettings.elCalloutUnblock.removeClass('hide').attr('style', '');
			data.block_by_default.value = false;
			updatePageGeneral();
			emitSettings();
		}
	};

	var updateList = function (element) {
		var i;
		element.elList.text('');

		for (i = 0; i < element.value.length; i++) {
			updateListRow(element, element.value[i]);
		}
	};
	var updateListRow = function (element, site) {
		var item = Utils.createEl('li'),
		    remove = Utils.createEl('i');

		item.textContent = site;
		remove.className = 'fa fa-times remove';

		remove.addEventListener('click', function () {
			element.value.splice(element.value.indexOf(site), 1);
			updateList(element);
			emitSettings();
		});

		Utils.appendChild(item, remove);
		element.elList.append(item);
	};
	var showListError = function (element, error) {
		if (error) {
			element.elAlert.show();
			element.elAlert.text(error);
		} else {
			element.elAlert.hide();
		}
	};
	var setListSite = function (element, otherElement) {
		var url = element.elInput.val().toLowerCase().replace(/^(http[s]?:\/\/)?(www\.)?/, ''),
		    isValidUrlRegex = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i;

		if (url.length >= 2083 || !isValidUrlRegex.test(url)) {
			showListError(element, t('white_black_list_error_invalid_url'));
			return false;
		} else if (element.value.indexOf(url) >= 0) {
			showListError(element, element.textErrorDuplicate);
			return false;
		}

		if (otherElement.value.indexOf(url) >= 0) {
			showListError(element, element.textErrorOtherList);
			showListError(otherElement, '');
			otherElement.value.splice(otherElement.value.indexOf(url), 1);
			updateList(otherElement);
		} else {
			showListError(element, '');
		}

		element.elInput.val('');
		element.value.push(url);
		updateList(element);
		emitSettings();
	};

	var updateLibraries = function (element) {
		var i;
		element.el.text('');

		for (i = 0; i < element.value.length; i++) {
			updateLibrariesRow(element, element.value[i]);
		}
	};
	var updateLibrariesRow = function (element, library) {
		var item = Utils.createEl('li'),
		    link = Utils.createEl('a'),
		    content = Utils.createEl('div'),
		    contentLink = Utils.createEl('a'),
		    contentText = Utils.createEl('div');

		item.className = 'accordion-item';
		link.href = '#library' + library.id;
		link.setAttribute('role', 'tab');
		link.className = 'accordion-title';
		link.id = 'library' + library.id + '-heading';
		link.setAttribute('aria-controls', 'library' + library.id);
		link.textContent = library.packageName;
		content.id = 'library' + library.id;
		content.className = 'accordion-content';
		content.setAttribute('role', 'tabpanel');
		content.setAttribute('data-tab-content', '');
		content.setAttribute('aria-labelledby', 'library' + library.id + '-heading');
		contentLink.href = library.licenseLink;
		contentLink.textContent = library.licenseLink;
		contentLink.target = '_blank';
		contentText.innerHTML = library.licenseText;

		Utils.appendChild(content, contentLink, contentText);
		Utils.appendChild(item, link, content);
		element.el.append(item);
	};

	var _onDatabaseUpdated = function (message) {
		if (!message.success) {
			setTextUpdateNow('fail');
			return;
		} else if (!message.isNewUpdate) {
			setTextUpdateNow('no-change');
			return;
		}

		setSettings(message);
		updatePageGeneral();
		updateList(data.site_whitelist);
		updateList(data.site_blacklist);
		setTextUpdateNow('success');

		populateTagSettings(message.bugs, message.conf.selected_app_ids);
		data.tagSettings.newAppIds = message.prefs.newAppIds;
		if (data.import_callout_dismissed.value) {
			setTableCallouts();
		}
		window.dispatchEvent(new window.Event('initBlocking'));
	};

	var _buildBindings = function () {
		var i;
		for (i in data) {
			if (data[i].type === 'checkbox') {
				(function (element) {
					element.el.off().on('click', function () {
						element.value = element.el.prop('checked');
						emitSettings();
					});
				})(data[i]);
			}
		}
		data.alert_bubble_timeout.el.off().on('change', function () {
			data.alert_bubble_timeout.value = data.alert_bubble_timeout.el.children(':selected').prop('value');
			emitSettings();
		});
		data.alert_bubble_pos.el.off().on('change', function () {
			data.alert_bubble_pos.value = data.alert_bubble_pos.el.children(':selected').prop('value');
			emitSettings();
		});
		data.updateNow.el.off().on('click', function (e) {
			e.preventDefault();
			data.updateNow.el.text(t('library_update_in_progress'));
			sendMessageInPromise('update_database').then(_onDatabaseUpdated).catch(err => {
				setTextUpdateNow('fail');
			});
		});

		data.ghostrankModal.elOptIn.off().on('click', function () {
			data.ghostrank.value = true;
			data.ghostrank_dismissed.value = true;
			emitSettings(false);
			modalHandler.setData(data);
			modalHandler.renderModal();
			updatePageGeneral(false);
			sendMessage('ping', 'install');
			sendMessage('ping', 'opt_in_ext');
		});
		data.ghostrankModal.elOptOut.off().on('click', function () {
			data.ghostrank.value = false;
			data.ghostrank_dismissed.value = true;
			modalHandler.setData(data);
			emitSettings(false);
			modalHandler.renderModal();
			updatePageGeneral(false);
			sendMessage('ping', 'install');
			sendMessage('ping', 'opt_out_ext');
		});
		data.metricsModal.elOptIn.off().on('click', function () {
			data.enable_metrics.value = true;
			data.metrics_dismissed.value = true;
			modalHandler.setData(data);
			emitSettings(false);
			modalHandler.renderModal();
			updatePageGeneral(false);
		});
		data.metricsModal.elOptOut.off().on('click', function () {
			data.enable_metrics.value = false;
			data.metrics_dismissed.value = true;
			modalHandler.setData(data);
			emitSettings(false);
			modalHandler.renderModal();
			updatePageGeneral(false);
		});
		data.humanWebModal.elOptIn.off().on('click', function () {
			data.enable_human_web.value = true;
			data.human_web_dismissed.value = true;
			modalHandler.setData(data);
			emitSettings(false);
			modalHandler.renderModal();
			updatePageGeneral(false);
		});
		data.humanWebModal.elOptOut.off().on('click', function () {
			data.enable_human_web.value = false;
			data.human_web_dismissed.value = true;
			modalHandler.setData(data);
			emitSettings(false);
			modalHandler.renderModal();
			updatePageGeneral(false);
		});

		data.account_dismissed.elCreateAcct.off().on('click', function () {
			data.account_dismissed.value = true;
			modalHandler.setData(data);
			emitSettings(false);
			sendMessage('ping', 'account_start');
			modalHandler.renderModal();
			updatePageGeneral(false);
		});
		data.account_dismissed.elSignIn.off().on('click', function (event) {
			event.preventDefault();
			data.account_dismissed.value = true;
			modalHandler.setData(data);
			emitSettings(false);
			updatePageGeneral(false);
			window.location = event.target.href;
		});
		data.account_dismissed.elNoThanks.off().on('click', function () {
			data.account_dismissed.value = true;
			modalHandler.setData(data);
			emitSettings(false);
			updatePageGeneral(false);
		});
		data.tour_alert_dismissed.elClose.off().on('click', function (event) {
			data.tour_alert_dismissed.value = true;
			modalHandler.setData(data);
			emitSettings(false);
			updatePageGeneral(false);
			if (event.target.className.includes('btn-yestour')) {
				sendMessage('ping', 'tour_start');
			}
		});

		data.site_whitelist.elButton.off().on('click', function () {
			setListSite(data.site_whitelist, data.site_blacklist);
		});
		data.site_whitelist.elInput.off().keypress(function (e) {
			if (e.keyCode === 13) {
				setListSite(data.site_whitelist, data.site_blacklist);
			}
		});
		data.site_blacklist.elButton.off().on('click', function () {
			setListSite(data.site_blacklist, data.site_whitelist);
		});
		data.site_blacklist.elInput.off().keypress(function (e) {
			if (e.keyCode === 13) {
				setListSite(data.site_blacklist, data.site_whitelist);
			}
		});

		data.tagSettings.elInput.off().keyup(function () {
			var num_returned,
			    query = data.tagSettings.elInput.val();

			window.dispatchEvent(new window.Event(query ? 'expandCategories' : 'collapseCategories'));
			data.tagSettings.elFilterParent.removeClass('all blocked unblocked new').addClass('all');
			data.tagSettings.view.views.forEach(function (category) {
				num_returned = category.trackersView.collection.searchCollection(query);
				category.model.set('num_shown', num_returned);
			});
		});
		data.tagSettings.elCalloutImportClose.off().on('click', function () {
			setTableCallouts();
		});
		data.tagSettings.elBlock.off().on('click', function () {
			setTableCallouts('block');
			data.tagSettings.view.views.forEach(function (category) {
				category.model.set('num_blocked', category.trackersView.views.length);
				category.trackersView.views.forEach(function (tracker) {
					tracker.model.set('blocked', true);
				});
			});

			sendMessageInPromise('set_state_global', { blocked: true }).then(() => {
				setAlertClasses('saved');
				alertTimeout = setTimeout(setAlertClasses, 750);
			}).catch(err => {
				log('elBlock set_state_global error', err);
			});
		});
		data.tagSettings.elUnblock.off().on('click', function () {
			setTableCallouts('unblock');
			data.tagSettings.view.views.forEach(function (category) {
				category.model.set('num_blocked', 0);
				category.trackersView.views.forEach(function (tracker) {
					tracker.model.set('blocked', false);
				});
			});

			sendMessageInPromise('elUnblock set_state_global', { blocked: false }).then(() => {
				setAlertClasses('saved');
				alertTimeout = setTimeout(setAlertClasses, 750);
			}).catch(err => {
				log('set_state_global error', err);
			});
		});
		data.tagSettings.elClear.off().on('click', function (e) {
			var num_returned;
			e.preventDefault();
			setTableCallouts('clear');
			window.dispatchEvent(new window.Event('collapseCategories'));
			data.tagSettings.elInput.val('');
			data.tagSettings.elFilterParent.removeClass('all blocked unblocked new').addClass('all');
			data.tagSettings.view.views.forEach(function (category) {
				num_returned = category.trackersView.collection.resetCollectionBlocked();
				category.model.set('num_blocked', 0);
				category.model.set('num_shown', num_returned);
			});

			sendMessageInPromise('clear_ss_tracker_settings').then(() => {
				setAlertClasses('saved');
				alertTimeout = setTimeout(setAlertClasses, 750);
			}).catch(err => {
				log('elClear clear_ss_tracker_settings error', err);
			});

			window.dispatchEvent(new window.Event('collapseCategories'));
		});
		data.tagSettings.elFilterAll.off().on('click', function () {
			var num_returned;
			window.dispatchEvent(new window.Event('expandCategories'));
			data.tagSettings.elInput.val('');
			data.tagSettings.elFilterParent.removeClass('all blocked unblocked new').addClass('all');
			data.tagSettings.view.views.forEach(function (category) {
				num_returned = category.trackersView.collection.searchCollection('');
				category.model.set('num_shown', num_returned);
			});
		});
		data.tagSettings.elFilterBlocked.off().on('click', function () {
			var num_returned;
			window.dispatchEvent(new window.Event('expandCategories'));
			data.tagSettings.elInput.val('');
			data.tagSettings.elFilterParent.removeClass('all blocked unblocked new').addClass('blocked');
			data.tagSettings.view.views.forEach(function (category) {
				num_returned = category.trackersView.collection.searchBlocked();
				category.model.set('num_shown', num_returned);
			});
		});
		data.tagSettings.elFilterUnblocked.off().on('click', function () {
			var num_returned;
			window.dispatchEvent(new window.Event('expandCategories'));
			data.tagSettings.elInput.val('');
			data.tagSettings.view.views.forEach(function (category) {
				data.tagSettings.elFilterParent.removeClass('all blocked unblocked new').addClass('unblocked');
				num_returned = category.trackersView.collection.searchUnblocked();
				category.model.set('num_shown', num_returned);
			});
		});
		data.tagSettings.elFilterNew.off().on('click', function () {
			filterNewTrackers();
		});
		data.tagSettings.elCategoriesCollapse.off().on('click', function () {
			window.dispatchEvent(new window.Event('collapseCategories'));
		});
		data.tagSettings.elCategoriesExpand.off().on('click', function () {
			window.dispatchEvent(new window.Event('expandCategories'));
		});
	};
	var filterNewTrackers = function () {
		var num_returned;
		window.dispatchEvent(new window.Event('expandCategories'));
		data.tagSettings.elInput.val('');
		data.tagSettings.elFilterParent.removeClass('all blocked unblocked new').addClass('new');
		data.tagSettings.view.views.forEach(function (category) {
			num_returned = category.trackersView.collection.searchAppIds(data.tagSettings.newAppIds);
			category.model.set('num_shown', num_returned);
		});
	};

	var _initialize = function () {
		$('#blocking-options').removeClass('old');
		$('.hide-pre-seven').removeClass('hide-pre-seven');
		data.hide_alert_trusted.el.parent().removeClass('hide');
		data.show_badge.el.parent().removeClass('hide');

		data.tagSettings.elInput.val('');

		showListError(data.site_whitelist);
		showListError(data.site_blacklist);
	};

	var Utils = {
		createEl: function (type) {
			return document.createElement(type);
		},
		appendChild: function (parent) {
			for (var i = 1; i < arguments.length; i++) {
				parent.appendChild(arguments[i]);
			}
		}
	};

	return {
		init: function () {
			_buildBindings();
			_initialize();
		},
		setTranslations: function () {
			data.site_whitelist.textErrorDuplicate = t('whitelist_error_duplicate_url');
			data.site_whitelist.textErrorOtherList = t('whitelist_error_blacklist_url');
			data.site_blacklist.textErrorDuplicate = t('blacklist_error_duplicate_url');
			data.site_blacklist.textErrorOtherList = t('blacklist_error_whitelist_url');
		},
		buildGeneralPage: function (message) {
			$(".language-settings").hide();
			setSettings(message);
			setTextUpdateNow('update-now');
			updatePageGeneral();
			updateList(data.site_whitelist);
			updateList(data.site_blacklist);
		},
		buildTagSettings: function (message) {
			populateTagSettings(message.bugs, message.conf.selected_app_ids);
			data.tagSettings.newAppIds = message.prefs.newAppIds;
			data.tagSettings.elInput.val('');
			data.tagSettings.elFilterParent.removeClass('all blocked unblocked new').addClass('all');

			if (data.import_callout_dismissed.value) {
				setTableCallouts();
			}
			window.dispatchEvent(new window.Event('initBlocking'));

			if (window.location.search.toLowerCase().indexOf('filter=new') > -1) {
				setTimeout(function () {
					filterNewTrackers();
				}, 0);
			}
		},
		updateTagSettings: function (message) {
			data.tagSettings.view.views.forEach(function (category) {
				const num_returned = category.trackersView.collection.setCollectionBlocked(message.conf.selected_app_ids);
				category.model.set('num_blocked', num_returned);
			});
		},
		buildAbout: function (message) {
			updateLibraries(data.licenses);
			data.browser.el.text(data.browser.value);
			data.version.el.text(data.version.value);
			window.dispatchEvent(new window.Event('initAbout'));
		},
		onDatabaseUpdated: _onDatabaseUpdated
	};
}(window, document);

function setPageSettings(settings) {
	SYNC_SET = new Set(settings.syncSetArray);
	LANGUAGE = settings.language;
	AB_TESTS = settings.prefs.abtests;
	GeneralSettings.init();
	GeneralSettings.setTranslations();
	GeneralSettings.buildGeneralPage(settings);
	GeneralSettings.buildTagSettings(settings);
	GeneralSettings.buildAbout(settings);
	window.dispatchEvent(new window.Event('settingsLoaded'));
}

onMessage.addListener((request, sender, callback) => {
	let name = request.name,
	    message = request.message;
	if (name === 'setPageSettings') {
		setPageSettings(message);
	} else if (name === "onPageSettingsUpdated") {
		FROM_SETTINGS_UPDATE = true;

		GeneralSettings.buildGeneralPage(message);
		GeneralSettings.updateTagSettings(message);
		window.dispatchEvent(new window.Event('settingsLoaded'));
	} else if (name === 'onLoginInfoUpdated') {
		window.location.reload();
	}

	if (callback) {
		callback();
	}
});

sendMessage('getPageSettings');

window.dispatchEvent(new window.Event('extensionFound'));

},{"../utils/msg":8,"./collections/Collections":1,"./views/Categories":4,"jquery":10,"moment/min/moment-with-locales.min.js":11}],4:[function(require,module,exports){
'use strict';

var Backbone = require('backbone'),
    CategoryView = require('./Category');

var CategoriesView = Backbone.View.extend({
	render: function () {
		this.views = [];
		this.$el.html('');
		this.collection.each(function (category) {
			var categoryView = new CategoryView({
				model: category
			});
			this.$el.append(categoryView.render().el);
			this.views.push(categoryView);
		}, this);

		return this;
	}
});

module.exports = CategoriesView;

},{"./Category":5,"backbone":9}],5:[function(require,module,exports){
'use strict';

var Backbone = require('backbone'),
    _ = require('underscore'),
    $ = require('jquery'),
    Collections = require('../collections/Collections'),
    TrackersView = require('./Trackers'),
    msg = require('../../utils/msg')('settings'),
    sendMessage = msg.sendMessageInPromise,
    t = chrome.i18n.getMessage;

var CategoryView = Backbone.View.extend({
	tagName: 'li',

	template: _.template('\
		<a href="#<%= img_name %>" role="tab" class="accordion-title" id="<%= id %>-heading" aria-controls="<%= id %>">\
			<div class="category-image float-left">\
				<img src="./images/category_<%= img_name %>.png" alt="<%= name %>">\
			</div>\
			<div class="category-text float-left">\
				<h3>  <%= name %> </h3>\
				<p class="num-trackers">\
					<span class="num-shown">\
						<span class="count"><%= num_shown %></span>\
						<%= blocking_options_trackers %>\
					</span>\
					<span class="num-blocked">\
						<span class="count"><%= num_blocked %></span>\
						<%= blocking_options_blocked %>\
					</span>\
					<span class="all-blocked">\
						<%= blocking_options_blocked_all %>\
					</span>\
				</p>\
				<p class="description"> <%= description %> </p>\
			</div>\
			<div class="clearfix"></div>\
		</a>\
			<div class="category-checkbox float-right" name="<%= id %>">\
				<svg width="20px" height="20px" viewbox="0 0 20 20">\
					<g>\
						<path class="border" d="M1,1 l18,0 l0,18 l-18,0 l0,-18"></path>\
						<path class="background" d="M2,2 l16,0 l0,16 l-16,0 l0,-16"></path>\
						<path class="dash" d="M5,10.5 15,10.5"></path>\
						<polygon class="check" points="5.38461538 9.5 4 11 7.69230769 15 16 6.5 14.6153846 5 7.69230769 12"></polygon>\
					</g>\
				</svg>\
			</div>\
		<div id="<%= img_name %>" class="accordion-content" role="tabpanel" data-tab-content aria-labelledby="<%= id %>-heading"></div>\
	'),


	events: {
		'click .category-checkbox': 'clickCheckbox'
	},
	initialize: function () {
		this.customEvents = _.extend({}, Backbone.Events);
		this.customEvents.on('change:trackerToggle', this.childTrackerToggled, this);

		this.model.on('change:num_shown', this.updateNumShown, this);
		this.model.on('change:num_blocked', this.updateNumBlocked, this);
	},
	render: function () {
		this.model.set('num_shown', this.model.get('num_total'));
		this.model.set('blocking_options_trackers', t('blocking_options_trackers'));
		this.model.set('blocking_options_blocked', t('blocking_options_blocked'));
		this.model.set('blocking_options_blocked_all', t('blocking_options_blocked_all'));
		this.$el.html(this.template(this.model.toJSON()));
		this.$el.addClass('accordion-item');
		this.model.trigger('change:num_blocked', this);

		this.trackersView = new TrackersView({
			collection: new Collections.Trackers(),
			el: this.$('#' + this.model.get('img_name')),
			customEvents: this.customEvents
		});
		this.trackersView.collection.buildCollectionData(this.model.get('trackers'));
		this.trackersView.render();

		return this;
	},

	clickCheckbox: function () {
		var block = this.model.get('num_total') !== this.model.get('num_blocked');
		this.trackersView.views.forEach(function (tracker) {
			tracker.model.set('blocked', block);
		});
		this.model.set('num_blocked', block ? this.trackersView.views.length : 0);

		sendMessage('set_state_category', {
			blocked: block,
			cat_id: this.model.get('id')
		}).then(function () {
			$('.alert-messages').removeClass('saving').addClass('saved');
			setTimeout(() => {
				$('.alert-messages').removeClass('saving saved');
			}, 750);
		}).catch(function () {
			$('.alert-messages').removeClass('saving saved').addClass('error');
			setTimeout(() => {
				$('.alert-messages').removeClass('saving saved error');
			}, 750);
		});

		if (block) {
			sendMessage('ping', this.model.get('id') + '_blocked');
		}
	},

	childTrackerToggled: function (msg) {
		this.model.set('num_blocked', this.model.get('num_blocked') + msg);
	},
	updateNumShown: function () {
		var shown = this.model.get('num_shown');
		this.$('.num-shown .count').text(shown);

		if (shown === 0) {
			this.$('.accordion-content').addClass('hide');
		} else {
			this.$('.accordion-content').removeClass('hide');
		}
	},
	updateNumBlocked: function () {
		var blocked = this.model.get('num_blocked');
		this.$('.num-blocked .count').text(blocked);

		this.$el.removeClass('checked dashed');
		if (blocked === this.model.get('num_total')) {
			this.$el.addClass('checked');
		} else if (blocked !== 0) {
			this.$el.addClass('dashed');
		}
	}
});

module.exports = CategoryView;

},{"../../utils/msg":8,"../collections/Collections":1,"./Trackers":7,"backbone":9,"jquery":10,"underscore":13}],6:[function(require,module,exports){
'use strict';

var Backbone = require('backbone'),
    _ = require('underscore'),
    $ = require('jquery'),
    msg = require('../../utils/msg')('settings'),
    sendMessage = msg.sendMessageInPromise,
    log = msg.log,
    t = chrome.i18n.getMessage;

var TrackerView = Backbone.View.extend({
	tagName: 'div',

	template: _.template('\
		<div class="tracker-checkbox float-right">\
				<svg width="20px" height="20px" viewbox="0 0 20 20">\
					<g>\
						<path class="border" d="M1,1 l18,0 l0,18 l-18,0 l0,-18"></path>\
						<path class="background" d="M2,2 l16,0 l0,16 l-16,0 l0,-16"></path>\
						<polygon class="check" points="5.38461538 9.5 4 11 7.69230769 15 16 6.5 14.6153846 5 7.69230769 12"></polygon>\
					</g>\
				</svg>\
			</div>\
		<div class="name float-left">\
			<%= name %>\
		</div>\
		<div class="description" style="display: none;"></div>\
		<div class="clearfix"></div>\
	'),


	events: {
		'click .tracker-checkbox': 'toggleTracker',
		'click .name': 'toggleDescription'
	},
	initialize: function (options) {
		this.customEvents = options.customEvents;

		this.model.on('change:blocked', this.updateBlocked, this);
		this.model.on('change:shouldShow', this.updateShouldShow, this);
		this.model.on('change:description', this.updateDescription, this);

		this.uniqueName = this.model.get('name').replace(/\s+/g, '_').toLowerCase();
	},
	render: function () {
		this.$el.html(this.template(this.model.toJSON()));
		this.$el.addClass(this.model.get('blocked') ? 'tracker-item checked' : 'tracker-item');

		return this;
	},

	toggleTracker: function () {
		var blocked = !this.model.get('blocked');
		this.model.set('blocked', blocked);
		this.customEvents.trigger('change:trackerToggle', blocked ? 1 : -1);

		sendMessage('set_state_tracker', {
			blocked: blocked,
			app_id: this.model.get('id')
		}).then(function () {
			$('.alert-messages').removeClass('saving').addClass('saved');
			setTimeout(() => {
				$('.alert-messages').removeClass('saving saved');
			}, 750);
		}).catch(function () {
			$('.alert-messages').removeClass('saving saved').addClass('error');
			setTimeout(() => {
				$('.alert-messages').removeClass('saving saved error');
			}, 750);
		});
	},
	toggleDescription: function () {
		this.$('.description').toggle();

		if (this.model.get('description')) {
			return;
		}
		this.model.set('description', t('tracker_description_getting'));
		sendMessage('getTrackerDescription', {
			url: 'https://apps.ghostery.com/en/apps/' + encodeURIComponent(this.uniqueName) + '?format=json'
		}).then(data => {
			this.model.set('description', data);
		}).catch(err => {
			log("Error loading tracker description", err);
		});
	},

	updateBlocked: function () {
		var blocked = this.model.get('blocked');
		if (blocked) {
			this.$el.addClass('checked');
		} else {
			this.$el.removeClass('checked');
		}
	},
	updateShouldShow: function () {
		if (this.model.get('shouldShow')) {
			this.$el.removeClass('hide');
		} else {
			this.$el.addClass('hide');
		}
	},
	updateDescription: function () {
		var description = this.model.get('description');
		if (!description) {
			description = t('tracker_description_none_found');
		}

		description = '<br>' + description + '<br><a target="_blank" href="https://apps.ghostery.com/en/apps/' + encodeURIComponent(this.uniqueName) + '">' + t('tracker_description_learn_more') + '</a>';

		this.$('.description').html(description);
	}
});

module.exports = TrackerView;

},{"../../utils/msg":8,"backbone":9,"jquery":10,"underscore":13}],7:[function(require,module,exports){
'use strict';

var Backbone = require('backbone'),
    TrackerView = require('./Tracker');

var TrackersView = Backbone.View.extend({
	initialize: function (options) {
		this.customEvents = options.customEvents;
	},
	render: function () {
		this.views = [];
		this.$el.html('');
		this.collection.each(function (tracker) {
			var trackerView = new TrackerView({
				model: tracker,
				customEvents: this.customEvents
			});
			this.$el.append(trackerView.render().el);
			this.views.push(trackerView);
		}, this);

		return this;
	}
});

module.exports = TrackersView;

},{"./Tracker":6,"backbone":9}],8:[function(require,module,exports){
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

},{"../../../src/classes/Globals":14}],9:[function(require,module,exports){
(function (global){
!function(t){var e="object"==typeof self&&self.self===self&&self||"object"==typeof global&&global.global===global&&global;if("function"==typeof define&&define.amd)define(["underscore","jquery","exports"],function(i,n,s){e.Backbone=t(e,s,i,n)});else if("undefined"!=typeof exports){var i,n=require("underscore");try{i=require("jquery")}catch(t){}t(e,exports,n,i)}else e.Backbone=t(e,{},e._,e.jQuery||e.Zepto||e.ender||e.$)}(function(t,e,i,n){var s=t.Backbone,r=Array.prototype.slice;e.VERSION="1.3.3",e.$=n,e.noConflict=function(){return t.Backbone=s,this},e.emulateHTTP=!1,e.emulateJSON=!1;var a=function(t,e,n){switch(t){case 1:return function(){return i[e](this[n])};case 2:return function(t){return i[e](this[n],t)};case 3:return function(t,s){return i[e](this[n],h(t,this),s)};case 4:return function(t,s,r){return i[e](this[n],h(t,this),s,r)};default:return function(){var t=r.call(arguments);return t.unshift(this[n]),i[e].apply(i,t)}}},o=function(t,e,n){i.each(e,function(e,s){i[s]&&(t.prototype[s]=a(e,s,n))})},h=function(t,e){return i.isFunction(t)?t:i.isObject(t)&&!e._isModel(t)?u(t):i.isString(t)?function(e){return e.get(t)}:t},u=function(t){var e=i.matches(t);return function(t){return e(t.attributes)}},c=e.Events={},l=/\s+/,d=function(t,e,n,s,r){var a,o=0;if(n&&"object"==typeof n){void 0!==s&&"context"in r&&void 0===r.context&&(r.context=s);for(a=i.keys(n);o<a.length;o++)e=d(t,e,a[o],n[a[o]],r)}else if(n&&l.test(n))for(a=n.split(l);o<a.length;o++)e=t(e,a[o],s,r);else e=t(e,n,s,r);return e};c.on=function(t,e,i){return f(this,t,e,i)};var f=function(t,e,i,n,s){if(t._events=d(g,t._events||{},e,i,{context:n,ctx:t,listening:s}),s){(t._listeners||(t._listeners={}))[s.id]=s}return t};c.listenTo=function(t,e,n){if(!t)return this;var s=t._listenId||(t._listenId=i.uniqueId("l")),r=this._listeningTo||(this._listeningTo={}),a=r[s];if(!a){var o=this._listenId||(this._listenId=i.uniqueId("l"));a=r[s]={obj:t,objId:s,id:o,listeningTo:r,count:0}}return f(t,e,n,this,a),this};var g=function(t,e,i,n){if(i){var s=t[e]||(t[e]=[]),r=n.context,a=n.ctx,o=n.listening;o&&o.count++,s.push({callback:i,context:r,ctx:r||a,listening:o})}return t};c.off=function(t,e,i){return this._events?(this._events=d(p,this._events,t,e,{context:i,listeners:this._listeners}),this):this},c.stopListening=function(t,e,n){var s=this._listeningTo;if(!s)return this;for(var r=t?[t._listenId]:i.keys(s),a=0;a<r.length;a++){var o=s[r[a]];if(!o)break;o.obj.off(e,n,this)}return this};var p=function(t,e,n,s){if(t){var r,a=0,o=s.context,h=s.listeners;if(e||n||o){for(var u=e?[e]:i.keys(t);a<u.length;a++){e=u[a];var c=t[e];if(!c)break;for(var l=[],d=0;d<c.length;d++){var f=c[d];n&&n!==f.callback&&n!==f.callback._callback||o&&o!==f.context?l.push(f):(r=f.listening)&&0==--r.count&&(delete h[r.id],delete r.listeningTo[r.objId])}l.length?t[e]=l:delete t[e]}return t}for(var g=i.keys(h);a<g.length;a++)r=h[g[a]],delete h[r.id],delete r.listeningTo[r.objId]}};c.once=function(t,e,n){var s=d(v,{},t,e,i.bind(this.off,this));return"string"==typeof t&&null==n&&(e=void 0),this.on(s,e,n)},c.listenToOnce=function(t,e,n){var s=d(v,{},e,n,i.bind(this.stopListening,this,t));return this.listenTo(t,s)};var v=function(t,e,n,s){if(n){var r=t[e]=i.once(function(){s(e,r),n.apply(this,arguments)});r._callback=n}return t};c.trigger=function(t){if(!this._events)return this;for(var e=Math.max(0,arguments.length-1),i=Array(e),n=0;n<e;n++)i[n]=arguments[n+1];return d(m,this._events,t,void 0,i),this};var m=function(t,e,i,n){if(t){var s=t[e],r=t.all;s&&r&&(r=r.slice()),s&&_(s,n),r&&_(r,[e].concat(n))}return t},_=function(t,e){var i,n=-1,s=t.length,r=e[0],a=e[1],o=e[2];switch(e.length){case 0:for(;++n<s;)(i=t[n]).callback.call(i.ctx);return;case 1:for(;++n<s;)(i=t[n]).callback.call(i.ctx,r);return;case 2:for(;++n<s;)(i=t[n]).callback.call(i.ctx,r,a);return;case 3:for(;++n<s;)(i=t[n]).callback.call(i.ctx,r,a,o);return;default:for(;++n<s;)(i=t[n]).callback.apply(i.ctx,e);return}};c.bind=c.on,c.unbind=c.off,i.extend(e,c);var y=e.Model=function(t,e){var n=t||{};e||(e={}),this.cid=i.uniqueId(this.cidPrefix),this.attributes={},e.collection&&(this.collection=e.collection),e.parse&&(n=this.parse(n,e)||{});var s=i.result(this,"defaults");n=i.defaults(i.extend({},s,n),s),this.set(n,e),this.changed={},this.initialize.apply(this,arguments)};i.extend(y.prototype,c,{changed:null,validationError:null,idAttribute:"id",cidPrefix:"c",initialize:function(){},toJSON:function(t){return i.clone(this.attributes)},sync:function(){return e.sync.apply(this,arguments)},get:function(t){return this.attributes[t]},escape:function(t){return i.escape(this.get(t))},has:function(t){return null!=this.get(t)},matches:function(t){return!!i.iteratee(t,this)(this.attributes)},set:function(t,e,n){if(null==t)return this;var s;if("object"==typeof t?(s=t,n=e):(s={})[t]=e,n||(n={}),!this._validate(s,n))return!1;var r=n.unset,a=n.silent,o=[],h=this._changing;this._changing=!0,h||(this._previousAttributes=i.clone(this.attributes),this.changed={});var u=this.attributes,c=this.changed,l=this._previousAttributes;for(var d in s)e=s[d],i.isEqual(u[d],e)||o.push(d),i.isEqual(l[d],e)?delete c[d]:c[d]=e,r?delete u[d]:u[d]=e;if(this.idAttribute in s&&(this.id=this.get(this.idAttribute)),!a){o.length&&(this._pending=n);for(var f=0;f<o.length;f++)this.trigger("change:"+o[f],this,u[o[f]],n)}if(h)return this;if(!a)for(;this._pending;)n=this._pending,this._pending=!1,this.trigger("change",this,n);return this._pending=!1,this._changing=!1,this},unset:function(t,e){return this.set(t,void 0,i.extend({},e,{unset:!0}))},clear:function(t){var e={};for(var n in this.attributes)e[n]=void 0;return this.set(e,i.extend({},t,{unset:!0}))},hasChanged:function(t){return null==t?!i.isEmpty(this.changed):i.has(this.changed,t)},changedAttributes:function(t){if(!t)return!!this.hasChanged()&&i.clone(this.changed);var e=this._changing?this._previousAttributes:this.attributes,n={};for(var s in t){var r=t[s];i.isEqual(e[s],r)||(n[s]=r)}return!!i.size(n)&&n},previous:function(t){return null!=t&&this._previousAttributes?this._previousAttributes[t]:null},previousAttributes:function(){return i.clone(this._previousAttributes)},fetch:function(t){t=i.extend({parse:!0},t);var e=this,n=t.success;return t.success=function(i){var s=t.parse?e.parse(i,t):i;if(!e.set(s,t))return!1;n&&n.call(t.context,e,i,t),e.trigger("sync",e,i,t)},A(this,t),this.sync("read",this,t)},save:function(t,e,n){var s;null==t||"object"==typeof t?(s=t,n=e):(s={})[t]=e,n=i.extend({validate:!0,parse:!0},n);var r=n.wait;if(s&&!r){if(!this.set(s,n))return!1}else if(!this._validate(s,n))return!1;var a=this,o=n.success,h=this.attributes;n.success=function(t){a.attributes=h;var e=n.parse?a.parse(t,n):t;if(r&&(e=i.extend({},s,e)),e&&!a.set(e,n))return!1;o&&o.call(n.context,a,t,n),a.trigger("sync",a,t,n)},A(this,n),s&&r&&(this.attributes=i.extend({},h,s));var u=this.isNew()?"create":n.patch?"patch":"update";"patch"!==u||n.attrs||(n.attrs=s);var c=this.sync(u,this,n);return this.attributes=h,c},destroy:function(t){t=t?i.clone(t):{};var e=this,n=t.success,s=t.wait,r=function(){e.stopListening(),e.trigger("destroy",e,e.collection,t)};t.success=function(i){s&&r(),n&&n.call(t.context,e,i,t),e.isNew()||e.trigger("sync",e,i,t)};var a=!1;return this.isNew()?i.defer(t.success):(A(this,t),a=this.sync("delete",this,t)),s||r(),a},url:function(){var t=i.result(this,"urlRoot")||i.result(this.collection,"url")||$();if(this.isNew())return t;var e=this.get(this.idAttribute);return t.replace(/[^\/]$/,"$&/")+encodeURIComponent(e)},parse:function(t,e){return t},clone:function(){return new this.constructor(this.attributes)},isNew:function(){return!this.has(this.idAttribute)},isValid:function(t){return this._validate({},i.extend({},t,{validate:!0}))},_validate:function(t,e){if(!e.validate||!this.validate)return!0;t=i.extend({},this.attributes,t);var n=this.validationError=this.validate(t,e)||null;return!n||(this.trigger("invalid",this,n,i.extend(e,{validationError:n})),!1)}}),o(y,{keys:1,values:1,pairs:1,invert:1,pick:0,omit:0,chain:1,isEmpty:1},"attributes");var b=e.Collection=function(t,e){e||(e={}),e.model&&(this.model=e.model),void 0!==e.comparator&&(this.comparator=e.comparator),this._reset(),this.initialize.apply(this,arguments),t&&this.reset(t,i.extend({silent:!0},e))},x={add:!0,remove:!0,merge:!0},w={add:!0,remove:!1},E=function(t,e,i){i=Math.min(Math.max(i,0),t.length);var n,s=Array(t.length-i),r=e.length;for(n=0;n<s.length;n++)s[n]=t[n+i];for(n=0;n<r;n++)t[n+i]=e[n];for(n=0;n<s.length;n++)t[n+r+i]=s[n]};i.extend(b.prototype,c,{model:y,initialize:function(){},toJSON:function(t){return this.map(function(e){return e.toJSON(t)})},sync:function(){return e.sync.apply(this,arguments)},add:function(t,e){return this.set(t,i.extend({merge:!1},e,w))},remove:function(t,e){e=i.extend({},e);var n=!i.isArray(t);t=n?[t]:t.slice();var s=this._removeModels(t,e);return!e.silent&&s.length&&(e.changes={added:[],merged:[],removed:s},this.trigger("update",this,e)),n?s[0]:s},set:function(t,e){if(null!=t){e=i.extend({},x,e),e.parse&&!this._isModel(t)&&(t=this.parse(t,e)||[]);var n=!i.isArray(t);t=n?[t]:t.slice();var s=e.at;null!=s&&(s=+s),s>this.length&&(s=this.length),s<0&&(s+=this.length+1);var r,a,o=[],h=[],u=[],c=[],l={},d=e.add,f=e.merge,g=e.remove,p=!1,v=this.comparator&&null==s&&!1!==e.sort,m=i.isString(this.comparator)?this.comparator:null;for(a=0;a<t.length;a++){r=t[a];var _=this.get(r);if(_){if(f&&r!==_){var y=this._isModel(r)?r.attributes:r;e.parse&&(y=_.parse(y,e)),_.set(y,e),u.push(_),v&&!p&&(p=_.hasChanged(m))}l[_.cid]||(l[_.cid]=!0,o.push(_)),t[a]=_}else d&&(r=t[a]=this._prepareModel(r,e))&&(h.push(r),this._addReference(r,e),l[r.cid]=!0,o.push(r))}if(g){for(a=0;a<this.length;a++)r=this.models[a],l[r.cid]||c.push(r);c.length&&this._removeModels(c,e)}var b=!1,w=!v&&d&&g;if(o.length&&w?(b=this.length!==o.length||i.some(this.models,function(t,e){return t!==o[e]}),this.models.length=0,E(this.models,o,0),this.length=this.models.length):h.length&&(v&&(p=!0),E(this.models,h,null==s?this.length:s),this.length=this.models.length),p&&this.sort({silent:!0}),!e.silent){for(a=0;a<h.length;a++)null!=s&&(e.index=s+a),r=h[a],r.trigger("add",r,this,e);(p||b)&&this.trigger("sort",this,e),(h.length||c.length||u.length)&&(e.changes={added:h,removed:c,merged:u},this.trigger("update",this,e))}return n?t[0]:t}},reset:function(t,e){e=e?i.clone(e):{};for(var n=0;n<this.models.length;n++)this._removeReference(this.models[n],e);return e.previousModels=this.models,this._reset(),t=this.add(t,i.extend({silent:!0},e)),e.silent||this.trigger("reset",this,e),t},push:function(t,e){return this.add(t,i.extend({at:this.length},e))},pop:function(t){var e=this.at(this.length-1);return this.remove(e,t)},unshift:function(t,e){return this.add(t,i.extend({at:0},e))},shift:function(t){var e=this.at(0);return this.remove(e,t)},slice:function(){return r.apply(this.models,arguments)},get:function(t){if(null!=t)return this._byId[t]||this._byId[this.modelId(t.attributes||t)]||t.cid&&this._byId[t.cid]},has:function(t){return null!=this.get(t)},at:function(t){return t<0&&(t+=this.length),this.models[t]},where:function(t,e){return this[e?"find":"filter"](t)},findWhere:function(t){return this.where(t,!0)},sort:function(t){var e=this.comparator;if(!e)throw new Error("Cannot sort a set without a comparator");t||(t={});var n=e.length;return i.isFunction(e)&&(e=i.bind(e,this)),1===n||i.isString(e)?this.models=this.sortBy(e):this.models.sort(e),t.silent||this.trigger("sort",this,t),this},pluck:function(t){return this.map(t+"")},fetch:function(t){t=i.extend({parse:!0},t);var e=t.success,n=this;return t.success=function(i){var s=t.reset?"reset":"set";n[s](i,t),e&&e.call(t.context,n,i,t),n.trigger("sync",n,i,t)},A(this,t),this.sync("read",this,t)},create:function(t,e){e=e?i.clone(e):{};var n=e.wait;if(!(t=this._prepareModel(t,e)))return!1;n||this.add(t,e);var s=this,r=e.success;return e.success=function(t,e,i){n&&s.add(t,i),r&&r.call(i.context,t,e,i)},t.save(null,e),t},parse:function(t,e){return t},clone:function(){return new this.constructor(this.models,{model:this.model,comparator:this.comparator})},modelId:function(t){return t[this.model.prototype.idAttribute||"id"]},_reset:function(){this.length=0,this.models=[],this._byId={}},_prepareModel:function(t,e){if(this._isModel(t))return t.collection||(t.collection=this),t;e=e?i.clone(e):{},e.collection=this;var n=new this.model(t,e);return n.validationError?(this.trigger("invalid",this,n.validationError,e),!1):n},_removeModels:function(t,e){for(var i=[],n=0;n<t.length;n++){var s=this.get(t[n]);if(s){var r=this.indexOf(s);this.models.splice(r,1),this.length--,delete this._byId[s.cid];var a=this.modelId(s.attributes);null!=a&&delete this._byId[a],e.silent||(e.index=r,s.trigger("remove",s,this,e)),i.push(s),this._removeReference(s,e)}}return i},_isModel:function(t){return t instanceof y},_addReference:function(t,e){this._byId[t.cid]=t;var i=this.modelId(t.attributes);null!=i&&(this._byId[i]=t),t.on("all",this._onModelEvent,this)},_removeReference:function(t,e){delete this._byId[t.cid];var i=this.modelId(t.attributes);null!=i&&delete this._byId[i],this===t.collection&&delete t.collection,t.off("all",this._onModelEvent,this)},_onModelEvent:function(t,e,i,n){if(e){if(("add"===t||"remove"===t)&&i!==this)return;if("destroy"===t&&this.remove(e,n),"change"===t){var s=this.modelId(e.previousAttributes()),r=this.modelId(e.attributes);s!==r&&(null!=s&&delete this._byId[s],null!=r&&(this._byId[r]=e))}}this.trigger.apply(this,arguments)}}),o(b,{forEach:3,each:3,map:3,collect:3,reduce:0,foldl:0,inject:0,reduceRight:0,foldr:0,find:3,detect:3,filter:3,select:3,reject:3,every:3,all:3,some:3,any:3,include:3,includes:3,contains:3,invoke:0,max:3,min:3,toArray:1,size:1,first:3,head:3,take:3,initial:3,rest:3,tail:3,drop:3,last:3,without:0,difference:0,indexOf:3,shuffle:1,lastIndexOf:3,isEmpty:1,chain:1,sample:3,partition:3,groupBy:3,countBy:3,sortBy:3,indexBy:3,findIndex:3,findLastIndex:3},"models");var I=e.View=function(t){this.cid=i.uniqueId("view"),i.extend(this,i.pick(t,S)),this._ensureElement(),this.initialize.apply(this,arguments)},S=["model","collection","el","id","attributes","className","tagName","events"];i.extend(I.prototype,c,{tagName:"div",$:function(t){return this.$el.find(t)},initialize:function(){},render:function(){return this},remove:function(){return this._removeElement(),this.stopListening(),this},_removeElement:function(){this.$el.remove()},setElement:function(t){return this.undelegateEvents(),this._setElement(t),this.delegateEvents(),this},_setElement:function(t){this.$el=t instanceof e.$?t:e.$(t),this.el=this.$el[0]},delegateEvents:function(t){if(t||(t=i.result(this,"events")),!t)return this;this.undelegateEvents();for(var e in t){var n=t[e];if(i.isFunction(n)||(n=this[n]),n){var s=e.match(/^(\S+)\s*(.*)$/);this.delegate(s[1],s[2],i.bind(n,this))}}return this},delegate:function(t,e,i){return this.$el.on(t+".delegateEvents"+this.cid,e,i),this},undelegateEvents:function(){return this.$el&&this.$el.off(".delegateEvents"+this.cid),this},undelegate:function(t,e,i){return this.$el.off(t+".delegateEvents"+this.cid,e,i),this},_createElement:function(t){return document.createElement(t)},_ensureElement:function(){if(this.el)this.setElement(i.result(this,"el"));else{var t=i.extend({},i.result(this,"attributes"));this.id&&(t.id=i.result(this,"id")),this.className&&(t.class=i.result(this,"className")),this.setElement(this._createElement(i.result(this,"tagName"))),this._setAttributes(t)}},_setAttributes:function(t){this.$el.attr(t)}}),e.sync=function(t,n,s){var r=k[t];i.defaults(s||(s={}),{emulateHTTP:e.emulateHTTP,emulateJSON:e.emulateJSON});var a={type:r,dataType:"json"};if(s.url||(a.url=i.result(n,"url")||$()),null!=s.data||!n||"create"!==t&&"update"!==t&&"patch"!==t||(a.contentType="application/json",a.data=JSON.stringify(s.attrs||n.toJSON(s))),s.emulateJSON&&(a.contentType="application/x-www-form-urlencoded",a.data=a.data?{model:a.data}:{}),s.emulateHTTP&&("PUT"===r||"DELETE"===r||"PATCH"===r)){a.type="POST",s.emulateJSON&&(a.data._method=r);var o=s.beforeSend;s.beforeSend=function(t){if(t.setRequestHeader("X-HTTP-Method-Override",r),o)return o.apply(this,arguments)}}"GET"===a.type||s.emulateJSON||(a.processData=!1);var h=s.error;s.error=function(t,e,i){s.textStatus=e,s.errorThrown=i,h&&h.call(s.context,t,e,i)};var u=s.xhr=e.ajax(i.extend(a,s));return n.trigger("request",n,u,s),u};var k={create:"POST",update:"PUT",patch:"PATCH",delete:"DELETE",read:"GET"};e.ajax=function(){return e.$.ajax.apply(e.$,arguments)};var T=e.Router=function(t){t||(t={}),t.routes&&(this.routes=t.routes),this._bindRoutes(),this.initialize.apply(this,arguments)};i.extend(T.prototype,c,{initialize:function(){},route:function(t,n,s){i.isRegExp(t)||(t=this._routeToRegExp(t)),i.isFunction(n)&&(s=n,n=""),s||(s=this[n]);var r=this;return e.history.route(t,function(i){var a=r._extractParameters(t,i);!1!==r.execute(s,a,n)&&(r.trigger.apply(r,["route:"+n].concat(a)),r.trigger("route",n,a),e.history.trigger("route",r,n,a))}),this},execute:function(t,e,i){t&&t.apply(this,e)},navigate:function(t,i){return e.history.navigate(t,i),this},_bindRoutes:function(){if(this.routes){this.routes=i.result(this,"routes");for(var t,e=i.keys(this.routes);null!=(t=e.pop());)this.route(t,this.routes[t])}},_routeToRegExp:function(t){return t=t.replace(/[\-{}\[\]+?.,\\\^$|#\s]/g,"\\$&").replace(/\((.*?)\)/g,"(?:$1)?").replace(/(\(\?)?:\w+/g,function(t,e){return e?t:"([^/?]+)"}).replace(/\*\w+/g,"([^?]*?)"),new RegExp("^"+t+"(?:\\?([\\s\\S]*))?$")},_extractParameters:function(t,e){var n=t.exec(e).slice(1);return i.map(n,function(t,e){return e===n.length-1?t||null:t?decodeURIComponent(t):null})}});var P=e.History=function(){this.handlers=[],this.checkUrl=i.bind(this.checkUrl,this),"undefined"!=typeof window&&(this.location=window.location,this.history=window.history)};P.started=!1,i.extend(P.prototype,c,{interval:50,atRoot:function(){return this.location.pathname.replace(/[^\/]$/,"$&/")===this.root&&!this.getSearch()},matchRoot:function(){return this.decodeFragment(this.location.pathname).slice(0,this.root.length-1)+"/"===this.root},decodeFragment:function(t){return decodeURI(t.replace(/%25/g,"%2525"))},getSearch:function(){var t=this.location.href.replace(/#.*/,"").match(/\?.+/);return t?t[0]:""},getHash:function(t){var e=(t||this).location.href.match(/#(.*)$/);return e?e[1]:""},getPath:function(){var t=this.decodeFragment(this.location.pathname+this.getSearch()).slice(this.root.length-1);return"/"===t.charAt(0)?t.slice(1):t},getFragment:function(t){return null==t&&(t=this._usePushState||!this._wantsHashChange?this.getPath():this.getHash()),t.replace(/^[#\/]|\s+$/g,"")},start:function(t){if(P.started)throw new Error("Backbone.history has already been started");if(P.started=!0,this.options=i.extend({root:"/"},this.options,t),this.root=this.options.root,this._wantsHashChange=!1!==this.options.hashChange,this._hasHashChange="onhashchange"in window&&(void 0===document.documentMode||document.documentMode>7),this._useHashChange=this._wantsHashChange&&this._hasHashChange,this._wantsPushState=!!this.options.pushState,this._hasPushState=!(!this.history||!this.history.pushState),this._usePushState=this._wantsPushState&&this._hasPushState,this.fragment=this.getFragment(),this.root=("/"+this.root+"/").replace(/^\/+|\/+$/g,"/"),this._wantsHashChange&&this._wantsPushState){if(!this._hasPushState&&!this.atRoot()){var e=this.root.slice(0,-1)||"/";return this.location.replace(e+"#"+this.getPath()),!0}this._hasPushState&&this.atRoot()&&this.navigate(this.getHash(),{replace:!0})}if(!this._hasHashChange&&this._wantsHashChange&&!this._usePushState){this.iframe=document.createElement("iframe"),this.iframe.src="javascript:0",this.iframe.style.display="none",this.iframe.tabIndex=-1;var n=document.body,s=n.insertBefore(this.iframe,n.firstChild).contentWindow;s.document.open(),s.document.close(),s.location.hash="#"+this.fragment}var r=window.addEventListener||function(t,e){return attachEvent("on"+t,e)};if(this._usePushState?r("popstate",this.checkUrl,!1):this._useHashChange&&!this.iframe?r("hashchange",this.checkUrl,!1):this._wantsHashChange&&(this._checkUrlInterval=setInterval(this.checkUrl,this.interval)),!this.options.silent)return this.loadUrl()},stop:function(){var t=window.removeEventListener||function(t,e){return detachEvent("on"+t,e)};this._usePushState?t("popstate",this.checkUrl,!1):this._useHashChange&&!this.iframe&&t("hashchange",this.checkUrl,!1),this.iframe&&(document.body.removeChild(this.iframe),this.iframe=null),this._checkUrlInterval&&clearInterval(this._checkUrlInterval),P.started=!1},route:function(t,e){this.handlers.unshift({route:t,callback:e})},checkUrl:function(t){var e=this.getFragment();if(e===this.fragment&&this.iframe&&(e=this.getHash(this.iframe.contentWindow)),e===this.fragment)return!1;this.iframe&&this.navigate(e),this.loadUrl()},loadUrl:function(t){return!!this.matchRoot()&&(t=this.fragment=this.getFragment(t),i.some(this.handlers,function(e){if(e.route.test(t))return e.callback(t),!0}))},navigate:function(t,e){if(!P.started)return!1;e&&!0!==e||(e={trigger:!!e}),t=this.getFragment(t||"");var i=this.root;""!==t&&"?"!==t.charAt(0)||(i=i.slice(0,-1)||"/");var n=i+t;if(t=this.decodeFragment(t.replace(/#.*$/,"")),this.fragment!==t){if(this.fragment=t,this._usePushState)this.history[e.replace?"replaceState":"pushState"]({},document.title,n);else{if(!this._wantsHashChange)return this.location.assign(n);if(this._updateHash(this.location,t,e.replace),this.iframe&&t!==this.getHash(this.iframe.contentWindow)){var s=this.iframe.contentWindow;e.replace||(s.document.open(),s.document.close()),this._updateHash(s.location,t,e.replace)}}return e.trigger?this.loadUrl(t):void 0}},_updateHash:function(t,e,i){if(i){var n=t.href.replace(/(javascript:|#).*$/,"");t.replace(n+"#"+e)}else t.hash="#"+e}}),e.history=new P;var H=function(t,e){var n,s=this;return n=t&&i.has(t,"constructor")?t.constructor:function(){return s.apply(this,arguments)},i.extend(n,s,e),n.prototype=i.create(s.prototype,t),n.prototype.constructor=n,n.__super__=s.prototype,n};y.extend=b.extend=T.extend=I.extend=P.extend=H;var $=function(){throw new Error('A "url" property or function must be specified')},A=function(t,e){var i=e.error;e.error=function(n){i&&i.call(e.context,t,n,e),t.trigger("error",t,n,e)}};return e});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"jquery":10,"underscore":13}],10:[function(require,module,exports){
!function(e,t){"object"==typeof module&&"object"==typeof module.exports?module.exports=e.document?t(e,!0):function(e){if(!e.document)throw new Error("jQuery requires a window with a document");return t(e)}:t(e)}("undefined"!=typeof window?window:this,function(e,t){function n(e){var t=!!e&&"length"in e&&e.length,n=ie.type(e);return"function"!==n&&!ie.isWindow(e)&&("array"===n||0===t||"number"==typeof t&&t>0&&t-1 in e)}function r(e,t,n){if(ie.isFunction(t))return ie.grep(e,function(e,r){return!!t.call(e,r,e)!==n});if(t.nodeType)return ie.grep(e,function(e){return e===t!==n});if("string"==typeof t){if(fe.test(t))return ie.filter(t,e,n);t=ie.filter(t,e)}return ie.grep(e,function(e){return Z.call(t,e)>-1!==n})}function i(e,t){for(;(e=e[t])&&1!==e.nodeType;);return e}function o(e){var t={};return ie.each(e.match(ve)||[],function(e,n){t[n]=!0}),t}function s(){G.removeEventListener("DOMContentLoaded",s),e.removeEventListener("load",s),ie.ready()}function a(){this.expando=ie.expando+a.uid++}function u(e,t,n){var r;if(void 0===n&&1===e.nodeType)if(r="data-"+t.replace(Ce,"-$&").toLowerCase(),"string"==typeof(n=e.getAttribute(r))){try{n="true"===n||"false"!==n&&("null"===n?null:+n+""===n?+n:Te.test(n)?ie.parseJSON(n):n)}catch(e){}we.set(e,t,n)}else n=void 0;return n}function l(e,t,n,r){var i,o=1,s=20,a=r?function(){return r.cur()}:function(){return ie.css(e,t,"")},u=a(),l=n&&n[3]||(ie.cssNumber[t]?"":"px"),c=(ie.cssNumber[t]||"px"!==l&&+u)&&Ee.exec(ie.css(e,t));if(c&&c[3]!==l){l=l||c[3],n=n||[],c=+u||1;do{o=o||".5",c/=o,ie.style(e,t,c+l)}while(o!==(o=a()/u)&&1!==o&&--s)}return n&&(c=+c||+u||0,i=n[1]?c+(n[1]+1)*n[2]:+n[2],r&&(r.unit=l,r.start=c,r.end=i)),i}function c(e,t){var n=void 0!==e.getElementsByTagName?e.getElementsByTagName(t||"*"):void 0!==e.querySelectorAll?e.querySelectorAll(t||"*"):[];return void 0===t||t&&ie.nodeName(e,t)?ie.merge([e],n):n}function f(e,t){for(var n=0,r=e.length;n<r;n++)be.set(e[n],"globalEval",!t||be.get(t[n],"globalEval"))}function p(e,t,n,r,i){for(var o,s,a,u,l,p,d=t.createDocumentFragment(),h=[],g=0,v=e.length;g<v;g++)if((o=e[g])||0===o)if("object"===ie.type(o))ie.merge(h,o.nodeType?[o]:o);else if(Le.test(o)){for(s=s||d.appendChild(t.createElement("div")),a=(De.exec(o)||["",""])[1].toLowerCase(),u=qe[a]||qe._default,s.innerHTML=u[1]+ie.htmlPrefilter(o)+u[2],p=u[0];p--;)s=s.lastChild;ie.merge(h,s.childNodes),s=d.firstChild,s.textContent=""}else h.push(t.createTextNode(o));for(d.textContent="",g=0;o=h[g++];)if(r&&ie.inArray(o,r)>-1)i&&i.push(o);else if(l=ie.contains(o.ownerDocument,o),s=c(d.appendChild(o),"script"),l&&f(s),n)for(p=0;o=s[p++];)Ae.test(o.type||"")&&n.push(o);return d}function d(){return!0}function h(){return!1}function g(){try{return G.activeElement}catch(e){}}function v(e,t,n,r,i,o){var s,a;if("object"==typeof t){"string"!=typeof n&&(r=r||n,n=void 0);for(a in t)v(e,a,n,r,t[a],o);return e}if(null==r&&null==i?(i=n,r=n=void 0):null==i&&("string"==typeof n?(i=r,r=void 0):(i=r,r=n,n=void 0)),!1===i)i=h;else if(!i)return e;return 1===o&&(s=i,i=function(e){return ie().off(e),s.apply(this,arguments)},i.guid=s.guid||(s.guid=ie.guid++)),e.each(function(){ie.event.add(this,t,i,r,n)})}function m(e,t){return ie.nodeName(e,"table")&&ie.nodeName(11!==t.nodeType?t:t.firstChild,"tr")?e.getElementsByTagName("tbody")[0]||e.appendChild(e.ownerDocument.createElement("tbody")):e}function y(e){return e.type=(null!==e.getAttribute("type"))+"/"+e.type,e}function x(e){var t=Me.exec(e.type);return t?e.type=t[1]:e.removeAttribute("type"),e}function b(e,t){var n,r,i,o,s,a,u,l;if(1===t.nodeType){if(be.hasData(e)&&(o=be.access(e),s=be.set(t,o),l=o.events)){delete s.handle,s.events={};for(i in l)for(n=0,r=l[i].length;n<r;n++)ie.event.add(t,i,l[i][n])}we.hasData(e)&&(a=we.access(e),u=ie.extend({},a),we.set(t,u))}}function w(e,t){var n=t.nodeName.toLowerCase();"input"===n&&je.test(e.type)?t.checked=e.checked:"input"!==n&&"textarea"!==n||(t.defaultValue=e.defaultValue)}function T(e,t,n,r){t=J.apply([],t);var i,o,s,a,u,l,f=0,d=e.length,h=d-1,g=t[0],v=ie.isFunction(g);if(v||d>1&&"string"==typeof g&&!re.checkClone&&Re.test(g))return e.each(function(i){var o=e.eq(i);v&&(t[0]=g.call(this,i,o.html())),T(o,t,n,r)});if(d&&(i=p(t,e[0].ownerDocument,!1,e,r),o=i.firstChild,1===i.childNodes.length&&(i=o),o||r)){for(s=ie.map(c(i,"script"),y),a=s.length;f<d;f++)u=i,f!==h&&(u=ie.clone(u,!0,!0),a&&ie.merge(s,c(u,"script"))),n.call(e[f],u,f);if(a)for(l=s[s.length-1].ownerDocument,ie.map(s,x),f=0;f<a;f++)u=s[f],Ae.test(u.type||"")&&!be.access(u,"globalEval")&&ie.contains(l,u)&&(u.src?ie._evalUrl&&ie._evalUrl(u.src):ie.globalEval(u.textContent.replace(Ie,"")))}return e}function C(e,t,n){for(var r,i=t?ie.filter(t,e):e,o=0;null!=(r=i[o]);o++)n||1!==r.nodeType||ie.cleanData(c(r)),r.parentNode&&(n&&ie.contains(r.ownerDocument,r)&&f(c(r,"script")),r.parentNode.removeChild(r));return e}function k(e,t){var n=ie(t.createElement(e)).appendTo(t.body),r=ie.css(n[0],"display");return n.detach(),r}function E(e){var t=G,n=$e[e];return n||(n=k(e,t),"none"!==n&&n||(We=(We||ie("<iframe frameborder='0' width='0' height='0'/>")).appendTo(t.documentElement),t=We[0].contentDocument,t.write(),t.close(),n=k(e,t),We.detach()),$e[e]=n),n}function N(e,t,n){var r,i,o,s,a=e.style;return n=n||Xe(e),s=n?n.getPropertyValue(t)||n[t]:void 0,""!==s&&void 0!==s||ie.contains(e.ownerDocument,e)||(s=ie.style(e,t)),n&&!re.pixelMarginRight()&&_e.test(s)&&Be.test(t)&&(r=a.width,i=a.minWidth,o=a.maxWidth,a.minWidth=a.maxWidth=a.width=s,s=n.width,a.width=r,a.minWidth=i,a.maxWidth=o),void 0!==s?s+"":s}function S(e,t){return{get:function(){return e()?void delete this.get:(this.get=t).apply(this,arguments)}}}function j(e){if(e in Je)return e;for(var t=e[0].toUpperCase()+e.slice(1),n=Qe.length;n--;)if((e=Qe[n]+t)in Je)return e}function D(e,t,n){var r=Ee.exec(t);return r?Math.max(0,r[2]-(n||0))+(r[3]||"px"):t}function A(e,t,n,r,i){for(var o=n===(r?"border":"content")?4:"width"===t?1:0,s=0;o<4;o+=2)"margin"===n&&(s+=ie.css(e,n+Ne[o],!0,i)),r?("content"===n&&(s-=ie.css(e,"padding"+Ne[o],!0,i)),"margin"!==n&&(s-=ie.css(e,"border"+Ne[o]+"Width",!0,i))):(s+=ie.css(e,"padding"+Ne[o],!0,i),"padding"!==n&&(s+=ie.css(e,"border"+Ne[o]+"Width",!0,i)));return s}function q(e,t,n){var r=!0,i="width"===t?e.offsetWidth:e.offsetHeight,o=Xe(e),s="border-box"===ie.css(e,"boxSizing",!1,o);if(i<=0||null==i){if(i=N(e,t,o),(i<0||null==i)&&(i=e.style[t]),_e.test(i))return i;r=s&&(re.boxSizingReliable()||i===e.style[t]),i=parseFloat(i)||0}return i+A(e,t,n||(s?"border":"content"),r,o)+"px"}function L(e,t){for(var n,r,i,o=[],s=0,a=e.length;s<a;s++)r=e[s],r.style&&(o[s]=be.get(r,"olddisplay"),n=r.style.display,t?(o[s]||"none"!==n||(r.style.display=""),""===r.style.display&&Se(r)&&(o[s]=be.access(r,"olddisplay",E(r.nodeName)))):(i=Se(r),"none"===n&&i||be.set(r,"olddisplay",i?n:ie.css(r,"display"))));for(s=0;s<a;s++)r=e[s],r.style&&(t&&"none"!==r.style.display&&""!==r.style.display||(r.style.display=t?o[s]||"":"none"));return e}function H(e,t,n,r,i){return new H.prototype.init(e,t,n,r,i)}function O(){return e.setTimeout(function(){Ke=void 0}),Ke=ie.now()}function F(e,t){var n,r=0,i={height:e};for(t=t?1:0;r<4;r+=2-t)n=Ne[r],i["margin"+n]=i["padding"+n]=e;return t&&(i.opacity=i.width=e),i}function P(e,t,n){for(var r,i=(I.tweeners[t]||[]).concat(I.tweeners["*"]),o=0,s=i.length;o<s;o++)if(r=i[o].call(n,t,e))return r}function R(e,t,n){var r,i,o,s,a,u,l,c=this,f={},p=e.style,d=e.nodeType&&Se(e),h=be.get(e,"fxshow");n.queue||(a=ie._queueHooks(e,"fx"),null==a.unqueued&&(a.unqueued=0,u=a.empty.fire,a.empty.fire=function(){a.unqueued||u()}),a.unqueued++,c.always(function(){c.always(function(){a.unqueued--,ie.queue(e,"fx").length||a.empty.fire()})})),1===e.nodeType&&("height"in t||"width"in t)&&(n.overflow=[p.overflow,p.overflowX,p.overflowY],l=ie.css(e,"display"),"inline"===("none"===l?be.get(e,"olddisplay")||E(e.nodeName):l)&&"none"===ie.css(e,"float")&&(p.display="inline-block")),n.overflow&&(p.overflow="hidden",c.always(function(){p.overflow=n.overflow[0],p.overflowX=n.overflow[1],p.overflowY=n.overflow[2]}));for(r in t)if(i=t[r],et.exec(i)){if(delete t[r],o=o||"toggle"===i,i===(d?"hide":"show")){if("show"!==i||!h||void 0===h[r])continue;d=!0}f[r]=h&&h[r]||ie.style(e,r)}else l=void 0;if(ie.isEmptyObject(f))"inline"===("none"===l?E(e.nodeName):l)&&(p.display=l);else{h?"hidden"in h&&(d=h.hidden):h=be.access(e,"fxshow",{}),o&&(h.hidden=!d),d?ie(e).show():c.done(function(){ie(e).hide()}),c.done(function(){var t;be.remove(e,"fxshow");for(t in f)ie.style(e,t,f[t])});for(r in f)s=P(d?h[r]:0,r,c),r in h||(h[r]=s.start,d&&(s.end=s.start,s.start="width"===r||"height"===r?1:0))}}function M(e,t){var n,r,i,o,s;for(n in e)if(r=ie.camelCase(n),i=t[r],o=e[n],ie.isArray(o)&&(i=o[1],o=e[n]=o[0]),n!==r&&(e[r]=o,delete e[n]),(s=ie.cssHooks[r])&&"expand"in s){o=s.expand(o),delete e[r];for(n in o)n in e||(e[n]=o[n],t[n]=i)}else t[r]=i}function I(e,t,n){var r,i,o=0,s=I.prefilters.length,a=ie.Deferred().always(function(){delete u.elem}),u=function(){if(i)return!1;for(var t=Ke||O(),n=Math.max(0,l.startTime+l.duration-t),r=n/l.duration||0,o=1-r,s=0,u=l.tweens.length;s<u;s++)l.tweens[s].run(o);return a.notifyWith(e,[l,o,n]),o<1&&u?n:(a.resolveWith(e,[l]),!1)},l=a.promise({elem:e,props:ie.extend({},t),opts:ie.extend(!0,{specialEasing:{},easing:ie.easing._default},n),originalProperties:t,originalOptions:n,startTime:Ke||O(),duration:n.duration,tweens:[],createTween:function(t,n){var r=ie.Tween(e,l.opts,t,n,l.opts.specialEasing[t]||l.opts.easing);return l.tweens.push(r),r},stop:function(t){var n=0,r=t?l.tweens.length:0;if(i)return this;for(i=!0;n<r;n++)l.tweens[n].run(1);return t?(a.notifyWith(e,[l,1,0]),a.resolveWith(e,[l,t])):a.rejectWith(e,[l,t]),this}}),c=l.props;for(M(c,l.opts.specialEasing);o<s;o++)if(r=I.prefilters[o].call(l,e,c,l.opts))return ie.isFunction(r.stop)&&(ie._queueHooks(l.elem,l.opts.queue).stop=ie.proxy(r.stop,r)),r;return ie.map(c,P,l),ie.isFunction(l.opts.start)&&l.opts.start.call(e,l),ie.fx.timer(ie.extend(u,{elem:e,anim:l,queue:l.opts.queue})),l.progress(l.opts.progress).done(l.opts.done,l.opts.complete).fail(l.opts.fail).always(l.opts.always)}function W(e){return e.getAttribute&&e.getAttribute("class")||""}function $(e){return function(t,n){"string"!=typeof t&&(n=t,t="*");var r,i=0,o=t.toLowerCase().match(ve)||[];if(ie.isFunction(n))for(;r=o[i++];)"+"===r[0]?(r=r.slice(1)||"*",(e[r]=e[r]||[]).unshift(n)):(e[r]=e[r]||[]).push(n)}}function B(e,t,n,r){function i(a){var u;return o[a]=!0,ie.each(e[a]||[],function(e,a){var l=a(t,n,r);return"string"!=typeof l||s||o[l]?s?!(u=l):void 0:(t.dataTypes.unshift(l),i(l),!1)}),u}var o={},s=e===gt;return i(t.dataTypes[0])||!o["*"]&&i("*")}function _(e,t){var n,r,i=ie.ajaxSettings.flatOptions||{};for(n in t)void 0!==t[n]&&((i[n]?e:r||(r={}))[n]=t[n]);return r&&ie.extend(!0,e,r),e}function X(e,t,n){for(var r,i,o,s,a=e.contents,u=e.dataTypes;"*"===u[0];)u.shift(),void 0===r&&(r=e.mimeType||t.getResponseHeader("Content-Type"));if(r)for(i in a)if(a[i]&&a[i].test(r)){u.unshift(i);break}if(u[0]in n)o=u[0];else{for(i in n){if(!u[0]||e.converters[i+" "+u[0]]){o=i;break}s||(s=i)}o=o||s}if(o)return o!==u[0]&&u.unshift(o),n[o]}function z(e,t,n,r){var i,o,s,a,u,l={},c=e.dataTypes.slice();if(c[1])for(s in e.converters)l[s.toLowerCase()]=e.converters[s];for(o=c.shift();o;)if(e.responseFields[o]&&(n[e.responseFields[o]]=t),!u&&r&&e.dataFilter&&(t=e.dataFilter(t,e.dataType)),u=o,o=c.shift())if("*"===o)o=u;else if("*"!==u&&u!==o){if(!(s=l[u+" "+o]||l["* "+o]))for(i in l)if(a=i.split(" "),a[1]===o&&(s=l[u+" "+a[0]]||l["* "+a[0]])){!0===s?s=l[i]:!0!==l[i]&&(o=a[0],c.unshift(a[1]));break}if(!0!==s)if(s&&e.throws)t=s(t);else try{t=s(t)}catch(e){return{state:"parsererror",error:s?e:"No conversion from "+u+" to "+o}}}return{state:"success",data:t}}function U(e,t,n,r){var i;if(ie.isArray(t))ie.each(t,function(t,i){n||yt.test(e)?r(e,i):U(e+"["+("object"==typeof i&&null!=i?t:"")+"]",i,n,r)});else if(n||"object"!==ie.type(t))r(e,t);else for(i in t)U(e+"["+i+"]",t[i],n,r)}function V(e){return ie.isWindow(e)?e:9===e.nodeType&&e.defaultView}var Y=[],G=e.document,Q=Y.slice,J=Y.concat,K=Y.push,Z=Y.indexOf,ee={},te=ee.toString,ne=ee.hasOwnProperty,re={},ie=function(e,t){return new ie.fn.init(e,t)},oe=function(e,t){return t.toUpperCase()};ie.fn=ie.prototype={jquery:"2.2.4",constructor:ie,selector:"",length:0,toArray:function(){return Q.call(this)},get:function(e){return null!=e?e<0?this[e+this.length]:this[e]:Q.call(this)},pushStack:function(e){var t=ie.merge(this.constructor(),e);return t.prevObject=this,t.context=this.context,t},each:function(e){return ie.each(this,e)},map:function(e){return this.pushStack(ie.map(this,function(t,n){return e.call(t,n,t)}))},slice:function(){return this.pushStack(Q.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},eq:function(e){var t=this.length,n=+e+(e<0?t:0);return this.pushStack(n>=0&&n<t?[this[n]]:[])},end:function(){return this.prevObject||this.constructor()},push:K,sort:Y.sort,splice:Y.splice},ie.extend=ie.fn.extend=function(){var e,t,n,r,i,o,s=arguments[0]||{},a=1,u=arguments.length,l=!1;for("boolean"==typeof s&&(l=s,s=arguments[a]||{},a++),"object"==typeof s||ie.isFunction(s)||(s={}),a===u&&(s=this,a--);a<u;a++)if(null!=(e=arguments[a]))for(t in e)n=s[t],r=e[t],s!==r&&(l&&r&&(ie.isPlainObject(r)||(i=ie.isArray(r)))?(i?(i=!1,o=n&&ie.isArray(n)?n:[]):o=n&&ie.isPlainObject(n)?n:{},s[t]=ie.extend(l,o,r)):void 0!==r&&(s[t]=r));return s},ie.extend({expando:"jQuery"+("2.2.4"+Math.random()).replace(/\D/g,""),isReady:!0,error:function(e){throw new Error(e)},noop:function(){},isFunction:function(e){return"function"===ie.type(e)},isArray:Array.isArray,isWindow:function(e){return null!=e&&e===e.window},isNumeric:function(e){var t=e&&e.toString();return!ie.isArray(e)&&t-parseFloat(t)+1>=0},isPlainObject:function(e){var t;if("object"!==ie.type(e)||e.nodeType||ie.isWindow(e))return!1;if(e.constructor&&!ne.call(e,"constructor")&&!ne.call(e.constructor.prototype||{},"isPrototypeOf"))return!1;for(t in e);return void 0===t||ne.call(e,t)},isEmptyObject:function(e){var t;for(t in e)return!1;return!0},type:function(e){return null==e?e+"":"object"==typeof e||"function"==typeof e?ee[te.call(e)]||"object":typeof e},globalEval:function(e){var t,n=eval;(e=ie.trim(e))&&(1===e.indexOf("use strict")?(t=G.createElement("script"),t.text=e,G.head.appendChild(t).parentNode.removeChild(t)):n(e))},camelCase:function(e){return e.replace(/^-ms-/,"ms-").replace(/-([\da-z])/gi,oe)},nodeName:function(e,t){return e.nodeName&&e.nodeName.toLowerCase()===t.toLowerCase()},each:function(e,t){var r,i=0;if(n(e))for(r=e.length;i<r&&!1!==t.call(e[i],i,e[i]);i++);else for(i in e)if(!1===t.call(e[i],i,e[i]))break;return e},trim:function(e){return null==e?"":(e+"").replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,"")},makeArray:function(e,t){var r=t||[];return null!=e&&(n(Object(e))?ie.merge(r,"string"==typeof e?[e]:e):K.call(r,e)),r},inArray:function(e,t,n){return null==t?-1:Z.call(t,e,n)},merge:function(e,t){for(var n=+t.length,r=0,i=e.length;r<n;r++)e[i++]=t[r];return e.length=i,e},grep:function(e,t,n){for(var r=[],i=0,o=e.length,s=!n;i<o;i++)!t(e[i],i)!==s&&r.push(e[i]);return r},map:function(e,t,r){var i,o,s=0,a=[];if(n(e))for(i=e.length;s<i;s++)null!=(o=t(e[s],s,r))&&a.push(o);else for(s in e)null!=(o=t(e[s],s,r))&&a.push(o);return J.apply([],a)},guid:1,proxy:function(e,t){var n,r,i;if("string"==typeof t&&(n=e[t],t=e,e=n),ie.isFunction(e))return r=Q.call(arguments,2),i=function(){return e.apply(t||this,r.concat(Q.call(arguments)))},i.guid=e.guid=e.guid||ie.guid++,i},now:Date.now,support:re}),"function"==typeof Symbol&&(ie.fn[Symbol.iterator]=Y[Symbol.iterator]),ie.each("Boolean Number String Function Array Date RegExp Object Error Symbol".split(" "),function(e,t){ee["[object "+t+"]"]=t.toLowerCase()});var se=function(e){function t(e,t,n,r){var i,o,s,a,l,f,p,d,h=t&&t.ownerDocument,g=t?t.nodeType:9;if(n=n||[],"string"!=typeof e||!e||1!==g&&9!==g&&11!==g)return n;if(!r&&((t?t.ownerDocument||t:M)!==A&&D(t),t=t||A,L)){if(11!==g&&(f=ge.exec(e)))if(i=f[1]){if(9===g){if(!(s=t.getElementById(i)))return n;if(s.id===i)return n.push(s),n}else if(h&&(s=h.getElementById(i))&&P(t,s)&&s.id===i)return n.push(s),n}else{if(f[2])return Q.apply(n,t.getElementsByTagName(e)),n;if((i=f[3])&&x.getElementsByClassName&&t.getElementsByClassName)return Q.apply(n,t.getElementsByClassName(i)),n}if(x.qsa&&!_[e+" "]&&(!H||!H.test(e))){if(1!==g)h=t,d=e;else if("object"!==t.nodeName.toLowerCase()){for((a=t.getAttribute("id"))?a=a.replace(me,"\\$&"):t.setAttribute("id",a=R),p=C(e),o=p.length,l=ce.test(a)?"#"+a:"[id='"+a+"']";o--;)p[o]=l+" "+c(p[o]);d=p.join(","),h=ve.test(e)&&u(t.parentNode)||t}if(d)try{return Q.apply(n,h.querySelectorAll(d)),n}catch(e){}finally{a===R&&t.removeAttribute("id")}}}return E(e.replace(oe,"$1"),t,n,r)}function n(){function e(n,r){return t.push(n+" ")>b.cacheLength&&delete e[t.shift()],e[n+" "]=r}var t=[];return e}function r(e){return e[R]=!0,e}function i(e){var t=A.createElement("div");try{return!!e(t)}catch(e){return!1}finally{t.parentNode&&t.parentNode.removeChild(t),t=null}}function o(e,t){for(var n=e.split("|"),r=n.length;r--;)b.attrHandle[n[r]]=t}function s(e,t){var n=t&&e,r=n&&1===e.nodeType&&1===t.nodeType&&(~t.sourceIndex||z)-(~e.sourceIndex||z);if(r)return r;if(n)for(;n=n.nextSibling;)if(n===t)return-1;return e?1:-1}function a(e){return r(function(t){return t=+t,r(function(n,r){for(var i,o=e([],n.length,t),s=o.length;s--;)n[i=o[s]]&&(n[i]=!(r[i]=n[i]))})})}function u(e){return e&&void 0!==e.getElementsByTagName&&e}function l(){}function c(e){for(var t=0,n=e.length,r="";t<n;t++)r+=e[t].value;return r}function f(e,t,n){var r=t.dir,i=n&&"parentNode"===r,o=W++;return t.first?function(t,n,o){for(;t=t[r];)if(1===t.nodeType||i)return e(t,n,o)}:function(t,n,s){var a,u,l,c=[I,o];if(s){for(;t=t[r];)if((1===t.nodeType||i)&&e(t,n,s))return!0}else for(;t=t[r];)if(1===t.nodeType||i){if(l=t[R]||(t[R]={}),u=l[t.uniqueID]||(l[t.uniqueID]={}),(a=u[r])&&a[0]===I&&a[1]===o)return c[2]=a[2];if(u[r]=c,c[2]=e(t,n,s))return!0}}}function p(e){return e.length>1?function(t,n,r){for(var i=e.length;i--;)if(!e[i](t,n,r))return!1;return!0}:e[0]}function d(e,n,r){for(var i=0,o=n.length;i<o;i++)t(e,n[i],r);return r}function h(e,t,n,r,i){for(var o,s=[],a=0,u=e.length,l=null!=t;a<u;a++)(o=e[a])&&(n&&!n(o,r,i)||(s.push(o),l&&t.push(a)));return s}function g(e,t,n,i,o,s){return i&&!i[R]&&(i=g(i)),o&&!o[R]&&(o=g(o,s)),r(function(r,s,a,u){var l,c,f,p=[],g=[],v=s.length,m=r||d(t||"*",a.nodeType?[a]:a,[]),y=!e||!r&&t?m:h(m,p,e,a,u),x=n?o||(r?e:v||i)?[]:s:y;if(n&&n(y,x,a,u),i)for(l=h(x,g),i(l,[],a,u),c=l.length;c--;)(f=l[c])&&(x[g[c]]=!(y[g[c]]=f));if(r){if(o||e){if(o){for(l=[],c=x.length;c--;)(f=x[c])&&l.push(y[c]=f);o(null,x=[],l,u)}for(c=x.length;c--;)(f=x[c])&&(l=o?K(r,f):p[c])>-1&&(r[l]=!(s[l]=f))}}else x=h(x===s?x.splice(v,x.length):x),o?o(null,s,x,u):Q.apply(s,x)})}function v(e){for(var t,n,r,i=e.length,o=b.relative[e[0].type],s=o||b.relative[" "],a=o?1:0,u=f(function(e){return e===t},s,!0),l=f(function(e){return K(t,e)>-1},s,!0),d=[function(e,n,r){var i=!o&&(r||n!==N)||((t=n).nodeType?u(e,n,r):l(e,n,r));return t=null,i}];a<i;a++)if(n=b.relative[e[a].type])d=[f(p(d),n)];else{if(n=b.filter[e[a].type].apply(null,e[a].matches),n[R]){for(r=++a;r<i&&!b.relative[e[r].type];r++);return g(a>1&&p(d),a>1&&c(e.slice(0,a-1).concat({value:" "===e[a-2].type?"*":""})).replace(oe,"$1"),n,a<r&&v(e.slice(a,r)),r<i&&v(e=e.slice(r)),r<i&&c(e))}d.push(n)}return p(d)}function m(e,n){var i=n.length>0,o=e.length>0,s=function(r,s,a,u,l){var c,f,p,d=0,g="0",v=r&&[],m=[],y=N,x=r||o&&b.find.TAG("*",l),w=I+=null==y?1:Math.random()||.1,T=x.length;for(l&&(N=s===A||s||l);g!==T&&null!=(c=x[g]);g++){if(o&&c){for(f=0,s||c.ownerDocument===A||(D(c),a=!L);p=e[f++];)if(p(c,s||A,a)){u.push(c);break}l&&(I=w)}i&&((c=!p&&c)&&d--,r&&v.push(c))}if(d+=g,i&&g!==d){for(f=0;p=n[f++];)p(v,m,s,a);if(r){if(d>0)for(;g--;)v[g]||m[g]||(m[g]=Y.call(u));m=h(m)}Q.apply(u,m),l&&!r&&m.length>0&&d+n.length>1&&t.uniqueSort(u)}return l&&(I=w,N=y),v};return i?r(s):s}var y,x,b,w,T,C,k,E,N,S,j,D,A,q,L,H,O,F,P,R="sizzle"+1*new Date,M=e.document,I=0,W=0,$=n(),B=n(),_=n(),X=function(e,t){return e===t&&(j=!0),0},z=1<<31,U={}.hasOwnProperty,V=[],Y=V.pop,G=V.push,Q=V.push,J=V.slice,K=function(e,t){for(var n=0,r=e.length;n<r;n++)if(e[n]===t)return n;return-1},Z="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",ee="[\\x20\\t\\r\\n\\f]",te="(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",ne="\\["+ee+"*("+te+")(?:"+ee+"*([*^$|!~]?=)"+ee+"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|("+te+"))|)"+ee+"*\\]",re=":("+te+")(?:\\((('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|((?:\\\\.|[^\\\\()[\\]]|"+ne+")*)|.*)\\)|)",ie=new RegExp(ee+"+","g"),oe=new RegExp("^"+ee+"+|((?:^|[^\\\\])(?:\\\\.)*)"+ee+"+$","g"),se=new RegExp("^"+ee+"*,"+ee+"*"),ae=new RegExp("^"+ee+"*([>+~]|"+ee+")"+ee+"*"),ue=new RegExp("="+ee+"*([^\\]'\"]*?)"+ee+"*\\]","g"),le=new RegExp(re),ce=new RegExp("^"+te+"$"),fe={ID:new RegExp("^#("+te+")"),CLASS:new RegExp("^\\.("+te+")"),TAG:new RegExp("^("+te+"|[*])"),ATTR:new RegExp("^"+ne),PSEUDO:new RegExp("^"+re),CHILD:new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+ee+"*(even|odd|(([+-]|)(\\d*)n|)"+ee+"*(?:([+-]|)"+ee+"*(\\d+)|))"+ee+"*\\)|)","i"),bool:new RegExp("^(?:"+Z+")$","i"),needsContext:new RegExp("^"+ee+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+ee+"*((?:-\\d)?\\d*)"+ee+"*\\)|)(?=[^-]|$)","i")},pe=/^(?:input|select|textarea|button)$/i,de=/^h\d$/i,he=/^[^{]+\{\s*\[native \w/,ge=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,ve=/[+~]/,me=/'|\\/g,ye=new RegExp("\\\\([\\da-f]{1,6}"+ee+"?|("+ee+")|.)","ig"),xe=function(e,t,n){var r="0x"+t-65536;return r!==r||n?t:r<0?String.fromCharCode(r+65536):String.fromCharCode(r>>10|55296,1023&r|56320)},be=function(){D()};try{Q.apply(V=J.call(M.childNodes),M.childNodes),V[M.childNodes.length].nodeType}catch(e){Q={apply:V.length?function(e,t){G.apply(e,J.call(t))}:function(e,t){for(var n=e.length,r=0;e[n++]=t[r++];);e.length=n-1}}}x=t.support={},T=t.isXML=function(e){var t=e&&(e.ownerDocument||e).documentElement;return!!t&&"HTML"!==t.nodeName},D=t.setDocument=function(e){var t,n,r=e?e.ownerDocument||e:M;return r!==A&&9===r.nodeType&&r.documentElement?(A=r,q=A.documentElement,L=!T(A),(n=A.defaultView)&&n.top!==n&&(n.addEventListener?n.addEventListener("unload",be,!1):n.attachEvent&&n.attachEvent("onunload",be)),x.attributes=i(function(e){return e.className="i",!e.getAttribute("className")}),x.getElementsByTagName=i(function(e){return e.appendChild(A.createComment("")),!e.getElementsByTagName("*").length}),x.getElementsByClassName=he.test(A.getElementsByClassName),x.getById=i(function(e){return q.appendChild(e).id=R,!A.getElementsByName||!A.getElementsByName(R).length}),x.getById?(b.find.ID=function(e,t){if(void 0!==t.getElementById&&L){var n=t.getElementById(e);return n?[n]:[]}},b.filter.ID=function(e){var t=e.replace(ye,xe);return function(e){return e.getAttribute("id")===t}}):(delete b.find.ID,b.filter.ID=function(e){var t=e.replace(ye,xe);return function(e){var n=void 0!==e.getAttributeNode&&e.getAttributeNode("id");return n&&n.value===t}}),b.find.TAG=x.getElementsByTagName?function(e,t){return void 0!==t.getElementsByTagName?t.getElementsByTagName(e):x.qsa?t.querySelectorAll(e):void 0}:function(e,t){var n,r=[],i=0,o=t.getElementsByTagName(e);if("*"===e){for(;n=o[i++];)1===n.nodeType&&r.push(n);return r}return o},b.find.CLASS=x.getElementsByClassName&&function(e,t){if(void 0!==t.getElementsByClassName&&L)return t.getElementsByClassName(e)},O=[],H=[],(x.qsa=he.test(A.querySelectorAll))&&(i(function(e){q.appendChild(e).innerHTML="<a id='"+R+"'></a><select id='"+R+"-\r\\' msallowcapture=''><option selected=''></option></select>",e.querySelectorAll("[msallowcapture^='']").length&&H.push("[*^$]="+ee+"*(?:''|\"\")"),e.querySelectorAll("[selected]").length||H.push("\\["+ee+"*(?:value|"+Z+")"),e.querySelectorAll("[id~="+R+"-]").length||H.push("~="),e.querySelectorAll(":checked").length||H.push(":checked"),e.querySelectorAll("a#"+R+"+*").length||H.push(".#.+[+~]")}),i(function(e){var t=A.createElement("input");t.setAttribute("type","hidden"),e.appendChild(t).setAttribute("name","D"),e.querySelectorAll("[name=d]").length&&H.push("name"+ee+"*[*^$|!~]?="),e.querySelectorAll(":enabled").length||H.push(":enabled",":disabled"),e.querySelectorAll("*,:x"),H.push(",.*:")})),(x.matchesSelector=he.test(F=q.matches||q.webkitMatchesSelector||q.mozMatchesSelector||q.oMatchesSelector||q.msMatchesSelector))&&i(function(e){x.disconnectedMatch=F.call(e,"div"),F.call(e,"[s!='']:x"),O.push("!=",re)}),H=H.length&&new RegExp(H.join("|")),O=O.length&&new RegExp(O.join("|")),t=he.test(q.compareDocumentPosition),P=t||he.test(q.contains)?function(e,t){var n=9===e.nodeType?e.documentElement:e,r=t&&t.parentNode;return e===r||!(!r||1!==r.nodeType||!(n.contains?n.contains(r):e.compareDocumentPosition&&16&e.compareDocumentPosition(r)))}:function(e,t){if(t)for(;t=t.parentNode;)if(t===e)return!0;return!1},X=t?function(e,t){if(e===t)return j=!0,0;var n=!e.compareDocumentPosition-!t.compareDocumentPosition;return n||(n=(e.ownerDocument||e)===(t.ownerDocument||t)?e.compareDocumentPosition(t):1,1&n||!x.sortDetached&&t.compareDocumentPosition(e)===n?e===A||e.ownerDocument===M&&P(M,e)?-1:t===A||t.ownerDocument===M&&P(M,t)?1:S?K(S,e)-K(S,t):0:4&n?-1:1)}:function(e,t){if(e===t)return j=!0,0;var n,r=0,i=e.parentNode,o=t.parentNode,a=[e],u=[t];if(!i||!o)return e===A?-1:t===A?1:i?-1:o?1:S?K(S,e)-K(S,t):0;if(i===o)return s(e,t);for(n=e;n=n.parentNode;)a.unshift(n);for(n=t;n=n.parentNode;)u.unshift(n);for(;a[r]===u[r];)r++;return r?s(a[r],u[r]):a[r]===M?-1:u[r]===M?1:0},A):A},t.matches=function(e,n){return t(e,null,null,n)},t.matchesSelector=function(e,n){if((e.ownerDocument||e)!==A&&D(e),n=n.replace(ue,"='$1']"),x.matchesSelector&&L&&!_[n+" "]&&(!O||!O.test(n))&&(!H||!H.test(n)))try{var r=F.call(e,n);if(r||x.disconnectedMatch||e.document&&11!==e.document.nodeType)return r}catch(e){}return t(n,A,null,[e]).length>0},t.contains=function(e,t){return(e.ownerDocument||e)!==A&&D(e),P(e,t)},t.attr=function(e,t){(e.ownerDocument||e)!==A&&D(e);var n=b.attrHandle[t.toLowerCase()],r=n&&U.call(b.attrHandle,t.toLowerCase())?n(e,t,!L):void 0;return void 0!==r?r:x.attributes||!L?e.getAttribute(t):(r=e.getAttributeNode(t))&&r.specified?r.value:null},t.error=function(e){throw new Error("Syntax error, unrecognized expression: "+e)},t.uniqueSort=function(e){var t,n=[],r=0,i=0;if(j=!x.detectDuplicates,S=!x.sortStable&&e.slice(0),e.sort(X),j){for(;t=e[i++];)t===e[i]&&(r=n.push(i));for(;r--;)e.splice(n[r],1)}return S=null,e},w=t.getText=function(e){var t,n="",r=0,i=e.nodeType;if(i){if(1===i||9===i||11===i){if("string"==typeof e.textContent)return e.textContent;for(e=e.firstChild;e;e=e.nextSibling)n+=w(e)}else if(3===i||4===i)return e.nodeValue}else for(;t=e[r++];)n+=w(t);return n},b=t.selectors={cacheLength:50,createPseudo:r,match:fe,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(e){return e[1]=e[1].replace(ye,xe),e[3]=(e[3]||e[4]||e[5]||"").replace(ye,xe),"~="===e[2]&&(e[3]=" "+e[3]+" "),e.slice(0,4)},CHILD:function(e){return e[1]=e[1].toLowerCase(),"nth"===e[1].slice(0,3)?(e[3]||t.error(e[0]),e[4]=+(e[4]?e[5]+(e[6]||1):2*("even"===e[3]||"odd"===e[3])),e[5]=+(e[7]+e[8]||"odd"===e[3])):e[3]&&t.error(e[0]),e},PSEUDO:function(e){var t,n=!e[6]&&e[2];return fe.CHILD.test(e[0])?null:(e[3]?e[2]=e[4]||e[5]||"":n&&le.test(n)&&(t=C(n,!0))&&(t=n.indexOf(")",n.length-t)-n.length)&&(e[0]=e[0].slice(0,t),e[2]=n.slice(0,t)),e.slice(0,3))}},filter:{TAG:function(e){var t=e.replace(ye,xe).toLowerCase();return"*"===e?function(){return!0}:function(e){return e.nodeName&&e.nodeName.toLowerCase()===t}},CLASS:function(e){var t=$[e+" "];return t||(t=new RegExp("(^|"+ee+")"+e+"("+ee+"|$)"))&&$(e,function(e){return t.test("string"==typeof e.className&&e.className||void 0!==e.getAttribute&&e.getAttribute("class")||"")})},ATTR:function(e,n,r){return function(i){var o=t.attr(i,e);return null==o?"!="===n:!n||(o+="","="===n?o===r:"!="===n?o!==r:"^="===n?r&&0===o.indexOf(r):"*="===n?r&&o.indexOf(r)>-1:"$="===n?r&&o.slice(-r.length)===r:"~="===n?(" "+o.replace(ie," ")+" ").indexOf(r)>-1:"|="===n&&(o===r||o.slice(0,r.length+1)===r+"-"))}},CHILD:function(e,t,n,r,i){var o="nth"!==e.slice(0,3),s="last"!==e.slice(-4),a="of-type"===t;return 1===r&&0===i?function(e){return!!e.parentNode}:function(t,n,u){var l,c,f,p,d,h,g=o!==s?"nextSibling":"previousSibling",v=t.parentNode,m=a&&t.nodeName.toLowerCase(),y=!u&&!a,x=!1;if(v){if(o){for(;g;){for(p=t;p=p[g];)if(a?p.nodeName.toLowerCase()===m:1===p.nodeType)return!1;h=g="only"===e&&!h&&"nextSibling"}return!0}if(h=[s?v.firstChild:v.lastChild],s&&y){for(p=v,f=p[R]||(p[R]={}),c=f[p.uniqueID]||(f[p.uniqueID]={}),l=c[e]||[],d=l[0]===I&&l[1],x=d&&l[2],p=d&&v.childNodes[d];p=++d&&p&&p[g]||(x=d=0)||h.pop();)if(1===p.nodeType&&++x&&p===t){c[e]=[I,d,x];break}}else if(y&&(p=t,f=p[R]||(p[R]={}),c=f[p.uniqueID]||(f[p.uniqueID]={}),l=c[e]||[],d=l[0]===I&&l[1],x=d),!1===x)for(;(p=++d&&p&&p[g]||(x=d=0)||h.pop())&&((a?p.nodeName.toLowerCase()!==m:1!==p.nodeType)||!++x||(y&&(f=p[R]||(p[R]={}),c=f[p.uniqueID]||(f[p.uniqueID]={}),c[e]=[I,x]),p!==t)););return(x-=i)===r||x%r==0&&x/r>=0}}},PSEUDO:function(e,n){var i,o=b.pseudos[e]||b.setFilters[e.toLowerCase()]||t.error("unsupported pseudo: "+e);return o[R]?o(n):o.length>1?(i=[e,e,"",n],b.setFilters.hasOwnProperty(e.toLowerCase())?r(function(e,t){for(var r,i=o(e,n),s=i.length;s--;)r=K(e,i[s]),e[r]=!(t[r]=i[s])}):function(e){return o(e,0,i)}):o}},pseudos:{not:r(function(e){var t=[],n=[],i=k(e.replace(oe,"$1"));return i[R]?r(function(e,t,n,r){for(var o,s=i(e,null,r,[]),a=e.length;a--;)(o=s[a])&&(e[a]=!(t[a]=o))}):function(e,r,o){return t[0]=e,i(t,null,o,n),t[0]=null,!n.pop()}}),has:r(function(e){return function(n){return t(e,n).length>0}}),contains:r(function(e){return e=e.replace(ye,xe),function(t){return(t.textContent||t.innerText||w(t)).indexOf(e)>-1}}),lang:r(function(e){return ce.test(e||"")||t.error("unsupported lang: "+e),e=e.replace(ye,xe).toLowerCase(),function(t){var n;do{if(n=L?t.lang:t.getAttribute("xml:lang")||t.getAttribute("lang"))return(n=n.toLowerCase())===e||0===n.indexOf(e+"-")}while((t=t.parentNode)&&1===t.nodeType);return!1}}),target:function(t){var n=e.location&&e.location.hash;return n&&n.slice(1)===t.id},root:function(e){return e===q},focus:function(e){return e===A.activeElement&&(!A.hasFocus||A.hasFocus())&&!!(e.type||e.href||~e.tabIndex)},enabled:function(e){return!1===e.disabled},disabled:function(e){return!0===e.disabled},checked:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&!!e.checked||"option"===t&&!!e.selected},selected:function(e){return e.parentNode&&e.parentNode.selectedIndex,!0===e.selected},empty:function(e){for(e=e.firstChild;e;e=e.nextSibling)if(e.nodeType<6)return!1;return!0},parent:function(e){return!b.pseudos.empty(e)},header:function(e){return de.test(e.nodeName)},input:function(e){return pe.test(e.nodeName)},button:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&"button"===e.type||"button"===t},text:function(e){var t;return"input"===e.nodeName.toLowerCase()&&"text"===e.type&&(null==(t=e.getAttribute("type"))||"text"===t.toLowerCase())},first:a(function(){return[0]}),last:a(function(e,t){return[t-1]}),eq:a(function(e,t,n){return[n<0?n+t:n]}),even:a(function(e,t){for(var n=0;n<t;n+=2)e.push(n);return e}),odd:a(function(e,t){for(var n=1;n<t;n+=2)e.push(n);return e}),lt:a(function(e,t,n){for(var r=n<0?n+t:n;--r>=0;)e.push(r);return e}),gt:a(function(e,t,n){for(var r=n<0?n+t:n;++r<t;)e.push(r);return e})}},b.pseudos.nth=b.pseudos.eq;for(y in{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})b.pseudos[y]=function(e){return function(t){
return"input"===t.nodeName.toLowerCase()&&t.type===e}}(y);for(y in{submit:!0,reset:!0})b.pseudos[y]=function(e){return function(t){var n=t.nodeName.toLowerCase();return("input"===n||"button"===n)&&t.type===e}}(y);return l.prototype=b.filters=b.pseudos,b.setFilters=new l,C=t.tokenize=function(e,n){var r,i,o,s,a,u,l,c=B[e+" "];if(c)return n?0:c.slice(0);for(a=e,u=[],l=b.preFilter;a;){r&&!(i=se.exec(a))||(i&&(a=a.slice(i[0].length)||a),u.push(o=[])),r=!1,(i=ae.exec(a))&&(r=i.shift(),o.push({value:r,type:i[0].replace(oe," ")}),a=a.slice(r.length));for(s in b.filter)!(i=fe[s].exec(a))||l[s]&&!(i=l[s](i))||(r=i.shift(),o.push({value:r,type:s,matches:i}),a=a.slice(r.length));if(!r)break}return n?a.length:a?t.error(e):B(e,u).slice(0)},k=t.compile=function(e,t){var n,r=[],i=[],o=_[e+" "];if(!o){for(t||(t=C(e)),n=t.length;n--;)o=v(t[n]),o[R]?r.push(o):i.push(o);o=_(e,m(i,r)),o.selector=e}return o},E=t.select=function(e,t,n,r){var i,o,s,a,l,f="function"==typeof e&&e,p=!r&&C(e=f.selector||e);if(n=n||[],1===p.length){if(o=p[0]=p[0].slice(0),o.length>2&&"ID"===(s=o[0]).type&&x.getById&&9===t.nodeType&&L&&b.relative[o[1].type]){if(!(t=(b.find.ID(s.matches[0].replace(ye,xe),t)||[])[0]))return n;f&&(t=t.parentNode),e=e.slice(o.shift().value.length)}for(i=fe.needsContext.test(e)?0:o.length;i--&&(s=o[i],!b.relative[a=s.type]);)if((l=b.find[a])&&(r=l(s.matches[0].replace(ye,xe),ve.test(o[0].type)&&u(t.parentNode)||t))){if(o.splice(i,1),!(e=r.length&&c(o)))return Q.apply(n,r),n;break}}return(f||k(e,p))(r,t,!L,n,!t||ve.test(e)&&u(t.parentNode)||t),n},x.sortStable=R.split("").sort(X).join("")===R,x.detectDuplicates=!!j,D(),x.sortDetached=i(function(e){return 1&e.compareDocumentPosition(A.createElement("div"))}),i(function(e){return e.innerHTML="<a href='#'></a>","#"===e.firstChild.getAttribute("href")})||o("type|href|height|width",function(e,t,n){if(!n)return e.getAttribute(t,"type"===t.toLowerCase()?1:2)}),x.attributes&&i(function(e){return e.innerHTML="<input/>",e.firstChild.setAttribute("value",""),""===e.firstChild.getAttribute("value")})||o("value",function(e,t,n){if(!n&&"input"===e.nodeName.toLowerCase())return e.defaultValue}),i(function(e){return null==e.getAttribute("disabled")})||o(Z,function(e,t,n){var r;if(!n)return!0===e[t]?t.toLowerCase():(r=e.getAttributeNode(t))&&r.specified?r.value:null}),t}(e);ie.find=se,ie.expr=se.selectors,ie.expr[":"]=ie.expr.pseudos,ie.uniqueSort=ie.unique=se.uniqueSort,ie.text=se.getText,ie.isXMLDoc=se.isXML,ie.contains=se.contains;var ae=function(e,t,n){for(var r=[],i=void 0!==n;(e=e[t])&&9!==e.nodeType;)if(1===e.nodeType){if(i&&ie(e).is(n))break;r.push(e)}return r},ue=function(e,t){for(var n=[];e;e=e.nextSibling)1===e.nodeType&&e!==t&&n.push(e);return n},le=ie.expr.match.needsContext,ce=/^<([\w-]+)\s*\/?>(?:<\/\1>|)$/,fe=/^.[^:#\[\.,]*$/;ie.filter=function(e,t,n){var r=t[0];return n&&(e=":not("+e+")"),1===t.length&&1===r.nodeType?ie.find.matchesSelector(r,e)?[r]:[]:ie.find.matches(e,ie.grep(t,function(e){return 1===e.nodeType}))},ie.fn.extend({find:function(e){var t,n=this.length,r=[],i=this;if("string"!=typeof e)return this.pushStack(ie(e).filter(function(){for(t=0;t<n;t++)if(ie.contains(i[t],this))return!0}));for(t=0;t<n;t++)ie.find(e,i[t],r);return r=this.pushStack(n>1?ie.unique(r):r),r.selector=this.selector?this.selector+" "+e:e,r},filter:function(e){return this.pushStack(r(this,e||[],!1))},not:function(e){return this.pushStack(r(this,e||[],!0))},is:function(e){return!!r(this,"string"==typeof e&&le.test(e)?ie(e):e||[],!1).length}});var pe,de=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/;(ie.fn.init=function(e,t,n){var r,i;if(!e)return this;if(n=n||pe,"string"==typeof e){if(!(r="<"===e[0]&&">"===e[e.length-1]&&e.length>=3?[null,e,null]:de.exec(e))||!r[1]&&t)return!t||t.jquery?(t||n).find(e):this.constructor(t).find(e);if(r[1]){if(t=t instanceof ie?t[0]:t,ie.merge(this,ie.parseHTML(r[1],t&&t.nodeType?t.ownerDocument||t:G,!0)),ce.test(r[1])&&ie.isPlainObject(t))for(r in t)ie.isFunction(this[r])?this[r](t[r]):this.attr(r,t[r]);return this}return i=G.getElementById(r[2]),i&&i.parentNode&&(this.length=1,this[0]=i),this.context=G,this.selector=e,this}return e.nodeType?(this.context=this[0]=e,this.length=1,this):ie.isFunction(e)?void 0!==n.ready?n.ready(e):e(ie):(void 0!==e.selector&&(this.selector=e.selector,this.context=e.context),ie.makeArray(e,this))}).prototype=ie.fn,pe=ie(G);var he=/^(?:parents|prev(?:Until|All))/,ge={children:!0,contents:!0,next:!0,prev:!0};ie.fn.extend({has:function(e){var t=ie(e,this),n=t.length;return this.filter(function(){for(var e=0;e<n;e++)if(ie.contains(this,t[e]))return!0})},closest:function(e,t){for(var n,r=0,i=this.length,o=[],s=le.test(e)||"string"!=typeof e?ie(e,t||this.context):0;r<i;r++)for(n=this[r];n&&n!==t;n=n.parentNode)if(n.nodeType<11&&(s?s.index(n)>-1:1===n.nodeType&&ie.find.matchesSelector(n,e))){o.push(n);break}return this.pushStack(o.length>1?ie.uniqueSort(o):o)},index:function(e){return e?"string"==typeof e?Z.call(ie(e),this[0]):Z.call(this,e.jquery?e[0]:e):this[0]&&this[0].parentNode?this.first().prevAll().length:-1},add:function(e,t){return this.pushStack(ie.uniqueSort(ie.merge(this.get(),ie(e,t))))},addBack:function(e){return this.add(null==e?this.prevObject:this.prevObject.filter(e))}}),ie.each({parent:function(e){var t=e.parentNode;return t&&11!==t.nodeType?t:null},parents:function(e){return ae(e,"parentNode")},parentsUntil:function(e,t,n){return ae(e,"parentNode",n)},next:function(e){return i(e,"nextSibling")},prev:function(e){return i(e,"previousSibling")},nextAll:function(e){return ae(e,"nextSibling")},prevAll:function(e){return ae(e,"previousSibling")},nextUntil:function(e,t,n){return ae(e,"nextSibling",n)},prevUntil:function(e,t,n){return ae(e,"previousSibling",n)},siblings:function(e){return ue((e.parentNode||{}).firstChild,e)},children:function(e){return ue(e.firstChild)},contents:function(e){return e.contentDocument||ie.merge([],e.childNodes)}},function(e,t){ie.fn[e]=function(n,r){var i=ie.map(this,t,n);return"Until"!==e.slice(-5)&&(r=n),r&&"string"==typeof r&&(i=ie.filter(r,i)),this.length>1&&(ge[e]||ie.uniqueSort(i),he.test(e)&&i.reverse()),this.pushStack(i)}});var ve=/\S+/g;ie.Callbacks=function(e){e="string"==typeof e?o(e):ie.extend({},e);var t,n,r,i,s=[],a=[],u=-1,l=function(){for(i=e.once,r=t=!0;a.length;u=-1)for(n=a.shift();++u<s.length;)!1===s[u].apply(n[0],n[1])&&e.stopOnFalse&&(u=s.length,n=!1);e.memory||(n=!1),t=!1,i&&(s=n?[]:"")},c={add:function(){return s&&(n&&!t&&(u=s.length-1,a.push(n)),function t(n){ie.each(n,function(n,r){ie.isFunction(r)?e.unique&&c.has(r)||s.push(r):r&&r.length&&"string"!==ie.type(r)&&t(r)})}(arguments),n&&!t&&l()),this},remove:function(){return ie.each(arguments,function(e,t){for(var n;(n=ie.inArray(t,s,n))>-1;)s.splice(n,1),n<=u&&u--}),this},has:function(e){return e?ie.inArray(e,s)>-1:s.length>0},empty:function(){return s&&(s=[]),this},disable:function(){return i=a=[],s=n="",this},disabled:function(){return!s},lock:function(){return i=a=[],n||(s=n=""),this},locked:function(){return!!i},fireWith:function(e,n){return i||(n=n||[],n=[e,n.slice?n.slice():n],a.push(n),t||l()),this},fire:function(){return c.fireWith(this,arguments),this},fired:function(){return!!r}};return c},ie.extend({Deferred:function(e){var t=[["resolve","done",ie.Callbacks("once memory"),"resolved"],["reject","fail",ie.Callbacks("once memory"),"rejected"],["notify","progress",ie.Callbacks("memory")]],n="pending",r={state:function(){return n},always:function(){return i.done(arguments).fail(arguments),this},then:function(){var e=arguments;return ie.Deferred(function(n){ie.each(t,function(t,o){var s=ie.isFunction(e[t])&&e[t];i[o[1]](function(){var e=s&&s.apply(this,arguments);e&&ie.isFunction(e.promise)?e.promise().progress(n.notify).done(n.resolve).fail(n.reject):n[o[0]+"With"](this===r?n.promise():this,s?[e]:arguments)})}),e=null}).promise()},promise:function(e){return null!=e?ie.extend(e,r):r}},i={};return r.pipe=r.then,ie.each(t,function(e,o){var s=o[2],a=o[3];r[o[1]]=s.add,a&&s.add(function(){n=a},t[1^e][2].disable,t[2][2].lock),i[o[0]]=function(){return i[o[0]+"With"](this===i?r:this,arguments),this},i[o[0]+"With"]=s.fireWith}),r.promise(i),e&&e.call(i,i),i},when:function(e){var t,n,r,i=0,o=Q.call(arguments),s=o.length,a=1!==s||e&&ie.isFunction(e.promise)?s:0,u=1===a?e:ie.Deferred(),l=function(e,n,r){return function(i){n[e]=this,r[e]=arguments.length>1?Q.call(arguments):i,r===t?u.notifyWith(n,r):--a||u.resolveWith(n,r)}};if(s>1)for(t=new Array(s),n=new Array(s),r=new Array(s);i<s;i++)o[i]&&ie.isFunction(o[i].promise)?o[i].promise().progress(l(i,n,t)).done(l(i,r,o)).fail(u.reject):--a;return a||u.resolveWith(r,o),u.promise()}});var me;ie.fn.ready=function(e){return ie.ready.promise().done(e),this},ie.extend({isReady:!1,readyWait:1,holdReady:function(e){e?ie.readyWait++:ie.ready(!0)},ready:function(e){(!0===e?--ie.readyWait:ie.isReady)||(ie.isReady=!0,!0!==e&&--ie.readyWait>0||(me.resolveWith(G,[ie]),ie.fn.triggerHandler&&(ie(G).triggerHandler("ready"),ie(G).off("ready"))))}}),ie.ready.promise=function(t){return me||(me=ie.Deferred(),"complete"===G.readyState||"loading"!==G.readyState&&!G.documentElement.doScroll?e.setTimeout(ie.ready):(G.addEventListener("DOMContentLoaded",s),e.addEventListener("load",s))),me.promise(t)},ie.ready.promise();var ye=function(e,t,n,r,i,o,s){var a=0,u=e.length,l=null==n;if("object"===ie.type(n)){i=!0;for(a in n)ye(e,t,a,n[a],!0,o,s)}else if(void 0!==r&&(i=!0,ie.isFunction(r)||(s=!0),l&&(s?(t.call(e,r),t=null):(l=t,t=function(e,t,n){return l.call(ie(e),n)})),t))for(;a<u;a++)t(e[a],n,s?r:r.call(e[a],a,t(e[a],n)));return i?e:l?t.call(e):u?t(e[0],n):o},xe=function(e){return 1===e.nodeType||9===e.nodeType||!+e.nodeType};a.uid=1,a.prototype={register:function(e,t){var n=t||{};return e.nodeType?e[this.expando]=n:Object.defineProperty(e,this.expando,{value:n,writable:!0,configurable:!0}),e[this.expando]},cache:function(e){if(!xe(e))return{};var t=e[this.expando];return t||(t={},xe(e)&&(e.nodeType?e[this.expando]=t:Object.defineProperty(e,this.expando,{value:t,configurable:!0}))),t},set:function(e,t,n){var r,i=this.cache(e);if("string"==typeof t)i[t]=n;else for(r in t)i[r]=t[r];return i},get:function(e,t){return void 0===t?this.cache(e):e[this.expando]&&e[this.expando][t]},access:function(e,t,n){var r;return void 0===t||t&&"string"==typeof t&&void 0===n?(r=this.get(e,t),void 0!==r?r:this.get(e,ie.camelCase(t))):(this.set(e,t,n),void 0!==n?n:t)},remove:function(e,t){var n,r,i,o=e[this.expando];if(void 0!==o){if(void 0===t)this.register(e);else{ie.isArray(t)?r=t.concat(t.map(ie.camelCase)):(i=ie.camelCase(t),t in o?r=[t,i]:(r=i,r=r in o?[r]:r.match(ve)||[])),n=r.length;for(;n--;)delete o[r[n]]}(void 0===t||ie.isEmptyObject(o))&&(e.nodeType?e[this.expando]=void 0:delete e[this.expando])}},hasData:function(e){var t=e[this.expando];return void 0!==t&&!ie.isEmptyObject(t)}};var be=new a,we=new a,Te=/^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,Ce=/[A-Z]/g;ie.extend({hasData:function(e){return we.hasData(e)||be.hasData(e)},data:function(e,t,n){return we.access(e,t,n)},removeData:function(e,t){we.remove(e,t)},_data:function(e,t,n){return be.access(e,t,n)},_removeData:function(e,t){be.remove(e,t)}}),ie.fn.extend({data:function(e,t){var n,r,i,o=this[0],s=o&&o.attributes;if(void 0===e){if(this.length&&(i=we.get(o),1===o.nodeType&&!be.get(o,"hasDataAttrs"))){for(n=s.length;n--;)s[n]&&(r=s[n].name,0===r.indexOf("data-")&&(r=ie.camelCase(r.slice(5)),u(o,r,i[r])));be.set(o,"hasDataAttrs",!0)}return i}return"object"==typeof e?this.each(function(){we.set(this,e)}):ye(this,function(t){var n,r;if(o&&void 0===t){if(void 0!==(n=we.get(o,e)||we.get(o,e.replace(Ce,"-$&").toLowerCase())))return n;if(r=ie.camelCase(e),void 0!==(n=we.get(o,r)))return n;if(void 0!==(n=u(o,r,void 0)))return n}else r=ie.camelCase(e),this.each(function(){var n=we.get(this,r);we.set(this,r,t),e.indexOf("-")>-1&&void 0!==n&&we.set(this,e,t)})},null,t,arguments.length>1,null,!0)},removeData:function(e){return this.each(function(){we.remove(this,e)})}}),ie.extend({queue:function(e,t,n){var r;if(e)return t=(t||"fx")+"queue",r=be.get(e,t),n&&(!r||ie.isArray(n)?r=be.access(e,t,ie.makeArray(n)):r.push(n)),r||[]},dequeue:function(e,t){t=t||"fx";var n=ie.queue(e,t),r=n.length,i=n.shift(),o=ie._queueHooks(e,t),s=function(){ie.dequeue(e,t)};"inprogress"===i&&(i=n.shift(),r--),i&&("fx"===t&&n.unshift("inprogress"),delete o.stop,i.call(e,s,o)),!r&&o&&o.empty.fire()},_queueHooks:function(e,t){var n=t+"queueHooks";return be.get(e,n)||be.access(e,n,{empty:ie.Callbacks("once memory").add(function(){be.remove(e,[t+"queue",n])})})}}),ie.fn.extend({queue:function(e,t){var n=2;return"string"!=typeof e&&(t=e,e="fx",n--),arguments.length<n?ie.queue(this[0],e):void 0===t?this:this.each(function(){var n=ie.queue(this,e,t);ie._queueHooks(this,e),"fx"===e&&"inprogress"!==n[0]&&ie.dequeue(this,e)})},dequeue:function(e){return this.each(function(){ie.dequeue(this,e)})},clearQueue:function(e){return this.queue(e||"fx",[])},promise:function(e,t){var n,r=1,i=ie.Deferred(),o=this,s=this.length,a=function(){--r||i.resolveWith(o,[o])};for("string"!=typeof e&&(t=e,e=void 0),e=e||"fx";s--;)(n=be.get(o[s],e+"queueHooks"))&&n.empty&&(r++,n.empty.add(a));return a(),i.promise(t)}});var ke=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,Ee=new RegExp("^(?:([+-])=|)("+ke+")([a-z%]*)$","i"),Ne=["Top","Right","Bottom","Left"],Se=function(e,t){return e=t||e,"none"===ie.css(e,"display")||!ie.contains(e.ownerDocument,e)},je=/^(?:checkbox|radio)$/i,De=/<([\w:-]+)/,Ae=/^$|\/(?:java|ecma)script/i,qe={option:[1,"<select multiple='multiple'>","</select>"],thead:[1,"<table>","</table>"],col:[2,"<table><colgroup>","</colgroup></table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:[0,"",""]};qe.optgroup=qe.option,qe.tbody=qe.tfoot=qe.colgroup=qe.caption=qe.thead,qe.th=qe.td;var Le=/<|&#?\w+;/;!function(){var e=G.createDocumentFragment(),t=e.appendChild(G.createElement("div")),n=G.createElement("input");n.setAttribute("type","radio"),n.setAttribute("checked","checked"),n.setAttribute("name","t"),t.appendChild(n),re.checkClone=t.cloneNode(!0).cloneNode(!0).lastChild.checked,t.innerHTML="<textarea>x</textarea>",re.noCloneChecked=!!t.cloneNode(!0).lastChild.defaultValue}();var He=/^key/,Oe=/^(?:mouse|pointer|contextmenu|drag|drop)|click/,Fe=/^([^.]*)(?:\.(.+)|)/;ie.event={global:{},add:function(e,t,n,r,i){var o,s,a,u,l,c,f,p,d,h,g,v=be.get(e);if(v)for(n.handler&&(o=n,n=o.handler,i=o.selector),n.guid||(n.guid=ie.guid++),(u=v.events)||(u=v.events={}),(s=v.handle)||(s=v.handle=function(t){return void 0!==ie&&ie.event.triggered!==t.type?ie.event.dispatch.apply(e,arguments):void 0}),t=(t||"").match(ve)||[""],l=t.length;l--;)a=Fe.exec(t[l])||[],d=g=a[1],h=(a[2]||"").split(".").sort(),d&&(f=ie.event.special[d]||{},d=(i?f.delegateType:f.bindType)||d,f=ie.event.special[d]||{},c=ie.extend({type:d,origType:g,data:r,handler:n,guid:n.guid,selector:i,needsContext:i&&ie.expr.match.needsContext.test(i),namespace:h.join(".")},o),(p=u[d])||(p=u[d]=[],p.delegateCount=0,f.setup&&!1!==f.setup.call(e,r,h,s)||e.addEventListener&&e.addEventListener(d,s)),f.add&&(f.add.call(e,c),c.handler.guid||(c.handler.guid=n.guid)),i?p.splice(p.delegateCount++,0,c):p.push(c),ie.event.global[d]=!0)},remove:function(e,t,n,r,i){var o,s,a,u,l,c,f,p,d,h,g,v=be.hasData(e)&&be.get(e);if(v&&(u=v.events)){for(t=(t||"").match(ve)||[""],l=t.length;l--;)if(a=Fe.exec(t[l])||[],d=g=a[1],h=(a[2]||"").split(".").sort(),d){for(f=ie.event.special[d]||{},d=(r?f.delegateType:f.bindType)||d,p=u[d]||[],a=a[2]&&new RegExp("(^|\\.)"+h.join("\\.(?:.*\\.|)")+"(\\.|$)"),s=o=p.length;o--;)c=p[o],!i&&g!==c.origType||n&&n.guid!==c.guid||a&&!a.test(c.namespace)||r&&r!==c.selector&&("**"!==r||!c.selector)||(p.splice(o,1),c.selector&&p.delegateCount--,f.remove&&f.remove.call(e,c));s&&!p.length&&(f.teardown&&!1!==f.teardown.call(e,h,v.handle)||ie.removeEvent(e,d,v.handle),delete u[d])}else for(d in u)ie.event.remove(e,d+t[l],n,r,!0);ie.isEmptyObject(u)&&be.remove(e,"handle events")}},dispatch:function(e){e=ie.event.fix(e);var t,n,r,i,o,s=[],a=Q.call(arguments),u=(be.get(this,"events")||{})[e.type]||[],l=ie.event.special[e.type]||{};if(a[0]=e,e.delegateTarget=this,!l.preDispatch||!1!==l.preDispatch.call(this,e)){for(s=ie.event.handlers.call(this,e,u),t=0;(i=s[t++])&&!e.isPropagationStopped();)for(e.currentTarget=i.elem,n=0;(o=i.handlers[n++])&&!e.isImmediatePropagationStopped();)e.rnamespace&&!e.rnamespace.test(o.namespace)||(e.handleObj=o,e.data=o.data,void 0!==(r=((ie.event.special[o.origType]||{}).handle||o.handler).apply(i.elem,a))&&!1===(e.result=r)&&(e.preventDefault(),e.stopPropagation()));return l.postDispatch&&l.postDispatch.call(this,e),e.result}},handlers:function(e,t){var n,r,i,o,s=[],a=t.delegateCount,u=e.target;if(a&&u.nodeType&&("click"!==e.type||isNaN(e.button)||e.button<1))for(;u!==this;u=u.parentNode||this)if(1===u.nodeType&&(!0!==u.disabled||"click"!==e.type)){for(r=[],n=0;n<a;n++)o=t[n],i=o.selector+" ",void 0===r[i]&&(r[i]=o.needsContext?ie(i,this).index(u)>-1:ie.find(i,this,null,[u]).length),r[i]&&r.push(o);r.length&&s.push({elem:u,handlers:r})}return a<t.length&&s.push({elem:this,handlers:t.slice(a)}),s},props:"altKey bubbles cancelable ctrlKey currentTarget detail eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function(e,t){return null==e.which&&(e.which=null!=t.charCode?t.charCode:t.keyCode),e}},mouseHooks:{props:"button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(e,t){var n,r,i,o=t.button;return null==e.pageX&&null!=t.clientX&&(n=e.target.ownerDocument||G,r=n.documentElement,i=n.body,e.pageX=t.clientX+(r&&r.scrollLeft||i&&i.scrollLeft||0)-(r&&r.clientLeft||i&&i.clientLeft||0),e.pageY=t.clientY+(r&&r.scrollTop||i&&i.scrollTop||0)-(r&&r.clientTop||i&&i.clientTop||0)),e.which||void 0===o||(e.which=1&o?1:2&o?3:4&o?2:0),e}},fix:function(e){if(e[ie.expando])return e;var t,n,r,i=e.type,o=e,s=this.fixHooks[i];for(s||(this.fixHooks[i]=s=Oe.test(i)?this.mouseHooks:He.test(i)?this.keyHooks:{}),r=s.props?this.props.concat(s.props):this.props,e=new ie.Event(o),t=r.length;t--;)n=r[t],e[n]=o[n];return e.target||(e.target=G),3===e.target.nodeType&&(e.target=e.target.parentNode),s.filter?s.filter(e,o):e},special:{load:{noBubble:!0},focus:{trigger:function(){if(this!==g()&&this.focus)return this.focus(),!1},delegateType:"focusin"},blur:{trigger:function(){if(this===g()&&this.blur)return this.blur(),!1},delegateType:"focusout"},click:{trigger:function(){if("checkbox"===this.type&&this.click&&ie.nodeName(this,"input"))return this.click(),!1},_default:function(e){return ie.nodeName(e.target,"a")}},beforeunload:{postDispatch:function(e){void 0!==e.result&&e.originalEvent&&(e.originalEvent.returnValue=e.result)}}}},ie.removeEvent=function(e,t,n){e.removeEventListener&&e.removeEventListener(t,n)},ie.Event=function(e,t){if(!(this instanceof ie.Event))return new ie.Event(e,t);e&&e.type?(this.originalEvent=e,this.type=e.type,this.isDefaultPrevented=e.defaultPrevented||void 0===e.defaultPrevented&&!1===e.returnValue?d:h):this.type=e,t&&ie.extend(this,t),this.timeStamp=e&&e.timeStamp||ie.now(),this[ie.expando]=!0},ie.Event.prototype={constructor:ie.Event,isDefaultPrevented:h,isPropagationStopped:h,isImmediatePropagationStopped:h,isSimulated:!1,preventDefault:function(){var e=this.originalEvent;this.isDefaultPrevented=d,e&&!this.isSimulated&&e.preventDefault()},stopPropagation:function(){var e=this.originalEvent;this.isPropagationStopped=d,e&&!this.isSimulated&&e.stopPropagation()},stopImmediatePropagation:function(){var e=this.originalEvent;this.isImmediatePropagationStopped=d,e&&!this.isSimulated&&e.stopImmediatePropagation(),this.stopPropagation()}},ie.each({mouseenter:"mouseover",mouseleave:"mouseout",pointerenter:"pointerover",pointerleave:"pointerout"},function(e,t){ie.event.special[e]={delegateType:t,bindType:t,handle:function(e){var n,r=this,i=e.relatedTarget,o=e.handleObj;return i&&(i===r||ie.contains(r,i))||(e.type=o.origType,n=o.handler.apply(this,arguments),e.type=t),n}}}),ie.fn.extend({on:function(e,t,n,r){return v(this,e,t,n,r)},one:function(e,t,n,r){return v(this,e,t,n,r,1)},off:function(e,t,n){var r,i;if(e&&e.preventDefault&&e.handleObj)return r=e.handleObj,ie(e.delegateTarget).off(r.namespace?r.origType+"."+r.namespace:r.origType,r.selector,r.handler),this;if("object"==typeof e){for(i in e)this.off(i,t,e[i]);return this}return!1!==t&&"function"!=typeof t||(n=t,t=void 0),!1===n&&(n=h),this.each(function(){ie.event.remove(this,e,n,t)})}});var Pe=/<script|<style|<link/i,Re=/checked\s*(?:[^=]|=\s*.checked.)/i,Me=/^true\/(.*)/,Ie=/^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;ie.extend({htmlPrefilter:function(e){return e.replace(/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:-]+)[^>]*)\/>/gi,"<$1></$2>")},clone:function(e,t,n){var r,i,o,s,a=e.cloneNode(!0),u=ie.contains(e.ownerDocument,e);if(!(re.noCloneChecked||1!==e.nodeType&&11!==e.nodeType||ie.isXMLDoc(e)))for(s=c(a),o=c(e),r=0,i=o.length;r<i;r++)w(o[r],s[r]);if(t)if(n)for(o=o||c(e),s=s||c(a),r=0,i=o.length;r<i;r++)b(o[r],s[r]);else b(e,a);return s=c(a,"script"),s.length>0&&f(s,!u&&c(e,"script")),a},cleanData:function(e){for(var t,n,r,i=ie.event.special,o=0;void 0!==(n=e[o]);o++)if(xe(n)){if(t=n[be.expando]){if(t.events)for(r in t.events)i[r]?ie.event.remove(n,r):ie.removeEvent(n,r,t.handle);n[be.expando]=void 0}n[we.expando]&&(n[we.expando]=void 0)}}}),ie.fn.extend({domManip:T,detach:function(e){return C(this,e,!0)},remove:function(e){return C(this,e)},text:function(e){return ye(this,function(e){return void 0===e?ie.text(this):this.empty().each(function(){1!==this.nodeType&&11!==this.nodeType&&9!==this.nodeType||(this.textContent=e)})},null,e,arguments.length)},append:function(){return T(this,arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){m(this,e).appendChild(e)}})},prepend:function(){return T(this,arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var t=m(this,e);t.insertBefore(e,t.firstChild)}})},before:function(){return T(this,arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this)})},after:function(){return T(this,arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this.nextSibling)})},empty:function(){for(var e,t=0;null!=(e=this[t]);t++)1===e.nodeType&&(ie.cleanData(c(e,!1)),e.textContent="");return this},clone:function(e,t){return e=null!=e&&e,t=null==t?e:t,this.map(function(){return ie.clone(this,e,t)})},html:function(e){return ye(this,function(e){var t=this[0]||{},n=0,r=this.length;if(void 0===e&&1===t.nodeType)return t.innerHTML;if("string"==typeof e&&!Pe.test(e)&&!qe[(De.exec(e)||["",""])[1].toLowerCase()]){e=ie.htmlPrefilter(e);try{for(;n<r;n++)t=this[n]||{},1===t.nodeType&&(ie.cleanData(c(t,!1)),t.innerHTML=e);t=0}catch(e){}}t&&this.empty().append(e)},null,e,arguments.length)},replaceWith:function(){var e=[];return T(this,arguments,function(t){var n=this.parentNode;ie.inArray(this,e)<0&&(ie.cleanData(c(this)),n&&n.replaceChild(t,this))},e)}}),ie.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(e,t){ie.fn[e]=function(e){for(var n,r=[],i=ie(e),o=i.length-1,s=0;s<=o;s++)n=s===o?this:this.clone(!0),ie(i[s])[t](n),K.apply(r,n.get());return this.pushStack(r)}});var We,$e={HTML:"block",BODY:"block"},Be=/^margin/,_e=new RegExp("^("+ke+")(?!px)[a-z%]+$","i"),Xe=function(t){var n=t.ownerDocument.defaultView;return n&&n.opener||(n=e),n.getComputedStyle(t)},ze=function(e,t,n,r){var i,o,s={};for(o in t)s[o]=e.style[o],e.style[o]=t[o];i=n.apply(e,r||[]);for(o in t)e.style[o]=s[o];return i},Ue=G.documentElement;!function(){function t(){a.style.cssText="-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;position:relative;display:block;margin:auto;border:1px;padding:1px;top:1%;width:50%",a.innerHTML="",Ue.appendChild(s);var t=e.getComputedStyle(a);n="1%"!==t.top,o="2px"===t.marginLeft,r="4px"===t.width,a.style.marginRight="50%",i="4px"===t.marginRight,Ue.removeChild(s)}var n,r,i,o,s=G.createElement("div"),a=G.createElement("div");a.style&&(a.style.backgroundClip="content-box",a.cloneNode(!0).style.backgroundClip="",re.clearCloneStyle="content-box"===a.style.backgroundClip,s.style.cssText="border:0;width:8px;height:0;top:0;left:-9999px;padding:0;margin-top:1px;position:absolute",s.appendChild(a),ie.extend(re,{pixelPosition:function(){return t(),n},boxSizingReliable:function(){return null==r&&t(),r},pixelMarginRight:function(){return null==r&&t(),i},reliableMarginLeft:function(){return null==r&&t(),o},reliableMarginRight:function(){var t,n=a.appendChild(G.createElement("div"));return n.style.cssText=a.style.cssText="-webkit-box-sizing:content-box;box-sizing:content-box;display:block;margin:0;border:0;padding:0",n.style.marginRight=n.style.width="0",a.style.width="1px",Ue.appendChild(s),t=!parseFloat(e.getComputedStyle(n).marginRight),Ue.removeChild(s),a.removeChild(n),t}}))}();var Ve=/^(none|table(?!-c[ea]).+)/,Ye={position:"absolute",visibility:"hidden",display:"block"},Ge={letterSpacing:"0",fontWeight:"400"},Qe=["Webkit","O","Moz","ms"],Je=G.createElement("div").style;ie.extend({cssHooks:{opacity:{get:function(e,t){if(t){var n=N(e,"opacity");return""===n?"1":n}}}},cssNumber:{animationIterationCount:!0,columnCount:!0,fillOpacity:!0,flexGrow:!0,flexShrink:!0,fontWeight:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{float:"cssFloat"},style:function(e,t,n,r){if(e&&3!==e.nodeType&&8!==e.nodeType&&e.style){var i,o,s,a=ie.camelCase(t),u=e.style;if(t=ie.cssProps[a]||(ie.cssProps[a]=j(a)||a),s=ie.cssHooks[t]||ie.cssHooks[a],void 0===n)return s&&"get"in s&&void 0!==(i=s.get(e,!1,r))?i:u[t];o=typeof n,"string"===o&&(i=Ee.exec(n))&&i[1]&&(n=l(e,t,i),o="number"),null!=n&&n===n&&("number"===o&&(n+=i&&i[3]||(ie.cssNumber[a]?"":"px")),re.clearCloneStyle||""!==n||0!==t.indexOf("background")||(u[t]="inherit"),s&&"set"in s&&void 0===(n=s.set(e,n,r))||(u[t]=n))}},css:function(e,t,n,r){var i,o,s,a=ie.camelCase(t);return t=ie.cssProps[a]||(ie.cssProps[a]=j(a)||a),s=ie.cssHooks[t]||ie.cssHooks[a],s&&"get"in s&&(i=s.get(e,!0,n)),void 0===i&&(i=N(e,t,r)),"normal"===i&&t in Ge&&(i=Ge[t]),""===n||n?(o=parseFloat(i),!0===n||isFinite(o)?o||0:i):i}}),ie.each(["height","width"],function(e,t){ie.cssHooks[t]={get:function(e,n,r){if(n)return Ve.test(ie.css(e,"display"))&&0===e.offsetWidth?ze(e,Ye,function(){return q(e,t,r)}):q(e,t,r)},set:function(e,n,r){var i,o=r&&Xe(e),s=r&&A(e,t,r,"border-box"===ie.css(e,"boxSizing",!1,o),o);return s&&(i=Ee.exec(n))&&"px"!==(i[3]||"px")&&(e.style[t]=n,n=ie.css(e,t)),D(e,n,s)}}}),ie.cssHooks.marginLeft=S(re.reliableMarginLeft,function(e,t){if(t)return(parseFloat(N(e,"marginLeft"))||e.getBoundingClientRect().left-ze(e,{marginLeft:0},function(){return e.getBoundingClientRect().left}))+"px"}),ie.cssHooks.marginRight=S(re.reliableMarginRight,function(e,t){if(t)return ze(e,{display:"inline-block"},N,[e,"marginRight"])}),ie.each({margin:"",padding:"",border:"Width"},function(e,t){ie.cssHooks[e+t]={expand:function(n){for(var r=0,i={},o="string"==typeof n?n.split(" "):[n];r<4;r++)i[e+Ne[r]+t]=o[r]||o[r-2]||o[0];return i}},Be.test(e)||(ie.cssHooks[e+t].set=D)}),ie.fn.extend({css:function(e,t){return ye(this,function(e,t,n){var r,i,o={},s=0;if(ie.isArray(t)){for(r=Xe(e),i=t.length;s<i;s++)o[t[s]]=ie.css(e,t[s],!1,r);return o}return void 0!==n?ie.style(e,t,n):ie.css(e,t)},e,t,arguments.length>1)},show:function(){return L(this,!0)},hide:function(){return L(this)},toggle:function(e){return"boolean"==typeof e?e?this.show():this.hide():this.each(function(){Se(this)?ie(this).show():ie(this).hide()})}}),ie.Tween=H,H.prototype={constructor:H,init:function(e,t,n,r,i,o){this.elem=e,this.prop=n,this.easing=i||ie.easing._default,this.options=t,this.start=this.now=this.cur(),this.end=r,this.unit=o||(ie.cssNumber[n]?"":"px")},cur:function(){var e=H.propHooks[this.prop];return e&&e.get?e.get(this):H.propHooks._default.get(this)},run:function(e){var t,n=H.propHooks[this.prop];return this.options.duration?this.pos=t=ie.easing[this.easing](e,this.options.duration*e,0,1,this.options.duration):this.pos=t=e,this.now=(this.end-this.start)*t+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),n&&n.set?n.set(this):H.propHooks._default.set(this),this}},H.prototype.init.prototype=H.prototype,H.propHooks={_default:{get:function(e){var t;return 1!==e.elem.nodeType||null!=e.elem[e.prop]&&null==e.elem.style[e.prop]?e.elem[e.prop]:(t=ie.css(e.elem,e.prop,""),t&&"auto"!==t?t:0)},set:function(e){ie.fx.step[e.prop]?ie.fx.step[e.prop](e):1!==e.elem.nodeType||null==e.elem.style[ie.cssProps[e.prop]]&&!ie.cssHooks[e.prop]?e.elem[e.prop]=e.now:ie.style(e.elem,e.prop,e.now+e.unit)}}},H.propHooks.scrollTop=H.propHooks.scrollLeft={set:function(e){e.elem.nodeType&&e.elem.parentNode&&(e.elem[e.prop]=e.now)}},ie.easing={linear:function(e){return e},swing:function(e){return.5-Math.cos(e*Math.PI)/2},_default:"swing"},ie.fx=H.prototype.init,ie.fx.step={};var Ke,Ze,et=/^(?:toggle|show|hide)$/,tt=/queueHooks$/;ie.Animation=ie.extend(I,{tweeners:{"*":[function(e,t){var n=this.createTween(e,t);return l(n.elem,e,Ee.exec(t),n),n}]},tweener:function(e,t){ie.isFunction(e)?(t=e,e=["*"]):e=e.match(ve);for(var n,r=0,i=e.length;r<i;r++)n=e[r],I.tweeners[n]=I.tweeners[n]||[],I.tweeners[n].unshift(t)},prefilters:[R],prefilter:function(e,t){t?I.prefilters.unshift(e):I.prefilters.push(e)}}),ie.speed=function(e,t,n){var r=e&&"object"==typeof e?ie.extend({},e):{complete:n||!n&&t||ie.isFunction(e)&&e,duration:e,easing:n&&t||t&&!ie.isFunction(t)&&t};return r.duration=ie.fx.off?0:"number"==typeof r.duration?r.duration:r.duration in ie.fx.speeds?ie.fx.speeds[r.duration]:ie.fx.speeds._default,null!=r.queue&&!0!==r.queue||(r.queue="fx"),r.old=r.complete,r.complete=function(){ie.isFunction(r.old)&&r.old.call(this),r.queue&&ie.dequeue(this,r.queue)},r},ie.fn.extend({fadeTo:function(e,t,n,r){return this.filter(Se).css("opacity",0).show().end().animate({opacity:t},e,n,r)},animate:function(e,t,n,r){var i=ie.isEmptyObject(e),o=ie.speed(t,n,r),s=function(){var t=I(this,ie.extend({},e),o);(i||be.get(this,"finish"))&&t.stop(!0)};return s.finish=s,i||!1===o.queue?this.each(s):this.queue(o.queue,s)},stop:function(e,t,n){var r=function(e){var t=e.stop;delete e.stop,t(n)};return"string"!=typeof e&&(n=t,t=e,e=void 0),t&&!1!==e&&this.queue(e||"fx",[]),this.each(function(){var t=!0,i=null!=e&&e+"queueHooks",o=ie.timers,s=be.get(this);if(i)s[i]&&s[i].stop&&r(s[i]);else for(i in s)s[i]&&s[i].stop&&tt.test(i)&&r(s[i]);for(i=o.length;i--;)o[i].elem!==this||null!=e&&o[i].queue!==e||(o[i].anim.stop(n),t=!1,o.splice(i,1));!t&&n||ie.dequeue(this,e)})},finish:function(e){return!1!==e&&(e=e||"fx"),this.each(function(){var t,n=be.get(this),r=n[e+"queue"],i=n[e+"queueHooks"],o=ie.timers,s=r?r.length:0;for(n.finish=!0,ie.queue(this,e,[]),i&&i.stop&&i.stop.call(this,!0),t=o.length;t--;)o[t].elem===this&&o[t].queue===e&&(o[t].anim.stop(!0),o.splice(t,1));for(t=0;t<s;t++)r[t]&&r[t].finish&&r[t].finish.call(this);delete n.finish})}}),ie.each(["toggle","show","hide"],function(e,t){var n=ie.fn[t];ie.fn[t]=function(e,r,i){return null==e||"boolean"==typeof e?n.apply(this,arguments):this.animate(F(t,!0),e,r,i)}}),ie.each({slideDown:F("show"),slideUp:F("hide"),slideToggle:F("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(e,t){ie.fn[e]=function(e,n,r){return this.animate(t,e,n,r)}}),ie.timers=[],ie.fx.tick=function(){var e,t=0,n=ie.timers;for(Ke=ie.now();t<n.length;t++)(e=n[t])()||n[t]!==e||n.splice(t--,1);n.length||ie.fx.stop(),Ke=void 0},ie.fx.timer=function(e){ie.timers.push(e),e()?ie.fx.start():ie.timers.pop()},ie.fx.interval=13,ie.fx.start=function(){
Ze||(Ze=e.setInterval(ie.fx.tick,ie.fx.interval))},ie.fx.stop=function(){e.clearInterval(Ze),Ze=null},ie.fx.speeds={slow:600,fast:200,_default:400},ie.fn.delay=function(t,n){return t=ie.fx?ie.fx.speeds[t]||t:t,n=n||"fx",this.queue(n,function(n,r){var i=e.setTimeout(n,t);r.stop=function(){e.clearTimeout(i)}})},function(){var e=G.createElement("input"),t=G.createElement("select"),n=t.appendChild(G.createElement("option"));e.type="checkbox",re.checkOn=""!==e.value,re.optSelected=n.selected,t.disabled=!0,re.optDisabled=!n.disabled,e=G.createElement("input"),e.value="t",e.type="radio",re.radioValue="t"===e.value}();var nt,rt=ie.expr.attrHandle;ie.fn.extend({attr:function(e,t){return ye(this,ie.attr,e,t,arguments.length>1)},removeAttr:function(e){return this.each(function(){ie.removeAttr(this,e)})}}),ie.extend({attr:function(e,t,n){var r,i,o=e.nodeType;if(3!==o&&8!==o&&2!==o)return void 0===e.getAttribute?ie.prop(e,t,n):(1===o&&ie.isXMLDoc(e)||(t=t.toLowerCase(),i=ie.attrHooks[t]||(ie.expr.match.bool.test(t)?nt:void 0)),void 0!==n?null===n?void ie.removeAttr(e,t):i&&"set"in i&&void 0!==(r=i.set(e,n,t))?r:(e.setAttribute(t,n+""),n):i&&"get"in i&&null!==(r=i.get(e,t))?r:(r=ie.find.attr(e,t),null==r?void 0:r))},attrHooks:{type:{set:function(e,t){if(!re.radioValue&&"radio"===t&&ie.nodeName(e,"input")){var n=e.value;return e.setAttribute("type",t),n&&(e.value=n),t}}}},removeAttr:function(e,t){var n,r,i=0,o=t&&t.match(ve);if(o&&1===e.nodeType)for(;n=o[i++];)r=ie.propFix[n]||n,ie.expr.match.bool.test(n)&&(e[r]=!1),e.removeAttribute(n)}}),nt={set:function(e,t,n){return!1===t?ie.removeAttr(e,n):e.setAttribute(n,n),n}},ie.each(ie.expr.match.bool.source.match(/\w+/g),function(e,t){var n=rt[t]||ie.find.attr;rt[t]=function(e,t,r){var i,o;return r||(o=rt[t],rt[t]=i,i=null!=n(e,t,r)?t.toLowerCase():null,rt[t]=o),i}});var it=/^(?:input|select|textarea|button)$/i,ot=/^(?:a|area)$/i;ie.fn.extend({prop:function(e,t){return ye(this,ie.prop,e,t,arguments.length>1)},removeProp:function(e){return this.each(function(){delete this[ie.propFix[e]||e]})}}),ie.extend({prop:function(e,t,n){var r,i,o=e.nodeType;if(3!==o&&8!==o&&2!==o)return 1===o&&ie.isXMLDoc(e)||(t=ie.propFix[t]||t,i=ie.propHooks[t]),void 0!==n?i&&"set"in i&&void 0!==(r=i.set(e,n,t))?r:e[t]=n:i&&"get"in i&&null!==(r=i.get(e,t))?r:e[t]},propHooks:{tabIndex:{get:function(e){var t=ie.find.attr(e,"tabindex");return t?parseInt(t,10):it.test(e.nodeName)||ot.test(e.nodeName)&&e.href?0:-1}}},propFix:{for:"htmlFor",class:"className"}}),re.optSelected||(ie.propHooks.selected={get:function(e){var t=e.parentNode;return t&&t.parentNode&&t.parentNode.selectedIndex,null},set:function(e){var t=e.parentNode;t&&(t.selectedIndex,t.parentNode&&t.parentNode.selectedIndex)}}),ie.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){ie.propFix[this.toLowerCase()]=this});ie.fn.extend({addClass:function(e){var t,n,r,i,o,s,a,u=0;if(ie.isFunction(e))return this.each(function(t){ie(this).addClass(e.call(this,t,W(this)))});if("string"==typeof e&&e)for(t=e.match(ve)||[];n=this[u++];)if(i=W(n),r=1===n.nodeType&&(" "+i+" ").replace(/[\t\r\n\f]/g," ")){for(s=0;o=t[s++];)r.indexOf(" "+o+" ")<0&&(r+=o+" ");a=ie.trim(r),i!==a&&n.setAttribute("class",a)}return this},removeClass:function(e){var t,n,r,i,o,s,a,u=0;if(ie.isFunction(e))return this.each(function(t){ie(this).removeClass(e.call(this,t,W(this)))});if(!arguments.length)return this.attr("class","");if("string"==typeof e&&e)for(t=e.match(ve)||[];n=this[u++];)if(i=W(n),r=1===n.nodeType&&(" "+i+" ").replace(/[\t\r\n\f]/g," ")){for(s=0;o=t[s++];)for(;r.indexOf(" "+o+" ")>-1;)r=r.replace(" "+o+" "," ");a=ie.trim(r),i!==a&&n.setAttribute("class",a)}return this},toggleClass:function(e,t){var n=typeof e;return"boolean"==typeof t&&"string"===n?t?this.addClass(e):this.removeClass(e):ie.isFunction(e)?this.each(function(n){ie(this).toggleClass(e.call(this,n,W(this),t),t)}):this.each(function(){var t,r,i,o;if("string"===n)for(r=0,i=ie(this),o=e.match(ve)||[];t=o[r++];)i.hasClass(t)?i.removeClass(t):i.addClass(t);else void 0!==e&&"boolean"!==n||(t=W(this),t&&be.set(this,"__className__",t),this.setAttribute&&this.setAttribute("class",t||!1===e?"":be.get(this,"__className__")||""))})},hasClass:function(e){var t,n,r=0;for(t=" "+e+" ";n=this[r++];)if(1===n.nodeType&&(" "+W(n)+" ").replace(/[\t\r\n\f]/g," ").indexOf(t)>-1)return!0;return!1}});ie.fn.extend({val:function(e){var t,n,r,i=this[0];{if(arguments.length)return r=ie.isFunction(e),this.each(function(n){var i;1===this.nodeType&&(i=r?e.call(this,n,ie(this).val()):e,null==i?i="":"number"==typeof i?i+="":ie.isArray(i)&&(i=ie.map(i,function(e){return null==e?"":e+""})),(t=ie.valHooks[this.type]||ie.valHooks[this.nodeName.toLowerCase()])&&"set"in t&&void 0!==t.set(this,i,"value")||(this.value=i))});if(i)return(t=ie.valHooks[i.type]||ie.valHooks[i.nodeName.toLowerCase()])&&"get"in t&&void 0!==(n=t.get(i,"value"))?n:(n=i.value,"string"==typeof n?n.replace(/\r/g,""):null==n?"":n)}}}),ie.extend({valHooks:{option:{get:function(e){var t=ie.find.attr(e,"value");return null!=t?t:ie.trim(ie.text(e)).replace(/[\x20\t\r\n\f]+/g," ")}},select:{get:function(e){for(var t,n,r=e.options,i=e.selectedIndex,o="select-one"===e.type||i<0,s=o?null:[],a=o?i+1:r.length,u=i<0?a:o?i:0;u<a;u++)if(n=r[u],(n.selected||u===i)&&(re.optDisabled?!n.disabled:null===n.getAttribute("disabled"))&&(!n.parentNode.disabled||!ie.nodeName(n.parentNode,"optgroup"))){if(t=ie(n).val(),o)return t;s.push(t)}return s},set:function(e,t){for(var n,r,i=e.options,o=ie.makeArray(t),s=i.length;s--;)r=i[s],(r.selected=ie.inArray(ie.valHooks.option.get(r),o)>-1)&&(n=!0);return n||(e.selectedIndex=-1),o}}}}),ie.each(["radio","checkbox"],function(){ie.valHooks[this]={set:function(e,t){if(ie.isArray(t))return e.checked=ie.inArray(ie(e).val(),t)>-1}},re.checkOn||(ie.valHooks[this].get=function(e){return null===e.getAttribute("value")?"on":e.value})});var st=/^(?:focusinfocus|focusoutblur)$/;ie.extend(ie.event,{trigger:function(t,n,r,i){var o,s,a,u,l,c,f,p=[r||G],d=ne.call(t,"type")?t.type:t,h=ne.call(t,"namespace")?t.namespace.split("."):[];if(s=a=r=r||G,3!==r.nodeType&&8!==r.nodeType&&!st.test(d+ie.event.triggered)&&(d.indexOf(".")>-1&&(h=d.split("."),d=h.shift(),h.sort()),l=d.indexOf(":")<0&&"on"+d,t=t[ie.expando]?t:new ie.Event(d,"object"==typeof t&&t),t.isTrigger=i?2:3,t.namespace=h.join("."),t.rnamespace=t.namespace?new RegExp("(^|\\.)"+h.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,t.result=void 0,t.target||(t.target=r),n=null==n?[t]:ie.makeArray(n,[t]),f=ie.event.special[d]||{},i||!f.trigger||!1!==f.trigger.apply(r,n))){if(!i&&!f.noBubble&&!ie.isWindow(r)){for(u=f.delegateType||d,st.test(u+d)||(s=s.parentNode);s;s=s.parentNode)p.push(s),a=s;a===(r.ownerDocument||G)&&p.push(a.defaultView||a.parentWindow||e)}for(o=0;(s=p[o++])&&!t.isPropagationStopped();)t.type=o>1?u:f.bindType||d,c=(be.get(s,"events")||{})[t.type]&&be.get(s,"handle"),c&&c.apply(s,n),(c=l&&s[l])&&c.apply&&xe(s)&&(t.result=c.apply(s,n),!1===t.result&&t.preventDefault());return t.type=d,i||t.isDefaultPrevented()||f._default&&!1!==f._default.apply(p.pop(),n)||!xe(r)||l&&ie.isFunction(r[d])&&!ie.isWindow(r)&&(a=r[l],a&&(r[l]=null),ie.event.triggered=d,r[d](),ie.event.triggered=void 0,a&&(r[l]=a)),t.result}},simulate:function(e,t,n){var r=ie.extend(new ie.Event,n,{type:e,isSimulated:!0});ie.event.trigger(r,null,t)}}),ie.fn.extend({trigger:function(e,t){return this.each(function(){ie.event.trigger(e,t,this)})},triggerHandler:function(e,t){var n=this[0];if(n)return ie.event.trigger(e,t,n,!0)}}),ie.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),function(e,t){ie.fn[t]=function(e,n){return arguments.length>0?this.on(t,null,e,n):this.trigger(t)}}),ie.fn.extend({hover:function(e,t){return this.mouseenter(e).mouseleave(t||e)}}),re.focusin="onfocusin"in e,re.focusin||ie.each({focus:"focusin",blur:"focusout"},function(e,t){var n=function(e){ie.event.simulate(t,e.target,ie.event.fix(e))};ie.event.special[t]={setup:function(){var r=this.ownerDocument||this,i=be.access(r,t);i||r.addEventListener(e,n,!0),be.access(r,t,(i||0)+1)},teardown:function(){var r=this.ownerDocument||this,i=be.access(r,t)-1;i?be.access(r,t,i):(r.removeEventListener(e,n,!0),be.remove(r,t))}}});var at=e.location,ut=ie.now(),lt=/\?/;ie.parseJSON=function(e){return JSON.parse(e+"")},ie.parseXML=function(t){var n;if(!t||"string"!=typeof t)return null;try{n=(new e.DOMParser).parseFromString(t,"text/xml")}catch(e){n=void 0}return n&&!n.getElementsByTagName("parsererror").length||ie.error("Invalid XML: "+t),n};var ct=/([?&])_=[^&]*/,ft=/^(.*?):[ \t]*([^\r\n]*)$/gm,pt=/^(?:about|app|app-storage|.+-extension|file|res|widget):$/,dt=/^(?:GET|HEAD)$/,ht={},gt={},vt="*/".concat("*"),mt=G.createElement("a");mt.href=at.href,ie.extend({active:0,lastModified:{},etag:{},ajaxSettings:{url:at.href,type:"GET",isLocal:pt.test(at.protocol),global:!0,processData:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",accepts:{"*":vt,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/\bxml\b/,html:/\bhtml/,json:/\bjson\b/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"},converters:{"* text":String,"text html":!0,"text json":ie.parseJSON,"text xml":ie.parseXML},flatOptions:{url:!0,context:!0}},ajaxSetup:function(e,t){return t?_(_(e,ie.ajaxSettings),t):_(ie.ajaxSettings,e)},ajaxPrefilter:$(ht),ajaxTransport:$(gt),ajax:function(t,n){function r(t,n,r,a){var l,f,y,x,w,C=n;2!==b&&(b=2,u&&e.clearTimeout(u),i=void 0,s=a||"",T.readyState=t>0?4:0,l=t>=200&&t<300||304===t,r&&(x=X(p,T,r)),x=z(p,x,T,l),l?(p.ifModified&&(w=T.getResponseHeader("Last-Modified"),w&&(ie.lastModified[o]=w),(w=T.getResponseHeader("etag"))&&(ie.etag[o]=w)),204===t||"HEAD"===p.type?C="nocontent":304===t?C="notmodified":(C=x.state,f=x.data,y=x.error,l=!y)):(y=C,!t&&C||(C="error",t<0&&(t=0))),T.status=t,T.statusText=(n||C)+"",l?g.resolveWith(d,[f,C,T]):g.rejectWith(d,[T,C,y]),T.statusCode(m),m=void 0,c&&h.trigger(l?"ajaxSuccess":"ajaxError",[T,p,l?f:y]),v.fireWith(d,[T,C]),c&&(h.trigger("ajaxComplete",[T,p]),--ie.active||ie.event.trigger("ajaxStop")))}"object"==typeof t&&(n=t,t=void 0),n=n||{};var i,o,s,a,u,l,c,f,p=ie.ajaxSetup({},n),d=p.context||p,h=p.context&&(d.nodeType||d.jquery)?ie(d):ie.event,g=ie.Deferred(),v=ie.Callbacks("once memory"),m=p.statusCode||{},y={},x={},b=0,w="canceled",T={readyState:0,getResponseHeader:function(e){var t;if(2===b){if(!a)for(a={};t=ft.exec(s);)a[t[1].toLowerCase()]=t[2];t=a[e.toLowerCase()]}return null==t?null:t},getAllResponseHeaders:function(){return 2===b?s:null},setRequestHeader:function(e,t){var n=e.toLowerCase();return b||(e=x[n]=x[n]||e,y[e]=t),this},overrideMimeType:function(e){return b||(p.mimeType=e),this},statusCode:function(e){var t;if(e)if(b<2)for(t in e)m[t]=[m[t],e[t]];else T.always(e[T.status]);return this},abort:function(e){var t=e||w;return i&&i.abort(t),r(0,t),this}};if(g.promise(T).complete=v.add,T.success=T.done,T.error=T.fail,p.url=((t||p.url||at.href)+"").replace(/#.*$/,"").replace(/^\/\//,at.protocol+"//"),p.type=n.method||n.type||p.method||p.type,p.dataTypes=ie.trim(p.dataType||"*").toLowerCase().match(ve)||[""],null==p.crossDomain){l=G.createElement("a");try{l.href=p.url,l.href=l.href,p.crossDomain=mt.protocol+"//"+mt.host!=l.protocol+"//"+l.host}catch(e){p.crossDomain=!0}}if(p.data&&p.processData&&"string"!=typeof p.data&&(p.data=ie.param(p.data,p.traditional)),B(ht,p,n,T),2===b)return T;c=ie.event&&p.global,c&&0==ie.active++&&ie.event.trigger("ajaxStart"),p.type=p.type.toUpperCase(),p.hasContent=!dt.test(p.type),o=p.url,p.hasContent||(p.data&&(o=p.url+=(lt.test(o)?"&":"?")+p.data,delete p.data),!1===p.cache&&(p.url=ct.test(o)?o.replace(ct,"$1_="+ut++):o+(lt.test(o)?"&":"?")+"_="+ut++)),p.ifModified&&(ie.lastModified[o]&&T.setRequestHeader("If-Modified-Since",ie.lastModified[o]),ie.etag[o]&&T.setRequestHeader("If-None-Match",ie.etag[o])),(p.data&&p.hasContent&&!1!==p.contentType||n.contentType)&&T.setRequestHeader("Content-Type",p.contentType),T.setRequestHeader("Accept",p.dataTypes[0]&&p.accepts[p.dataTypes[0]]?p.accepts[p.dataTypes[0]]+("*"!==p.dataTypes[0]?", "+vt+"; q=0.01":""):p.accepts["*"]);for(f in p.headers)T.setRequestHeader(f,p.headers[f]);if(p.beforeSend&&(!1===p.beforeSend.call(d,T,p)||2===b))return T.abort();w="abort";for(f in{success:1,error:1,complete:1})T[f](p[f]);if(i=B(gt,p,n,T)){if(T.readyState=1,c&&h.trigger("ajaxSend",[T,p]),2===b)return T;p.async&&p.timeout>0&&(u=e.setTimeout(function(){T.abort("timeout")},p.timeout));try{b=1,i.send(y,r)}catch(e){if(!(b<2))throw e;r(-1,e)}}else r(-1,"No Transport");return T},getJSON:function(e,t,n){return ie.get(e,t,n,"json")},getScript:function(e,t){return ie.get(e,void 0,t,"script")}}),ie.each(["get","post"],function(e,t){ie[t]=function(e,n,r,i){return ie.isFunction(n)&&(i=i||r,r=n,n=void 0),ie.ajax(ie.extend({url:e,type:t,dataType:i,data:n,success:r},ie.isPlainObject(e)&&e))}}),ie._evalUrl=function(e){return ie.ajax({url:e,type:"GET",dataType:"script",async:!1,global:!1,throws:!0})},ie.fn.extend({wrapAll:function(e){var t;return ie.isFunction(e)?this.each(function(t){ie(this).wrapAll(e.call(this,t))}):(this[0]&&(t=ie(e,this[0].ownerDocument).eq(0).clone(!0),this[0].parentNode&&t.insertBefore(this[0]),t.map(function(){for(var e=this;e.firstElementChild;)e=e.firstElementChild;return e}).append(this)),this)},wrapInner:function(e){return ie.isFunction(e)?this.each(function(t){ie(this).wrapInner(e.call(this,t))}):this.each(function(){var t=ie(this),n=t.contents();n.length?n.wrapAll(e):t.append(e)})},wrap:function(e){var t=ie.isFunction(e);return this.each(function(n){ie(this).wrapAll(t?e.call(this,n):e)})},unwrap:function(){return this.parent().each(function(){ie.nodeName(this,"body")||ie(this).replaceWith(this.childNodes)}).end()}}),ie.expr.filters.hidden=function(e){return!ie.expr.filters.visible(e)},ie.expr.filters.visible=function(e){return e.offsetWidth>0||e.offsetHeight>0||e.getClientRects().length>0};var yt=/\[\]$/,xt=/^(?:submit|button|image|reset|file)$/i,bt=/^(?:input|select|textarea|keygen)/i;ie.param=function(e,t){var n,r=[],i=function(e,t){t=ie.isFunction(t)?t():null==t?"":t,r[r.length]=encodeURIComponent(e)+"="+encodeURIComponent(t)};if(void 0===t&&(t=ie.ajaxSettings&&ie.ajaxSettings.traditional),ie.isArray(e)||e.jquery&&!ie.isPlainObject(e))ie.each(e,function(){i(this.name,this.value)});else for(n in e)U(n,e[n],t,i);return r.join("&").replace(/%20/g,"+")},ie.fn.extend({serialize:function(){return ie.param(this.serializeArray())},serializeArray:function(){return this.map(function(){var e=ie.prop(this,"elements");return e?ie.makeArray(e):this}).filter(function(){var e=this.type;return this.name&&!ie(this).is(":disabled")&&bt.test(this.nodeName)&&!xt.test(e)&&(this.checked||!je.test(e))}).map(function(e,t){var n=ie(this).val();return null==n?null:ie.isArray(n)?ie.map(n,function(e){return{name:t.name,value:e.replace(/\r?\n/g,"\r\n")}}):{name:t.name,value:n.replace(/\r?\n/g,"\r\n")}}).get()}}),ie.ajaxSettings.xhr=function(){try{return new e.XMLHttpRequest}catch(e){}};var wt={0:200,1223:204},Tt=ie.ajaxSettings.xhr();re.cors=!!Tt&&"withCredentials"in Tt,re.ajax=Tt=!!Tt,ie.ajaxTransport(function(t){var n,r;if(re.cors||Tt&&!t.crossDomain)return{send:function(i,o){var s,a=t.xhr();if(a.open(t.type,t.url,t.async,t.username,t.password),t.xhrFields)for(s in t.xhrFields)a[s]=t.xhrFields[s];t.mimeType&&a.overrideMimeType&&a.overrideMimeType(t.mimeType),t.crossDomain||i["X-Requested-With"]||(i["X-Requested-With"]="XMLHttpRequest");for(s in i)a.setRequestHeader(s,i[s]);n=function(e){return function(){n&&(n=r=a.onload=a.onerror=a.onabort=a.onreadystatechange=null,"abort"===e?a.abort():"error"===e?"number"!=typeof a.status?o(0,"error"):o(a.status,a.statusText):o(wt[a.status]||a.status,a.statusText,"text"!==(a.responseType||"text")||"string"!=typeof a.responseText?{binary:a.response}:{text:a.responseText},a.getAllResponseHeaders()))}},a.onload=n(),r=a.onerror=n("error"),void 0!==a.onabort?a.onabort=r:a.onreadystatechange=function(){4===a.readyState&&e.setTimeout(function(){n&&r()})},n=n("abort");try{a.send(t.hasContent&&t.data||null)}catch(e){if(n)throw e}},abort:function(){n&&n()}}}),ie.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/\b(?:java|ecma)script\b/},converters:{"text script":function(e){return ie.globalEval(e),e}}}),ie.ajaxPrefilter("script",function(e){void 0===e.cache&&(e.cache=!1),e.crossDomain&&(e.type="GET")}),ie.ajaxTransport("script",function(e){if(e.crossDomain){var t,n;return{send:function(r,i){t=ie("<script>").prop({charset:e.scriptCharset,src:e.url}).on("load error",n=function(e){t.remove(),n=null,e&&i("error"===e.type?404:200,e.type)}),G.head.appendChild(t[0])},abort:function(){n&&n()}}}});var Ct=[],kt=/(=)\?(?=&|$)|\?\?/;ie.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var e=Ct.pop()||ie.expando+"_"+ut++;return this[e]=!0,e}}),ie.ajaxPrefilter("json jsonp",function(t,n,r){var i,o,s,a=!1!==t.jsonp&&(kt.test(t.url)?"url":"string"==typeof t.data&&0===(t.contentType||"").indexOf("application/x-www-form-urlencoded")&&kt.test(t.data)&&"data");if(a||"jsonp"===t.dataTypes[0])return i=t.jsonpCallback=ie.isFunction(t.jsonpCallback)?t.jsonpCallback():t.jsonpCallback,a?t[a]=t[a].replace(kt,"$1"+i):!1!==t.jsonp&&(t.url+=(lt.test(t.url)?"&":"?")+t.jsonp+"="+i),t.converters["script json"]=function(){return s||ie.error(i+" was not called"),s[0]},t.dataTypes[0]="json",o=e[i],e[i]=function(){s=arguments},r.always(function(){void 0===o?ie(e).removeProp(i):e[i]=o,t[i]&&(t.jsonpCallback=n.jsonpCallback,Ct.push(i)),s&&ie.isFunction(o)&&o(s[0]),s=o=void 0}),"script"}),ie.parseHTML=function(e,t,n){if(!e||"string"!=typeof e)return null;"boolean"==typeof t&&(n=t,t=!1),t=t||G;var r=ce.exec(e),i=!n&&[];return r?[t.createElement(r[1])]:(r=p([e],t,i),i&&i.length&&ie(i).remove(),ie.merge([],r.childNodes))};var Et=ie.fn.load;ie.fn.load=function(e,t,n){if("string"!=typeof e&&Et)return Et.apply(this,arguments);var r,i,o,s=this,a=e.indexOf(" ");return a>-1&&(r=ie.trim(e.slice(a)),e=e.slice(0,a)),ie.isFunction(t)?(n=t,t=void 0):t&&"object"==typeof t&&(i="POST"),s.length>0&&ie.ajax({url:e,type:i||"GET",dataType:"html",data:t}).done(function(e){o=arguments,s.html(r?ie("<div>").append(ie.parseHTML(e)).find(r):e)}).always(n&&function(e,t){s.each(function(){n.apply(this,o||[e.responseText,t,e])})}),this},ie.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(e,t){ie.fn[t]=function(e){return this.on(t,e)}}),ie.expr.filters.animated=function(e){return ie.grep(ie.timers,function(t){return e===t.elem}).length},ie.offset={setOffset:function(e,t,n){var r,i,o,s,a,u,l,c=ie.css(e,"position"),f=ie(e),p={};"static"===c&&(e.style.position="relative"),a=f.offset(),o=ie.css(e,"top"),u=ie.css(e,"left"),l=("absolute"===c||"fixed"===c)&&(o+u).indexOf("auto")>-1,l?(r=f.position(),s=r.top,i=r.left):(s=parseFloat(o)||0,i=parseFloat(u)||0),ie.isFunction(t)&&(t=t.call(e,n,ie.extend({},a))),null!=t.top&&(p.top=t.top-a.top+s),null!=t.left&&(p.left=t.left-a.left+i),"using"in t?t.using.call(e,p):f.css(p)}},ie.fn.extend({offset:function(e){if(arguments.length)return void 0===e?this:this.each(function(t){ie.offset.setOffset(this,e,t)});var t,n,r=this[0],i={top:0,left:0},o=r&&r.ownerDocument;if(o)return t=o.documentElement,ie.contains(t,r)?(i=r.getBoundingClientRect(),n=V(o),{top:i.top+n.pageYOffset-t.clientTop,left:i.left+n.pageXOffset-t.clientLeft}):i},position:function(){if(this[0]){var e,t,n=this[0],r={top:0,left:0};return"fixed"===ie.css(n,"position")?t=n.getBoundingClientRect():(e=this.offsetParent(),t=this.offset(),ie.nodeName(e[0],"html")||(r=e.offset()),r.top+=ie.css(e[0],"borderTopWidth",!0),r.left+=ie.css(e[0],"borderLeftWidth",!0)),{top:t.top-r.top-ie.css(n,"marginTop",!0),left:t.left-r.left-ie.css(n,"marginLeft",!0)}}},offsetParent:function(){return this.map(function(){for(var e=this.offsetParent;e&&"static"===ie.css(e,"position");)e=e.offsetParent;return e||Ue})}}),ie.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(e,t){var n="pageYOffset"===t;ie.fn[e]=function(r){return ye(this,function(e,r,i){var o=V(e);if(void 0===i)return o?o[t]:e[r];o?o.scrollTo(n?o.pageXOffset:i,n?i:o.pageYOffset):e[r]=i},e,r,arguments.length)}}),ie.each(["top","left"],function(e,t){ie.cssHooks[t]=S(re.pixelPosition,function(e,n){if(n)return n=N(e,t),_e.test(n)?ie(e).position()[t]+"px":n})}),ie.each({Height:"height",Width:"width"},function(e,t){ie.each({padding:"inner"+e,content:t,"":"outer"+e},function(n,r){ie.fn[r]=function(r,i){var o=arguments.length&&(n||"boolean"!=typeof r),s=n||(!0===r||!0===i?"margin":"border");return ye(this,function(t,n,r){var i;return ie.isWindow(t)?t.document.documentElement["client"+e]:9===t.nodeType?(i=t.documentElement,Math.max(t.body["scroll"+e],i["scroll"+e],t.body["offset"+e],i["offset"+e],i["client"+e])):void 0===r?ie.css(t,n,s):ie.style(t,n,r,s)},t,o?r:void 0,o,null)}})}),ie.fn.extend({bind:function(e,t,n){return this.on(e,null,t,n)},unbind:function(e,t){return this.off(e,null,t)},delegate:function(e,t,n,r){return this.on(t,e,n,r)},undelegate:function(e,t,n){return 1===arguments.length?this.off(e,"**"):this.off(t,e||"**",n)},size:function(){return this.length}}),ie.fn.andSelf=ie.fn.addBack,"function"==typeof define&&define.amd&&define("jquery",[],function(){return ie});var Nt=e.jQuery,St=e.$;return ie.noConflict=function(t){return e.$===ie&&(e.$=St),t&&e.jQuery===ie&&(e.jQuery=Nt),ie},t||(e.jQuery=e.$=ie),ie});

},{}],11:[function(require,module,exports){
!function(e,a){"object"==typeof exports&&"undefined"!=typeof module?module.exports=a():"function"==typeof define&&define.amd?define(a):e.moment=a()}(this,function(){"use strict";function e(){return Yn.apply(null,arguments)}function a(e){return e instanceof Array||"[object Array]"===Object.prototype.toString.call(e)}function t(e){return null!=e&&"[object Object]"===Object.prototype.toString.call(e)}function s(e){var a;for(a in e)return!1;return!0}function n(e){return void 0===e}function r(e){return"number"==typeof e||"[object Number]"===Object.prototype.toString.call(e)}function d(e){return e instanceof Date||"[object Date]"===Object.prototype.toString.call(e)}function _(e,a){var t,s=[];for(t=0;t<e.length;++t)s.push(a(e[t],t));return s}function i(e,a){return Object.prototype.hasOwnProperty.call(e,a)}function o(e,a){for(var t in a)i(a,t)&&(e[t]=a[t]);return i(a,"toString")&&(e.toString=a.toString),i(a,"valueOf")&&(e.valueOf=a.valueOf),e}function m(e,a,t,s){return Ya(e,a,t,s,!0).utc()}function u(){return{empty:!1,unusedTokens:[],unusedInput:[],overflow:-2,charsLeftOver:0,nullInput:!1,invalidMonth:null,invalidFormat:!1,userInvalidated:!1,iso:!1,parsedDateParts:[],meridiem:null,rfc2822:!1,weekdayMismatch:!1}}function l(e){return null==e._pf&&(e._pf=u()),e._pf}function M(e){if(null==e._isValid){var a=l(e),t=fn.call(a.parsedDateParts,function(e){return null!=e}),s=!isNaN(e._d.getTime())&&a.overflow<0&&!a.empty&&!a.invalidMonth&&!a.invalidWeekday&&!a.nullInput&&!a.invalidFormat&&!a.userInvalidated&&(!a.meridiem||a.meridiem&&t);if(e._strict&&(s=s&&0===a.charsLeftOver&&0===a.unusedTokens.length&&void 0===a.bigHour),null!=Object.isFrozen&&Object.isFrozen(e))return s;e._isValid=s}return e._isValid}function h(e){var a=m(NaN);return null!=e?o(l(a),e):l(a).userInvalidated=!0,a}function L(e,a){var t,s,r;if(n(a._isAMomentObject)||(e._isAMomentObject=a._isAMomentObject),n(a._i)||(e._i=a._i),n(a._f)||(e._f=a._f),n(a._l)||(e._l=a._l),n(a._strict)||(e._strict=a._strict),n(a._tzm)||(e._tzm=a._tzm),n(a._isUTC)||(e._isUTC=a._isUTC),n(a._offset)||(e._offset=a._offset),n(a._pf)||(e._pf=l(a)),n(a._locale)||(e._locale=a._locale),pn.length>0)for(t=0;t<pn.length;t++)s=pn[t],r=a[s],n(r)||(e[s]=r);return e}function c(a){L(this,a),this._d=new Date(null!=a._d?a._d.getTime():NaN),this.isValid()||(this._d=new Date(NaN)),!1===Dn&&(Dn=!0,e.updateOffset(this),Dn=!1)}function Y(e){return e instanceof c||null!=e&&null!=e._isAMomentObject}function y(e){return e<0?Math.ceil(e)||0:Math.floor(e)}function f(e){var a=+e,t=0;return 0!==a&&isFinite(a)&&(t=y(a)),t}function p(e,a,t){var s,n=Math.min(e.length,a.length),r=Math.abs(e.length-a.length),d=0;for(s=0;s<n;s++)(t&&e[s]!==a[s]||!t&&f(e[s])!==f(a[s]))&&d++;return d+r}function D(a){!1===e.suppressDeprecationWarnings&&"undefined"!=typeof console&&console.warn&&console.warn("Deprecation warning: "+a)}function k(a,t){var s=!0;return o(function(){if(null!=e.deprecationHandler&&e.deprecationHandler(null,a),s){for(var n,r=[],d=0;d<arguments.length;d++){if(n="","object"==typeof arguments[d]){n+="\n["+d+"] ";for(var _ in arguments[0])n+=_+": "+arguments[0][_]+", ";n=n.slice(0,-2)}else n=arguments[d];r.push(n)}D(a+"\nArguments: "+Array.prototype.slice.call(r).join("")+"\n"+(new Error).stack),s=!1}return t.apply(this,arguments)},t)}function T(a,t){null!=e.deprecationHandler&&e.deprecationHandler(a,t),kn[a]||(D(t),kn[a]=!0)}function g(e){return e instanceof Function||"[object Function]"===Object.prototype.toString.call(e)}function w(e){var a,t;for(t in e)a=e[t],g(a)?this[t]=a:this["_"+t]=a;this._config=e,this._dayOfMonthOrdinalParseLenient=new RegExp((this._dayOfMonthOrdinalParse.source||this._ordinalParse.source)+"|"+/\d{1,2}/.source)}function v(e,a){var s,n=o({},e);for(s in a)i(a,s)&&(t(e[s])&&t(a[s])?(n[s]={},o(n[s],e[s]),o(n[s],a[s])):null!=a[s]?n[s]=a[s]:delete n[s]);for(s in e)i(e,s)&&!i(a,s)&&t(e[s])&&(n[s]=o({},n[s]));return n}function H(e){null!=e&&this.set(e)}function S(e,a,t){var s=this._calendar[e]||this._calendar.sameElse;return g(s)?s.call(a,t):s}function b(e){var a=this._longDateFormat[e],t=this._longDateFormat[e.toUpperCase()];return a||!t?a:(this._longDateFormat[e]=t.replace(/MMMM|MM|DD|dddd/g,function(e){return e.slice(1)}),this._longDateFormat[e])}function j(){return this._invalidDate}function x(e){return this._ordinal.replace("%d",e)}function P(e,a,t,s){var n=this._relativeTime[t];return g(n)?n(e,a,t,s):n.replace(/%d/i,e)}function O(e,a){var t=this._relativeTime[e>0?"future":"past"];return g(t)?t(a):t.replace(/%s/i,a)}function W(e,a){var t=e.toLowerCase();bn[t]=bn[t+"s"]=bn[a]=e}function E(e){return"string"==typeof e?bn[e]||bn[e.toLowerCase()]:void 0}function A(e){var a,t,s={};for(t in e)i(e,t)&&(a=E(t))&&(s[a]=e[t]);return s}function F(e,a){jn[e]=a}function z(e){var a=[];for(var t in e)a.push({unit:t,priority:jn[t]});return a.sort(function(e,a){return e.priority-a.priority}),a}function J(a,t){return function(s){return null!=s?(N(this,a,s),e.updateOffset(this,t),this):R(this,a)}}function R(e,a){return e.isValid()?e._d["get"+(e._isUTC?"UTC":"")+a]():NaN}function N(e,a,t){e.isValid()&&e._d["set"+(e._isUTC?"UTC":"")+a](t)}function C(e){return e=E(e),g(this[e])?this[e]():this}function I(e,a){if("object"==typeof e){e=A(e);for(var t=z(e),s=0;s<t.length;s++)this[t[s].unit](e[t[s].unit])}else if(e=E(e),g(this[e]))return this[e](a);return this}function G(e,a,t){var s=""+Math.abs(e),n=a-s.length;return(e>=0?t?"+":"":"-")+Math.pow(10,Math.max(0,n)).toString().substr(1)+s}function U(e,a,t,s){var n=s;"string"==typeof s&&(n=function(){return this[s]()}),e&&(Wn[e]=n),a&&(Wn[a[0]]=function(){return G(n.apply(this,arguments),a[1],a[2])}),t&&(Wn[t]=function(){return this.localeData().ordinal(n.apply(this,arguments),e)})}function V(e){return e.match(/\[[\s\S]/)?e.replace(/^\[|\]$/g,""):e.replace(/\\/g,"")}function $(e){var a,t,s=e.match(xn);for(a=0,t=s.length;a<t;a++)Wn[s[a]]?s[a]=Wn[s[a]]:s[a]=V(s[a]);return function(a){var n,r="";for(n=0;n<t;n++)r+=g(s[n])?s[n].call(a,e):s[n];return r}}function K(e,a){return e.isValid()?(a=Z(a,e.localeData()),On[a]=On[a]||$(a),On[a](e)):e.localeData().invalidDate()}function Z(e,a){function t(e){return a.longDateFormat(e)||e}var s=5;for(Pn.lastIndex=0;s>=0&&Pn.test(e);)e=e.replace(Pn,t),Pn.lastIndex=0,s-=1;return e}function q(e,a,t){Kn[e]=g(a)?a:function(e,s){return e&&t?t:a}}function B(e,a){return i(Kn,e)?Kn[e](a._strict,a._locale):new RegExp(Q(e))}function Q(e){return X(e.replace("\\","").replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g,function(e,a,t,s,n){return a||t||s||n}))}function X(e){return e.replace(/[-\/\\^$*+?.()|[\]{}]/g,"\\$&")}function ee(e,a){var t,s=a;for("string"==typeof e&&(e=[e]),r(a)&&(s=function(e,t){t[a]=f(e)}),t=0;t<e.length;t++)Zn[e[t]]=s}function ae(e,a){ee(e,function(e,t,s,n){s._w=s._w||{},a(e,s._w,s,n)})}function te(e,a,t){null!=a&&i(Zn,e)&&Zn[e](a,t._a,t,e)}function se(e,a){return new Date(Date.UTC(e,a+1,0)).getUTCDate()}function ne(e,t){return e?a(this._months)?this._months[e.month()]:this._months[(this._months.isFormat||dr).test(t)?"format":"standalone"][e.month()]:a(this._months)?this._months:this._months.standalone}function re(e,t){return e?a(this._monthsShort)?this._monthsShort[e.month()]:this._monthsShort[dr.test(t)?"format":"standalone"][e.month()]:a(this._monthsShort)?this._monthsShort:this._monthsShort.standalone}function de(e,a,t){var s,n,r,d=e.toLocaleLowerCase();if(!this._monthsParse)for(this._monthsParse=[],this._longMonthsParse=[],this._shortMonthsParse=[],s=0;s<12;++s)r=m([2e3,s]),this._shortMonthsParse[s]=this.monthsShort(r,"").toLocaleLowerCase(),this._longMonthsParse[s]=this.months(r,"").toLocaleLowerCase();return t?"MMM"===a?(n=rr.call(this._shortMonthsParse,d),-1!==n?n:null):(n=rr.call(this._longMonthsParse,d),-1!==n?n:null):"MMM"===a?(n=rr.call(this._shortMonthsParse,d),-1!==n?n:(n=rr.call(this._longMonthsParse,d),-1!==n?n:null)):(n=rr.call(this._longMonthsParse,d),-1!==n?n:(n=rr.call(this._shortMonthsParse,d),-1!==n?n:null))}function _e(e,a,t){var s,n,r;if(this._monthsParseExact)return de.call(this,e,a,t);for(this._monthsParse||(this._monthsParse=[],this._longMonthsParse=[],this._shortMonthsParse=[]),s=0;s<12;s++){if(n=m([2e3,s]),t&&!this._longMonthsParse[s]&&(this._longMonthsParse[s]=new RegExp("^"+this.months(n,"").replace(".","")+"$","i"),this._shortMonthsParse[s]=new RegExp("^"+this.monthsShort(n,"").replace(".","")+"$","i")),t||this._monthsParse[s]||(r="^"+this.months(n,"")+"|^"+this.monthsShort(n,""),this._monthsParse[s]=new RegExp(r.replace(".",""),"i")),t&&"MMMM"===a&&this._longMonthsParse[s].test(e))return s;if(t&&"MMM"===a&&this._shortMonthsParse[s].test(e))return s;if(!t&&this._monthsParse[s].test(e))return s}}function ie(e,a){var t;if(!e.isValid())return e;if("string"==typeof a)if(/^\d+$/.test(a))a=f(a);else if(a=e.localeData().monthsParse(a),!r(a))return e;return t=Math.min(e.date(),se(e.year(),a)),e._d["set"+(e._isUTC?"UTC":"")+"Month"](a,t),e}function oe(a){return null!=a?(ie(this,a),e.updateOffset(this,!0),this):R(this,"Month")}function me(){return se(this.year(),this.month())}function ue(e){return this._monthsParseExact?(i(this,"_monthsRegex")||Me.call(this),e?this._monthsShortStrictRegex:this._monthsShortRegex):(i(this,"_monthsShortRegex")||(this._monthsShortRegex=or),this._monthsShortStrictRegex&&e?this._monthsShortStrictRegex:this._monthsShortRegex)}function le(e){return this._monthsParseExact?(i(this,"_monthsRegex")||Me.call(this),e?this._monthsStrictRegex:this._monthsRegex):(i(this,"_monthsRegex")||(this._monthsRegex=mr),this._monthsStrictRegex&&e?this._monthsStrictRegex:this._monthsRegex)}function Me(){function e(e,a){return a.length-e.length}var a,t,s=[],n=[],r=[];for(a=0;a<12;a++)t=m([2e3,a]),s.push(this.monthsShort(t,"")),n.push(this.months(t,"")),r.push(this.months(t,"")),r.push(this.monthsShort(t,""));for(s.sort(e),n.sort(e),r.sort(e),a=0;a<12;a++)s[a]=X(s[a]),n[a]=X(n[a]);for(a=0;a<24;a++)r[a]=X(r[a]);this._monthsRegex=new RegExp("^("+r.join("|")+")","i"),this._monthsShortRegex=this._monthsRegex,this._monthsStrictRegex=new RegExp("^("+n.join("|")+")","i"),this._monthsShortStrictRegex=new RegExp("^("+s.join("|")+")","i")}function he(e){return Le(e)?366:365}function Le(e){return e%4==0&&e%100!=0||e%400==0}function ce(){return Le(this.year())}function Ye(e,a,t,s,n,r,d){var _=new Date(e,a,t,s,n,r,d);return e<100&&e>=0&&isFinite(_.getFullYear())&&_.setFullYear(e),_}function ye(e){var a=new Date(Date.UTC.apply(null,arguments));return e<100&&e>=0&&isFinite(a.getUTCFullYear())&&a.setUTCFullYear(e),a}function fe(e,a,t){var s=7+a-t;return-(7+ye(e,0,s).getUTCDay()-a)%7+s-1}function pe(e,a,t,s,n){var r,d,_=(7+t-s)%7,i=fe(e,s,n),o=1+7*(a-1)+_+i;return o<=0?(r=e-1,d=he(r)+o):o>he(e)?(r=e+1,d=o-he(e)):(r=e,d=o),{year:r,dayOfYear:d}}function De(e,a,t){var s,n,r=fe(e.year(),a,t),d=Math.floor((e.dayOfYear()-r-1)/7)+1;return d<1?(n=e.year()-1,s=d+ke(n,a,t)):d>ke(e.year(),a,t)?(s=d-ke(e.year(),a,t),n=e.year()+1):(n=e.year(),s=d),{week:s,year:n}}function ke(e,a,t){var s=fe(e,a,t),n=fe(e+1,a,t);return(he(e)-s+n)/7}function Te(e){return De(e,this._week.dow,this._week.doy).week}function ge(){return this._week.dow}function we(){return this._week.doy}function ve(e){var a=this.localeData().week(this);return null==e?a:this.add(7*(e-a),"d")}function He(e){var a=De(this,1,4).week;return null==e?a:this.add(7*(e-a),"d")}function Se(e,a){return"string"!=typeof e?e:isNaN(e)?(e=a.weekdaysParse(e),"number"==typeof e?e:null):parseInt(e,10)}function be(e,a){return"string"==typeof e?a.weekdaysParse(e)%7||7:isNaN(e)?null:e}function je(e,t){return e?a(this._weekdays)?this._weekdays[e.day()]:this._weekdays[this._weekdays.isFormat.test(t)?"format":"standalone"][e.day()]:a(this._weekdays)?this._weekdays:this._weekdays.standalone}function xe(e){return e?this._weekdaysShort[e.day()]:this._weekdaysShort}function Pe(e){return e?this._weekdaysMin[e.day()]:this._weekdaysMin}function Oe(e,a,t){var s,n,r,d=e.toLocaleLowerCase();if(!this._weekdaysParse)for(this._weekdaysParse=[],this._shortWeekdaysParse=[],this._minWeekdaysParse=[],s=0;s<7;++s)r=m([2e3,1]).day(s),this._minWeekdaysParse[s]=this.weekdaysMin(r,"").toLocaleLowerCase(),this._shortWeekdaysParse[s]=this.weekdaysShort(r,"").toLocaleLowerCase(),this._weekdaysParse[s]=this.weekdays(r,"").toLocaleLowerCase();return t?"dddd"===a?(n=rr.call(this._weekdaysParse,d),-1!==n?n:null):"ddd"===a?(n=rr.call(this._shortWeekdaysParse,d),-1!==n?n:null):(n=rr.call(this._minWeekdaysParse,d),-1!==n?n:null):"dddd"===a?(n=rr.call(this._weekdaysParse,d),-1!==n?n:(n=rr.call(this._shortWeekdaysParse,d),-1!==n?n:(n=rr.call(this._minWeekdaysParse,d),-1!==n?n:null))):"ddd"===a?(n=rr.call(this._shortWeekdaysParse,d),-1!==n?n:(n=rr.call(this._weekdaysParse,d),-1!==n?n:(n=rr.call(this._minWeekdaysParse,d),-1!==n?n:null))):(n=rr.call(this._minWeekdaysParse,d),-1!==n?n:(n=rr.call(this._weekdaysParse,d),-1!==n?n:(n=rr.call(this._shortWeekdaysParse,d),-1!==n?n:null)))}function We(e,a,t){var s,n,r;if(this._weekdaysParseExact)return Oe.call(this,e,a,t);for(this._weekdaysParse||(this._weekdaysParse=[],this._minWeekdaysParse=[],this._shortWeekdaysParse=[],this._fullWeekdaysParse=[]),s=0;s<7;s++){if(n=m([2e3,1]).day(s),t&&!this._fullWeekdaysParse[s]&&(this._fullWeekdaysParse[s]=new RegExp("^"+this.weekdays(n,"").replace(".",".?")+"$","i"),this._shortWeekdaysParse[s]=new RegExp("^"+this.weekdaysShort(n,"").replace(".",".?")+"$","i"),this._minWeekdaysParse[s]=new RegExp("^"+this.weekdaysMin(n,"").replace(".",".?")+"$","i")),this._weekdaysParse[s]||(r="^"+this.weekdays(n,"")+"|^"+this.weekdaysShort(n,"")+"|^"+this.weekdaysMin(n,""),this._weekdaysParse[s]=new RegExp(r.replace(".",""),"i")),t&&"dddd"===a&&this._fullWeekdaysParse[s].test(e))return s;if(t&&"ddd"===a&&this._shortWeekdaysParse[s].test(e))return s;if(t&&"dd"===a&&this._minWeekdaysParse[s].test(e))return s;if(!t&&this._weekdaysParse[s].test(e))return s}}function Ee(e){if(!this.isValid())return null!=e?this:NaN;var a=this._isUTC?this._d.getUTCDay():this._d.getDay();return null!=e?(e=Se(e,this.localeData()),this.add(e-a,"d")):a}function Ae(e){if(!this.isValid())return null!=e?this:NaN;var a=(this.day()+7-this.localeData()._week.dow)%7;return null==e?a:this.add(e-a,"d")}function Fe(e){if(!this.isValid())return null!=e?this:NaN;if(null!=e){var a=be(e,this.localeData());return this.day(this.day()%7?a:a-7)}return this.day()||7}function ze(e){return this._weekdaysParseExact?(i(this,"_weekdaysRegex")||Ne.call(this),e?this._weekdaysStrictRegex:this._weekdaysRegex):(i(this,"_weekdaysRegex")||(this._weekdaysRegex=cr),this._weekdaysStrictRegex&&e?this._weekdaysStrictRegex:this._weekdaysRegex)}function Je(e){return this._weekdaysParseExact?(i(this,"_weekdaysRegex")||Ne.call(this),e?this._weekdaysShortStrictRegex:this._weekdaysShortRegex):(i(this,"_weekdaysShortRegex")||(this._weekdaysShortRegex=Yr),this._weekdaysShortStrictRegex&&e?this._weekdaysShortStrictRegex:this._weekdaysShortRegex)}function Re(e){return this._weekdaysParseExact?(i(this,"_weekdaysRegex")||Ne.call(this),e?this._weekdaysMinStrictRegex:this._weekdaysMinRegex):(i(this,"_weekdaysMinRegex")||(this._weekdaysMinRegex=yr),this._weekdaysMinStrictRegex&&e?this._weekdaysMinStrictRegex:this._weekdaysMinRegex)}function Ne(){function e(e,a){return a.length-e.length}var a,t,s,n,r,d=[],_=[],i=[],o=[];for(a=0;a<7;a++)t=m([2e3,1]).day(a),s=this.weekdaysMin(t,""),n=this.weekdaysShort(t,""),r=this.weekdays(t,""),d.push(s),_.push(n),i.push(r),o.push(s),o.push(n),o.push(r);for(d.sort(e),_.sort(e),i.sort(e),o.sort(e),a=0;a<7;a++)_[a]=X(_[a]),i[a]=X(i[a]),o[a]=X(o[a]);this._weekdaysRegex=new RegExp("^("+o.join("|")+")","i"),this._weekdaysShortRegex=this._weekdaysRegex,this._weekdaysMinRegex=this._weekdaysRegex,this._weekdaysStrictRegex=new RegExp("^("+i.join("|")+")","i"),this._weekdaysShortStrictRegex=new RegExp("^("+_.join("|")+")","i"),this._weekdaysMinStrictRegex=new RegExp("^("+d.join("|")+")","i")}function Ce(){return this.hours()%12||12}function Ie(){return this.hours()||24}function Ge(e,a){U(e,0,0,function(){return this.localeData().meridiem(this.hours(),this.minutes(),a)})}function Ue(e,a){return a._meridiemParse}function Ve(e){return"p"===(e+"").toLowerCase().charAt(0)}function $e(e,a,t){return e>11?t?"pm":"PM":t?"am":"AM"}function Ke(e){return e?e.toLowerCase().replace("_","-"):e}function Ze(e){for(var a,t,s,n,r=0;r<e.length;){for(n=Ke(e[r]).split("-"),a=n.length,t=Ke(e[r+1]),t=t?t.split("-"):null;a>0;){if(s=qe(n.slice(0,a).join("-")))return s;if(t&&t.length>=a&&p(n,t,!0)>=a-1)break;a--}r++}return null}function qe(e){var a=null;if(!kr[e]&&"undefined"!=typeof module&&module&&module.exports)try{a=fr._abbr,require("./locale/"+e),Be(a)}catch(e){}return kr[e]}function Be(e,a){var t;return e&&(t=n(a)?ea(e):Qe(e,a))&&(fr=t),fr._abbr}function Qe(e,a){if(null!==a){var t=Dr;if(a.abbr=e,null!=kr[e])T("defineLocaleOverride","use moment.updateLocale(localeName, config) to change an existing locale. moment.defineLocale(localeName, config) should only be used for creating a new locale See http://momentjs.com/guides/#/warnings/define-locale/ for more info."),t=kr[e]._config;else if(null!=a.parentLocale){if(null==kr[a.parentLocale])return Tr[a.parentLocale]||(Tr[a.parentLocale]=[]),Tr[a.parentLocale].push({name:e,config:a}),null;t=kr[a.parentLocale]._config}return kr[e]=new H(v(t,a)),Tr[e]&&Tr[e].forEach(function(e){Qe(e.name,e.config)}),Be(e),kr[e]}return delete kr[e],null}function Xe(e,a){if(null!=a){var t,s=Dr;null!=kr[e]&&(s=kr[e]._config),a=v(s,a),t=new H(a),t.parentLocale=kr[e],kr[e]=t,Be(e)}else null!=kr[e]&&(null!=kr[e].parentLocale?kr[e]=kr[e].parentLocale:null!=kr[e]&&delete kr[e]);return kr[e]}function ea(e){var t;if(e&&e._locale&&e._locale._abbr&&(e=e._locale._abbr),!e)return fr;if(!a(e)){if(t=qe(e))return t;e=[e]}return Ze(e)}function aa(){return wn(kr)}function ta(e){var a,t=e._a;return t&&-2===l(e).overflow&&(a=t[Bn]<0||t[Bn]>11?Bn:t[Qn]<1||t[Qn]>se(t[qn],t[Bn])?Qn:t[Xn]<0||t[Xn]>24||24===t[Xn]&&(0!==t[er]||0!==t[ar]||0!==t[tr])?Xn:t[er]<0||t[er]>59?er:t[ar]<0||t[ar]>59?ar:t[tr]<0||t[tr]>999?tr:-1,l(e)._overflowDayOfYear&&(a<qn||a>Qn)&&(a=Qn),l(e)._overflowWeeks&&-1===a&&(a=sr),l(e)._overflowWeekday&&-1===a&&(a=nr),l(e).overflow=a),e}function sa(e){var a,t,s,n,r,d,_=e._i,i=gr.exec(_)||wr.exec(_);if(i){for(l(e).iso=!0,a=0,t=Hr.length;a<t;a++)if(Hr[a][1].exec(i[1])){n=Hr[a][0],s=!1!==Hr[a][2];break}if(null==n)return void(e._isValid=!1);if(i[3]){for(a=0,t=Sr.length;a<t;a++)if(Sr[a][1].exec(i[3])){r=(i[2]||" ")+Sr[a][0];break}if(null==r)return void(e._isValid=!1)}if(!s&&null!=r)return void(e._isValid=!1);if(i[4]){if(!vr.exec(i[4]))return void(e._isValid=!1);d="Z"}e._f=n+(r||"")+(d||""),ma(e)}else e._isValid=!1}function na(e){var a,t,s,n,r,d,_,i,o={" GMT":" +0000"," EDT":" -0400"," EST":" -0500"," CDT":" -0500"," CST":" -0600"," MDT":" -0600"," MST":" -0700"," PDT":" -0700"," PST":" -0800"};if(a=e._i.replace(/\([^\)]*\)|[\n\t]/g," ").replace(/(\s\s+)/g," ").replace(/^\s|\s$/g,""),t=jr.exec(a)){if(s=t[1]?"ddd"+(5===t[1].length?", ":" "):"",n="D MMM "+(t[2].length>10?"YYYY ":"YY "),r="HH:mm"+(t[4]?":ss":""),t[1]){var m=new Date(t[2]),u=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][m.getDay()];if(t[1].substr(0,3)!==u)return l(e).weekdayMismatch=!0,void(e._isValid=!1)}switch(t[5].length){case 2:0===i?_=" +0000":(i="YXWVUTSRQPONZABCDEFGHIKLM".indexOf(t[5][1].toUpperCase())-12,_=(i<0?" -":" +")+(""+i).replace(/^-?/,"0").match(/..$/)[0]+"00");break;case 4:_=o[t[5]];break;default:_=o[" GMT"]}t[5]=_,e._i=t.splice(1).join(""),d=" ZZ",e._f=s+n+r+d,ma(e),l(e).rfc2822=!0}else e._isValid=!1}function ra(a){var t=br.exec(a._i);return null!==t?void(a._d=new Date(+t[1])):(sa(a),void(!1===a._isValid&&(delete a._isValid,na(a),!1===a._isValid&&(delete a._isValid,e.createFromInputFallback(a)))))}function da(e,a,t){return null!=e?e:null!=a?a:t}function _a(a){var t=new Date(e.now());return a._useUTC?[t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate()]:[t.getFullYear(),t.getMonth(),t.getDate()]}function ia(e){var a,t,s,n,r=[];if(!e._d){for(s=_a(e),e._w&&null==e._a[Qn]&&null==e._a[Bn]&&oa(e),null!=e._dayOfYear&&(n=da(e._a[qn],s[qn]),(e._dayOfYear>he(n)||0===e._dayOfYear)&&(l(e)._overflowDayOfYear=!0),t=ye(n,0,e._dayOfYear),e._a[Bn]=t.getUTCMonth(),e._a[Qn]=t.getUTCDate()),a=0;a<3&&null==e._a[a];++a)e._a[a]=r[a]=s[a];for(;a<7;a++)e._a[a]=r[a]=null==e._a[a]?2===a?1:0:e._a[a];24===e._a[Xn]&&0===e._a[er]&&0===e._a[ar]&&0===e._a[tr]&&(e._nextDay=!0,e._a[Xn]=0),e._d=(e._useUTC?ye:Ye).apply(null,r),null!=e._tzm&&e._d.setUTCMinutes(e._d.getUTCMinutes()-e._tzm),e._nextDay&&(e._a[Xn]=24)}}function oa(e){var a,t,s,n,r,d,_,i;if(a=e._w,null!=a.GG||null!=a.W||null!=a.E)r=1,d=4,t=da(a.GG,e._a[qn],De(ya(),1,4).year),s=da(a.W,1),((n=da(a.E,1))<1||n>7)&&(i=!0);else{r=e._locale._week.dow,d=e._locale._week.doy;var o=De(ya(),r,d);t=da(a.gg,e._a[qn],o.year),s=da(a.w,o.week),null!=a.d?((n=a.d)<0||n>6)&&(i=!0):null!=a.e?(n=a.e+r,(a.e<0||a.e>6)&&(i=!0)):n=r}s<1||s>ke(t,r,d)?l(e)._overflowWeeks=!0:null!=i?l(e)._overflowWeekday=!0:(_=pe(t,s,n,r,d),e._a[qn]=_.year,e._dayOfYear=_.dayOfYear)}function ma(a){if(a._f===e.ISO_8601)return void sa(a);if(a._f===e.RFC_2822)return void na(a);a._a=[],l(a).empty=!0;var t,s,n,r,d,_=""+a._i,i=_.length,o=0;for(n=Z(a._f,a._locale).match(xn)||[],t=0;t<n.length;t++)r=n[t],s=(_.match(B(r,a))||[])[0],s&&(d=_.substr(0,_.indexOf(s)),d.length>0&&l(a).unusedInput.push(d),_=_.slice(_.indexOf(s)+s.length),o+=s.length),Wn[r]?(s?l(a).empty=!1:l(a).unusedTokens.push(r),te(r,s,a)):a._strict&&!s&&l(a).unusedTokens.push(r);l(a).charsLeftOver=i-o,_.length>0&&l(a).unusedInput.push(_),a._a[Xn]<=12&&!0===l(a).bigHour&&a._a[Xn]>0&&(l(a).bigHour=void 0),l(a).parsedDateParts=a._a.slice(0),l(a).meridiem=a._meridiem,a._a[Xn]=ua(a._locale,a._a[Xn],a._meridiem),ia(a),ta(a)}function ua(e,a,t){var s;return null==t?a:null!=e.meridiemHour?e.meridiemHour(a,t):null!=e.isPM?(s=e.isPM(t),s&&a<12&&(a+=12),s||12!==a||(a=0),a):a}function la(e){var a,t,s,n,r;if(0===e._f.length)return l(e).invalidFormat=!0,void(e._d=new Date(NaN));for(n=0;n<e._f.length;n++)r=0,a=L({},e),null!=e._useUTC&&(a._useUTC=e._useUTC),a._f=e._f[n],ma(a),M(a)&&(r+=l(a).charsLeftOver,r+=10*l(a).unusedTokens.length,l(a).score=r,(null==s||r<s)&&(s=r,t=a));o(e,t||a)}function Ma(e){if(!e._d){var a=A(e._i);e._a=_([a.year,a.month,a.day||a.date,a.hour,a.minute,a.second,a.millisecond],function(e){return e&&parseInt(e,10)}),ia(e)}}function ha(e){var a=new c(ta(La(e)));return a._nextDay&&(a.add(1,"d"),a._nextDay=void 0),a}function La(e){var t=e._i,s=e._f;return e._locale=e._locale||ea(e._l),null===t||void 0===s&&""===t?h({nullInput:!0}):("string"==typeof t&&(e._i=t=e._locale.preparse(t)),Y(t)?new c(ta(t)):(d(t)?e._d=t:a(s)?la(e):s?ma(e):ca(e),M(e)||(e._d=null),e))}function ca(s){var i=s._i;n(i)?s._d=new Date(e.now()):d(i)?s._d=new Date(i.valueOf()):"string"==typeof i?ra(s):a(i)?(s._a=_(i.slice(0),function(e){return parseInt(e,10)}),ia(s)):t(i)?Ma(s):r(i)?s._d=new Date(i):e.createFromInputFallback(s)}function Ya(e,n,r,d,_){var i={};return!0!==r&&!1!==r||(d=r,r=void 0),(t(e)&&s(e)||a(e)&&0===e.length)&&(e=void 0),i._isAMomentObject=!0,i._useUTC=i._isUTC=_,i._l=r,i._i=e,i._f=n,i._strict=d,ha(i)}function ya(e,a,t,s){return Ya(e,a,t,s,!1)}function fa(e,t){var s,n;if(1===t.length&&a(t[0])&&(t=t[0]),!t.length)return ya();for(s=t[0],n=1;n<t.length;++n)t[n].isValid()&&!t[n][e](s)||(s=t[n]);return s}function pa(){return fa("isBefore",[].slice.call(arguments,0))}function Da(){return fa("isAfter",[].slice.call(arguments,0))}function ka(e){for(var a in e)if(-1===Wr.indexOf(a)||null!=e[a]&&isNaN(e[a]))return!1;for(var t=!1,s=0;s<Wr.length;++s)if(e[Wr[s]]){if(t)return!1;parseFloat(e[Wr[s]])!==f(e[Wr[s]])&&(t=!0)}return!0}function Ta(){return this._isValid}function ga(){return Ia(NaN)}function wa(e){var a=A(e),t=a.year||0,s=a.quarter||0,n=a.month||0,r=a.week||0,d=a.day||0,_=a.hour||0,i=a.minute||0,o=a.second||0,m=a.millisecond||0;this._isValid=ka(a),this._milliseconds=+m+1e3*o+6e4*i+1e3*_*60*60,this._days=+d+7*r,this._months=+n+3*s+12*t,this._data={},this._locale=ea(),this._bubble()}function va(e){return e instanceof wa}function Ha(e){return e<0?-1*Math.round(-1*e):Math.round(e)}function Sa(e,a){U(e,0,0,function(){var e=this.utcOffset(),t="+";return e<0&&(e=-e,t="-"),t+G(~~(e/60),2)+a+G(~~e%60,2)})}function ba(e,a){var t=(a||"").match(e);if(null===t)return null;var s=t[t.length-1]||[],n=(s+"").match(Er)||["-",0,0],r=60*n[1]+f(n[2]);return 0===r?0:"+"===n[0]?r:-r}function ja(a,t){var s,n;return t._isUTC?(s=t.clone(),n=(Y(a)||d(a)?a.valueOf():ya(a).valueOf())-s.valueOf(),s._d.setTime(s._d.valueOf()+n),e.updateOffset(s,!1),s):ya(a).local()}function xa(e){return 15*-Math.round(e._d.getTimezoneOffset()/15)}function Pa(a,t,s){var n,r=this._offset||0;if(!this.isValid())return null!=a?this:NaN;if(null!=a){if("string"==typeof a){if(null===(a=ba(Vn,a)))return this}else Math.abs(a)<16&&!s&&(a*=60);return!this._isUTC&&t&&(n=xa(this)),this._offset=a,this._isUTC=!0,null!=n&&this.add(n,"m"),r!==a&&(!t||this._changeInProgress?Ka(this,Ia(a-r,"m"),1,!1):this._changeInProgress||(this._changeInProgress=!0,e.updateOffset(this,!0),this._changeInProgress=null)),this}return this._isUTC?r:xa(this)}function Oa(e,a){return null!=e?("string"!=typeof e&&(e=-e),this.utcOffset(e,a),this):-this.utcOffset()}function Wa(e){return this.utcOffset(0,e)}function Ea(e){return this._isUTC&&(this.utcOffset(0,e),this._isUTC=!1,e&&this.subtract(xa(this),"m")),this}function Aa(){if(null!=this._tzm)this.utcOffset(this._tzm,!1,!0);else if("string"==typeof this._i){var e=ba(Un,this._i);null!=e?this.utcOffset(e):this.utcOffset(0,!0)}return this}function Fa(e){return!!this.isValid()&&(e=e?ya(e).utcOffset():0,(this.utcOffset()-e)%60==0)}function za(){return this.utcOffset()>this.clone().month(0).utcOffset()||this.utcOffset()>this.clone().month(5).utcOffset()}function Ja(){if(!n(this._isDSTShifted))return this._isDSTShifted;var e={};if(L(e,this),e=La(e),e._a){var a=e._isUTC?m(e._a):ya(e._a);this._isDSTShifted=this.isValid()&&p(e._a,a.toArray())>0}else this._isDSTShifted=!1;return this._isDSTShifted}function Ra(){return!!this.isValid()&&!this._isUTC}function Na(){return!!this.isValid()&&this._isUTC}function Ca(){return!!this.isValid()&&this._isUTC&&0===this._offset}function Ia(e,a){var t,s,n,d=e,_=null;return va(e)?d={ms:e._milliseconds,d:e._days,M:e._months}:r(e)?(d={},a?d[a]=e:d.milliseconds=e):(_=Ar.exec(e))?(t="-"===_[1]?-1:1,d={y:0,d:f(_[Qn])*t,h:f(_[Xn])*t,m:f(_[er])*t,s:f(_[ar])*t,ms:f(Ha(1e3*_[tr]))*t}):(_=Fr.exec(e))?(t="-"===_[1]?-1:1,d={y:Ga(_[2],t),M:Ga(_[3],t),w:Ga(_[4],t),d:Ga(_[5],t),h:Ga(_[6],t),m:Ga(_[7],t),s:Ga(_[8],t)}):null==d?d={}:"object"==typeof d&&("from"in d||"to"in d)&&(n=Va(ya(d.from),ya(d.to)),d={},d.ms=n.milliseconds,d.M=n.months),s=new wa(d),va(e)&&i(e,"_locale")&&(s._locale=e._locale),s}function Ga(e,a){var t=e&&parseFloat(e.replace(",","."));return(isNaN(t)?0:t)*a}function Ua(e,a){var t={milliseconds:0,months:0};return t.months=a.month()-e.month()+12*(a.year()-e.year()),e.clone().add(t.months,"M").isAfter(a)&&--t.months,t.milliseconds=+a-+e.clone().add(t.months,"M"),t}function Va(e,a){var t;return e.isValid()&&a.isValid()?(a=ja(a,e),e.isBefore(a)?t=Ua(e,a):(t=Ua(a,e),t.milliseconds=-t.milliseconds,t.months=-t.months),t):{milliseconds:0,months:0}}function $a(e,a){return function(t,s){var n,r;return null===s||isNaN(+s)||(T(a,"moment()."+a+"(period, number) is deprecated. Please use moment()."+a+"(number, period). See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info."),r=t,t=s,s=r),t="string"==typeof t?+t:t,n=Ia(t,s),Ka(this,n,e),this}}function Ka(a,t,s,n){var r=t._milliseconds,d=Ha(t._days),_=Ha(t._months);a.isValid()&&(n=null==n||n,r&&a._d.setTime(a._d.valueOf()+r*s),d&&N(a,"Date",R(a,"Date")+d*s),_&&ie(a,R(a,"Month")+_*s),n&&e.updateOffset(a,d||_))}function Za(e,a){var t=e.diff(a,"days",!0);return t<-6?"sameElse":t<-1?"lastWeek":t<0?"lastDay":t<1?"sameDay":t<2?"nextDay":t<7?"nextWeek":"sameElse"}function qa(a,t){var s=a||ya(),n=ja(s,this).startOf("day"),r=e.calendarFormat(this,n)||"sameElse",d=t&&(g(t[r])?t[r].call(this,s):t[r]);return this.format(d||this.localeData().calendar(r,this,ya(s)))}function Ba(){return new c(this)}function Qa(e,a){var t=Y(e)?e:ya(e);return!(!this.isValid()||!t.isValid())&&(a=E(n(a)?"millisecond":a),"millisecond"===a?this.valueOf()>t.valueOf():t.valueOf()<this.clone().startOf(a).valueOf())}function Xa(e,a){var t=Y(e)?e:ya(e);return!(!this.isValid()||!t.isValid())&&(a=E(n(a)?"millisecond":a),"millisecond"===a?this.valueOf()<t.valueOf():this.clone().endOf(a).valueOf()<t.valueOf())}function et(e,a,t,s){return s=s||"()",("("===s[0]?this.isAfter(e,t):!this.isBefore(e,t))&&(")"===s[1]?this.isBefore(a,t):!this.isAfter(a,t))}function at(e,a){var t,s=Y(e)?e:ya(e);return!(!this.isValid()||!s.isValid())&&(a=E(a||"millisecond"),"millisecond"===a?this.valueOf()===s.valueOf():(t=s.valueOf(),this.clone().startOf(a).valueOf()<=t&&t<=this.clone().endOf(a).valueOf()))}function tt(e,a){return this.isSame(e,a)||this.isAfter(e,a)}function st(e,a){return this.isSame(e,a)||this.isBefore(e,a)}function nt(e,a,t){var s,n,r,d;return this.isValid()?(s=ja(e,this),s.isValid()?(n=6e4*(s.utcOffset()-this.utcOffset()),a=E(a),"year"===a||"month"===a||"quarter"===a?(d=rt(this,s),"quarter"===a?d/=3:"year"===a&&(d/=12)):(r=this-s,d="second"===a?r/1e3:"minute"===a?r/6e4:"hour"===a?r/36e5:"day"===a?(r-n)/864e5:"week"===a?(r-n)/6048e5:r),t?d:y(d)):NaN):NaN}function rt(e,a){var t,s,n=12*(a.year()-e.year())+(a.month()-e.month()),r=e.clone().add(n,"months");return a-r<0?(t=e.clone().add(n-1,"months"),s=(a-r)/(r-t)):(t=e.clone().add(n+1,"months"),s=(a-r)/(t-r)),-(n+s)||0}function dt(){return this.clone().locale("en").format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ")}function _t(){if(!this.isValid())return null;var e=this.clone().utc();return e.year()<0||e.year()>9999?K(e,"YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]"):g(Date.prototype.toISOString)?this.toDate().toISOString():K(e,"YYYY-MM-DD[T]HH:mm:ss.SSS[Z]")}function it(){if(!this.isValid())return"moment.invalid(/* "+this._i+" */)";var e="moment",a="";this.isLocal()||(e=0===this.utcOffset()?"moment.utc":"moment.parseZone",a="Z");var t="["+e+'("]',s=0<=this.year()&&this.year()<=9999?"YYYY":"YYYYYY",n=a+'[")]';return this.format(t+s+"-MM-DD[T]HH:mm:ss.SSS"+n)}function ot(a){a||(a=this.isUtc()?e.defaultFormatUtc:e.defaultFormat);var t=K(this,a);return this.localeData().postformat(t)}function mt(e,a){return this.isValid()&&(Y(e)&&e.isValid()||ya(e).isValid())?Ia({to:this,from:e}).locale(this.locale()).humanize(!a):this.localeData().invalidDate()}function ut(e){return this.from(ya(),e)}function lt(e,a){return this.isValid()&&(Y(e)&&e.isValid()||ya(e).isValid())?Ia({from:this,to:e}).locale(this.locale()).humanize(!a):this.localeData().invalidDate()}function Mt(e){return this.to(ya(),e)}function ht(e){var a;return void 0===e?this._locale._abbr:(a=ea(e),null!=a&&(this._locale=a),this)}function Lt(){return this._locale}function ct(e){switch(e=E(e)){case"year":this.month(0);case"quarter":case"month":this.date(1);case"week":case"isoWeek":case"day":case"date":this.hours(0);case"hour":this.minutes(0);case"minute":this.seconds(0);case"second":this.milliseconds(0)}return"week"===e&&this.weekday(0),"isoWeek"===e&&this.isoWeekday(1),"quarter"===e&&this.month(3*Math.floor(this.month()/3)),this}function Yt(e){return e=E(e),void 0===e||"millisecond"===e?this:("date"===e&&(e="day"),this.startOf(e).add(1,"isoWeek"===e?"week":e).subtract(1,"ms"))}function yt(){return this._d.valueOf()-6e4*(this._offset||0)}function ft(){return Math.floor(this.valueOf()/1e3)}function pt(){return new Date(this.valueOf())}function Dt(){var e=this;return[e.year(),e.month(),e.date(),e.hour(),e.minute(),e.second(),e.millisecond()]}function kt(){var e=this;return{years:e.year(),months:e.month(),date:e.date(),hours:e.hours(),minutes:e.minutes(),seconds:e.seconds(),milliseconds:e.milliseconds()}}function Tt(){return this.isValid()?this.toISOString():null}function gt(){return M(this)}function wt(){return o({},l(this))}function vt(){return l(this).overflow}
function Ht(){return{input:this._i,format:this._f,locale:this._locale,isUTC:this._isUTC,strict:this._strict}}function St(e,a){U(0,[e,e.length],0,a)}function bt(e){return Ot.call(this,e,this.week(),this.weekday(),this.localeData()._week.dow,this.localeData()._week.doy)}function jt(e){return Ot.call(this,e,this.isoWeek(),this.isoWeekday(),1,4)}function xt(){return ke(this.year(),1,4)}function Pt(){var e=this.localeData()._week;return ke(this.year(),e.dow,e.doy)}function Ot(e,a,t,s,n){var r;return null==e?De(this,s,n).year:(r=ke(e,s,n),a>r&&(a=r),Wt.call(this,e,a,t,s,n))}function Wt(e,a,t,s,n){var r=pe(e,a,t,s,n),d=ye(r.year,0,r.dayOfYear);return this.year(d.getUTCFullYear()),this.month(d.getUTCMonth()),this.date(d.getUTCDate()),this}function Et(e){return null==e?Math.ceil((this.month()+1)/3):this.month(3*(e-1)+this.month()%3)}function At(e){var a=Math.round((this.clone().startOf("day")-this.clone().startOf("year"))/864e5)+1;return null==e?a:this.add(e-a,"d")}function Ft(e,a){a[tr]=f(1e3*("0."+e))}function zt(){return this._isUTC?"UTC":""}function Jt(){return this._isUTC?"Coordinated Universal Time":""}function Rt(e){return ya(1e3*e)}function Nt(){return ya.apply(null,arguments).parseZone()}function Ct(e){return e}function It(e,a,t,s){var n=ea(),r=m().set(s,a);return n[t](r,e)}function Gt(e,a,t){if(r(e)&&(a=e,e=void 0),e=e||"",null!=a)return It(e,a,t,"month");var s,n=[];for(s=0;s<12;s++)n[s]=It(e,s,t,"month");return n}function Ut(e,a,t,s){"boolean"==typeof e?(r(a)&&(t=a,a=void 0),a=a||""):(a=e,t=a,e=!1,r(a)&&(t=a,a=void 0),a=a||"");var n=ea(),d=e?n._week.dow:0;if(null!=t)return It(a,(t+d)%7,s,"day");var _,i=[];for(_=0;_<7;_++)i[_]=It(a,(_+d)%7,s,"day");return i}function Vt(e,a){return Gt(e,a,"months")}function $t(e,a){return Gt(e,a,"monthsShort")}function Kt(e,a,t){return Ut(e,a,t,"weekdays")}function Zt(e,a,t){return Ut(e,a,t,"weekdaysShort")}function qt(e,a,t){return Ut(e,a,t,"weekdaysMin")}function Bt(){var e=this._data;return this._milliseconds=Kr(this._milliseconds),this._days=Kr(this._days),this._months=Kr(this._months),e.milliseconds=Kr(e.milliseconds),e.seconds=Kr(e.seconds),e.minutes=Kr(e.minutes),e.hours=Kr(e.hours),e.months=Kr(e.months),e.years=Kr(e.years),this}function Qt(e,a,t,s){var n=Ia(a,t);return e._milliseconds+=s*n._milliseconds,e._days+=s*n._days,e._months+=s*n._months,e._bubble()}function Xt(e,a){return Qt(this,e,a,1)}function es(e,a){return Qt(this,e,a,-1)}function as(e){return e<0?Math.floor(e):Math.ceil(e)}function ts(){var e,a,t,s,n,r=this._milliseconds,d=this._days,_=this._months,i=this._data;return r>=0&&d>=0&&_>=0||r<=0&&d<=0&&_<=0||(r+=864e5*as(ns(_)+d),d=0,_=0),i.milliseconds=r%1e3,e=y(r/1e3),i.seconds=e%60,a=y(e/60),i.minutes=a%60,t=y(a/60),i.hours=t%24,d+=y(t/24),n=y(ss(d)),_+=n,d-=as(ns(n)),s=y(_/12),_%=12,i.days=d,i.months=_,i.years=s,this}function ss(e){return 4800*e/146097}function ns(e){return 146097*e/4800}function rs(e){if(!this.isValid())return NaN;var a,t,s=this._milliseconds;if("month"===(e=E(e))||"year"===e)return a=this._days+s/864e5,t=this._months+ss(a),"month"===e?t:t/12;switch(a=this._days+Math.round(ns(this._months)),e){case"week":return a/7+s/6048e5;case"day":return a+s/864e5;case"hour":return 24*a+s/36e5;case"minute":return 1440*a+s/6e4;case"second":return 86400*a+s/1e3;case"millisecond":return Math.floor(864e5*a)+s;default:throw new Error("Unknown unit "+e)}}function ds(){return this.isValid()?this._milliseconds+864e5*this._days+this._months%12*2592e6+31536e6*f(this._months/12):NaN}function _s(e){return function(){return this.as(e)}}function is(e){return e=E(e),this.isValid()?this[e+"s"]():NaN}function os(e){return function(){return this.isValid()?this._data[e]:NaN}}function ms(){return y(this.days()/7)}function us(e,a,t,s,n){return n.relativeTime(a||1,!!t,e,s)}function ls(e,a,t){var s=Ia(e).abs(),n=md(s.as("s")),r=md(s.as("m")),d=md(s.as("h")),_=md(s.as("d")),i=md(s.as("M")),o=md(s.as("y")),m=n<=ud.ss&&["s",n]||n<ud.s&&["ss",n]||r<=1&&["m"]||r<ud.m&&["mm",r]||d<=1&&["h"]||d<ud.h&&["hh",d]||_<=1&&["d"]||_<ud.d&&["dd",_]||i<=1&&["M"]||i<ud.M&&["MM",i]||o<=1&&["y"]||["yy",o];return m[2]=a,m[3]=+e>0,m[4]=t,us.apply(null,m)}function Ms(e){return void 0===e?md:"function"==typeof e&&(md=e,!0)}function hs(e,a){return void 0!==ud[e]&&(void 0===a?ud[e]:(ud[e]=a,"s"===e&&(ud.ss=a-1),!0))}function Ls(e){if(!this.isValid())return this.localeData().invalidDate();var a=this.localeData(),t=ls(this,!e,a);return e&&(t=a.pastFuture(+this,t)),a.postformat(t)}function cs(){if(!this.isValid())return this.localeData().invalidDate();var e,a,t,s=ld(this._milliseconds)/1e3,n=ld(this._days),r=ld(this._months);e=y(s/60),a=y(e/60),s%=60,e%=60,t=y(r/12),r%=12;var d=t,_=r,i=n,o=a,m=e,u=s,l=this.asSeconds();return l?(l<0?"-":"")+"P"+(d?d+"Y":"")+(_?_+"M":"")+(i?i+"D":"")+(o||m||u?"T":"")+(o?o+"H":"")+(m?m+"M":"")+(u?u+"S":""):"P0D"}function Ys(e,a){var t=e.split("_");return a%10==1&&a%100!=11?t[0]:a%10>=2&&a%10<=4&&(a%100<10||a%100>=20)?t[1]:t[2]}function ys(e,a,t){var s={mm:a?"хвіліна_хвіліны_хвілін":"хвіліну_хвіліны_хвілін",hh:a?"гадзіна_гадзіны_гадзін":"гадзіну_гадзіны_гадзін",dd:"дзень_дні_дзён",MM:"месяц_месяцы_месяцаў",yy:"год_гады_гадоў"};return"m"===t?a?"хвіліна":"хвіліну":"h"===t?a?"гадзіна":"гадзіну":e+" "+Ys(s[t],+e)}function fs(e,a,t){return e+" "+ks({mm:"munutenn",MM:"miz",dd:"devezh"}[t],e)}function ps(e){switch(Ds(e)){case 1:case 3:case 4:case 5:case 9:return e+" bloaz";default:return e+" vloaz"}}function Ds(e){return e>9?Ds(e%10):e}function ks(e,a){return 2===a?Ts(e):e}function Ts(e){var a={m:"v",b:"v",d:"z"};return void 0===a[e.charAt(0)]?e:a[e.charAt(0)]+e.substring(1)}function gs(e,a,t){var s=e+" ";switch(t){case"m":return a?"jedna minuta":"jedne minute";case"mm":return s+=1===e?"minuta":2===e||3===e||4===e?"minute":"minuta";case"h":return a?"jedan sat":"jednog sata";case"hh":return s+=1===e?"sat":2===e||3===e||4===e?"sata":"sati";case"dd":return s+=1===e?"dan":"dana";case"MM":return s+=1===e?"mjesec":2===e||3===e||4===e?"mjeseca":"mjeseci";case"yy":return s+=1===e?"godina":2===e||3===e||4===e?"godine":"godina"}}function ws(e){return e>1&&e<5&&1!=~~(e/10)}function vs(e,a,t,s){var n=e+" ";switch(t){case"s":return a||s?"pár sekund":"pár sekundami";case"m":return a?"minuta":s?"minutu":"minutou";case"mm":return a||s?n+(ws(e)?"minuty":"minut"):n+"minutami";case"h":return a?"hodina":s?"hodinu":"hodinou";case"hh":return a||s?n+(ws(e)?"hodiny":"hodin"):n+"hodinami";case"d":return a||s?"den":"dnem";case"dd":return a||s?n+(ws(e)?"dny":"dní"):n+"dny";case"M":return a||s?"měsíc":"měsícem";case"MM":return a||s?n+(ws(e)?"měsíce":"měsíců"):n+"měsíci";case"y":return a||s?"rok":"rokem";case"yy":return a||s?n+(ws(e)?"roky":"let"):n+"lety"}}function Hs(e,a,t,s){var n={m:["eine Minute","einer Minute"],h:["eine Stunde","einer Stunde"],d:["ein Tag","einem Tag"],dd:[e+" Tage",e+" Tagen"],M:["ein Monat","einem Monat"],MM:[e+" Monate",e+" Monaten"],y:["ein Jahr","einem Jahr"],yy:[e+" Jahre",e+" Jahren"]};return a?n[t][0]:n[t][1]}function Ss(e,a,t,s){var n={m:["eine Minute","einer Minute"],h:["eine Stunde","einer Stunde"],d:["ein Tag","einem Tag"],dd:[e+" Tage",e+" Tagen"],M:["ein Monat","einem Monat"],MM:[e+" Monate",e+" Monaten"],y:["ein Jahr","einem Jahr"],yy:[e+" Jahre",e+" Jahren"]};return a?n[t][0]:n[t][1]}function bs(e,a,t,s){var n={m:["eine Minute","einer Minute"],h:["eine Stunde","einer Stunde"],d:["ein Tag","einem Tag"],dd:[e+" Tage",e+" Tagen"],M:["ein Monat","einem Monat"],MM:[e+" Monate",e+" Monaten"],y:["ein Jahr","einem Jahr"],yy:[e+" Jahre",e+" Jahren"]};return a?n[t][0]:n[t][1]}function js(e,a,t,s){var n={s:["mõne sekundi","mõni sekund","paar sekundit"],m:["ühe minuti","üks minut"],mm:[e+" minuti",e+" minutit"],h:["ühe tunni","tund aega","üks tund"],hh:[e+" tunni",e+" tundi"],d:["ühe päeva","üks päev"],M:["kuu aja","kuu aega","üks kuu"],MM:[e+" kuu",e+" kuud"],y:["ühe aasta","aasta","üks aasta"],yy:[e+" aasta",e+" aastat"]};return a?n[t][2]?n[t][2]:n[t][1]:s?n[t][0]:n[t][1]}function xs(e,a,t,s){var n="";switch(t){case"s":return s?"muutaman sekunnin":"muutama sekunti";case"m":return s?"minuutin":"minuutti";case"mm":n=s?"minuutin":"minuuttia";break;case"h":return s?"tunnin":"tunti";case"hh":n=s?"tunnin":"tuntia";break;case"d":return s?"päivän":"päivä";case"dd":n=s?"päivän":"päivää";break;case"M":return s?"kuukauden":"kuukausi";case"MM":n=s?"kuukauden":"kuukautta";break;case"y":return s?"vuoden":"vuosi";case"yy":n=s?"vuoden":"vuotta"}return n=Ps(e,s)+" "+n}function Ps(e,a){return e<10?a?Id[e]:Cd[e]:e}function Os(e,a,t,s){var n={s:["thodde secondanim","thodde second"],m:["eka mintan","ek minute"],mm:[e+" mintanim",e+" mintam"],h:["eka horan","ek hor"],hh:[e+" horanim",e+" hor"],d:["eka disan","ek dis"],dd:[e+" disanim",e+" dis"],M:["eka mhoinean","ek mhoino"],MM:[e+" mhoineanim",e+" mhoine"],y:["eka vorsan","ek voros"],yy:[e+" vorsanim",e+" vorsam"]};return a?n[t][0]:n[t][1]}function Ws(e,a,t){var s=e+" ";switch(t){case"m":return a?"jedna minuta":"jedne minute";case"mm":return s+=1===e?"minuta":2===e||3===e||4===e?"minute":"minuta";case"h":return a?"jedan sat":"jednog sata";case"hh":return s+=1===e?"sat":2===e||3===e||4===e?"sata":"sati";case"dd":return s+=1===e?"dan":"dana";case"MM":return s+=1===e?"mjesec":2===e||3===e||4===e?"mjeseca":"mjeseci";case"yy":return s+=1===e?"godina":2===e||3===e||4===e?"godine":"godina"}}function Es(e,a,t,s){var n=e;switch(t){case"s":return s||a?"néhány másodperc":"néhány másodperce";case"m":return"egy"+(s||a?" perc":" perce");case"mm":return n+(s||a?" perc":" perce");case"h":return"egy"+(s||a?" óra":" órája");case"hh":return n+(s||a?" óra":" órája");case"d":return"egy"+(s||a?" nap":" napja");case"dd":return n+(s||a?" nap":" napja");case"M":return"egy"+(s||a?" hónap":" hónapja");case"MM":return n+(s||a?" hónap":" hónapja");case"y":return"egy"+(s||a?" év":" éve");case"yy":return n+(s||a?" év":" éve")}return""}function As(e){return(e?"":"[múlt] ")+"["+Xd[this.day()]+"] LT[-kor]"}function Fs(e){return e%100==11||e%10!=1}function zs(e,a,t,s){var n=e+" ";switch(t){case"s":return a||s?"nokkrar sekúndur":"nokkrum sekúndum";case"m":return a?"mínúta":"mínútu";case"mm":return Fs(e)?n+(a||s?"mínútur":"mínútum"):a?n+"mínúta":n+"mínútu";case"hh":return Fs(e)?n+(a||s?"klukkustundir":"klukkustundum"):n+"klukkustund";case"d":return a?"dagur":s?"dag":"degi";case"dd":return Fs(e)?a?n+"dagar":n+(s?"daga":"dögum"):a?n+"dagur":n+(s?"dag":"degi");case"M":return a?"mánuður":s?"mánuð":"mánuði";case"MM":return Fs(e)?a?n+"mánuðir":n+(s?"mánuði":"mánuðum"):a?n+"mánuður":n+(s?"mánuð":"mánuði");case"y":return a||s?"ár":"ári";case"yy":return Fs(e)?n+(a||s?"ár":"árum"):n+(a||s?"ár":"ári")}}function Js(e,a,t,s){var n={m:["eng Minutt","enger Minutt"],h:["eng Stonn","enger Stonn"],d:["een Dag","engem Dag"],M:["ee Mount","engem Mount"],y:["ee Joer","engem Joer"]};return a?n[t][0]:n[t][1]}function Rs(e){return Cs(e.substr(0,e.indexOf(" ")))?"a "+e:"an "+e}function Ns(e){return Cs(e.substr(0,e.indexOf(" ")))?"viru "+e:"virun "+e}function Cs(e){if(e=parseInt(e,10),isNaN(e))return!1;if(e<0)return!0;if(e<10)return 4<=e&&e<=7;if(e<100){var a=e%10,t=e/10;return Cs(0===a?t:a)}if(e<1e4){for(;e>=10;)e/=10;return Cs(e)}return e/=1e3,Cs(e)}function Is(e,a,t,s){return a?"kelios sekundės":s?"kelių sekundžių":"kelias sekundes"}function Gs(e,a,t,s){return a?Vs(t)[0]:s?Vs(t)[1]:Vs(t)[2]}function Us(e){return e%10==0||e>10&&e<20}function Vs(e){return n_[e].split("_")}function $s(e,a,t,s){var n=e+" ";return 1===e?n+Gs(e,a,t[0],s):a?n+(Us(e)?Vs(t)[1]:Vs(t)[0]):s?n+Vs(t)[1]:n+(Us(e)?Vs(t)[1]:Vs(t)[2])}function Ks(e,a,t){return t?a%10==1&&a%100!=11?e[2]:e[3]:a%10==1&&a%100!=11?e[0]:e[1]}function Zs(e,a,t){return e+" "+Ks(r_[t],e,a)}function qs(e,a,t){return Ks(r_[t],e,a)}function Bs(e,a){return a?"dažas sekundes":"dažām sekundēm"}function Qs(e,a,t,s){var n="";if(a)switch(t){case"s":n="काही सेकंद";break;case"m":n="एक मिनिट";break;case"mm":n="%d मिनिटे";break;case"h":n="एक तास";break;case"hh":n="%d तास";break;case"d":n="एक दिवस";break;case"dd":n="%d दिवस";break;case"M":n="एक महिना";break;case"MM":n="%d महिने";break;case"y":n="एक वर्ष";break;case"yy":n="%d वर्षे"}else switch(t){case"s":n="काही सेकंदां";break;case"m":n="एका मिनिटा";break;case"mm":n="%d मिनिटां";break;case"h":n="एका तासा";break;case"hh":n="%d तासां";break;case"d":n="एका दिवसा";break;case"dd":n="%d दिवसां";break;case"M":n="एका महिन्या";break;case"MM":n="%d महिन्यां";break;case"y":n="एका वर्षा";break;case"yy":n="%d वर्षां"}return n.replace(/%d/i,e)}function Xs(e){return e%10<5&&e%10>1&&~~(e/10)%10!=1}function en(e,a,t){var s=e+" ";switch(t){case"m":return a?"minuta":"minutę";case"mm":return s+(Xs(e)?"minuty":"minut");case"h":return a?"godzina":"godzinę";case"hh":return s+(Xs(e)?"godziny":"godzin");case"MM":return s+(Xs(e)?"miesiące":"miesięcy");case"yy":return s+(Xs(e)?"lata":"lat")}}function an(e,a,t){var s={mm:"minute",hh:"ore",dd:"zile",MM:"luni",yy:"ani"},n=" ";return(e%100>=20||e>=100&&e%100==0)&&(n=" de "),e+n+s[t]}function tn(e,a){var t=e.split("_");return a%10==1&&a%100!=11?t[0]:a%10>=2&&a%10<=4&&(a%100<10||a%100>=20)?t[1]:t[2]}function sn(e,a,t){var s={mm:a?"минута_минуты_минут":"минуту_минуты_минут",hh:"час_часа_часов",dd:"день_дня_дней",MM:"месяц_месяца_месяцев",yy:"год_года_лет"};return"m"===t?a?"минута":"минуту":e+" "+tn(s[t],+e)}function nn(e){return e>1&&e<5}function rn(e,a,t,s){var n=e+" ";switch(t){case"s":return a||s?"pár sekúnd":"pár sekundami";case"m":return a?"minúta":s?"minútu":"minútou";case"mm":return a||s?n+(nn(e)?"minúty":"minút"):n+"minútami";case"h":return a?"hodina":s?"hodinu":"hodinou";case"hh":return a||s?n+(nn(e)?"hodiny":"hodín"):n+"hodinami";case"d":return a||s?"deň":"dňom";case"dd":return a||s?n+(nn(e)?"dni":"dní"):n+"dňami";case"M":return a||s?"mesiac":"mesiacom";case"MM":return a||s?n+(nn(e)?"mesiace":"mesiacov"):n+"mesiacmi";case"y":return a||s?"rok":"rokom";case"yy":return a||s?n+(nn(e)?"roky":"rokov"):n+"rokmi"}}function dn(e,a,t,s){var n=e+" ";switch(t){case"s":return a||s?"nekaj sekund":"nekaj sekundami";case"m":return a?"ena minuta":"eno minuto";case"mm":return n+=1===e?a?"minuta":"minuto":2===e?a||s?"minuti":"minutama":e<5?a||s?"minute":"minutami":a||s?"minut":"minutami";case"h":return a?"ena ura":"eno uro";case"hh":return n+=1===e?a?"ura":"uro":2===e?a||s?"uri":"urama":e<5?a||s?"ure":"urami":a||s?"ur":"urami";case"d":return a||s?"en dan":"enim dnem";case"dd":return n+=1===e?a||s?"dan":"dnem":2===e?a||s?"dni":"dnevoma":a||s?"dni":"dnevi";case"M":return a||s?"en mesec":"enim mesecem";case"MM":return n+=1===e?a||s?"mesec":"mesecem":2===e?a||s?"meseca":"mesecema":e<5?a||s?"mesece":"meseci":a||s?"mesecev":"meseci";case"y":return a||s?"eno leto":"enim letom";case"yy":return n+=1===e?a||s?"leto":"letom":2===e?a||s?"leti":"letoma":e<5?a||s?"leta":"leti":a||s?"let":"leti"}}function _n(e){var a=e;return a=-1!==e.indexOf("jaj")?a.slice(0,-3)+"leS":-1!==e.indexOf("jar")?a.slice(0,-3)+"waQ":-1!==e.indexOf("DIS")?a.slice(0,-3)+"nem":a+" pIq"}function on(e){var a=e;return a=-1!==e.indexOf("jaj")?a.slice(0,-3)+"Hu’":-1!==e.indexOf("jar")?a.slice(0,-3)+"wen":-1!==e.indexOf("DIS")?a.slice(0,-3)+"ben":a+" ret"}function mn(e,a,t,s){var n=un(e);switch(t){case"mm":return n+" tup";case"hh":return n+" rep";case"dd":return n+" jaj";case"MM":return n+" jar";case"yy":return n+" DIS"}}function un(e){var a=Math.floor(e%1e3/100),t=Math.floor(e%100/10),s=e%10,n="";return a>0&&(n+=W_[a]+"vatlh"),t>0&&(n+=(""!==n?" ":"")+W_[t]+"maH"),s>0&&(n+=(""!==n?" ":"")+W_[s]),""===n?"pagh":n}function ln(e,a,t,s){var n={s:["viensas secunds","'iensas secunds"],m:["'n míut","'iens míut"],mm:[e+" míuts",e+" míuts"],h:["'n þora","'iensa þora"],hh:[e+" þoras",e+" þoras"],d:["'n ziua","'iensa ziua"],dd:[e+" ziuas",e+" ziuas"],M:["'n mes","'iens mes"],MM:[e+" mesen",e+" mesen"],y:["'n ar","'iens ar"],yy:[e+" ars",e+" ars"]};return s?n[t][0]:a?n[t][0]:n[t][1]}function Mn(e,a){var t=e.split("_");return a%10==1&&a%100!=11?t[0]:a%10>=2&&a%10<=4&&(a%100<10||a%100>=20)?t[1]:t[2]}function hn(e,a,t){var s={mm:a?"хвилина_хвилини_хвилин":"хвилину_хвилини_хвилин",hh:a?"година_години_годин":"годину_години_годин",dd:"день_дні_днів",MM:"місяць_місяці_місяців",yy:"рік_роки_років"};return"m"===t?a?"хвилина":"хвилину":"h"===t?a?"година":"годину":e+" "+Mn(s[t],+e)}function Ln(e,a){var t={nominative:"неділя_понеділок_вівторок_середа_четвер_п’ятниця_субота".split("_"),accusative:"неділю_понеділок_вівторок_середу_четвер_п’ятницю_суботу".split("_"),genitive:"неділі_понеділка_вівторка_середи_четверга_п’ятниці_суботи".split("_")};return e?t[/(\[[ВвУу]\]) ?dddd/.test(a)?"accusative":/\[?(?:минулої|наступної)? ?\] ?dddd/.test(a)?"genitive":"nominative"][e.day()]:t.nominative}function cn(e){return function(){return e+"о"+(11===this.hours()?"б":"")+"] LT"}}var Yn,yn;yn=Array.prototype.some?Array.prototype.some:function(e){for(var a=Object(this),t=a.length>>>0,s=0;s<t;s++)if(s in a&&e.call(this,a[s],s,a))return!0;return!1};var fn=yn,pn=e.momentProperties=[],Dn=!1,kn={};e.suppressDeprecationWarnings=!1,e.deprecationHandler=null;var Tn;Tn=Object.keys?Object.keys:function(e){var a,t=[];for(a in e)i(e,a)&&t.push(a);return t};var gn,wn=Tn,vn={sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},Hn={LTS:"h:mm:ss A",LT:"h:mm A",L:"MM/DD/YYYY",LL:"MMMM D, YYYY",LLL:"MMMM D, YYYY h:mm A",LLLL:"dddd, MMMM D, YYYY h:mm A"},Sn={future:"in %s",past:"%s ago",s:"a few seconds",ss:"%d seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},bn={},jn={},xn=/(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g,Pn=/(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,On={},Wn={},En=/\d\d/,An=/\d{4}/,Fn=/[+-]?\d{6}/,zn=/\d\d?/,Jn=/\d\d\d\d?/,Rn=/\d\d\d\d\d\d?/,Nn=/\d{1,3}/,Cn=/\d{1,4}/,In=/[+-]?\d{1,6}/,Gn=/[+-]?\d+/,Un=/Z|[+-]\d\d:?\d\d/gi,Vn=/Z|[+-]\d\d(?::?\d\d)?/gi,$n=/[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i,Kn={},Zn={},qn=0,Bn=1,Qn=2,Xn=3,er=4,ar=5,tr=6,sr=7,nr=8;gn=Array.prototype.indexOf?Array.prototype.indexOf:function(e){var a;for(a=0;a<this.length;++a)if(this[a]===e)return a;return-1};var rr=gn;U("M",["MM",2],"Mo",function(){return this.month()+1}),U("MMM",0,0,function(e){return this.localeData().monthsShort(this,e)}),U("MMMM",0,0,function(e){return this.localeData().months(this,e)}),W("month","M"),F("month",8),q("M",zn),q("MM",zn,En),q("MMM",function(e,a){return a.monthsShortRegex(e)}),q("MMMM",function(e,a){return a.monthsRegex(e)}),ee(["M","MM"],function(e,a){a[Bn]=f(e)-1}),ee(["MMM","MMMM"],function(e,a,t,s){var n=t._locale.monthsParse(e,s,t._strict);null!=n?a[Bn]=n:l(t).invalidMonth=e});var dr=/D[oD]?(\[[^\[\]]*\]|\s)+MMMM?/,_r="January_February_March_April_May_June_July_August_September_October_November_December".split("_"),ir="Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),or=$n,mr=$n;U("Y",0,0,function(){var e=this.year();return e<=9999?""+e:"+"+e}),U(0,["YY",2],0,function(){return this.year()%100}),U(0,["YYYY",4],0,"year"),U(0,["YYYYY",5],0,"year"),U(0,["YYYYYY",6,!0],0,"year"),W("year","y"),F("year",1),q("Y",Gn),q("YY",zn,En),q("YYYY",Cn,An),q("YYYYY",In,Fn),q("YYYYYY",In,Fn),ee(["YYYYY","YYYYYY"],qn),ee("YYYY",function(a,t){t[qn]=2===a.length?e.parseTwoDigitYear(a):f(a)}),ee("YY",function(a,t){t[qn]=e.parseTwoDigitYear(a)}),ee("Y",function(e,a){a[qn]=parseInt(e,10)}),e.parseTwoDigitYear=function(e){return f(e)+(f(e)>68?1900:2e3)};var ur=J("FullYear",!0);U("w",["ww",2],"wo","week"),U("W",["WW",2],"Wo","isoWeek"),W("week","w"),W("isoWeek","W"),F("week",5),F("isoWeek",5),q("w",zn),q("ww",zn,En),q("W",zn),q("WW",zn,En),ae(["w","ww","W","WW"],function(e,a,t,s){a[s.substr(0,1)]=f(e)});var lr={dow:0,doy:6};U("d",0,"do","day"),U("dd",0,0,function(e){return this.localeData().weekdaysMin(this,e)}),U("ddd",0,0,function(e){return this.localeData().weekdaysShort(this,e)}),U("dddd",0,0,function(e){return this.localeData().weekdays(this,e)}),U("e",0,0,"weekday"),U("E",0,0,"isoWeekday"),W("day","d"),W("weekday","e"),W("isoWeekday","E"),F("day",11),F("weekday",11),F("isoWeekday",11),q("d",zn),q("e",zn),q("E",zn),q("dd",function(e,a){return a.weekdaysMinRegex(e)}),q("ddd",function(e,a){return a.weekdaysShortRegex(e)}),q("dddd",function(e,a){return a.weekdaysRegex(e)}),ae(["dd","ddd","dddd"],function(e,a,t,s){var n=t._locale.weekdaysParse(e,s,t._strict);null!=n?a.d=n:l(t).invalidWeekday=e}),ae(["d","e","E"],function(e,a,t,s){a[s]=f(e)});var Mr="Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),hr="Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),Lr="Su_Mo_Tu_We_Th_Fr_Sa".split("_"),cr=$n,Yr=$n,yr=$n;U("H",["HH",2],0,"hour"),U("h",["hh",2],0,Ce),U("k",["kk",2],0,Ie),U("hmm",0,0,function(){return""+Ce.apply(this)+G(this.minutes(),2)}),U("hmmss",0,0,function(){return""+Ce.apply(this)+G(this.minutes(),2)+G(this.seconds(),2)}),U("Hmm",0,0,function(){return""+this.hours()+G(this.minutes(),2)}),U("Hmmss",0,0,function(){return""+this.hours()+G(this.minutes(),2)+G(this.seconds(),2)}),Ge("a",!0),Ge("A",!1),W("hour","h"),F("hour",13),q("a",Ue),q("A",Ue),q("H",zn),q("h",zn),q("k",zn),q("HH",zn,En),q("hh",zn,En),q("kk",zn,En),q("hmm",Jn),q("hmmss",Rn),q("Hmm",Jn),q("Hmmss",Rn),ee(["H","HH"],Xn),ee(["k","kk"],function(e,a,t){var s=f(e);a[Xn]=24===s?0:s}),ee(["a","A"],function(e,a,t){t._isPm=t._locale.isPM(e),t._meridiem=e}),ee(["h","hh"],function(e,a,t){a[Xn]=f(e),l(t).bigHour=!0}),ee("hmm",function(e,a,t){var s=e.length-2;a[Xn]=f(e.substr(0,s)),a[er]=f(e.substr(s)),l(t).bigHour=!0}),ee("hmmss",function(e,a,t){var s=e.length-4,n=e.length-2;a[Xn]=f(e.substr(0,s)),a[er]=f(e.substr(s,2)),a[ar]=f(e.substr(n)),l(t).bigHour=!0}),ee("Hmm",function(e,a,t){var s=e.length-2;a[Xn]=f(e.substr(0,s)),a[er]=f(e.substr(s))}),ee("Hmmss",function(e,a,t){var s=e.length-4,n=e.length-2;a[Xn]=f(e.substr(0,s)),a[er]=f(e.substr(s,2)),a[ar]=f(e.substr(n))});var fr,pr=J("Hours",!0),Dr={calendar:vn,longDateFormat:Hn,invalidDate:"Invalid date",ordinal:"%d",dayOfMonthOrdinalParse:/\d{1,2}/,relativeTime:Sn,months:_r,monthsShort:ir,week:lr,weekdays:Mr,weekdaysMin:Lr,weekdaysShort:hr,meridiemParse:/[ap]\.?m?\.?/i},kr={},Tr={},gr=/^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,wr=/^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,vr=/Z|[+-]\d\d(?::?\d\d)?/,Hr=[["YYYYYY-MM-DD",/[+-]\d{6}-\d\d-\d\d/],["YYYY-MM-DD",/\d{4}-\d\d-\d\d/],["GGGG-[W]WW-E",/\d{4}-W\d\d-\d/],["GGGG-[W]WW",/\d{4}-W\d\d/,!1],["YYYY-DDD",/\d{4}-\d{3}/],["YYYY-MM",/\d{4}-\d\d/,!1],["YYYYYYMMDD",/[+-]\d{10}/],["YYYYMMDD",/\d{8}/],["GGGG[W]WWE",/\d{4}W\d{3}/],["GGGG[W]WW",/\d{4}W\d{2}/,!1],["YYYYDDD",/\d{7}/]],Sr=[["HH:mm:ss.SSSS",/\d\d:\d\d:\d\d\.\d+/],["HH:mm:ss,SSSS",/\d\d:\d\d:\d\d,\d+/],["HH:mm:ss",/\d\d:\d\d:\d\d/],["HH:mm",/\d\d:\d\d/],["HHmmss.SSSS",/\d\d\d\d\d\d\.\d+/],["HHmmss,SSSS",/\d\d\d\d\d\d,\d+/],["HHmmss",/\d\d\d\d\d\d/],["HHmm",/\d\d\d\d/],["HH",/\d\d/]],br=/^\/?Date\((\-?\d+)/i,jr=/^((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d?\d\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(?:\d\d)?\d\d\s)(\d\d:\d\d)(\:\d\d)?(\s(?:UT|GMT|[ECMP][SD]T|[A-IK-Za-ik-z]|[+-]\d{4}))$/;e.createFromInputFallback=k("value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are discouraged and will be removed in an upcoming major release. Please refer to http://momentjs.com/guides/#/warnings/js-date/ for more info.",function(e){e._d=new Date(e._i+(e._useUTC?" UTC":""))}),e.ISO_8601=function(){},e.RFC_2822=function(){};var xr=k("moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/",function(){var e=ya.apply(null,arguments);return this.isValid()&&e.isValid()?e<this?this:e:h()}),Pr=k("moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/",function(){var e=ya.apply(null,arguments);return this.isValid()&&e.isValid()?e>this?this:e:h()}),Or=function(){return Date.now?Date.now():+new Date},Wr=["year","quarter","month","week","day","hour","minute","second","millisecond"];Sa("Z",":"),Sa("ZZ",""),q("Z",Vn),q("ZZ",Vn),ee(["Z","ZZ"],function(e,a,t){t._useUTC=!0,t._tzm=ba(Vn,e)});var Er=/([\+\-]|\d\d)/gi;e.updateOffset=function(){};var Ar=/^(\-)?(?:(\d*)[. ])?(\d+)\:(\d+)(?:\:(\d+)(\.\d*)?)?$/,Fr=/^(-)?P(?:(-?[0-9,.]*)Y)?(?:(-?[0-9,.]*)M)?(?:(-?[0-9,.]*)W)?(?:(-?[0-9,.]*)D)?(?:T(?:(-?[0-9,.]*)H)?(?:(-?[0-9,.]*)M)?(?:(-?[0-9,.]*)S)?)?$/;Ia.fn=wa.prototype,Ia.invalid=ga;var zr=$a(1,"add"),Jr=$a(-1,"subtract");e.defaultFormat="YYYY-MM-DDTHH:mm:ssZ",e.defaultFormatUtc="YYYY-MM-DDTHH:mm:ss[Z]";var Rr=k("moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.",function(e){return void 0===e?this.localeData():this.locale(e)});U(0,["gg",2],0,function(){return this.weekYear()%100}),U(0,["GG",2],0,function(){return this.isoWeekYear()%100}),St("gggg","weekYear"),St("ggggg","weekYear"),St("GGGG","isoWeekYear"),St("GGGGG","isoWeekYear"),W("weekYear","gg"),W("isoWeekYear","GG"),F("weekYear",1),F("isoWeekYear",1),q("G",Gn),q("g",Gn),q("GG",zn,En),q("gg",zn,En),q("GGGG",Cn,An),q("gggg",Cn,An),q("GGGGG",In,Fn),q("ggggg",In,Fn),ae(["gggg","ggggg","GGGG","GGGGG"],function(e,a,t,s){a[s.substr(0,2)]=f(e)}),ae(["gg","GG"],function(a,t,s,n){t[n]=e.parseTwoDigitYear(a)}),U("Q",0,"Qo","quarter"),W("quarter","Q"),F("quarter",7),q("Q",/\d/),ee("Q",function(e,a){a[Bn]=3*(f(e)-1)}),U("D",["DD",2],"Do","date"),W("date","D"),F("date",9),q("D",zn),q("DD",zn,En),q("Do",function(e,a){return e?a._dayOfMonthOrdinalParse||a._ordinalParse:a._dayOfMonthOrdinalParseLenient}),ee(["D","DD"],Qn),ee("Do",function(e,a){a[Qn]=f(e.match(zn)[0],10)});var Nr=J("Date",!0);U("DDD",["DDDD",3],"DDDo","dayOfYear"),W("dayOfYear","DDD"),F("dayOfYear",4),q("DDD",Nn),q("DDDD",/\d{3}/),ee(["DDD","DDDD"],function(e,a,t){t._dayOfYear=f(e)}),U("m",["mm",2],0,"minute"),W("minute","m"),F("minute",14),q("m",zn),q("mm",zn,En),ee(["m","mm"],er);var Cr=J("Minutes",!1);U("s",["ss",2],0,"second"),W("second","s"),F("second",15),q("s",zn),q("ss",zn,En),ee(["s","ss"],ar);var Ir=J("Seconds",!1);U("S",0,0,function(){return~~(this.millisecond()/100)}),U(0,["SS",2],0,function(){return~~(this.millisecond()/10)}),U(0,["SSS",3],0,"millisecond"),U(0,["SSSS",4],0,function(){return 10*this.millisecond()}),U(0,["SSSSS",5],0,function(){return 100*this.millisecond()}),U(0,["SSSSSS",6],0,function(){return 1e3*this.millisecond()}),U(0,["SSSSSSS",7],0,function(){return 1e4*this.millisecond()}),U(0,["SSSSSSSS",8],0,function(){return 1e5*this.millisecond()}),U(0,["SSSSSSSSS",9],0,function(){return 1e6*this.millisecond()}),W("millisecond","ms"),F("millisecond",16),q("S",Nn,/\d/),q("SS",Nn,En),q("SSS",Nn,/\d{3}/);var Gr;for(Gr="SSSS";Gr.length<=9;Gr+="S")q(Gr,/\d+/);for(Gr="S";Gr.length<=9;Gr+="S")ee(Gr,Ft);var Ur=J("Milliseconds",!1);U("z",0,0,"zoneAbbr"),U("zz",0,0,"zoneName");var Vr=c.prototype;Vr.add=zr,Vr.calendar=qa,Vr.clone=Ba,Vr.diff=nt,Vr.endOf=Yt,Vr.format=ot,Vr.from=mt,Vr.fromNow=ut,Vr.to=lt,Vr.toNow=Mt,Vr.get=C,Vr.invalidAt=vt,Vr.isAfter=Qa,Vr.isBefore=Xa,Vr.isBetween=et,Vr.isSame=at,Vr.isSameOrAfter=tt,Vr.isSameOrBefore=st,Vr.isValid=gt,Vr.lang=Rr,Vr.locale=ht,Vr.localeData=Lt,Vr.max=Pr,Vr.min=xr,Vr.parsingFlags=wt,Vr.set=I,Vr.startOf=ct,Vr.subtract=Jr,Vr.toArray=Dt,Vr.toObject=kt,Vr.toDate=pt,Vr.toISOString=_t,Vr.inspect=it,Vr.toJSON=Tt,Vr.toString=dt,Vr.unix=ft,Vr.valueOf=yt,Vr.creationData=Ht,Vr.year=ur,Vr.isLeapYear=ce,Vr.weekYear=bt,Vr.isoWeekYear=jt,Vr.quarter=Vr.quarters=Et,Vr.month=oe,Vr.daysInMonth=me,Vr.week=Vr.weeks=ve,Vr.isoWeek=Vr.isoWeeks=He,Vr.weeksInYear=Pt,Vr.isoWeeksInYear=xt,Vr.date=Nr,Vr.day=Vr.days=Ee,Vr.weekday=Ae,Vr.isoWeekday=Fe,Vr.dayOfYear=At,Vr.hour=Vr.hours=pr,Vr.minute=Vr.minutes=Cr,Vr.second=Vr.seconds=Ir,Vr.millisecond=Vr.milliseconds=Ur,Vr.utcOffset=Pa,Vr.utc=Wa,Vr.local=Ea,Vr.parseZone=Aa,Vr.hasAlignedHourOffset=Fa,Vr.isDST=za,Vr.isLocal=Ra,Vr.isUtcOffset=Na,Vr.isUtc=Ca,Vr.isUTC=Ca,Vr.zoneAbbr=zt,Vr.zoneName=Jt,Vr.dates=k("dates accessor is deprecated. Use date instead.",Nr),Vr.months=k("months accessor is deprecated. Use month instead",oe),Vr.years=k("years accessor is deprecated. Use year instead",ur),Vr.zone=k("moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/",Oa),Vr.isDSTShifted=k("isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information",Ja);var $r=H.prototype;$r.calendar=S,$r.longDateFormat=b,$r.invalidDate=j,$r.ordinal=x,$r.preparse=Ct,$r.postformat=Ct,$r.relativeTime=P,$r.pastFuture=O,$r.set=w,$r.months=ne,$r.monthsShort=re,$r.monthsParse=_e,$r.monthsRegex=le,$r.monthsShortRegex=ue,$r.week=Te,$r.firstDayOfYear=we,$r.firstDayOfWeek=ge,$r.weekdays=je,$r.weekdaysMin=Pe,$r.weekdaysShort=xe,$r.weekdaysParse=We,$r.weekdaysRegex=ze,$r.weekdaysShortRegex=Je,$r.weekdaysMinRegex=Re,$r.isPM=Ve,$r.meridiem=$e,Be("en",{dayOfMonthOrdinalParse:/\d{1,2}(th|st|nd|rd)/,ordinal:function(e){var a=e%10;return e+(1===f(e%100/10)?"th":1===a?"st":2===a?"nd":3===a?"rd":"th")}}),e.lang=k("moment.lang is deprecated. Use moment.locale instead.",Be),e.langData=k("moment.langData is deprecated. Use moment.localeData instead.",ea);var Kr=Math.abs,Zr=_s("ms"),qr=_s("s"),Br=_s("m"),Qr=_s("h"),Xr=_s("d"),ed=_s("w"),ad=_s("M"),td=_s("y"),sd=os("milliseconds"),nd=os("seconds"),rd=os("minutes"),dd=os("hours"),_d=os("days"),id=os("months"),od=os("years"),md=Math.round,ud={ss:44,s:45,m:45,h:22,d:26,M:11},ld=Math.abs,Md=wa.prototype;Md.isValid=Ta,Md.abs=Bt,Md.add=Xt,Md.subtract=es,Md.as=rs,Md.asMilliseconds=Zr,Md.asSeconds=qr,Md.asMinutes=Br,Md.asHours=Qr,Md.asDays=Xr,Md.asWeeks=ed,Md.asMonths=ad,Md.asYears=td,Md.valueOf=ds,Md._bubble=ts,Md.get=is,Md.milliseconds=sd,Md.seconds=nd,Md.minutes=rd,Md.hours=dd,Md.days=_d,Md.weeks=ms,Md.months=id,Md.years=od,Md.humanize=Ls,Md.toISOString=cs,Md.toString=cs,Md.toJSON=cs,Md.locale=ht,Md.localeData=Lt,Md.toIsoString=k("toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)",cs),Md.lang=Rr,U("X",0,0,"unix"),U("x",0,0,"valueOf"),q("x",Gn),q("X",/[+-]?\d+(\.\d{1,3})?/),ee("X",function(e,a,t){t._d=new Date(1e3*parseFloat(e,10))}),ee("x",function(e,a,t){t._d=new Date(f(e))}),e.version="2.18.1",function(e){Yn=e}(ya),e.fn=Vr,e.min=pa,e.max=Da,e.now=Or,e.utc=m,e.unix=Rt,e.months=Vt,e.isDate=d,e.locale=Be,e.invalid=h,e.duration=Ia,e.isMoment=Y,e.weekdays=Kt,e.parseZone=Nt,e.localeData=ea,e.isDuration=va,e.monthsShort=$t,e.weekdaysMin=qt,e.defineLocale=Qe,e.updateLocale=Xe,e.locales=aa,e.weekdaysShort=Zt,e.normalizeUnits=E,e.relativeTimeRounding=Ms,e.relativeTimeThreshold=hs,e.calendarFormat=Za,e.prototype=Vr,e.defineLocale("af",{months:"Januarie_Februarie_Maart_April_Mei_Junie_Julie_Augustus_September_Oktober_November_Desember".split("_"),monthsShort:"Jan_Feb_Mrt_Apr_Mei_Jun_Jul_Aug_Sep_Okt_Nov_Des".split("_"),weekdays:"Sondag_Maandag_Dinsdag_Woensdag_Donderdag_Vrydag_Saterdag".split("_"),weekdaysShort:"Son_Maa_Din_Woe_Don_Vry_Sat".split("_"),weekdaysMin:"So_Ma_Di_Wo_Do_Vr_Sa".split("_"),meridiemParse:/vm|nm/i,isPM:function(e){return/^nm$/i.test(e)},meridiem:function(e,a,t){return e<12?t?"vm":"VM":t?"nm":"NM"},longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd, D MMMM YYYY HH:mm"},calendar:{sameDay:"[Vandag om] LT",nextDay:"[Môre om] LT",nextWeek:"dddd [om] LT",lastDay:"[Gister om] LT",lastWeek:"[Laas] dddd [om] LT",sameElse:"L"},relativeTime:{future:"oor %s",past:"%s gelede",s:"'n paar sekondes",m:"'n minuut",mm:"%d minute",h:"'n uur",hh:"%d ure",
d:"'n dag",dd:"%d dae",M:"'n maand",MM:"%d maande",y:"'n jaar",yy:"%d jaar"},dayOfMonthOrdinalParse:/\d{1,2}(ste|de)/,ordinal:function(e){return e+(1===e||8===e||e>=20?"ste":"de")},week:{dow:1,doy:4}}),e.defineLocale("ar-dz",{months:"جانفي_فيفري_مارس_أفريل_ماي_جوان_جويلية_أوت_سبتمبر_أكتوبر_نوفمبر_ديسمبر".split("_"),monthsShort:"جانفي_فيفري_مارس_أفريل_ماي_جوان_جويلية_أوت_سبتمبر_أكتوبر_نوفمبر_ديسمبر".split("_"),weekdays:"الأحد_الإثنين_الثلاثاء_الأربعاء_الخميس_الجمعة_السبت".split("_"),weekdaysShort:"احد_اثنين_ثلاثاء_اربعاء_خميس_جمعة_سبت".split("_"),weekdaysMin:"أح_إث_ثلا_أر_خم_جم_سب".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D MMMM YYYY HH:mm"},calendar:{sameDay:"[اليوم على الساعة] LT",nextDay:"[غدا على الساعة] LT",nextWeek:"dddd [على الساعة] LT",lastDay:"[أمس على الساعة] LT",lastWeek:"dddd [على الساعة] LT",sameElse:"L"},relativeTime:{future:"في %s",past:"منذ %s",s:"ثوان",m:"دقيقة",mm:"%d دقائق",h:"ساعة",hh:"%d ساعات",d:"يوم",dd:"%d أيام",M:"شهر",MM:"%d أشهر",y:"سنة",yy:"%d سنوات"},week:{dow:0,doy:4}}),e.defineLocale("ar-kw",{months:"يناير_فبراير_مارس_أبريل_ماي_يونيو_يوليوز_غشت_شتنبر_أكتوبر_نونبر_دجنبر".split("_"),monthsShort:"يناير_فبراير_مارس_أبريل_ماي_يونيو_يوليوز_غشت_شتنبر_أكتوبر_نونبر_دجنبر".split("_"),weekdays:"الأحد_الإتنين_الثلاثاء_الأربعاء_الخميس_الجمعة_السبت".split("_"),weekdaysShort:"احد_اتنين_ثلاثاء_اربعاء_خميس_جمعة_سبت".split("_"),weekdaysMin:"ح_ن_ث_ر_خ_ج_س".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D MMMM YYYY HH:mm"},calendar:{sameDay:"[اليوم على الساعة] LT",nextDay:"[غدا على الساعة] LT",nextWeek:"dddd [على الساعة] LT",lastDay:"[أمس على الساعة] LT",lastWeek:"dddd [على الساعة] LT",sameElse:"L"},relativeTime:{future:"في %s",past:"منذ %s",s:"ثوان",m:"دقيقة",mm:"%d دقائق",h:"ساعة",hh:"%d ساعات",d:"يوم",dd:"%d أيام",M:"شهر",MM:"%d أشهر",y:"سنة",yy:"%d سنوات"},week:{dow:0,doy:12}});var hd={1:"1",2:"2",3:"3",4:"4",5:"5",6:"6",7:"7",8:"8",9:"9",0:"0"},Ld=function(e){return 0===e?0:1===e?1:2===e?2:e%100>=3&&e%100<=10?3:e%100>=11?4:5},cd={s:["أقل من ثانية","ثانية واحدة",["ثانيتان","ثانيتين"],"%d ثوان","%d ثانية","%d ثانية"],m:["أقل من دقيقة","دقيقة واحدة",["دقيقتان","دقيقتين"],"%d دقائق","%d دقيقة","%d دقيقة"],h:["أقل من ساعة","ساعة واحدة",["ساعتان","ساعتين"],"%d ساعات","%d ساعة","%d ساعة"],d:["أقل من يوم","يوم واحد",["يومان","يومين"],"%d أيام","%d يومًا","%d يوم"],M:["أقل من شهر","شهر واحد",["شهران","شهرين"],"%d أشهر","%d شهرا","%d شهر"],y:["أقل من عام","عام واحد",["عامان","عامين"],"%d أعوام","%d عامًا","%d عام"]},Yd=function(e){return function(a,t,s,n){var r=Ld(a),d=cd[e][Ld(a)];return 2===r&&(d=d[t?0:1]),d.replace(/%d/i,a)}},yd=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];e.defineLocale("ar-ly",{months:yd,monthsShort:yd,weekdays:"الأحد_الإثنين_الثلاثاء_الأربعاء_الخميس_الجمعة_السبت".split("_"),weekdaysShort:"أحد_إثنين_ثلاثاء_أربعاء_خميس_جمعة_سبت".split("_"),weekdaysMin:"ح_ن_ث_ر_خ_ج_س".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"D/‏M/‏YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D MMMM YYYY HH:mm"},meridiemParse:/ص|م/,isPM:function(e){return"م"===e},meridiem:function(e,a,t){return e<12?"ص":"م"},calendar:{sameDay:"[اليوم عند الساعة] LT",nextDay:"[غدًا عند الساعة] LT",nextWeek:"dddd [عند الساعة] LT",lastDay:"[أمس عند الساعة] LT",lastWeek:"dddd [عند الساعة] LT",sameElse:"L"},relativeTime:{future:"بعد %s",past:"منذ %s",s:Yd("s"),m:Yd("m"),mm:Yd("m"),h:Yd("h"),hh:Yd("h"),d:Yd("d"),dd:Yd("d"),M:Yd("M"),MM:Yd("M"),y:Yd("y"),yy:Yd("y")},preparse:function(e){return e.replace(/\u200f/g,"").replace(/،/g,",")},postformat:function(e){return e.replace(/\d/g,function(e){return hd[e]}).replace(/,/g,"،")},week:{dow:6,doy:12}}),e.defineLocale("ar-ma",{months:"يناير_فبراير_مارس_أبريل_ماي_يونيو_يوليوز_غشت_شتنبر_أكتوبر_نونبر_دجنبر".split("_"),monthsShort:"يناير_فبراير_مارس_أبريل_ماي_يونيو_يوليوز_غشت_شتنبر_أكتوبر_نونبر_دجنبر".split("_"),weekdays:"الأحد_الإتنين_الثلاثاء_الأربعاء_الخميس_الجمعة_السبت".split("_"),weekdaysShort:"احد_اتنين_ثلاثاء_اربعاء_خميس_جمعة_سبت".split("_"),weekdaysMin:"ح_ن_ث_ر_خ_ج_س".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D MMMM YYYY HH:mm"},calendar:{sameDay:"[اليوم على الساعة] LT",nextDay:"[غدا على الساعة] LT",nextWeek:"dddd [على الساعة] LT",lastDay:"[أمس على الساعة] LT",lastWeek:"dddd [على الساعة] LT",sameElse:"L"},relativeTime:{future:"في %s",past:"منذ %s",s:"ثوان",m:"دقيقة",mm:"%d دقائق",h:"ساعة",hh:"%d ساعات",d:"يوم",dd:"%d أيام",M:"شهر",MM:"%d أشهر",y:"سنة",yy:"%d سنوات"},week:{dow:6,doy:12}});var fd={1:"١",2:"٢",3:"٣",4:"٤",5:"٥",6:"٦",7:"٧",8:"٨",9:"٩",0:"٠"},pd={"١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","٠":"0"};e.defineLocale("ar-sa",{months:"يناير_فبراير_مارس_أبريل_مايو_يونيو_يوليو_أغسطس_سبتمبر_أكتوبر_نوفمبر_ديسمبر".split("_"),monthsShort:"يناير_فبراير_مارس_أبريل_مايو_يونيو_يوليو_أغسطس_سبتمبر_أكتوبر_نوفمبر_ديسمبر".split("_"),weekdays:"الأحد_الإثنين_الثلاثاء_الأربعاء_الخميس_الجمعة_السبت".split("_"),weekdaysShort:"أحد_إثنين_ثلاثاء_أربعاء_خميس_جمعة_سبت".split("_"),weekdaysMin:"ح_ن_ث_ر_خ_ج_س".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D MMMM YYYY HH:mm"},meridiemParse:/ص|م/,isPM:function(e){return"م"===e},meridiem:function(e,a,t){return e<12?"ص":"م"},calendar:{sameDay:"[اليوم على الساعة] LT",nextDay:"[غدا على الساعة] LT",nextWeek:"dddd [على الساعة] LT",lastDay:"[أمس على الساعة] LT",lastWeek:"dddd [على الساعة] LT",sameElse:"L"},relativeTime:{future:"في %s",past:"منذ %s",s:"ثوان",m:"دقيقة",mm:"%d دقائق",h:"ساعة",hh:"%d ساعات",d:"يوم",dd:"%d أيام",M:"شهر",MM:"%d أشهر",y:"سنة",yy:"%d سنوات"},preparse:function(e){return e.replace(/[١٢٣٤٥٦٧٨٩٠]/g,function(e){return pd[e]}).replace(/،/g,",")},postformat:function(e){return e.replace(/\d/g,function(e){return fd[e]}).replace(/,/g,"،")},week:{dow:0,doy:6}}),e.defineLocale("ar-tn",{months:"جانفي_فيفري_مارس_أفريل_ماي_جوان_جويلية_أوت_سبتمبر_أكتوبر_نوفمبر_ديسمبر".split("_"),monthsShort:"جانفي_فيفري_مارس_أفريل_ماي_جوان_جويلية_أوت_سبتمبر_أكتوبر_نوفمبر_ديسمبر".split("_"),weekdays:"الأحد_الإثنين_الثلاثاء_الأربعاء_الخميس_الجمعة_السبت".split("_"),weekdaysShort:"أحد_إثنين_ثلاثاء_أربعاء_خميس_جمعة_سبت".split("_"),weekdaysMin:"ح_ن_ث_ر_خ_ج_س".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D MMMM YYYY HH:mm"},calendar:{sameDay:"[اليوم على الساعة] LT",nextDay:"[غدا على الساعة] LT",nextWeek:"dddd [على الساعة] LT",lastDay:"[أمس على الساعة] LT",lastWeek:"dddd [على الساعة] LT",sameElse:"L"},relativeTime:{future:"في %s",past:"منذ %s",s:"ثوان",m:"دقيقة",mm:"%d دقائق",h:"ساعة",hh:"%d ساعات",d:"يوم",dd:"%d أيام",M:"شهر",MM:"%d أشهر",y:"سنة",yy:"%d سنوات"},week:{dow:1,doy:4}});var Dd={1:"١",2:"٢",3:"٣",4:"٤",5:"٥",6:"٦",7:"٧",8:"٨",9:"٩",0:"٠"},kd={"١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","٠":"0"},Td=function(e){return 0===e?0:1===e?1:2===e?2:e%100>=3&&e%100<=10?3:e%100>=11?4:5},gd={s:["أقل من ثانية","ثانية واحدة",["ثانيتان","ثانيتين"],"%d ثوان","%d ثانية","%d ثانية"],m:["أقل من دقيقة","دقيقة واحدة",["دقيقتان","دقيقتين"],"%d دقائق","%d دقيقة","%d دقيقة"],h:["أقل من ساعة","ساعة واحدة",["ساعتان","ساعتين"],"%d ساعات","%d ساعة","%d ساعة"],d:["أقل من يوم","يوم واحد",["يومان","يومين"],"%d أيام","%d يومًا","%d يوم"],M:["أقل من شهر","شهر واحد",["شهران","شهرين"],"%d أشهر","%d شهرا","%d شهر"],y:["أقل من عام","عام واحد",["عامان","عامين"],"%d أعوام","%d عامًا","%d عام"]},wd=function(e){return function(a,t,s,n){var r=Td(a),d=gd[e][Td(a)];return 2===r&&(d=d[t?0:1]),d.replace(/%d/i,a)}},vd=["كانون الثاني يناير","شباط فبراير","آذار مارس","نيسان أبريل","أيار مايو","حزيران يونيو","تموز يوليو","آب أغسطس","أيلول سبتمبر","تشرين الأول أكتوبر","تشرين الثاني نوفمبر","كانون الأول ديسمبر"];e.defineLocale("ar",{months:vd,monthsShort:vd,weekdays:"الأحد_الإثنين_الثلاثاء_الأربعاء_الخميس_الجمعة_السبت".split("_"),weekdaysShort:"أحد_إثنين_ثلاثاء_أربعاء_خميس_جمعة_سبت".split("_"),weekdaysMin:"ح_ن_ث_ر_خ_ج_س".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"D/‏M/‏YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D MMMM YYYY HH:mm"},meridiemParse:/ص|م/,isPM:function(e){return"م"===e},meridiem:function(e,a,t){return e<12?"ص":"م"},calendar:{sameDay:"[اليوم عند الساعة] LT",nextDay:"[غدًا عند الساعة] LT",nextWeek:"dddd [عند الساعة] LT",lastDay:"[أمس عند الساعة] LT",lastWeek:"dddd [عند الساعة] LT",sameElse:"L"},relativeTime:{future:"بعد %s",past:"منذ %s",s:wd("s"),m:wd("m"),mm:wd("m"),h:wd("h"),hh:wd("h"),d:wd("d"),dd:wd("d"),M:wd("M"),MM:wd("M"),y:wd("y"),yy:wd("y")},preparse:function(e){return e.replace(/\u200f/g,"").replace(/[١٢٣٤٥٦٧٨٩٠]/g,function(e){return kd[e]}).replace(/،/g,",")},postformat:function(e){return e.replace(/\d/g,function(e){return Dd[e]}).replace(/,/g,"،")},week:{dow:6,doy:12}});var Hd={1:"-inci",5:"-inci",8:"-inci",70:"-inci",80:"-inci",2:"-nci",7:"-nci",20:"-nci",50:"-nci",3:"-üncü",4:"-üncü",100:"-üncü",6:"-ncı",9:"-uncu",10:"-uncu",30:"-uncu",60:"-ıncı",90:"-ıncı"};e.defineLocale("az",{months:"yanvar_fevral_mart_aprel_may_iyun_iyul_avqust_sentyabr_oktyabr_noyabr_dekabr".split("_"),monthsShort:"yan_fev_mar_apr_may_iyn_iyl_avq_sen_okt_noy_dek".split("_"),weekdays:"Bazar_Bazar ertəsi_Çərşənbə axşamı_Çərşənbə_Cümə axşamı_Cümə_Şənbə".split("_"),weekdaysShort:"Baz_BzE_ÇAx_Çər_CAx_Cüm_Şən".split("_"),weekdaysMin:"Bz_BE_ÇA_Çə_CA_Cü_Şə".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD.MM.YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd, D MMMM YYYY HH:mm"},calendar:{sameDay:"[bugün saat] LT",nextDay:"[sabah saat] LT",nextWeek:"[gələn həftə] dddd [saat] LT",lastDay:"[dünən] LT",lastWeek:"[keçən həftə] dddd [saat] LT",sameElse:"L"},relativeTime:{future:"%s sonra",past:"%s əvvəl",s:"birneçə saniyyə",m:"bir dəqiqə",mm:"%d dəqiqə",h:"bir saat",hh:"%d saat",d:"bir gün",dd:"%d gün",M:"bir ay",MM:"%d ay",y:"bir il",yy:"%d il"},meridiemParse:/gecə|səhər|gündüz|axşam/,isPM:function(e){return/^(gündüz|axşam)$/.test(e)},meridiem:function(e,a,t){return e<4?"gecə":e<12?"səhər":e<17?"gündüz":"axşam"},dayOfMonthOrdinalParse:/\d{1,2}-(ıncı|inci|nci|üncü|ncı|uncu)/,ordinal:function(e){if(0===e)return e+"-ıncı";var a=e%10,t=e%100-a,s=e>=100?100:null;return e+(Hd[a]||Hd[t]||Hd[s])},week:{dow:1,doy:7}}),e.defineLocale("be",{months:{format:"студзеня_лютага_сакавіка_красавіка_траўня_чэрвеня_ліпеня_жніўня_верасня_кастрычніка_лістапада_снежня".split("_"),standalone:"студзень_люты_сакавік_красавік_травень_чэрвень_ліпень_жнівень_верасень_кастрычнік_лістапад_снежань".split("_")},monthsShort:"студ_лют_сак_крас_трав_чэрв_ліп_жнів_вер_каст_ліст_снеж".split("_"),weekdays:{format:"нядзелю_панядзелак_аўторак_сераду_чацвер_пятніцу_суботу".split("_"),standalone:"нядзеля_панядзелак_аўторак_серада_чацвер_пятніца_субота".split("_"),isFormat:/\[ ?[Вв] ?(?:мінулую|наступную)? ?\] ?dddd/},weekdaysShort:"нд_пн_ат_ср_чц_пт_сб".split("_"),weekdaysMin:"нд_пн_ат_ср_чц_пт_сб".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD.MM.YYYY",LL:"D MMMM YYYY г.",LLL:"D MMMM YYYY г., HH:mm",LLLL:"dddd, D MMMM YYYY г., HH:mm"},calendar:{sameDay:"[Сёння ў] LT",nextDay:"[Заўтра ў] LT",lastDay:"[Учора ў] LT",nextWeek:function(){return"[У] dddd [ў] LT"},lastWeek:function(){switch(this.day()){case 0:case 3:case 5:case 6:return"[У мінулую] dddd [ў] LT";case 1:case 2:case 4:return"[У мінулы] dddd [ў] LT"}},sameElse:"L"},relativeTime:{future:"праз %s",past:"%s таму",s:"некалькі секунд",m:ys,mm:ys,h:ys,hh:ys,d:"дзень",dd:ys,M:"месяц",MM:ys,y:"год",yy:ys},meridiemParse:/ночы|раніцы|дня|вечара/,isPM:function(e){return/^(дня|вечара)$/.test(e)},meridiem:function(e,a,t){return e<4?"ночы":e<12?"раніцы":e<17?"дня":"вечара"},dayOfMonthOrdinalParse:/\d{1,2}-(і|ы|га)/,ordinal:function(e,a){switch(a){case"M":case"d":case"DDD":case"w":case"W":return e%10!=2&&e%10!=3||e%100==12||e%100==13?e+"-ы":e+"-і";case"D":return e+"-га";default:return e}},week:{dow:1,doy:7}}),e.defineLocale("bg",{months:"януари_февруари_март_април_май_юни_юли_август_септември_октомври_ноември_декември".split("_"),monthsShort:"янр_фев_мар_апр_май_юни_юли_авг_сеп_окт_ное_дек".split("_"),weekdays:"неделя_понеделник_вторник_сряда_четвъртък_петък_събота".split("_"),weekdaysShort:"нед_пон_вто_сря_чет_пет_съб".split("_"),weekdaysMin:"нд_пн_вт_ср_чт_пт_сб".split("_"),longDateFormat:{LT:"H:mm",LTS:"H:mm:ss",L:"D.MM.YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY H:mm",LLLL:"dddd, D MMMM YYYY H:mm"},calendar:{sameDay:"[Днес в] LT",nextDay:"[Утре в] LT",nextWeek:"dddd [в] LT",lastDay:"[Вчера в] LT",lastWeek:function(){switch(this.day()){case 0:case 3:case 6:return"[В изминалата] dddd [в] LT";case 1:case 2:case 4:case 5:return"[В изминалия] dddd [в] LT"}},sameElse:"L"},relativeTime:{future:"след %s",past:"преди %s",s:"няколко секунди",m:"минута",mm:"%d минути",h:"час",hh:"%d часа",d:"ден",dd:"%d дни",M:"месец",MM:"%d месеца",y:"година",yy:"%d години"},dayOfMonthOrdinalParse:/\d{1,2}-(ев|ен|ти|ви|ри|ми)/,ordinal:function(e){var a=e%10,t=e%100;return 0===e?e+"-ев":0===t?e+"-ен":t>10&&t<20?e+"-ти":1===a?e+"-ви":2===a?e+"-ри":7===a||8===a?e+"-ми":e+"-ти"},week:{dow:1,doy:7}});var Sd={1:"১",2:"২",3:"৩",4:"৪",5:"৫",6:"৬",7:"৭",8:"৮",9:"৯",0:"০"},bd={"১":"1","২":"2","৩":"3","৪":"4","৫":"5","৬":"6","৭":"7","৮":"8","৯":"9","০":"0"};e.defineLocale("bn",{months:"জানুয়ারী_ফেব্রুয়ারি_মার্চ_এপ্রিল_মে_জুন_জুলাই_আগস্ট_সেপ্টেম্বর_অক্টোবর_নভেম্বর_ডিসেম্বর".split("_"),monthsShort:"জানু_ফেব_মার্চ_এপ্র_মে_জুন_জুল_আগ_সেপ্ট_অক্টো_নভে_ডিসে".split("_"),weekdays:"রবিবার_সোমবার_মঙ্গলবার_বুধবার_বৃহস্পতিবার_শুক্রবার_শনিবার".split("_"),weekdaysShort:"রবি_সোম_মঙ্গল_বুধ_বৃহস্পতি_শুক্র_শনি".split("_"),weekdaysMin:"রবি_সোম_মঙ্গ_বুধ_বৃহঃ_শুক্র_শনি".split("_"),longDateFormat:{LT:"A h:mm সময়",LTS:"A h:mm:ss সময়",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY, A h:mm সময়",LLLL:"dddd, D MMMM YYYY, A h:mm সময়"},calendar:{sameDay:"[আজ] LT",nextDay:"[আগামীকাল] LT",nextWeek:"dddd, LT",lastDay:"[গতকাল] LT",lastWeek:"[গত] dddd, LT",sameElse:"L"},relativeTime:{future:"%s পরে",past:"%s আগে",s:"কয়েক সেকেন্ড",m:"এক মিনিট",mm:"%d মিনিট",h:"এক ঘন্টা",hh:"%d ঘন্টা",d:"এক দিন",dd:"%d দিন",M:"এক মাস",MM:"%d মাস",y:"এক বছর",yy:"%d বছর"},preparse:function(e){return e.replace(/[১২৩৪৫৬৭৮৯০]/g,function(e){return bd[e]})},postformat:function(e){return e.replace(/\d/g,function(e){return Sd[e]})},meridiemParse:/রাত|সকাল|দুপুর|বিকাল|রাত/,meridiemHour:function(e,a){return 12===e&&(e=0),"রাত"===a&&e>=4||"দুপুর"===a&&e<5||"বিকাল"===a?e+12:e},meridiem:function(e,a,t){return e<4?"রাত":e<10?"সকাল":e<17?"দুপুর":e<20?"বিকাল":"রাত"},week:{dow:0,doy:6}});var jd={1:"༡",2:"༢",3:"༣",4:"༤",5:"༥",6:"༦",7:"༧",8:"༨",9:"༩",0:"༠"},xd={"༡":"1","༢":"2","༣":"3","༤":"4","༥":"5","༦":"6","༧":"7","༨":"8","༩":"9","༠":"0"};e.defineLocale("bo",{months:"ཟླ་བ་དང་པོ_ཟླ་བ་གཉིས་པ_ཟླ་བ་གསུམ་པ_ཟླ་བ་བཞི་པ_ཟླ་བ་ལྔ་པ_ཟླ་བ་དྲུག་པ_ཟླ་བ་བདུན་པ_ཟླ་བ་བརྒྱད་པ_ཟླ་བ་དགུ་པ_ཟླ་བ་བཅུ་པ_ཟླ་བ་བཅུ་གཅིག་པ_ཟླ་བ་བཅུ་གཉིས་པ".split("_"),monthsShort:"ཟླ་བ་དང་པོ_ཟླ་བ་གཉིས་པ_ཟླ་བ་གསུམ་པ_ཟླ་བ་བཞི་པ_ཟླ་བ་ལྔ་པ_ཟླ་བ་དྲུག་པ_ཟླ་བ་བདུན་པ_ཟླ་བ་བརྒྱད་པ_ཟླ་བ་དགུ་པ_ཟླ་བ་བཅུ་པ_ཟླ་བ་བཅུ་གཅིག་པ_ཟླ་བ་བཅུ་གཉིས་པ".split("_"),weekdays:"གཟའ་ཉི་མ་_གཟའ་ཟླ་བ་_གཟའ་མིག་དམར་_གཟའ་ལྷག་པ་_གཟའ་ཕུར་བུ_གཟའ་པ་སངས་_གཟའ་སྤེན་པ་".split("_"),weekdaysShort:"ཉི་མ་_ཟླ་བ་_མིག་དམར་_ལྷག་པ་_ཕུར་བུ_པ་སངས་_སྤེན་པ་".split("_"),weekdaysMin:"ཉི་མ་_ཟླ་བ་_མིག་དམར་_ལྷག་པ་_ཕུར་བུ_པ་སངས་_སྤེན་པ་".split("_"),longDateFormat:{LT:"A h:mm",LTS:"A h:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY, A h:mm",LLLL:"dddd, D MMMM YYYY, A h:mm"},calendar:{sameDay:"[དི་རིང] LT",nextDay:"[སང་ཉིན] LT",nextWeek:"[བདུན་ཕྲག་རྗེས་མ], LT",lastDay:"[ཁ་སང] LT",lastWeek:"[བདུན་ཕྲག་མཐའ་མ] dddd, LT",sameElse:"L"},relativeTime:{future:"%s ལ་",past:"%s སྔན་ལ",s:"ལམ་སང",m:"སྐར་མ་གཅིག",mm:"%d སྐར་མ",h:"ཆུ་ཚོད་གཅིག",hh:"%d ཆུ་ཚོད",d:"ཉིན་གཅིག",dd:"%d ཉིན་",M:"ཟླ་བ་གཅིག",MM:"%d ཟླ་བ",y:"ལོ་གཅིག",yy:"%d ལོ"},preparse:function(e){return e.replace(/[༡༢༣༤༥༦༧༨༩༠]/g,function(e){return xd[e]})},postformat:function(e){return e.replace(/\d/g,function(e){return jd[e]})},meridiemParse:/མཚན་མོ|ཞོགས་ཀས|ཉིན་གུང|དགོང་དག|མཚན་མོ/,meridiemHour:function(e,a){return 12===e&&(e=0),"མཚན་མོ"===a&&e>=4||"ཉིན་གུང"===a&&e<5||"དགོང་དག"===a?e+12:e},meridiem:function(e,a,t){return e<4?"མཚན་མོ":e<10?"ཞོགས་ཀས":e<17?"ཉིན་གུང":e<20?"དགོང་དག":"མཚན་མོ"},week:{dow:0,doy:6}}),e.defineLocale("br",{months:"Genver_C'hwevrer_Meurzh_Ebrel_Mae_Mezheven_Gouere_Eost_Gwengolo_Here_Du_Kerzu".split("_"),monthsShort:"Gen_C'hwe_Meu_Ebr_Mae_Eve_Gou_Eos_Gwe_Her_Du_Ker".split("_"),weekdays:"Sul_Lun_Meurzh_Merc'her_Yaou_Gwener_Sadorn".split("_"),weekdaysShort:"Sul_Lun_Meu_Mer_Yao_Gwe_Sad".split("_"),weekdaysMin:"Su_Lu_Me_Mer_Ya_Gw_Sa".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"h[e]mm A",LTS:"h[e]mm:ss A",L:"DD/MM/YYYY",LL:"D [a viz] MMMM YYYY",LLL:"D [a viz] MMMM YYYY h[e]mm A",LLLL:"dddd, D [a viz] MMMM YYYY h[e]mm A"},calendar:{sameDay:"[Hiziv da] LT",nextDay:"[Warc'hoazh da] LT",nextWeek:"dddd [da] LT",lastDay:"[Dec'h da] LT",lastWeek:"dddd [paset da] LT",sameElse:"L"},relativeTime:{future:"a-benn %s",past:"%s 'zo",s:"un nebeud segondennoù",m:"ur vunutenn",mm:fs,h:"un eur",hh:"%d eur",d:"un devezh",dd:fs,M:"ur miz",MM:fs,y:"ur bloaz",yy:ps},dayOfMonthOrdinalParse:/\d{1,2}(añ|vet)/,ordinal:function(e){return e+(1===e?"añ":"vet")},week:{dow:1,doy:4}}),e.defineLocale("bs",{months:"januar_februar_mart_april_maj_juni_juli_august_septembar_oktobar_novembar_decembar".split("_"),monthsShort:"jan._feb._mar._apr._maj._jun._jul._aug._sep._okt._nov._dec.".split("_"),monthsParseExact:!0,weekdays:"nedjelja_ponedjeljak_utorak_srijeda_četvrtak_petak_subota".split("_"),weekdaysShort:"ned._pon._uto._sri._čet._pet._sub.".split("_"),weekdaysMin:"ne_po_ut_sr_če_pe_su".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"H:mm",LTS:"H:mm:ss",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY H:mm",LLLL:"dddd, D. MMMM YYYY H:mm"},calendar:{sameDay:"[danas u] LT",nextDay:"[sutra u] LT",nextWeek:function(){switch(this.day()){case 0:return"[u] [nedjelju] [u] LT";case 3:return"[u] [srijedu] [u] LT";case 6:return"[u] [subotu] [u] LT";case 1:case 2:case 4:case 5:return"[u] dddd [u] LT"}},lastDay:"[jučer u] LT",lastWeek:function(){switch(this.day()){case 0:case 3:return"[prošlu] dddd [u] LT";case 6:return"[prošle] [subote] [u] LT";case 1:case 2:case 4:case 5:return"[prošli] dddd [u] LT"}},sameElse:"L"},relativeTime:{future:"za %s",past:"prije %s",s:"par sekundi",m:gs,mm:gs,h:gs,hh:gs,d:"dan",dd:gs,M:"mjesec",MM:gs,y:"godinu",yy:gs},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:7}}),e.defineLocale("ca",{months:{standalone:"gener_febrer_març_abril_maig_juny_juliol_agost_setembre_octubre_novembre_desembre".split("_"),format:"de gener_de febrer_de març_d'abril_de maig_de juny_de juliol_d'agost_de setembre_d'octubre_de novembre_de desembre".split("_"),isFormat:/D[oD]?(\s)+MMMM/},monthsShort:"gen._febr._març_abr._maig_juny_jul._ag._set._oct._nov._des.".split("_"),monthsParseExact:!0,weekdays:"diumenge_dilluns_dimarts_dimecres_dijous_divendres_dissabte".split("_"),weekdaysShort:"dg._dl._dt._dc._dj._dv._ds.".split("_"),weekdaysMin:"Dg_Dl_Dt_Dc_Dj_Dv_Ds".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"H:mm",LTS:"H:mm:ss",L:"DD/MM/YYYY",LL:"[el] D MMMM [de] YYYY",ll:"D MMM YYYY",LLL:"[el] D MMMM [de] YYYY [a les] H:mm",lll:"D MMM YYYY, H:mm",LLLL:"[el] dddd D MMMM [de] YYYY [a les] H:mm",llll:"ddd D MMM YYYY, H:mm"},calendar:{sameDay:function(){return"[avui a "+(1!==this.hours()?"les":"la")+"] LT"},nextDay:function(){return"[demà a "+(1!==this.hours()?"les":"la")+"] LT"},nextWeek:function(){return"dddd [a "+(1!==this.hours()?"les":"la")+"] LT"},lastDay:function(){return"[ahir a "+(1!==this.hours()?"les":"la")+"] LT"},lastWeek:function(){return"[el] dddd [passat a "+(1!==this.hours()?"les":"la")+"] LT"},sameElse:"L"},relativeTime:{future:"d'aquí %s",past:"fa %s",s:"uns segons",m:"un minut",mm:"%d minuts",h:"una hora",hh:"%d hores",d:"un dia",dd:"%d dies",M:"un mes",MM:"%d mesos",y:"un any",yy:"%d anys"},dayOfMonthOrdinalParse:/\d{1,2}(r|n|t|è|a)/,ordinal:function(e,a){var t=1===e?"r":2===e?"n":3===e?"r":4===e?"t":"è";return"w"!==a&&"W"!==a||(t="a"),e+t},week:{dow:1,doy:4}});var Pd="leden_únor_březen_duben_květen_červen_červenec_srpen_září_říjen_listopad_prosinec".split("_"),Od="led_úno_bře_dub_kvě_čvn_čvc_srp_zář_říj_lis_pro".split("_");e.defineLocale("cs",{months:Pd,monthsShort:Od,monthsParse:function(e,a){var t,s=[];for(t=0;t<12;t++)s[t]=new RegExp("^"+e[t]+"$|^"+a[t]+"$","i");return s}(Pd,Od),shortMonthsParse:function(e){var a,t=[];for(a=0;a<12;a++)t[a]=new RegExp("^"+e[a]+"$","i");return t}(Od),longMonthsParse:function(e){var a,t=[];for(a=0;a<12;a++)t[a]=new RegExp("^"+e[a]+"$","i");return t}(Pd),weekdays:"neděle_pondělí_úterý_středa_čtvrtek_pátek_sobota".split("_"),weekdaysShort:"ne_po_út_st_čt_pá_so".split("_"),weekdaysMin:"ne_po_út_st_čt_pá_so".split("_"),longDateFormat:{LT:"H:mm",LTS:"H:mm:ss",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY H:mm",LLLL:"dddd D. MMMM YYYY H:mm",l:"D. M. YYYY"},calendar:{sameDay:"[dnes v] LT",nextDay:"[zítra v] LT",nextWeek:function(){switch(this.day()){case 0:return"[v neděli v] LT";case 1:case 2:return"[v] dddd [v] LT";case 3:return"[ve středu v] LT";case 4:return"[ve čtvrtek v] LT";case 5:return"[v pátek v] LT";case 6:return"[v sobotu v] LT"}},lastDay:"[včera v] LT",lastWeek:function(){switch(this.day()){case 0:return"[minulou neděli v] LT";case 1:case 2:return"[minulé] dddd [v] LT";case 3:return"[minulou středu v] LT";case 4:case 5:return"[minulý] dddd [v] LT";case 6:return"[minulou sobotu v] LT"}},sameElse:"L"},relativeTime:{future:"za %s",past:"před %s",s:vs,m:vs,mm:vs,h:vs,hh:vs,d:vs,dd:vs,M:vs,MM:vs,y:vs,yy:vs},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}}),e.defineLocale("cv",{months:"кӑрлач_нарӑс_пуш_ака_май_ҫӗртме_утӑ_ҫурла_авӑн_юпа_чӳк_раштав".split("_"),monthsShort:"кӑр_нар_пуш_ака_май_ҫӗр_утӑ_ҫур_авн_юпа_чӳк_раш".split("_"),weekdays:"вырсарникун_тунтикун_ытларикун_юнкун_кӗҫнерникун_эрнекун_шӑматкун".split("_"),weekdaysShort:"выр_тун_ытл_юн_кӗҫ_эрн_шӑм".split("_"),weekdaysMin:"вр_тн_ыт_юн_кҫ_эр_шм".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD-MM-YYYY",LL:"YYYY [ҫулхи] MMMM [уйӑхӗн] D[-мӗшӗ]",LLL:"YYYY [ҫулхи] MMMM [уйӑхӗн] D[-мӗшӗ], HH:mm",LLLL:"dddd, YYYY [ҫулхи] MMMM [уйӑхӗн] D[-мӗшӗ], HH:mm"},calendar:{sameDay:"[Паян] LT [сехетре]",nextDay:"[Ыран] LT [сехетре]",lastDay:"[Ӗнер] LT [сехетре]",nextWeek:"[Ҫитес] dddd LT [сехетре]",lastWeek:"[Иртнӗ] dddd LT [сехетре]",sameElse:"L"},relativeTime:{future:function(e){return e+(/сехет$/i.exec(e)?"рен":/ҫул$/i.exec(e)?"тан":"ран")},past:"%s каялла",s:"пӗр-ик ҫеккунт",m:"пӗр минут",mm:"%d минут",h:"пӗр сехет",hh:"%d сехет",d:"пӗр кун",dd:"%d кун",M:"пӗр уйӑх",MM:"%d уйӑх",y:"пӗр ҫул",yy:"%d ҫул"},dayOfMonthOrdinalParse:/\d{1,2}-мӗш/,ordinal:"%d-мӗш",week:{dow:1,doy:7}}),e.defineLocale("cy",{months:"Ionawr_Chwefror_Mawrth_Ebrill_Mai_Mehefin_Gorffennaf_Awst_Medi_Hydref_Tachwedd_Rhagfyr".split("_"),monthsShort:"Ion_Chwe_Maw_Ebr_Mai_Meh_Gor_Aws_Med_Hyd_Tach_Rhag".split("_"),weekdays:"Dydd Sul_Dydd Llun_Dydd Mawrth_Dydd Mercher_Dydd Iau_Dydd Gwener_Dydd Sadwrn".split("_"),weekdaysShort:"Sul_Llun_Maw_Mer_Iau_Gwe_Sad".split("_"),weekdaysMin:"Su_Ll_Ma_Me_Ia_Gw_Sa".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd, D MMMM YYYY HH:mm"},calendar:{sameDay:"[Heddiw am] LT",nextDay:"[Yfory am] LT",nextWeek:"dddd [am] LT",lastDay:"[Ddoe am] LT",lastWeek:"dddd [diwethaf am] LT",sameElse:"L"},relativeTime:{future:"mewn %s",past:"%s yn ôl",s:"ychydig eiliadau",m:"munud",mm:"%d munud",h:"awr",hh:"%d awr",d:"diwrnod",dd:"%d diwrnod",M:"mis",MM:"%d mis",y:"blwyddyn",yy:"%d flynedd"},dayOfMonthOrdinalParse:/\d{1,2}(fed|ain|af|il|ydd|ed|eg)/,ordinal:function(e){var a=e,t="",s=["","af","il","ydd","ydd","ed","ed","ed","fed","fed","fed","eg","fed","eg","eg","fed","eg","eg","fed","eg","fed"];return a>20?t=40===a||50===a||60===a||80===a||100===a?"fed":"ain":a>0&&(t=s[a]),e+t},week:{dow:1,doy:4}}),e.defineLocale("da",{months:"januar_februar_marts_april_maj_juni_juli_august_september_oktober_november_december".split("_"),monthsShort:"jan_feb_mar_apr_maj_jun_jul_aug_sep_okt_nov_dec".split("_"),weekdays:"søndag_mandag_tirsdag_onsdag_torsdag_fredag_lørdag".split("_"),weekdaysShort:"søn_man_tir_ons_tor_fre_lør".split("_"),weekdaysMin:"sø_ma_ti_on_to_fr_lø".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY HH:mm",LLLL:"dddd [d.] D. MMMM YYYY [kl.] HH:mm"},calendar:{sameDay:"[i dag kl.] LT",nextDay:"[i morgen kl.] LT",nextWeek:"på dddd [kl.] LT",lastDay:"[i går kl.] LT",lastWeek:"[i] dddd[s kl.] LT",sameElse:"L"},relativeTime:{future:"om %s",past:"%s siden",s:"få sekunder",m:"et minut",mm:"%d minutter",h:"en time",hh:"%d timer",d:"en dag",dd:"%d dage",M:"en måned",MM:"%d måneder",y:"et år",yy:"%d år"},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}}),e.defineLocale("de-at",{months:"Jänner_Februar_März_April_Mai_Juni_Juli_August_September_Oktober_November_Dezember".split("_"),monthsShort:"Jän._Febr._Mrz._Apr._Mai_Jun._Jul._Aug._Sept._Okt._Nov._Dez.".split("_"),monthsParseExact:!0,weekdays:"Sonntag_Montag_Dienstag_Mittwoch_Donnerstag_Freitag_Samstag".split("_"),weekdaysShort:"So._Mo._Di._Mi._Do._Fr._Sa.".split("_"),weekdaysMin:"So_Mo_Di_Mi_Do_Fr_Sa".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY HH:mm",LLLL:"dddd, D. MMMM YYYY HH:mm"},calendar:{sameDay:"[heute um] LT [Uhr]",sameElse:"L",nextDay:"[morgen um] LT [Uhr]",nextWeek:"dddd [um] LT [Uhr]",lastDay:"[gestern um] LT [Uhr]",lastWeek:"[letzten] dddd [um] LT [Uhr]"},relativeTime:{future:"in %s",past:"vor %s",s:"ein paar Sekunden",m:Hs,mm:"%d Minuten",h:Hs,hh:"%d Stunden",d:Hs,dd:Hs,M:Hs,MM:Hs,y:Hs,yy:Hs},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}}),e.defineLocale("de-ch",{months:"Januar_Februar_März_April_Mai_Juni_Juli_August_September_Oktober_November_Dezember".split("_"),monthsShort:"Jan._Febr._März_April_Mai_Juni_Juli_Aug._Sept._Okt._Nov._Dez.".split("_"),monthsParseExact:!0,weekdays:"Sonntag_Montag_Dienstag_Mittwoch_Donnerstag_Freitag_Samstag".split("_"),weekdaysShort:"So_Mo_Di_Mi_Do_Fr_Sa".split("_"),weekdaysMin:"So_Mo_Di_Mi_Do_Fr_Sa".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH.mm",LTS:"HH.mm.ss",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY HH.mm",LLLL:"dddd, D. MMMM YYYY HH.mm"},calendar:{sameDay:"[heute um] LT [Uhr]",sameElse:"L",nextDay:"[morgen um] LT [Uhr]",nextWeek:"dddd [um] LT [Uhr]",lastDay:"[gestern um] LT [Uhr]",lastWeek:"[letzten] dddd [um] LT [Uhr]"},relativeTime:{future:"in %s",past:"vor %s",s:"ein paar Sekunden",m:Ss,mm:"%d Minuten",h:Ss,hh:"%d Stunden",d:Ss,dd:Ss,M:Ss,MM:Ss,y:Ss,yy:Ss},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}}),e.defineLocale("de",{months:"Januar_Februar_März_April_Mai_Juni_Juli_August_September_Oktober_November_Dezember".split("_"),monthsShort:"Jan._Febr._Mrz._Apr._Mai_Jun._Jul._Aug._Sept._Okt._Nov._Dez.".split("_"),monthsParseExact:!0,weekdays:"Sonntag_Montag_Dienstag_Mittwoch_Donnerstag_Freitag_Samstag".split("_"),weekdaysShort:"So._Mo._Di._Mi._Do._Fr._Sa.".split("_"),weekdaysMin:"So_Mo_Di_Mi_Do_Fr_Sa".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY HH:mm",LLLL:"dddd, D. MMMM YYYY HH:mm"},calendar:{sameDay:"[heute um] LT [Uhr]",sameElse:"L",nextDay:"[morgen um] LT [Uhr]",nextWeek:"dddd [um] LT [Uhr]",lastDay:"[gestern um] LT [Uhr]",lastWeek:"[letzten] dddd [um] LT [Uhr]"},relativeTime:{future:"in %s",past:"vor %s",s:"ein paar Sekunden",m:bs,mm:"%d Minuten",h:bs,hh:"%d Stunden",d:bs,dd:bs,M:bs,MM:bs,y:bs,yy:bs},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}});var Wd=["ޖެނުއަރީ","ފެބްރުއަރީ","މާރިޗު","އޭޕްރީލު","މޭ","ޖޫން","ޖުލައި","އޯގަސްޓު","ސެޕްޓެމްބަރު","އޮކްޓޯބަރު","ނޮވެމްބަރު","ޑިސެމްބަރު"],Ed=["އާދިއްތަ","ހޯމަ","އަންގާރަ","ބުދަ","ބުރާސްފަތި","ހުކުރު","ހޮނިހިރު"];e.defineLocale("dv",{months:Wd,monthsShort:Wd,weekdays:Ed,weekdaysShort:Ed,weekdaysMin:"އާދި_ހޯމަ_އަން_ބުދަ_ބުރާ_ހުކު_ހޮނި".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"D/M/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D MMMM YYYY HH:mm"},meridiemParse:/މކ|މފ/,isPM:function(e){return"މފ"===e},meridiem:function(e,a,t){return e<12?"މކ":"މފ"},calendar:{sameDay:"[މިއަދު] LT",nextDay:"[މާދަމާ] LT",nextWeek:"dddd LT",lastDay:"[އިއްޔެ] LT",lastWeek:"[ފާއިތުވި] dddd LT",sameElse:"L"},relativeTime:{future:"ތެރޭގައި %s",past:"ކުރިން %s",s:"ސިކުންތުކޮޅެއް",m:"މިނިޓެއް",mm:"މިނިޓު %d",h:"ގަޑިއިރެއް",hh:"ގަޑިއިރު %d",d:"ދުވަހެއް",dd:"ދުވަސް %d",M:"މަހެއް",MM:"މަސް %d",y:"އަހަރެއް",yy:"އަހަރު %d"},preparse:function(e){return e.replace(/،/g,",")},postformat:function(e){return e.replace(/,/g,"،")},week:{dow:7,doy:12}}),e.defineLocale("el",{monthsNominativeEl:"Ιανουάριος_Φεβρουάριος_Μάρτιος_Απρίλιος_Μάιος_Ιούνιος_Ιούλιος_Αύγουστος_Σεπτέμβριος_Οκτώβριος_Νοέμβριος_Δεκέμβριος".split("_"),monthsGenitiveEl:"Ιανουαρίου_Φεβρουαρίου_Μαρτίου_Απριλίου_Μαΐου_Ιουνίου_Ιουλίου_Αυγούστου_Σεπτεμβρίου_Οκτωβρίου_Νοεμβρίου_Δεκεμβρίου".split("_"),months:function(e,a){return e?/D/.test(a.substring(0,a.indexOf("MMMM")))?this._monthsGenitiveEl[e.month()]:this._monthsNominativeEl[e.month()]:this._monthsNominativeEl},monthsShort:"Ιαν_Φεβ_Μαρ_Απρ_Μαϊ_Ιουν_Ιουλ_Αυγ_Σεπ_Οκτ_Νοε_Δεκ".split("_"),weekdays:"Κυριακή_Δευτέρα_Τρίτη_Τετάρτη_Πέμπτη_Παρασκευή_Σάββατο".split("_"),weekdaysShort:"Κυρ_Δευ_Τρι_Τετ_Πεμ_Παρ_Σαβ".split("_"),weekdaysMin:"Κυ_Δε_Τρ_Τε_Πε_Πα_Σα".split("_"),meridiem:function(e,a,t){return e>11?t?"μμ":"ΜΜ":t?"πμ":"ΠΜ"},isPM:function(e){return"μ"===(e+"").toLowerCase()[0]},meridiemParse:/[ΠΜ]\.?Μ?\.?/i,longDateFormat:{LT:"h:mm A",LTS:"h:mm:ss A",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY h:mm A",LLLL:"dddd, D MMMM YYYY h:mm A"},calendarEl:{sameDay:"[Σήμερα {}] LT",nextDay:"[Αύριο {}] LT",nextWeek:"dddd [{}] LT",lastDay:"[Χθες {}] LT",lastWeek:function(){switch(this.day()){case 6:return"[το προηγούμενο] dddd [{}] LT";default:return"[την προηγούμενη] dddd [{}] LT"}},sameElse:"L"},calendar:function(e,a){var t=this._calendarEl[e],s=a&&a.hours();return g(t)&&(t=t.apply(a)),t.replace("{}",s%12==1?"στη":"στις")},relativeTime:{future:"σε %s",past:"%s πριν",s:"λίγα δευτερόλεπτα",m:"ένα λεπτό",mm:"%d λεπτά",h:"μία ώρα",hh:"%d ώρες",d:"μία μέρα",dd:"%d μέρες",M:"ένας μήνας",MM:"%d μήνες",y:"ένας χρόνος",yy:"%d χρόνια"},dayOfMonthOrdinalParse:/\d{1,2}η/,ordinal:"%dη",week:{dow:1,doy:4}}),e.defineLocale("en-au",{months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),monthsShort:"Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),weekdaysShort:"Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),weekdaysMin:"Su_Mo_Tu_We_Th_Fr_Sa".split("_"),longDateFormat:{LT:"h:mm A",LTS:"h:mm:ss A",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY h:mm A",LLLL:"dddd, D MMMM YYYY h:mm A"},calendar:{sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},relativeTime:{future:"in %s",past:"%s ago",s:"a few seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},dayOfMonthOrdinalParse:/\d{1,2}(st|nd|rd|th)/,ordinal:function(e){var a=e%10;return e+(1==~~(e%100/10)?"th":1===a?"st":2===a?"nd":3===a?"rd":"th")},week:{dow:1,doy:4}}),e.defineLocale("en-ca",{
months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),monthsShort:"Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),weekdaysShort:"Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),weekdaysMin:"Su_Mo_Tu_We_Th_Fr_Sa".split("_"),longDateFormat:{LT:"h:mm A",LTS:"h:mm:ss A",L:"YYYY-MM-DD",LL:"MMMM D, YYYY",LLL:"MMMM D, YYYY h:mm A",LLLL:"dddd, MMMM D, YYYY h:mm A"},calendar:{sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},relativeTime:{future:"in %s",past:"%s ago",s:"a few seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},dayOfMonthOrdinalParse:/\d{1,2}(st|nd|rd|th)/,ordinal:function(e){var a=e%10;return e+(1==~~(e%100/10)?"th":1===a?"st":2===a?"nd":3===a?"rd":"th")}}),e.defineLocale("en-gb",{months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),monthsShort:"Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),weekdaysShort:"Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),weekdaysMin:"Su_Mo_Tu_We_Th_Fr_Sa".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd, D MMMM YYYY HH:mm"},calendar:{sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},relativeTime:{future:"in %s",past:"%s ago",s:"a few seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},dayOfMonthOrdinalParse:/\d{1,2}(st|nd|rd|th)/,ordinal:function(e){var a=e%10;return e+(1==~~(e%100/10)?"th":1===a?"st":2===a?"nd":3===a?"rd":"th")},week:{dow:1,doy:4}}),e.defineLocale("en-ie",{months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),monthsShort:"Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),weekdaysShort:"Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),weekdaysMin:"Su_Mo_Tu_We_Th_Fr_Sa".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD-MM-YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D MMMM YYYY HH:mm"},calendar:{sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},relativeTime:{future:"in %s",past:"%s ago",s:"a few seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},dayOfMonthOrdinalParse:/\d{1,2}(st|nd|rd|th)/,ordinal:function(e){var a=e%10;return e+(1==~~(e%100/10)?"th":1===a?"st":2===a?"nd":3===a?"rd":"th")},week:{dow:1,doy:4}}),e.defineLocale("en-nz",{months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),monthsShort:"Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),weekdaysShort:"Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),weekdaysMin:"Su_Mo_Tu_We_Th_Fr_Sa".split("_"),longDateFormat:{LT:"h:mm A",LTS:"h:mm:ss A",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY h:mm A",LLLL:"dddd, D MMMM YYYY h:mm A"},calendar:{sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},relativeTime:{future:"in %s",past:"%s ago",s:"a few seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},dayOfMonthOrdinalParse:/\d{1,2}(st|nd|rd|th)/,ordinal:function(e){var a=e%10;return e+(1==~~(e%100/10)?"th":1===a?"st":2===a?"nd":3===a?"rd":"th")},week:{dow:1,doy:4}}),e.defineLocale("eo",{months:"januaro_februaro_marto_aprilo_majo_junio_julio_aŭgusto_septembro_oktobro_novembro_decembro".split("_"),monthsShort:"jan_feb_mar_apr_maj_jun_jul_aŭg_sep_okt_nov_dec".split("_"),weekdays:"dimanĉo_lundo_mardo_merkredo_ĵaŭdo_vendredo_sabato".split("_"),weekdaysShort:"dim_lun_mard_merk_ĵaŭ_ven_sab".split("_"),weekdaysMin:"di_lu_ma_me_ĵa_ve_sa".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"YYYY-MM-DD",LL:"D[-a de] MMMM, YYYY",LLL:"D[-a de] MMMM, YYYY HH:mm",LLLL:"dddd, [la] D[-a de] MMMM, YYYY HH:mm"},meridiemParse:/[ap]\.t\.m/i,isPM:function(e){return"p"===e.charAt(0).toLowerCase()},meridiem:function(e,a,t){return e>11?t?"p.t.m.":"P.T.M.":t?"a.t.m.":"A.T.M."},calendar:{sameDay:"[Hodiaŭ je] LT",nextDay:"[Morgaŭ je] LT",nextWeek:"dddd [je] LT",lastDay:"[Hieraŭ je] LT",lastWeek:"[pasinta] dddd [je] LT",sameElse:"L"},relativeTime:{future:"post %s",past:"antaŭ %s",s:"sekundoj",m:"minuto",mm:"%d minutoj",h:"horo",hh:"%d horoj",d:"tago",dd:"%d tagoj",M:"monato",MM:"%d monatoj",y:"jaro",yy:"%d jaroj"},dayOfMonthOrdinalParse:/\d{1,2}a/,ordinal:"%da",week:{dow:1,doy:7}});var Ad="ene._feb._mar._abr._may._jun._jul._ago._sep._oct._nov._dic.".split("_"),Fd="ene_feb_mar_abr_may_jun_jul_ago_sep_oct_nov_dic".split("_");e.defineLocale("es-do",{months:"enero_febrero_marzo_abril_mayo_junio_julio_agosto_septiembre_octubre_noviembre_diciembre".split("_"),monthsShort:function(e,a){return e?/-MMM-/.test(a)?Fd[e.month()]:Ad[e.month()]:Ad},monthsParseExact:!0,weekdays:"domingo_lunes_martes_miércoles_jueves_viernes_sábado".split("_"),weekdaysShort:"dom._lun._mar._mié._jue._vie._sáb.".split("_"),weekdaysMin:"do_lu_ma_mi_ju_vi_sá".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"h:mm A",LTS:"h:mm:ss A",L:"DD/MM/YYYY",LL:"D [de] MMMM [de] YYYY",LLL:"D [de] MMMM [de] YYYY h:mm A",LLLL:"dddd, D [de] MMMM [de] YYYY h:mm A"},calendar:{sameDay:function(){return"[hoy a la"+(1!==this.hours()?"s":"")+"] LT"},nextDay:function(){return"[mañana a la"+(1!==this.hours()?"s":"")+"] LT"},nextWeek:function(){return"dddd [a la"+(1!==this.hours()?"s":"")+"] LT"},lastDay:function(){return"[ayer a la"+(1!==this.hours()?"s":"")+"] LT"},lastWeek:function(){return"[el] dddd [pasado a la"+(1!==this.hours()?"s":"")+"] LT"},sameElse:"L"},relativeTime:{future:"en %s",past:"hace %s",s:"unos segundos",m:"un minuto",mm:"%d minutos",h:"una hora",hh:"%d horas",d:"un día",dd:"%d días",M:"un mes",MM:"%d meses",y:"un año",yy:"%d años"},dayOfMonthOrdinalParse:/\d{1,2}º/,ordinal:"%dº",week:{dow:1,doy:4}});var zd="ene._feb._mar._abr._may._jun._jul._ago._sep._oct._nov._dic.".split("_"),Jd="ene_feb_mar_abr_may_jun_jul_ago_sep_oct_nov_dic".split("_");e.defineLocale("es",{months:"enero_febrero_marzo_abril_mayo_junio_julio_agosto_septiembre_octubre_noviembre_diciembre".split("_"),monthsShort:function(e,a){return e?/-MMM-/.test(a)?Jd[e.month()]:zd[e.month()]:zd},monthsParseExact:!0,weekdays:"domingo_lunes_martes_miércoles_jueves_viernes_sábado".split("_"),weekdaysShort:"dom._lun._mar._mié._jue._vie._sáb.".split("_"),weekdaysMin:"do_lu_ma_mi_ju_vi_sá".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"H:mm",LTS:"H:mm:ss",L:"DD/MM/YYYY",LL:"D [de] MMMM [de] YYYY",LLL:"D [de] MMMM [de] YYYY H:mm",LLLL:"dddd, D [de] MMMM [de] YYYY H:mm"},calendar:{sameDay:function(){return"[hoy a la"+(1!==this.hours()?"s":"")+"] LT"},nextDay:function(){return"[mañana a la"+(1!==this.hours()?"s":"")+"] LT"},nextWeek:function(){return"dddd [a la"+(1!==this.hours()?"s":"")+"] LT"},lastDay:function(){return"[ayer a la"+(1!==this.hours()?"s":"")+"] LT"},lastWeek:function(){return"[el] dddd [pasado a la"+(1!==this.hours()?"s":"")+"] LT"},sameElse:"L"},relativeTime:{future:"en %s",past:"hace %s",s:"unos segundos",m:"un minuto",mm:"%d minutos",h:"una hora",hh:"%d horas",d:"un día",dd:"%d días",M:"un mes",MM:"%d meses",y:"un año",yy:"%d años"},dayOfMonthOrdinalParse:/\d{1,2}º/,ordinal:"%dº",week:{dow:1,doy:4}}),e.defineLocale("et",{months:"jaanuar_veebruar_märts_aprill_mai_juuni_juuli_august_september_oktoober_november_detsember".split("_"),monthsShort:"jaan_veebr_märts_apr_mai_juuni_juuli_aug_sept_okt_nov_dets".split("_"),weekdays:"pühapäev_esmaspäev_teisipäev_kolmapäev_neljapäev_reede_laupäev".split("_"),weekdaysShort:"P_E_T_K_N_R_L".split("_"),weekdaysMin:"P_E_T_K_N_R_L".split("_"),longDateFormat:{LT:"H:mm",LTS:"H:mm:ss",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY H:mm",LLLL:"dddd, D. MMMM YYYY H:mm"},calendar:{sameDay:"[Täna,] LT",nextDay:"[Homme,] LT",nextWeek:"[Järgmine] dddd LT",lastDay:"[Eile,] LT",lastWeek:"[Eelmine] dddd LT",sameElse:"L"},relativeTime:{future:"%s pärast",past:"%s tagasi",s:js,m:js,mm:js,h:js,hh:js,d:js,dd:"%d päeva",M:js,MM:js,y:js,yy:js},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}}),e.defineLocale("eu",{months:"urtarrila_otsaila_martxoa_apirila_maiatza_ekaina_uztaila_abuztua_iraila_urria_azaroa_abendua".split("_"),monthsShort:"urt._ots._mar._api._mai._eka._uzt._abu._ira._urr._aza._abe.".split("_"),monthsParseExact:!0,weekdays:"igandea_astelehena_asteartea_asteazkena_osteguna_ostirala_larunbata".split("_"),weekdaysShort:"ig._al._ar._az._og._ol._lr.".split("_"),weekdaysMin:"ig_al_ar_az_og_ol_lr".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"YYYY-MM-DD",LL:"YYYY[ko] MMMM[ren] D[a]",LLL:"YYYY[ko] MMMM[ren] D[a] HH:mm",LLLL:"dddd, YYYY[ko] MMMM[ren] D[a] HH:mm",l:"YYYY-M-D",ll:"YYYY[ko] MMM D[a]",lll:"YYYY[ko] MMM D[a] HH:mm",llll:"ddd, YYYY[ko] MMM D[a] HH:mm"},calendar:{sameDay:"[gaur] LT[etan]",nextDay:"[bihar] LT[etan]",nextWeek:"dddd LT[etan]",lastDay:"[atzo] LT[etan]",lastWeek:"[aurreko] dddd LT[etan]",sameElse:"L"},relativeTime:{future:"%s barru",past:"duela %s",s:"segundo batzuk",m:"minutu bat",mm:"%d minutu",h:"ordu bat",hh:"%d ordu",d:"egun bat",dd:"%d egun",M:"hilabete bat",MM:"%d hilabete",y:"urte bat",yy:"%d urte"},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:7}});var Rd={1:"۱",2:"۲",3:"۳",4:"۴",5:"۵",6:"۶",7:"۷",8:"۸",9:"۹",0:"۰"},Nd={"۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9","۰":"0"};e.defineLocale("fa",{months:"ژانویه_فوریه_مارس_آوریل_مه_ژوئن_ژوئیه_اوت_سپتامبر_اکتبر_نوامبر_دسامبر".split("_"),monthsShort:"ژانویه_فوریه_مارس_آوریل_مه_ژوئن_ژوئیه_اوت_سپتامبر_اکتبر_نوامبر_دسامبر".split("_"),weekdays:"یک‌شنبه_دوشنبه_سه‌شنبه_چهارشنبه_پنج‌شنبه_جمعه_شنبه".split("_"),weekdaysShort:"یک‌شنبه_دوشنبه_سه‌شنبه_چهارشنبه_پنج‌شنبه_جمعه_شنبه".split("_"),weekdaysMin:"ی_د_س_چ_پ_ج_ش".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd, D MMMM YYYY HH:mm"},meridiemParse:/قبل از ظهر|بعد از ظهر/,isPM:function(e){return/بعد از ظهر/.test(e)},meridiem:function(e,a,t){return e<12?"قبل از ظهر":"بعد از ظهر"},calendar:{sameDay:"[امروز ساعت] LT",nextDay:"[فردا ساعت] LT",nextWeek:"dddd [ساعت] LT",lastDay:"[دیروز ساعت] LT",lastWeek:"dddd [پیش] [ساعت] LT",sameElse:"L"},relativeTime:{future:"در %s",past:"%s پیش",s:"چند ثانیه",m:"یک دقیقه",mm:"%d دقیقه",h:"یک ساعت",hh:"%d ساعت",d:"یک روز",dd:"%d روز",M:"یک ماه",MM:"%d ماه",y:"یک سال",yy:"%d سال"},preparse:function(e){return e.replace(/[۰-۹]/g,function(e){return Nd[e]}).replace(/،/g,",")},postformat:function(e){return e.replace(/\d/g,function(e){return Rd[e]}).replace(/,/g,"،")},dayOfMonthOrdinalParse:/\d{1,2}م/,ordinal:"%dم",week:{dow:6,doy:12}});var Cd="nolla yksi kaksi kolme neljä viisi kuusi seitsemän kahdeksan yhdeksän".split(" "),Id=["nolla","yhden","kahden","kolmen","neljän","viiden","kuuden",Cd[7],Cd[8],Cd[9]];e.defineLocale("fi",{months:"tammikuu_helmikuu_maaliskuu_huhtikuu_toukokuu_kesäkuu_heinäkuu_elokuu_syyskuu_lokakuu_marraskuu_joulukuu".split("_"),monthsShort:"tammi_helmi_maalis_huhti_touko_kesä_heinä_elo_syys_loka_marras_joulu".split("_"),weekdays:"sunnuntai_maanantai_tiistai_keskiviikko_torstai_perjantai_lauantai".split("_"),weekdaysShort:"su_ma_ti_ke_to_pe_la".split("_"),weekdaysMin:"su_ma_ti_ke_to_pe_la".split("_"),longDateFormat:{LT:"HH.mm",LTS:"HH.mm.ss",L:"DD.MM.YYYY",LL:"Do MMMM[ta] YYYY",LLL:"Do MMMM[ta] YYYY, [klo] HH.mm",LLLL:"dddd, Do MMMM[ta] YYYY, [klo] HH.mm",l:"D.M.YYYY",ll:"Do MMM YYYY",lll:"Do MMM YYYY, [klo] HH.mm",llll:"ddd, Do MMM YYYY, [klo] HH.mm"},calendar:{sameDay:"[tänään] [klo] LT",nextDay:"[huomenna] [klo] LT",nextWeek:"dddd [klo] LT",lastDay:"[eilen] [klo] LT",lastWeek:"[viime] dddd[na] [klo] LT",sameElse:"L"},relativeTime:{future:"%s päästä",past:"%s sitten",s:xs,m:xs,mm:xs,h:xs,hh:xs,d:xs,dd:xs,M:xs,MM:xs,y:xs,yy:xs},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}}),e.defineLocale("fo",{months:"januar_februar_mars_apríl_mai_juni_juli_august_september_oktober_november_desember".split("_"),monthsShort:"jan_feb_mar_apr_mai_jun_jul_aug_sep_okt_nov_des".split("_"),weekdays:"sunnudagur_mánadagur_týsdagur_mikudagur_hósdagur_fríggjadagur_leygardagur".split("_"),weekdaysShort:"sun_mán_týs_mik_hós_frí_ley".split("_"),weekdaysMin:"su_má_tý_mi_hó_fr_le".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D. MMMM, YYYY HH:mm"},calendar:{sameDay:"[Í dag kl.] LT",nextDay:"[Í morgin kl.] LT",nextWeek:"dddd [kl.] LT",lastDay:"[Í gjár kl.] LT",lastWeek:"[síðstu] dddd [kl] LT",sameElse:"L"},relativeTime:{future:"um %s",past:"%s síðani",s:"fá sekund",m:"ein minutt",mm:"%d minuttir",h:"ein tími",hh:"%d tímar",d:"ein dagur",dd:"%d dagar",M:"ein mánaði",MM:"%d mánaðir",y:"eitt ár",yy:"%d ár"},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}}),e.defineLocale("fr-ca",{months:"janvier_février_mars_avril_mai_juin_juillet_août_septembre_octobre_novembre_décembre".split("_"),monthsShort:"janv._févr._mars_avr._mai_juin_juil._août_sept._oct._nov._déc.".split("_"),monthsParseExact:!0,weekdays:"dimanche_lundi_mardi_mercredi_jeudi_vendredi_samedi".split("_"),weekdaysShort:"dim._lun._mar._mer._jeu._ven._sam.".split("_"),weekdaysMin:"Di_Lu_Ma_Me_Je_Ve_Sa".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"YYYY-MM-DD",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D MMMM YYYY HH:mm"},calendar:{sameDay:"[Aujourd’hui à] LT",nextDay:"[Demain à] LT",nextWeek:"dddd [à] LT",lastDay:"[Hier à] LT",lastWeek:"dddd [dernier à] LT",sameElse:"L"},relativeTime:{future:"dans %s",past:"il y a %s",s:"quelques secondes",m:"une minute",mm:"%d minutes",h:"une heure",hh:"%d heures",d:"un jour",dd:"%d jours",M:"un mois",MM:"%d mois",y:"un an",yy:"%d ans"},dayOfMonthOrdinalParse:/\d{1,2}(er|e)/,ordinal:function(e,a){switch(a){default:case"M":case"Q":case"D":case"DDD":case"d":return e+(1===e?"er":"e");case"w":case"W":return e+(1===e?"re":"e")}}}),e.defineLocale("fr-ch",{months:"janvier_février_mars_avril_mai_juin_juillet_août_septembre_octobre_novembre_décembre".split("_"),monthsShort:"janv._févr._mars_avr._mai_juin_juil._août_sept._oct._nov._déc.".split("_"),monthsParseExact:!0,weekdays:"dimanche_lundi_mardi_mercredi_jeudi_vendredi_samedi".split("_"),weekdaysShort:"dim._lun._mar._mer._jeu._ven._sam.".split("_"),weekdaysMin:"Di_Lu_Ma_Me_Je_Ve_Sa".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD.MM.YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D MMMM YYYY HH:mm"},calendar:{sameDay:"[Aujourd’hui à] LT",nextDay:"[Demain à] LT",nextWeek:"dddd [à] LT",lastDay:"[Hier à] LT",lastWeek:"dddd [dernier à] LT",sameElse:"L"},relativeTime:{future:"dans %s",past:"il y a %s",s:"quelques secondes",m:"une minute",mm:"%d minutes",h:"une heure",hh:"%d heures",d:"un jour",dd:"%d jours",M:"un mois",MM:"%d mois",y:"un an",yy:"%d ans"},dayOfMonthOrdinalParse:/\d{1,2}(er|e)/,ordinal:function(e,a){switch(a){default:case"M":case"Q":case"D":case"DDD":case"d":return e+(1===e?"er":"e");case"w":case"W":return e+(1===e?"re":"e")}},week:{dow:1,doy:4}}),e.defineLocale("fr",{months:"janvier_février_mars_avril_mai_juin_juillet_août_septembre_octobre_novembre_décembre".split("_"),monthsShort:"janv._févr._mars_avr._mai_juin_juil._août_sept._oct._nov._déc.".split("_"),monthsParseExact:!0,weekdays:"dimanche_lundi_mardi_mercredi_jeudi_vendredi_samedi".split("_"),weekdaysShort:"dim._lun._mar._mer._jeu._ven._sam.".split("_"),weekdaysMin:"Di_Lu_Ma_Me_Je_Ve_Sa".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D MMMM YYYY HH:mm"},calendar:{sameDay:"[Aujourd’hui à] LT",nextDay:"[Demain à] LT",nextWeek:"dddd [à] LT",lastDay:"[Hier à] LT",lastWeek:"dddd [dernier à] LT",sameElse:"L"},relativeTime:{future:"dans %s",past:"il y a %s",s:"quelques secondes",m:"une minute",mm:"%d minutes",h:"une heure",hh:"%d heures",d:"un jour",dd:"%d jours",M:"un mois",MM:"%d mois",y:"un an",yy:"%d ans"},dayOfMonthOrdinalParse:/\d{1,2}(er|)/,ordinal:function(e,a){switch(a){case"D":return e+(1===e?"er":"");default:case"M":case"Q":case"DDD":case"d":return e+(1===e?"er":"e");case"w":case"W":return e+(1===e?"re":"e")}},week:{dow:1,doy:4}});var Gd="jan._feb._mrt._apr._mai_jun._jul._aug._sep._okt._nov._des.".split("_"),Ud="jan_feb_mrt_apr_mai_jun_jul_aug_sep_okt_nov_des".split("_");e.defineLocale("fy",{months:"jannewaris_febrewaris_maart_april_maaie_juny_july_augustus_septimber_oktober_novimber_desimber".split("_"),monthsShort:function(e,a){return e?/-MMM-/.test(a)?Ud[e.month()]:Gd[e.month()]:Gd},monthsParseExact:!0,weekdays:"snein_moandei_tiisdei_woansdei_tongersdei_freed_sneon".split("_"),weekdaysShort:"si._mo._ti._wo._to._fr._so.".split("_"),weekdaysMin:"Si_Mo_Ti_Wo_To_Fr_So".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD-MM-YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D MMMM YYYY HH:mm"},calendar:{sameDay:"[hjoed om] LT",nextDay:"[moarn om] LT",nextWeek:"dddd [om] LT",lastDay:"[juster om] LT",lastWeek:"[ôfrûne] dddd [om] LT",sameElse:"L"},relativeTime:{future:"oer %s",past:"%s lyn",s:"in pear sekonden",m:"ien minút",mm:"%d minuten",h:"ien oere",hh:"%d oeren",d:"ien dei",dd:"%d dagen",M:"ien moanne",MM:"%d moannen",y:"ien jier",yy:"%d jierren"},dayOfMonthOrdinalParse:/\d{1,2}(ste|de)/,ordinal:function(e){return e+(1===e||8===e||e>=20?"ste":"de")},week:{dow:1,doy:4}});var Vd=["Am Faoilleach","An Gearran","Am Màrt","An Giblean","An Cèitean","An t-Ògmhios","An t-Iuchar","An Lùnastal","An t-Sultain","An Dàmhair","An t-Samhain","An Dùbhlachd"],$d=["Faoi","Gear","Màrt","Gibl","Cèit","Ògmh","Iuch","Lùn","Sult","Dàmh","Samh","Dùbh"],Kd=["Didòmhnaich","Diluain","Dimàirt","Diciadain","Diardaoin","Dihaoine","Disathairne"],Zd=["Did","Dil","Dim","Dic","Dia","Dih","Dis"],qd=["Dò","Lu","Mà","Ci","Ar","Ha","Sa"];e.defineLocale("gd",{months:Vd,monthsShort:$d,monthsParseExact:!0,weekdays:Kd,weekdaysShort:Zd,weekdaysMin:qd,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd, D MMMM YYYY HH:mm"},calendar:{sameDay:"[An-diugh aig] LT",nextDay:"[A-màireach aig] LT",nextWeek:"dddd [aig] LT",lastDay:"[An-dè aig] LT",lastWeek:"dddd [seo chaidh] [aig] LT",sameElse:"L"},relativeTime:{future:"ann an %s",past:"bho chionn %s",s:"beagan diogan",m:"mionaid",mm:"%d mionaidean",h:"uair",hh:"%d uairean",d:"latha",dd:"%d latha",M:"mìos",MM:"%d mìosan",y:"bliadhna",yy:"%d bliadhna"},dayOfMonthOrdinalParse:/\d{1,2}(d|na|mh)/,ordinal:function(e){return e+(1===e?"d":e%10==2?"na":"mh")},week:{dow:1,doy:4}}),e.defineLocale("gl",{months:"xaneiro_febreiro_marzo_abril_maio_xuño_xullo_agosto_setembro_outubro_novembro_decembro".split("_"),monthsShort:"xan._feb._mar._abr._mai._xuñ._xul._ago._set._out._nov._dec.".split("_"),monthsParseExact:!0,weekdays:"domingo_luns_martes_mércores_xoves_venres_sábado".split("_"),weekdaysShort:"dom._lun._mar._mér._xov._ven._sáb.".split("_"),weekdaysMin:"do_lu_ma_mé_xo_ve_sá".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"H:mm",LTS:"H:mm:ss",L:"DD/MM/YYYY",LL:"D [de] MMMM [de] YYYY",LLL:"D [de] MMMM [de] YYYY H:mm",LLLL:"dddd, D [de] MMMM [de] YYYY H:mm"},calendar:{sameDay:function(){return"[hoxe "+(1!==this.hours()?"ás":"á")+"] LT"},nextDay:function(){return"[mañá "+(1!==this.hours()?"ás":"á")+"] LT"},nextWeek:function(){return"dddd ["+(1!==this.hours()?"ás":"a")+"] LT"},lastDay:function(){return"[onte "+(1!==this.hours()?"á":"a")+"] LT"},lastWeek:function(){return"[o] dddd [pasado "+(1!==this.hours()?"ás":"a")+"] LT"},sameElse:"L"},relativeTime:{future:function(e){return 0===e.indexOf("un")?"n"+e:"en "+e},past:"hai %s",s:"uns segundos",m:"un minuto",mm:"%d minutos",h:"unha hora",hh:"%d horas",d:"un día",dd:"%d días",M:"un mes",MM:"%d meses",y:"un ano",yy:"%d anos"},dayOfMonthOrdinalParse:/\d{1,2}º/,ordinal:"%dº",week:{dow:1,doy:4}}),e.defineLocale("gom-latn",{months:"Janer_Febrer_Mars_Abril_Mai_Jun_Julai_Agost_Setembr_Otubr_Novembr_Dezembr".split("_"),monthsShort:"Jan._Feb._Mars_Abr._Mai_Jun_Jul._Ago._Set._Otu._Nov._Dez.".split("_"),monthsParseExact:!0,weekdays:"Aitar_Somar_Mongllar_Budvar_Brestar_Sukrar_Son'var".split("_"),weekdaysShort:"Ait._Som._Mon._Bud._Bre._Suk._Son.".split("_"),weekdaysMin:"Ai_Sm_Mo_Bu_Br_Su_Sn".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"A h:mm [vazta]",LTS:"A h:mm:ss [vazta]",L:"DD-MM-YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY A h:mm [vazta]",LLLL:"dddd, MMMM[achea] Do, YYYY, A h:mm [vazta]",llll:"ddd, D MMM YYYY, A h:mm [vazta]"},calendar:{sameDay:"[Aiz] LT",nextDay:"[Faleam] LT",nextWeek:"[Ieta to] dddd[,] LT",lastDay:"[Kal] LT",lastWeek:"[Fatlo] dddd[,] LT",sameElse:"L"},relativeTime:{future:"%s",past:"%s adim",s:Os,m:Os,mm:Os,h:Os,hh:Os,d:Os,dd:Os,M:Os,MM:Os,y:Os,yy:Os},dayOfMonthOrdinalParse:/\d{1,2}(er)/,ordinal:function(e,a){switch(a){case"D":return e+"er";default:case"M":case"Q":case"DDD":case"d":case"w":case"W":return e}},week:{dow:1,doy:4},meridiemParse:/rati|sokalli|donparam|sanje/,meridiemHour:function(e,a){return 12===e&&(e=0),"rati"===a?e<4?e:e+12:"sokalli"===a?e:"donparam"===a?e>12?e:e+12:"sanje"===a?e+12:void 0},meridiem:function(e,a,t){return e<4?"rati":e<12?"sokalli":e<16?"donparam":e<20?"sanje":"rati"}}),e.defineLocale("he",{months:"ינואר_פברואר_מרץ_אפריל_מאי_יוני_יולי_אוגוסט_ספטמבר_אוקטובר_נובמבר_דצמבר".split("_"),monthsShort:"ינו׳_פבר׳_מרץ_אפר׳_מאי_יוני_יולי_אוג׳_ספט׳_אוק׳_נוב׳_דצמ׳".split("_"),weekdays:"ראשון_שני_שלישי_רביעי_חמישי_שישי_שבת".split("_"),weekdaysShort:"א׳_ב׳_ג׳_ד׳_ה׳_ו׳_ש׳".split("_"),weekdaysMin:"א_ב_ג_ד_ה_ו_ש".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D [ב]MMMM YYYY",LLL:"D [ב]MMMM YYYY HH:mm",LLLL:"dddd, D [ב]MMMM YYYY HH:mm",l:"D/M/YYYY",ll:"D MMM YYYY",lll:"D MMM YYYY HH:mm",llll:"ddd, D MMM YYYY HH:mm"},calendar:{sameDay:"[היום ב־]LT",nextDay:"[מחר ב־]LT",nextWeek:"dddd [בשעה] LT",lastDay:"[אתמול ב־]LT",lastWeek:"[ביום] dddd [האחרון בשעה] LT",sameElse:"L"},relativeTime:{future:"בעוד %s",past:"לפני %s",s:"מספר שניות",m:"דקה",mm:"%d דקות",h:"שעה",hh:function(e){return 2===e?"שעתיים":e+" שעות"},d:"יום",dd:function(e){return 2===e?"יומיים":e+" ימים"},M:"חודש",MM:function(e){return 2===e?"חודשיים":e+" חודשים"},y:"שנה",yy:function(e){return 2===e?"שנתיים":e%10==0&&10!==e?e+" שנה":e+" שנים"}},meridiemParse:/אחה"צ|לפנה"צ|אחרי הצהריים|לפני הצהריים|לפנות בוקר|בבוקר|בערב/i,isPM:function(e){return/^(אחה"צ|אחרי הצהריים|בערב)$/.test(e)},meridiem:function(e,a,t){return e<5?"לפנות בוקר":e<10?"בבוקר":e<12?t?'לפנה"צ':"לפני הצהריים":e<18?t?'אחה"צ':"אחרי הצהריים":"בערב"}});var Bd={1:"१",2:"२",3:"३",4:"४",5:"५",6:"६",7:"७",8:"८",9:"९",0:"०"},Qd={"१":"1","२":"2","३":"3","४":"4","५":"5","६":"6","७":"7","८":"8","९":"9","०":"0"};e.defineLocale("hi",{months:"जनवरी_फ़रवरी_मार्च_अप्रैल_मई_जून_जुलाई_अगस्त_सितम्बर_अक्टूबर_नवम्बर_दिसम्बर".split("_"),monthsShort:"जन._फ़र._मार्च_अप्रै._मई_जून_जुल._अग._सित._अक्टू._नव._दिस.".split("_"),monthsParseExact:!0,weekdays:"रविवार_सोमवार_मंगलवार_बुधवार_गुरूवार_शुक्रवार_शनिवार".split("_"),weekdaysShort:"रवि_सोम_मंगल_बुध_गुरू_शुक्र_शनि".split("_"),weekdaysMin:"र_सो_मं_बु_गु_शु_श".split("_"),longDateFormat:{LT:"A h:mm बजे",LTS:"A h:mm:ss बजे",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY, A h:mm बजे",LLLL:"dddd, D MMMM YYYY, A h:mm बजे"},calendar:{sameDay:"[आज] LT",nextDay:"[कल] LT",nextWeek:"dddd, LT",lastDay:"[कल] LT",lastWeek:"[पिछले] dddd, LT",sameElse:"L"},relativeTime:{future:"%s में",past:"%s पहले",s:"कुछ ही क्षण",m:"एक मिनट",mm:"%d मिनट",h:"एक घंटा",hh:"%d घंटे",d:"एक दिन",dd:"%d दिन",M:"एक महीने",MM:"%d महीने",y:"एक वर्ष",yy:"%d वर्ष"},preparse:function(e){return e.replace(/[१२३४५६७८९०]/g,function(e){return Qd[e]})},postformat:function(e){return e.replace(/\d/g,function(e){return Bd[e]})},meridiemParse:/रात|सुबह|दोपहर|शाम/,meridiemHour:function(e,a){return 12===e&&(e=0),"रात"===a?e<4?e:e+12:"सुबह"===a?e:"दोपहर"===a?e>=10?e:e+12:"शाम"===a?e+12:void 0},meridiem:function(e,a,t){return e<4?"रात":e<10?"सुबह":e<17?"दोपहर":e<20?"शाम":"रात"},week:{dow:0,doy:6}}),e.defineLocale("hr",{months:{format:"siječnja_veljače_ožujka_travnja_svibnja_lipnja_srpnja_kolovoza_rujna_listopada_studenoga_prosinca".split("_"),standalone:"siječanj_veljača_ožujak_travanj_svibanj_lipanj_srpanj_kolovoz_rujan_listopad_studeni_prosinac".split("_")},monthsShort:"sij._velj._ožu._tra._svi._lip._srp._kol._ruj._lis._stu._pro.".split("_"),monthsParseExact:!0,weekdays:"nedjelja_ponedjeljak_utorak_srijeda_četvrtak_petak_subota".split("_"),weekdaysShort:"ned._pon._uto._sri._čet._pet._sub.".split("_"),weekdaysMin:"ne_po_ut_sr_če_pe_su".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"H:mm",LTS:"H:mm:ss",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY H:mm",LLLL:"dddd, D. MMMM YYYY H:mm"},calendar:{sameDay:"[danas u] LT",nextDay:"[sutra u] LT",nextWeek:function(){switch(this.day()){case 0:return"[u] [nedjelju] [u] LT";case 3:return"[u] [srijedu] [u] LT";case 6:return"[u] [subotu] [u] LT";case 1:case 2:case 4:case 5:return"[u] dddd [u] LT"}},lastDay:"[jučer u] LT",lastWeek:function(){switch(this.day()){case 0:case 3:return"[prošlu] dddd [u] LT";case 6:return"[prošle] [subote] [u] LT";case 1:case 2:case 4:case 5:return"[prošli] dddd [u] LT"}},sameElse:"L"},relativeTime:{future:"za %s",past:"prije %s",s:"par sekundi",m:Ws,mm:Ws,h:Ws,hh:Ws,d:"dan",dd:Ws,M:"mjesec",MM:Ws,y:"godinu",yy:Ws},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:7}});var Xd="vasárnap hétfőn kedden szerdán csütörtökön pénteken szombaton".split(" ");e.defineLocale("hu",{months:"január_február_március_április_május_június_július_augusztus_szeptember_október_november_december".split("_"),monthsShort:"jan_feb_márc_ápr_máj_jún_júl_aug_szept_okt_nov_dec".split("_"),weekdays:"vasárnap_hétfő_kedd_szerda_csütörtök_péntek_szombat".split("_"),weekdaysShort:"vas_hét_kedd_sze_csüt_pén_szo".split("_"),weekdaysMin:"v_h_k_sze_cs_p_szo".split("_"),longDateFormat:{LT:"H:mm",LTS:"H:mm:ss",L:"YYYY.MM.DD.",LL:"YYYY. MMMM D.",LLL:"YYYY. MMMM D. H:mm",LLLL:"YYYY. MMMM D., dddd H:mm"},meridiemParse:/de|du/i,isPM:function(e){return"u"===e.charAt(1).toLowerCase()},meridiem:function(e,a,t){return e<12?!0===t?"de":"DE":!0===t?"du":"DU"},calendar:{sameDay:"[ma] LT[-kor]",nextDay:"[holnap] LT[-kor]",nextWeek:function(){return As.call(this,!0)},lastDay:"[tegnap] LT[-kor]",lastWeek:function(){return As.call(this,!1)},sameElse:"L"},relativeTime:{future:"%s múlva",past:"%s",s:Es,m:Es,mm:Es,h:Es,hh:Es,d:Es,dd:Es,M:Es,MM:Es,y:Es,yy:Es},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}}),e.defineLocale("hy-am",{months:{format:"հունվարի_փետրվարի_մարտի_ապրիլի_մայիսի_հունիսի_հուլիսի_օգոստոսի_սեպտեմբերի_հոկտեմբերի_նոյեմբերի_դեկտեմբերի".split("_"),standalone:"հունվար_փետրվար_մարտ_ապրիլ_մայիս_հունիս_հուլիս_օգոստոս_սեպտեմբեր_հոկտեմբեր_նոյեմբեր_դեկտեմբեր".split("_")},monthsShort:"հնվ_փտր_մրտ_ապր_մյս_հնս_հլս_օգս_սպտ_հկտ_նմբ_դկտ".split("_"),weekdays:"կիրակի_երկուշաբթի_երեքշաբթի_չորեքշաբթի_հինգշաբթի_ուրբաթ_շաբաթ".split("_"),weekdaysShort:"կրկ_երկ_երք_չրք_հնգ_ուրբ_շբթ".split("_"),weekdaysMin:"կրկ_երկ_երք_չրք_հնգ_ուրբ_շբթ".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD.MM.YYYY",LL:"D MMMM YYYY թ.",LLL:"D MMMM YYYY թ., HH:mm",LLLL:"dddd, D MMMM YYYY թ., HH:mm"},calendar:{sameDay:"[այսօր] LT",nextDay:"[վաղը] LT",lastDay:"[երեկ] LT",nextWeek:function(){return"dddd [օրը ժամը] LT"},lastWeek:function(){return"[անցած] dddd [օրը ժամը] LT"},sameElse:"L"},relativeTime:{future:"%s հետո",past:"%s առաջ",s:"մի քանի վայրկյան",m:"րոպե",mm:"%d րոպե",h:"ժամ",hh:"%d ժամ",d:"օր",dd:"%d օր",M:"ամիս",MM:"%d ամիս",y:"տարի",yy:"%d տարի"},meridiemParse:/գիշերվա|առավոտվա|ցերեկվա|երեկոյան/,isPM:function(e){return/^(ցերեկվա|երեկոյան)$/.test(e)},meridiem:function(e){return e<4?"գիշերվա":e<12?"առավոտվա":e<17?"ցերեկվա":"երեկոյան"},dayOfMonthOrdinalParse:/\d{1,2}|\d{1,2}-(ին|րդ)/,ordinal:function(e,a){switch(a){case"DDD":case"w":case"W":case"DDDo":return 1===e?e+"-ին":e+"-րդ";default:return e}},week:{dow:1,doy:7}}),e.defineLocale("id",{months:"Januari_Februari_Maret_April_Mei_Juni_Juli_Agustus_September_Oktober_November_Desember".split("_"),monthsShort:"Jan_Feb_Mar_Apr_Mei_Jun_Jul_Ags_Sep_Okt_Nov_Des".split("_"),weekdays:"Minggu_Senin_Selasa_Rabu_Kamis_Jumat_Sabtu".split("_"),weekdaysShort:"Min_Sen_Sel_Rab_Kam_Jum_Sab".split("_"),weekdaysMin:"Mg_Sn_Sl_Rb_Km_Jm_Sb".split("_"),longDateFormat:{LT:"HH.mm",LTS:"HH.mm.ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY [pukul] HH.mm",LLLL:"dddd, D MMMM YYYY [pukul] HH.mm"},meridiemParse:/pagi|siang|sore|malam/,meridiemHour:function(e,a){return 12===e&&(e=0),"pagi"===a?e:"siang"===a?e>=11?e:e+12:"sore"===a||"malam"===a?e+12:void 0},meridiem:function(e,a,t){return e<11?"pagi":e<15?"siang":e<19?"sore":"malam"},calendar:{sameDay:"[Hari ini pukul] LT",nextDay:"[Besok pukul] LT",nextWeek:"dddd [pukul] LT",lastDay:"[Kemarin pukul] LT",lastWeek:"dddd [lalu pukul] LT",sameElse:"L"},relativeTime:{future:"dalam %s",past:"%s yang lalu",s:"beberapa detik",m:"semenit",mm:"%d menit",h:"sejam",hh:"%d jam",d:"sehari",dd:"%d hari",M:"sebulan",MM:"%d bulan",y:"setahun",yy:"%d tahun"},week:{dow:1,doy:7}}),e.defineLocale("is",{months:"janúar_febrúar_mars_apríl_maí_júní_júlí_ágúst_september_október_nóvember_desember".split("_"),monthsShort:"jan_feb_mar_apr_maí_jún_júl_ágú_sep_okt_nóv_des".split("_"),weekdays:"sunnudagur_mánudagur_þriðjudagur_miðvikudagur_fimmtudagur_föstudagur_laugardagur".split("_"),weekdaysShort:"sun_mán_þri_mið_fim_fös_lau".split("_"),weekdaysMin:"Su_Má_Þr_Mi_Fi_Fö_La".split("_"),longDateFormat:{LT:"H:mm",LTS:"H:mm:ss",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY [kl.] H:mm",LLLL:"dddd, D. MMMM YYYY [kl.] H:mm"},calendar:{sameDay:"[í dag kl.] LT",nextDay:"[á morgun kl.] LT",nextWeek:"dddd [kl.] LT",lastDay:"[í gær kl.] LT",lastWeek:"[síðasta] dddd [kl.] LT",sameElse:"L"},relativeTime:{future:"eftir %s",past:"fyrir %s síðan",s:zs,m:zs,mm:zs,h:"klukkustund",hh:zs,d:zs,dd:zs,M:zs,MM:zs,y:zs,yy:zs},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}}),e.defineLocale("it",{months:"gennaio_febbraio_marzo_aprile_maggio_giugno_luglio_agosto_settembre_ottobre_novembre_dicembre".split("_"),monthsShort:"gen_feb_mar_apr_mag_giu_lug_ago_set_ott_nov_dic".split("_"),weekdays:"domenica_lunedì_martedì_mercoledì_giovedì_venerdì_sabato".split("_"),weekdaysShort:"dom_lun_mar_mer_gio_ven_sab".split("_"),weekdaysMin:"do_lu_ma_me_gi_ve_sa".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd, D MMMM YYYY HH:mm"},calendar:{sameDay:"[Oggi alle] LT",nextDay:"[Domani alle] LT",nextWeek:"dddd [alle] LT",lastDay:"[Ieri alle] LT",lastWeek:function(){switch(this.day()){case 0:return"[la scorsa] dddd [alle] LT";default:return"[lo scorso] dddd [alle] LT"}},sameElse:"L"},relativeTime:{future:function(e){return(/^[0-9].+$/.test(e)?"tra":"in")+" "+e},past:"%s fa",s:"alcuni secondi",m:"un minuto",mm:"%d minuti",h:"un'ora",hh:"%d ore",d:"un giorno",dd:"%d giorni",M:"un mese",MM:"%d mesi",y:"un anno",yy:"%d anni"},dayOfMonthOrdinalParse:/\d{1,2}º/,ordinal:"%dº",week:{dow:1,doy:4}}),e.defineLocale("ja",{months:"1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月".split("_"),
monthsShort:"1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月".split("_"),weekdays:"日曜日_月曜日_火曜日_水曜日_木曜日_金曜日_土曜日".split("_"),weekdaysShort:"日_月_火_水_木_金_土".split("_"),weekdaysMin:"日_月_火_水_木_金_土".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"YYYY/MM/DD",LL:"YYYY年M月D日",LLL:"YYYY年M月D日 HH:mm",LLLL:"YYYY年M月D日 HH:mm dddd",l:"YYYY/MM/DD",ll:"YYYY年M月D日",lll:"YYYY年M月D日 HH:mm",llll:"YYYY年M月D日 HH:mm dddd"},meridiemParse:/午前|午後/i,isPM:function(e){return"午後"===e},meridiem:function(e,a,t){return e<12?"午前":"午後"},calendar:{sameDay:"[今日] LT",nextDay:"[明日] LT",nextWeek:"[来週]dddd LT",lastDay:"[昨日] LT",lastWeek:"[前週]dddd LT",sameElse:"L"},dayOfMonthOrdinalParse:/\d{1,2}日/,ordinal:function(e,a){switch(a){case"d":case"D":case"DDD":return e+"日";default:return e}},relativeTime:{future:"%s後",past:"%s前",s:"数秒",m:"1分",mm:"%d分",h:"1時間",hh:"%d時間",d:"1日",dd:"%d日",M:"1ヶ月",MM:"%dヶ月",y:"1年",yy:"%d年"}}),e.defineLocale("jv",{months:"Januari_Februari_Maret_April_Mei_Juni_Juli_Agustus_September_Oktober_Nopember_Desember".split("_"),monthsShort:"Jan_Feb_Mar_Apr_Mei_Jun_Jul_Ags_Sep_Okt_Nop_Des".split("_"),weekdays:"Minggu_Senen_Seloso_Rebu_Kemis_Jemuwah_Septu".split("_"),weekdaysShort:"Min_Sen_Sel_Reb_Kem_Jem_Sep".split("_"),weekdaysMin:"Mg_Sn_Sl_Rb_Km_Jm_Sp".split("_"),longDateFormat:{LT:"HH.mm",LTS:"HH.mm.ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY [pukul] HH.mm",LLLL:"dddd, D MMMM YYYY [pukul] HH.mm"},meridiemParse:/enjing|siyang|sonten|ndalu/,meridiemHour:function(e,a){return 12===e&&(e=0),"enjing"===a?e:"siyang"===a?e>=11?e:e+12:"sonten"===a||"ndalu"===a?e+12:void 0},meridiem:function(e,a,t){return e<11?"enjing":e<15?"siyang":e<19?"sonten":"ndalu"},calendar:{sameDay:"[Dinten puniko pukul] LT",nextDay:"[Mbenjang pukul] LT",nextWeek:"dddd [pukul] LT",lastDay:"[Kala wingi pukul] LT",lastWeek:"dddd [kepengker pukul] LT",sameElse:"L"},relativeTime:{future:"wonten ing %s",past:"%s ingkang kepengker",s:"sawetawis detik",m:"setunggal menit",mm:"%d menit",h:"setunggal jam",hh:"%d jam",d:"sedinten",dd:"%d dinten",M:"sewulan",MM:"%d wulan",y:"setaun",yy:"%d taun"},week:{dow:1,doy:7}}),e.defineLocale("ka",{months:{standalone:"იანვარი_თებერვალი_მარტი_აპრილი_მაისი_ივნისი_ივლისი_აგვისტო_სექტემბერი_ოქტომბერი_ნოემბერი_დეკემბერი".split("_"),format:"იანვარს_თებერვალს_მარტს_აპრილის_მაისს_ივნისს_ივლისს_აგვისტს_სექტემბერს_ოქტომბერს_ნოემბერს_დეკემბერს".split("_")},monthsShort:"იან_თებ_მარ_აპრ_მაი_ივნ_ივლ_აგვ_სექ_ოქტ_ნოე_დეკ".split("_"),weekdays:{standalone:"კვირა_ორშაბათი_სამშაბათი_ოთხშაბათი_ხუთშაბათი_პარასკევი_შაბათი".split("_"),format:"კვირას_ორშაბათს_სამშაბათს_ოთხშაბათს_ხუთშაბათს_პარასკევს_შაბათს".split("_"),isFormat:/(წინა|შემდეგ)/},weekdaysShort:"კვი_ორშ_სამ_ოთხ_ხუთ_პარ_შაბ".split("_"),weekdaysMin:"კვ_ორ_სა_ოთ_ხუ_პა_შა".split("_"),longDateFormat:{LT:"h:mm A",LTS:"h:mm:ss A",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY h:mm A",LLLL:"dddd, D MMMM YYYY h:mm A"},calendar:{sameDay:"[დღეს] LT[-ზე]",nextDay:"[ხვალ] LT[-ზე]",lastDay:"[გუშინ] LT[-ზე]",nextWeek:"[შემდეგ] dddd LT[-ზე]",lastWeek:"[წინა] dddd LT-ზე",sameElse:"L"},relativeTime:{future:function(e){return/(წამი|წუთი|საათი|წელი)/.test(e)?e.replace(/ი$/,"ში"):e+"ში"},past:function(e){return/(წამი|წუთი|საათი|დღე|თვე)/.test(e)?e.replace(/(ი|ე)$/,"ის უკან"):/წელი/.test(e)?e.replace(/წელი$/,"წლის უკან"):void 0},s:"რამდენიმე წამი",m:"წუთი",mm:"%d წუთი",h:"საათი",hh:"%d საათი",d:"დღე",dd:"%d დღე",M:"თვე",MM:"%d თვე",y:"წელი",yy:"%d წელი"},dayOfMonthOrdinalParse:/0|1-ლი|მე-\d{1,2}|\d{1,2}-ე/,ordinal:function(e){return 0===e?e:1===e?e+"-ლი":e<20||e<=100&&e%20==0||e%100==0?"მე-"+e:e+"-ე"},week:{dow:1,doy:7}});var e_={0:"-ші",1:"-ші",2:"-ші",3:"-ші",4:"-ші",5:"-ші",6:"-шы",7:"-ші",8:"-ші",9:"-шы",10:"-шы",20:"-шы",30:"-шы",40:"-шы",50:"-ші",60:"-шы",70:"-ші",80:"-ші",90:"-шы",100:"-ші"};e.defineLocale("kk",{months:"қаңтар_ақпан_наурыз_сәуір_мамыр_маусым_шілде_тамыз_қыркүйек_қазан_қараша_желтоқсан".split("_"),monthsShort:"қаң_ақп_нау_сәу_мам_мау_шіл_там_қыр_қаз_қар_жел".split("_"),weekdays:"жексенбі_дүйсенбі_сейсенбі_сәрсенбі_бейсенбі_жұма_сенбі".split("_"),weekdaysShort:"жек_дүй_сей_сәр_бей_жұм_сен".split("_"),weekdaysMin:"жк_дй_сй_ср_бй_жм_сн".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD.MM.YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd, D MMMM YYYY HH:mm"},calendar:{sameDay:"[Бүгін сағат] LT",nextDay:"[Ертең сағат] LT",nextWeek:"dddd [сағат] LT",lastDay:"[Кеше сағат] LT",lastWeek:"[Өткен аптаның] dddd [сағат] LT",sameElse:"L"},relativeTime:{future:"%s ішінде",past:"%s бұрын",s:"бірнеше секунд",m:"бір минут",mm:"%d минут",h:"бір сағат",hh:"%d сағат",d:"бір күн",dd:"%d күн",M:"бір ай",MM:"%d ай",y:"бір жыл",yy:"%d жыл"},dayOfMonthOrdinalParse:/\d{1,2}-(ші|шы)/,ordinal:function(e){var a=e%10,t=e>=100?100:null;return e+(e_[e]||e_[a]||e_[t])},week:{dow:1,doy:7}}),e.defineLocale("km",{months:"មករា_កុម្ភៈ_មីនា_មេសា_ឧសភា_មិថុនា_កក្កដា_សីហា_កញ្ញា_តុលា_វិច្ឆិកា_ធ្នូ".split("_"),monthsShort:"មករា_កុម្ភៈ_មីនា_មេសា_ឧសភា_មិថុនា_កក្កដា_សីហា_កញ្ញា_តុលា_វិច្ឆិកា_ធ្នូ".split("_"),weekdays:"អាទិត្យ_ច័ន្ទ_អង្គារ_ពុធ_ព្រហស្បតិ៍_សុក្រ_សៅរ៍".split("_"),weekdaysShort:"អាទិត្យ_ច័ន្ទ_អង្គារ_ពុធ_ព្រហស្បតិ៍_សុក្រ_សៅរ៍".split("_"),weekdaysMin:"អាទិត្យ_ច័ន្ទ_អង្គារ_ពុធ_ព្រហស្បតិ៍_សុក្រ_សៅរ៍".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd, D MMMM YYYY HH:mm"},calendar:{sameDay:"[ថ្ងៃនេះ ម៉ោង] LT",nextDay:"[ស្អែក ម៉ោង] LT",nextWeek:"dddd [ម៉ោង] LT",lastDay:"[ម្សិលមិញ ម៉ោង] LT",lastWeek:"dddd [សប្តាហ៍មុន] [ម៉ោង] LT",sameElse:"L"},relativeTime:{future:"%sទៀត",past:"%sមុន",s:"ប៉ុន្មានវិនាទី",m:"មួយនាទី",mm:"%d នាទី",h:"មួយម៉ោង",hh:"%d ម៉ោង",d:"មួយថ្ងៃ",dd:"%d ថ្ងៃ",M:"មួយខែ",MM:"%d ខែ",y:"មួយឆ្នាំ",yy:"%d ឆ្នាំ"},week:{dow:1,doy:4}});var a_={1:"೧",2:"೨",3:"೩",4:"೪",5:"೫",6:"೬",7:"೭",8:"೮",9:"೯",0:"೦"},t_={"೧":"1","೨":"2","೩":"3","೪":"4","೫":"5","೬":"6","೭":"7","೮":"8","೯":"9","೦":"0"};e.defineLocale("kn",{months:"ಜನವರಿ_ಫೆಬ್ರವರಿ_ಮಾರ್ಚ್_ಏಪ್ರಿಲ್_ಮೇ_ಜೂನ್_ಜುಲೈ_ಆಗಸ್ಟ್_ಸೆಪ್ಟೆಂಬರ್_ಅಕ್ಟೋಬರ್_ನವೆಂಬರ್_ಡಿಸೆಂಬರ್".split("_"),monthsShort:"ಜನ_ಫೆಬ್ರ_ಮಾರ್ಚ್_ಏಪ್ರಿಲ್_ಮೇ_ಜೂನ್_ಜುಲೈ_ಆಗಸ್ಟ್_ಸೆಪ್ಟೆಂಬ_ಅಕ್ಟೋಬ_ನವೆಂಬ_ಡಿಸೆಂಬ".split("_"),monthsParseExact:!0,weekdays:"ಭಾನುವಾರ_ಸೋಮವಾರ_ಮಂಗಳವಾರ_ಬುಧವಾರ_ಗುರುವಾರ_ಶುಕ್ರವಾರ_ಶನಿವಾರ".split("_"),weekdaysShort:"ಭಾನು_ಸೋಮ_ಮಂಗಳ_ಬುಧ_ಗುರು_ಶುಕ್ರ_ಶನಿ".split("_"),weekdaysMin:"ಭಾ_ಸೋ_ಮಂ_ಬು_ಗು_ಶು_ಶ".split("_"),longDateFormat:{LT:"A h:mm",LTS:"A h:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY, A h:mm",LLLL:"dddd, D MMMM YYYY, A h:mm"},calendar:{sameDay:"[ಇಂದು] LT",nextDay:"[ನಾಳೆ] LT",nextWeek:"dddd, LT",lastDay:"[ನಿನ್ನೆ] LT",lastWeek:"[ಕೊನೆಯ] dddd, LT",sameElse:"L"},relativeTime:{future:"%s ನಂತರ",past:"%s ಹಿಂದೆ",s:"ಕೆಲವು ಕ್ಷಣಗಳು",m:"ಒಂದು ನಿಮಿಷ",mm:"%d ನಿಮಿಷ",h:"ಒಂದು ಗಂಟೆ",hh:"%d ಗಂಟೆ",d:"ಒಂದು ದಿನ",dd:"%d ದಿನ",M:"ಒಂದು ತಿಂಗಳು",MM:"%d ತಿಂಗಳು",y:"ಒಂದು ವರ್ಷ",yy:"%d ವರ್ಷ"},preparse:function(e){return e.replace(/[೧೨೩೪೫೬೭೮೯೦]/g,function(e){return t_[e]})},postformat:function(e){return e.replace(/\d/g,function(e){return a_[e]})},meridiemParse:/ರಾತ್ರಿ|ಬೆಳಿಗ್ಗೆ|ಮಧ್ಯಾಹ್ನ|ಸಂಜೆ/,meridiemHour:function(e,a){return 12===e&&(e=0),"ರಾತ್ರಿ"===a?e<4?e:e+12:"ಬೆಳಿಗ್ಗೆ"===a?e:"ಮಧ್ಯಾಹ್ನ"===a?e>=10?e:e+12:"ಸಂಜೆ"===a?e+12:void 0},meridiem:function(e,a,t){return e<4?"ರಾತ್ರಿ":e<10?"ಬೆಳಿಗ್ಗೆ":e<17?"ಮಧ್ಯಾಹ್ನ":e<20?"ಸಂಜೆ":"ರಾತ್ರಿ"},dayOfMonthOrdinalParse:/\d{1,2}(ನೇ)/,ordinal:function(e){return e+"ನೇ"},week:{dow:0,doy:6}}),e.defineLocale("ko",{months:"1월_2월_3월_4월_5월_6월_7월_8월_9월_10월_11월_12월".split("_"),monthsShort:"1월_2월_3월_4월_5월_6월_7월_8월_9월_10월_11월_12월".split("_"),weekdays:"일요일_월요일_화요일_수요일_목요일_금요일_토요일".split("_"),weekdaysShort:"일_월_화_수_목_금_토".split("_"),weekdaysMin:"일_월_화_수_목_금_토".split("_"),longDateFormat:{LT:"A h:mm",LTS:"A h:mm:ss",L:"YYYY.MM.DD",LL:"YYYY년 MMMM D일",LLL:"YYYY년 MMMM D일 A h:mm",LLLL:"YYYY년 MMMM D일 dddd A h:mm",l:"YYYY.MM.DD",ll:"YYYY년 MMMM D일",lll:"YYYY년 MMMM D일 A h:mm",llll:"YYYY년 MMMM D일 dddd A h:mm"},calendar:{sameDay:"오늘 LT",nextDay:"내일 LT",nextWeek:"dddd LT",lastDay:"어제 LT",lastWeek:"지난주 dddd LT",sameElse:"L"},relativeTime:{future:"%s 후",past:"%s 전",s:"몇 초",ss:"%d초",m:"1분",mm:"%d분",h:"한 시간",hh:"%d시간",d:"하루",dd:"%d일",M:"한 달",MM:"%d달",y:"일 년",yy:"%d년"},dayOfMonthOrdinalParse:/\d{1,2}일/,ordinal:"%d일",meridiemParse:/오전|오후/,isPM:function(e){return"오후"===e},meridiem:function(e,a,t){return e<12?"오전":"오후"}});var s_={0:"-чү",1:"-чи",2:"-чи",3:"-чү",4:"-чү",5:"-чи",6:"-чы",7:"-чи",8:"-чи",9:"-чу",10:"-чу",20:"-чы",30:"-чу",40:"-чы",50:"-чү",60:"-чы",70:"-чи",80:"-чи",90:"-чу",100:"-чү"};e.defineLocale("ky",{months:"январь_февраль_март_апрель_май_июнь_июль_август_сентябрь_октябрь_ноябрь_декабрь".split("_"),monthsShort:"янв_фев_март_апр_май_июнь_июль_авг_сен_окт_ноя_дек".split("_"),weekdays:"Жекшемби_Дүйшөмбү_Шейшемби_Шаршемби_Бейшемби_Жума_Ишемби".split("_"),weekdaysShort:"Жек_Дүй_Шей_Шар_Бей_Жум_Ише".split("_"),weekdaysMin:"Жк_Дй_Шй_Шр_Бй_Жм_Иш".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD.MM.YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd, D MMMM YYYY HH:mm"},calendar:{sameDay:"[Бүгүн саат] LT",nextDay:"[Эртең саат] LT",nextWeek:"dddd [саат] LT",lastDay:"[Кече саат] LT",lastWeek:"[Өткен аптанын] dddd [күнү] [саат] LT",sameElse:"L"},relativeTime:{future:"%s ичинде",past:"%s мурун",s:"бирнече секунд",m:"бир мүнөт",mm:"%d мүнөт",h:"бир саат",hh:"%d саат",d:"бир күн",dd:"%d күн",M:"бир ай",MM:"%d ай",y:"бир жыл",yy:"%d жыл"},dayOfMonthOrdinalParse:/\d{1,2}-(чи|чы|чү|чу)/,ordinal:function(e){var a=e%10,t=e>=100?100:null;return e+(s_[e]||s_[a]||s_[t])},week:{dow:1,doy:7}}),e.defineLocale("lb",{months:"Januar_Februar_Mäerz_Abrëll_Mee_Juni_Juli_August_September_Oktober_November_Dezember".split("_"),monthsShort:"Jan._Febr._Mrz._Abr._Mee_Jun._Jul._Aug._Sept._Okt._Nov._Dez.".split("_"),monthsParseExact:!0,weekdays:"Sonndeg_Méindeg_Dënschdeg_Mëttwoch_Donneschdeg_Freideg_Samschdeg".split("_"),weekdaysShort:"So._Mé._Dë._Më._Do._Fr._Sa.".split("_"),weekdaysMin:"So_Mé_Dë_Më_Do_Fr_Sa".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"H:mm [Auer]",LTS:"H:mm:ss [Auer]",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY H:mm [Auer]",LLLL:"dddd, D. MMMM YYYY H:mm [Auer]"},calendar:{sameDay:"[Haut um] LT",sameElse:"L",nextDay:"[Muer um] LT",nextWeek:"dddd [um] LT",lastDay:"[Gëschter um] LT",lastWeek:function(){switch(this.day()){case 2:case 4:return"[Leschten] dddd [um] LT";default:return"[Leschte] dddd [um] LT"}}},relativeTime:{future:Rs,past:Ns,s:"e puer Sekonnen",m:Js,mm:"%d Minutten",h:Js,hh:"%d Stonnen",d:Js,dd:"%d Deeg",M:Js,MM:"%d Méint",y:Js,yy:"%d Joer"},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}}),e.defineLocale("lo",{months:"ມັງກອນ_ກຸມພາ_ມີນາ_ເມສາ_ພຶດສະພາ_ມິຖຸນາ_ກໍລະກົດ_ສິງຫາ_ກັນຍາ_ຕຸລາ_ພະຈິກ_ທັນວາ".split("_"),monthsShort:"ມັງກອນ_ກຸມພາ_ມີນາ_ເມສາ_ພຶດສະພາ_ມິຖຸນາ_ກໍລະກົດ_ສິງຫາ_ກັນຍາ_ຕຸລາ_ພະຈິກ_ທັນວາ".split("_"),weekdays:"ອາທິດ_ຈັນ_ອັງຄານ_ພຸດ_ພະຫັດ_ສຸກ_ເສົາ".split("_"),weekdaysShort:"ທິດ_ຈັນ_ອັງຄານ_ພຸດ_ພະຫັດ_ສຸກ_ເສົາ".split("_"),weekdaysMin:"ທ_ຈ_ອຄ_ພ_ພຫ_ສກ_ສ".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"ວັນdddd D MMMM YYYY HH:mm"},meridiemParse:/ຕອນເຊົ້າ|ຕອນແລງ/,isPM:function(e){return"ຕອນແລງ"===e},meridiem:function(e,a,t){return e<12?"ຕອນເຊົ້າ":"ຕອນແລງ"},calendar:{sameDay:"[ມື້ນີ້ເວລາ] LT",nextDay:"[ມື້ອື່ນເວລາ] LT",nextWeek:"[ວັນ]dddd[ໜ້າເວລາ] LT",lastDay:"[ມື້ວານນີ້ເວລາ] LT",lastWeek:"[ວັນ]dddd[ແລ້ວນີ້ເວລາ] LT",sameElse:"L"},relativeTime:{future:"ອີກ %s",past:"%sຜ່ານມາ",s:"ບໍ່ເທົ່າໃດວິນາທີ",m:"1 ນາທີ",mm:"%d ນາທີ",h:"1 ຊົ່ວໂມງ",hh:"%d ຊົ່ວໂມງ",d:"1 ມື້",dd:"%d ມື້",M:"1 ເດືອນ",MM:"%d ເດືອນ",y:"1 ປີ",yy:"%d ປີ"},dayOfMonthOrdinalParse:/(ທີ່)\d{1,2}/,ordinal:function(e){return"ທີ່"+e}});var n_={m:"minutė_minutės_minutę",mm:"minutės_minučių_minutes",h:"valanda_valandos_valandą",hh:"valandos_valandų_valandas",d:"diena_dienos_dieną",dd:"dienos_dienų_dienas",M:"mėnuo_mėnesio_mėnesį",MM:"mėnesiai_mėnesių_mėnesius",y:"metai_metų_metus",yy:"metai_metų_metus"};e.defineLocale("lt",{months:{format:"sausio_vasario_kovo_balandžio_gegužės_birželio_liepos_rugpjūčio_rugsėjo_spalio_lapkričio_gruodžio".split("_"),standalone:"sausis_vasaris_kovas_balandis_gegužė_birželis_liepa_rugpjūtis_rugsėjis_spalis_lapkritis_gruodis".split("_"),isFormat:/D[oD]?(\[[^\[\]]*\]|\s)+MMMM?|MMMM?(\[[^\[\]]*\]|\s)+D[oD]?/},monthsShort:"sau_vas_kov_bal_geg_bir_lie_rgp_rgs_spa_lap_grd".split("_"),weekdays:{format:"sekmadienį_pirmadienį_antradienį_trečiadienį_ketvirtadienį_penktadienį_šeštadienį".split("_"),standalone:"sekmadienis_pirmadienis_antradienis_trečiadienis_ketvirtadienis_penktadienis_šeštadienis".split("_"),isFormat:/dddd HH:mm/},weekdaysShort:"Sek_Pir_Ant_Tre_Ket_Pen_Šeš".split("_"),weekdaysMin:"S_P_A_T_K_Pn_Š".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"YYYY-MM-DD",LL:"YYYY [m.] MMMM D [d.]",LLL:"YYYY [m.] MMMM D [d.], HH:mm [val.]",LLLL:"YYYY [m.] MMMM D [d.], dddd, HH:mm [val.]",l:"YYYY-MM-DD",ll:"YYYY [m.] MMMM D [d.]",lll:"YYYY [m.] MMMM D [d.], HH:mm [val.]",llll:"YYYY [m.] MMMM D [d.], ddd, HH:mm [val.]"},calendar:{sameDay:"[Šiandien] LT",nextDay:"[Rytoj] LT",nextWeek:"dddd LT",lastDay:"[Vakar] LT",lastWeek:"[Praėjusį] dddd LT",sameElse:"L"},relativeTime:{future:"po %s",past:"prieš %s",s:Is,m:Gs,mm:$s,h:Gs,hh:$s,d:Gs,dd:$s,M:Gs,MM:$s,y:Gs,yy:$s},dayOfMonthOrdinalParse:/\d{1,2}-oji/,ordinal:function(e){return e+"-oji"},week:{dow:1,doy:4}});var r_={m:"minūtes_minūtēm_minūte_minūtes".split("_"),mm:"minūtes_minūtēm_minūte_minūtes".split("_"),h:"stundas_stundām_stunda_stundas".split("_"),hh:"stundas_stundām_stunda_stundas".split("_"),d:"dienas_dienām_diena_dienas".split("_"),dd:"dienas_dienām_diena_dienas".split("_"),M:"mēneša_mēnešiem_mēnesis_mēneši".split("_"),MM:"mēneša_mēnešiem_mēnesis_mēneši".split("_"),y:"gada_gadiem_gads_gadi".split("_"),yy:"gada_gadiem_gads_gadi".split("_")};e.defineLocale("lv",{months:"janvāris_februāris_marts_aprīlis_maijs_jūnijs_jūlijs_augusts_septembris_oktobris_novembris_decembris".split("_"),monthsShort:"jan_feb_mar_apr_mai_jūn_jūl_aug_sep_okt_nov_dec".split("_"),weekdays:"svētdiena_pirmdiena_otrdiena_trešdiena_ceturtdiena_piektdiena_sestdiena".split("_"),weekdaysShort:"Sv_P_O_T_C_Pk_S".split("_"),weekdaysMin:"Sv_P_O_T_C_Pk_S".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD.MM.YYYY.",LL:"YYYY. [gada] D. MMMM",LLL:"YYYY. [gada] D. MMMM, HH:mm",LLLL:"YYYY. [gada] D. MMMM, dddd, HH:mm"},calendar:{sameDay:"[Šodien pulksten] LT",nextDay:"[Rīt pulksten] LT",nextWeek:"dddd [pulksten] LT",lastDay:"[Vakar pulksten] LT",lastWeek:"[Pagājušā] dddd [pulksten] LT",sameElse:"L"},relativeTime:{future:"pēc %s",past:"pirms %s",s:Bs,m:qs,mm:Zs,h:qs,hh:Zs,d:qs,dd:Zs,M:qs,MM:Zs,y:qs,yy:Zs},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}});var d_={words:{m:["jedan minut","jednog minuta"],mm:["minut","minuta","minuta"],h:["jedan sat","jednog sata"],hh:["sat","sata","sati"],dd:["dan","dana","dana"],MM:["mjesec","mjeseca","mjeseci"],yy:["godina","godine","godina"]},correctGrammaticalCase:function(e,a){return 1===e?a[0]:e>=2&&e<=4?a[1]:a[2]},translate:function(e,a,t){var s=d_.words[t];return 1===t.length?a?s[0]:s[1]:e+" "+d_.correctGrammaticalCase(e,s)}};e.defineLocale("me",{months:"januar_februar_mart_april_maj_jun_jul_avgust_septembar_oktobar_novembar_decembar".split("_"),monthsShort:"jan._feb._mar._apr._maj_jun_jul_avg._sep._okt._nov._dec.".split("_"),monthsParseExact:!0,weekdays:"nedjelja_ponedjeljak_utorak_srijeda_četvrtak_petak_subota".split("_"),weekdaysShort:"ned._pon._uto._sri._čet._pet._sub.".split("_"),weekdaysMin:"ne_po_ut_sr_če_pe_su".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"H:mm",LTS:"H:mm:ss",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY H:mm",LLLL:"dddd, D. MMMM YYYY H:mm"},calendar:{sameDay:"[danas u] LT",nextDay:"[sjutra u] LT",nextWeek:function(){switch(this.day()){case 0:return"[u] [nedjelju] [u] LT";case 3:return"[u] [srijedu] [u] LT";case 6:return"[u] [subotu] [u] LT";case 1:case 2:case 4:case 5:return"[u] dddd [u] LT"}},lastDay:"[juče u] LT",lastWeek:function(){return["[prošle] [nedjelje] [u] LT","[prošlog] [ponedjeljka] [u] LT","[prošlog] [utorka] [u] LT","[prošle] [srijede] [u] LT","[prošlog] [četvrtka] [u] LT","[prošlog] [petka] [u] LT","[prošle] [subote] [u] LT"][this.day()]},sameElse:"L"},relativeTime:{future:"za %s",past:"prije %s",s:"nekoliko sekundi",m:d_.translate,mm:d_.translate,h:d_.translate,hh:d_.translate,d:"dan",dd:d_.translate,M:"mjesec",MM:d_.translate,y:"godinu",yy:d_.translate},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:7}}),e.defineLocale("mi",{months:"Kohi-tāte_Hui-tanguru_Poutū-te-rangi_Paenga-whāwhā_Haratua_Pipiri_Hōngoingoi_Here-turi-kōkā_Mahuru_Whiringa-ā-nuku_Whiringa-ā-rangi_Hakihea".split("_"),monthsShort:"Kohi_Hui_Pou_Pae_Hara_Pipi_Hōngoi_Here_Mahu_Whi-nu_Whi-ra_Haki".split("_"),monthsRegex:/(?:['a-z\u0101\u014D\u016B]+\-?){1,3}/i,monthsStrictRegex:/(?:['a-z\u0101\u014D\u016B]+\-?){1,3}/i,monthsShortRegex:/(?:['a-z\u0101\u014D\u016B]+\-?){1,3}/i,monthsShortStrictRegex:/(?:['a-z\u0101\u014D\u016B]+\-?){1,2}/i,weekdays:"Rātapu_Mane_Tūrei_Wenerei_Tāite_Paraire_Hātarei".split("_"),weekdaysShort:"Ta_Ma_Tū_We_Tāi_Pa_Hā".split("_"),weekdaysMin:"Ta_Ma_Tū_We_Tāi_Pa_Hā".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY [i] HH:mm",LLLL:"dddd, D MMMM YYYY [i] HH:mm"},calendar:{sameDay:"[i teie mahana, i] LT",nextDay:"[apopo i] LT",nextWeek:"dddd [i] LT",lastDay:"[inanahi i] LT",lastWeek:"dddd [whakamutunga i] LT",sameElse:"L"},relativeTime:{future:"i roto i %s",past:"%s i mua",s:"te hēkona ruarua",m:"he meneti",mm:"%d meneti",h:"te haora",hh:"%d haora",d:"he ra",dd:"%d ra",M:"he marama",MM:"%d marama",y:"he tau",yy:"%d tau"},dayOfMonthOrdinalParse:/\d{1,2}º/,ordinal:"%dº",week:{dow:1,doy:4}}),e.defineLocale("mk",{months:"јануари_февруари_март_април_мај_јуни_јули_август_септември_октомври_ноември_декември".split("_"),monthsShort:"јан_фев_мар_апр_мај_јун_јул_авг_сеп_окт_ное_дек".split("_"),weekdays:"недела_понеделник_вторник_среда_четврток_петок_сабота".split("_"),weekdaysShort:"нед_пон_вто_сре_чет_пет_саб".split("_"),weekdaysMin:"нe_пo_вт_ср_че_пе_сa".split("_"),longDateFormat:{LT:"H:mm",LTS:"H:mm:ss",L:"D.MM.YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY H:mm",LLLL:"dddd, D MMMM YYYY H:mm"},calendar:{sameDay:"[Денес во] LT",nextDay:"[Утре во] LT",nextWeek:"[Во] dddd [во] LT",lastDay:"[Вчера во] LT",lastWeek:function(){switch(this.day()){case 0:case 3:case 6:return"[Изминатата] dddd [во] LT";case 1:case 2:case 4:case 5:return"[Изминатиот] dddd [во] LT"}},sameElse:"L"},relativeTime:{future:"после %s",past:"пред %s",s:"неколку секунди",m:"минута",mm:"%d минути",h:"час",hh:"%d часа",d:"ден",dd:"%d дена",M:"месец",MM:"%d месеци",y:"година",yy:"%d години"},dayOfMonthOrdinalParse:/\d{1,2}-(ев|ен|ти|ви|ри|ми)/,ordinal:function(e){var a=e%10,t=e%100;return 0===e?e+"-ев":0===t?e+"-ен":t>10&&t<20?e+"-ти":1===a?e+"-ви":2===a?e+"-ри":7===a||8===a?e+"-ми":e+"-ти"},week:{dow:1,doy:7}}),e.defineLocale("ml",{months:"ജനുവരി_ഫെബ്രുവരി_മാർച്ച്_ഏപ്രിൽ_മേയ്_ജൂൺ_ജൂലൈ_ഓഗസ്റ്റ്_സെപ്റ്റംബർ_ഒക്ടോബർ_നവംബർ_ഡിസംബർ".split("_"),monthsShort:"ജനു._ഫെബ്രു._മാർ._ഏപ്രി._മേയ്_ജൂൺ_ജൂലൈ._ഓഗ._സെപ്റ്റ._ഒക്ടോ._നവം._ഡിസം.".split("_"),monthsParseExact:!0,weekdays:"ഞായറാഴ്ച_തിങ്കളാഴ്ച_ചൊവ്വാഴ്ച_ബുധനാഴ്ച_വ്യാഴാഴ്ച_വെള്ളിയാഴ്ച_ശനിയാഴ്ച".split("_"),weekdaysShort:"ഞായർ_തിങ്കൾ_ചൊവ്വ_ബുധൻ_വ്യാഴം_വെള്ളി_ശനി".split("_"),weekdaysMin:"ഞാ_തി_ചൊ_ബു_വ്യാ_വെ_ശ".split("_"),longDateFormat:{LT:"A h:mm -നു",LTS:"A h:mm:ss -നു",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY, A h:mm -നു",LLLL:"dddd, D MMMM YYYY, A h:mm -നു"},calendar:{sameDay:"[ഇന്ന്] LT",nextDay:"[നാളെ] LT",nextWeek:"dddd, LT",lastDay:"[ഇന്നലെ] LT",lastWeek:"[കഴിഞ്ഞ] dddd, LT",sameElse:"L"},relativeTime:{future:"%s കഴിഞ്ഞ്",past:"%s മുൻപ്",s:"അൽപ നിമിഷങ്ങൾ",m:"ഒരു മിനിറ്റ്",mm:"%d മിനിറ്റ്",h:"ഒരു മണിക്കൂർ",hh:"%d മണിക്കൂർ",d:"ഒരു ദിവസം",dd:"%d ദിവസം",M:"ഒരു മാസം",MM:"%d മാസം",y:"ഒരു വർഷം",yy:"%d വർഷം"},meridiemParse:/രാത്രി|രാവിലെ|ഉച്ച കഴിഞ്ഞ്|വൈകുന്നേരം|രാത്രി/i,meridiemHour:function(e,a){return 12===e&&(e=0),"രാത്രി"===a&&e>=4||"ഉച്ച കഴിഞ്ഞ്"===a||"വൈകുന്നേരം"===a?e+12:e},meridiem:function(e,a,t){return e<4?"രാത്രി":e<12?"രാവിലെ":e<17?"ഉച്ച കഴിഞ്ഞ്":e<20?"വൈകുന്നേരം":"രാത്രി"}});var __={1:"१",2:"२",3:"३",4:"४",5:"५",6:"६",7:"७",8:"८",9:"९",0:"०"},i_={"१":"1","२":"2","३":"3","४":"4","५":"5","६":"6","७":"7","८":"8","९":"9","०":"0"};e.defineLocale("mr",{months:"जानेवारी_फेब्रुवारी_मार्च_एप्रिल_मे_जून_जुलै_ऑगस्ट_सप्टेंबर_ऑक्टोबर_नोव्हेंबर_डिसेंबर".split("_"),monthsShort:"जाने._फेब्रु._मार्च._एप्रि._मे._जून._जुलै._ऑग._सप्टें._ऑक्टो._नोव्हें._डिसें.".split("_"),monthsParseExact:!0,weekdays:"रविवार_सोमवार_मंगळवार_बुधवार_गुरूवार_शुक्रवार_शनिवार".split("_"),weekdaysShort:"रवि_सोम_मंगळ_बुध_गुरू_शुक्र_शनि".split("_"),weekdaysMin:"र_सो_मं_बु_गु_शु_श".split("_"),longDateFormat:{LT:"A h:mm वाजता",LTS:"A h:mm:ss वाजता",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY, A h:mm वाजता",LLLL:"dddd, D MMMM YYYY, A h:mm वाजता"},calendar:{sameDay:"[आज] LT",nextDay:"[उद्या] LT",nextWeek:"dddd, LT",lastDay:"[काल] LT",lastWeek:"[मागील] dddd, LT",sameElse:"L"},relativeTime:{future:"%sमध्ये",past:"%sपूर्वी",s:Qs,m:Qs,mm:Qs,h:Qs,hh:Qs,d:Qs,dd:Qs,M:Qs,MM:Qs,y:Qs,yy:Qs},preparse:function(e){return e.replace(/[१२३४५६७८९०]/g,function(e){return i_[e]})},postformat:function(e){return e.replace(/\d/g,function(e){return __[e]})},meridiemParse:/रात्री|सकाळी|दुपारी|सायंकाळी/,meridiemHour:function(e,a){return 12===e&&(e=0),"रात्री"===a?e<4?e:e+12:"सकाळी"===a?e:"दुपारी"===a?e>=10?e:e+12:"सायंकाळी"===a?e+12:void 0},meridiem:function(e,a,t){return e<4?"रात्री":e<10?"सकाळी":e<17?"दुपारी":e<20?"सायंकाळी":"रात्री"},week:{dow:0,doy:6}}),e.defineLocale("ms-my",{months:"Januari_Februari_Mac_April_Mei_Jun_Julai_Ogos_September_Oktober_November_Disember".split("_"),monthsShort:"Jan_Feb_Mac_Apr_Mei_Jun_Jul_Ogs_Sep_Okt_Nov_Dis".split("_"),weekdays:"Ahad_Isnin_Selasa_Rabu_Khamis_Jumaat_Sabtu".split("_"),weekdaysShort:"Ahd_Isn_Sel_Rab_Kha_Jum_Sab".split("_"),weekdaysMin:"Ah_Is_Sl_Rb_Km_Jm_Sb".split("_"),longDateFormat:{LT:"HH.mm",LTS:"HH.mm.ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY [pukul] HH.mm",LLLL:"dddd, D MMMM YYYY [pukul] HH.mm"},meridiemParse:/pagi|tengahari|petang|malam/,meridiemHour:function(e,a){return 12===e&&(e=0),"pagi"===a?e:"tengahari"===a?e>=11?e:e+12:"petang"===a||"malam"===a?e+12:void 0},meridiem:function(e,a,t){return e<11?"pagi":e<15?"tengahari":e<19?"petang":"malam"},calendar:{sameDay:"[Hari ini pukul] LT",nextDay:"[Esok pukul] LT",nextWeek:"dddd [pukul] LT",lastDay:"[Kelmarin pukul] LT",lastWeek:"dddd [lepas pukul] LT",sameElse:"L"},relativeTime:{future:"dalam %s",past:"%s yang lepas",s:"beberapa saat",m:"seminit",mm:"%d minit",h:"sejam",hh:"%d jam",d:"sehari",dd:"%d hari",M:"sebulan",MM:"%d bulan",y:"setahun",yy:"%d tahun"},week:{dow:1,doy:7}}),e.defineLocale("ms",{months:"Januari_Februari_Mac_April_Mei_Jun_Julai_Ogos_September_Oktober_November_Disember".split("_"),monthsShort:"Jan_Feb_Mac_Apr_Mei_Jun_Jul_Ogs_Sep_Okt_Nov_Dis".split("_"),weekdays:"Ahad_Isnin_Selasa_Rabu_Khamis_Jumaat_Sabtu".split("_"),weekdaysShort:"Ahd_Isn_Sel_Rab_Kha_Jum_Sab".split("_"),weekdaysMin:"Ah_Is_Sl_Rb_Km_Jm_Sb".split("_"),longDateFormat:{LT:"HH.mm",LTS:"HH.mm.ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY [pukul] HH.mm",LLLL:"dddd, D MMMM YYYY [pukul] HH.mm"},meridiemParse:/pagi|tengahari|petang|malam/,meridiemHour:function(e,a){return 12===e&&(e=0),"pagi"===a?e:"tengahari"===a?e>=11?e:e+12:"petang"===a||"malam"===a?e+12:void 0},meridiem:function(e,a,t){return e<11?"pagi":e<15?"tengahari":e<19?"petang":"malam"},calendar:{sameDay:"[Hari ini pukul] LT",nextDay:"[Esok pukul] LT",nextWeek:"dddd [pukul] LT",lastDay:"[Kelmarin pukul] LT",lastWeek:"dddd [lepas pukul] LT",sameElse:"L"},relativeTime:{future:"dalam %s",past:"%s yang lepas",s:"beberapa saat",m:"seminit",mm:"%d minit",h:"sejam",hh:"%d jam",d:"sehari",dd:"%d hari",M:"sebulan",MM:"%d bulan",y:"setahun",yy:"%d tahun"},week:{dow:1,doy:7}});var o_={1:"၁",2:"၂",3:"၃",4:"၄",5:"၅",6:"၆",7:"၇",8:"၈",9:"၉",0:"၀"},m_={"၁":"1","၂":"2","၃":"3","၄":"4","၅":"5","၆":"6","၇":"7","၈":"8","၉":"9","၀":"0"};e.defineLocale("my",{months:"ဇန်နဝါရီ_ဖေဖော်ဝါရီ_မတ်_ဧပြီ_မေ_ဇွန်_ဇူလိုင်_သြဂုတ်_စက်တင်ဘာ_အောက်တိုဘာ_နိုဝင်ဘာ_ဒီဇင်ဘာ".split("_"),monthsShort:"ဇန်_ဖေ_မတ်_ပြီ_မေ_ဇွန်_လိုင်_သြ_စက်_အောက်_နို_ဒီ".split("_"),weekdays:"တနင်္ဂနွေ_တနင်္လာ_အင်္ဂါ_ဗုဒ္ဓဟူး_ကြာသပတေး_သောကြာ_စနေ".split("_"),weekdaysShort:"နွေ_လာ_ဂါ_ဟူး_ကြာ_သော_နေ".split("_"),weekdaysMin:"နွေ_လာ_ဂါ_ဟူး_ကြာ_သော_နေ".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D MMMM YYYY HH:mm"},calendar:{sameDay:"[ယနေ.] LT [မှာ]",nextDay:"[မနက်ဖြန်] LT [မှာ]",nextWeek:"dddd LT [မှာ]",lastDay:"[မနေ.က] LT [မှာ]",lastWeek:"[ပြီးခဲ့သော] dddd LT [မှာ]",sameElse:"L"},relativeTime:{future:"လာမည့် %s မှာ",past:"လွန်ခဲ့သော %s က",s:"စက္ကန်.အနည်းငယ်",m:"တစ်မိနစ်",mm:"%d မိနစ်",h:"တစ်နာရီ",hh:"%d နာရီ",d:"တစ်ရက်",dd:"%d ရက်",M:"တစ်လ",MM:"%d လ",y:"တစ်နှစ်",yy:"%d နှစ်"},preparse:function(e){return e.replace(/[၁၂၃၄၅၆၇၈၉၀]/g,function(e){return m_[e]})},postformat:function(e){return e.replace(/\d/g,function(e){return o_[e]})},week:{dow:1,doy:4}}),e.defineLocale("nb",{months:"januar_februar_mars_april_mai_juni_juli_august_september_oktober_november_desember".split("_"),monthsShort:"jan._feb._mars_april_mai_juni_juli_aug._sep._okt._nov._des.".split("_"),monthsParseExact:!0,weekdays:"søndag_mandag_tirsdag_onsdag_torsdag_fredag_lørdag".split("_"),weekdaysShort:"sø._ma._ti._on._to._fr._lø.".split("_"),weekdaysMin:"sø_ma_ti_on_to_fr_lø".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY [kl.] HH:mm",LLLL:"dddd D. MMMM YYYY [kl.] HH:mm"},calendar:{sameDay:"[i dag kl.] LT",nextDay:"[i morgen kl.] LT",nextWeek:"dddd [kl.] LT",lastDay:"[i går kl.] LT",lastWeek:"[forrige] dddd [kl.] LT",sameElse:"L"},relativeTime:{future:"om %s",past:"%s siden",s:"noen sekunder",m:"ett minutt",mm:"%d minutter",h:"en time",hh:"%d timer",d:"en dag",dd:"%d dager",M:"en måned",MM:"%d måneder",y:"ett år",yy:"%d år"},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}});var u_={1:"१",2:"२",3:"३",4:"४",5:"५",6:"६",7:"७",8:"८",9:"९",0:"०"},l_={"१":"1","२":"2","३":"3","४":"4","५":"5","६":"6","७":"7","८":"8","९":"9","०":"0"};e.defineLocale("ne",{months:"जनवरी_फेब्रुवरी_मार्च_अप्रिल_मई_जुन_जुलाई_अगष्ट_सेप्टेम्बर_अक्टोबर_नोभेम्बर_डिसेम्बर".split("_"),monthsShort:"जन._फेब्रु._मार्च_अप्रि._मई_जुन_जुलाई._अग._सेप्ट._अक्टो._नोभे._डिसे.".split("_"),monthsParseExact:!0,weekdays:"आइतबार_सोमबार_मङ्गलबार_बुधबार_बिहिबार_शुक्रबार_शनिबार".split("_"),weekdaysShort:"आइत._सोम._मङ्गल._बुध._बिहि._शुक्र._शनि.".split("_"),weekdaysMin:"आ._सो._मं._बु._बि._शु._श.".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"Aको h:mm बजे",LTS:"Aको h:mm:ss बजे",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY, Aको h:mm बजे",LLLL:"dddd, D MMMM YYYY, Aको h:mm बजे"},preparse:function(e){return e.replace(/[१२३४५६७८९०]/g,function(e){return l_[e]})},postformat:function(e){return e.replace(/\d/g,function(e){return u_[e]})},meridiemParse:/राति|बिहान|दिउँसो|साँझ/,meridiemHour:function(e,a){return 12===e&&(e=0),"राति"===a?e<4?e:e+12:"बिहान"===a?e:"दिउँसो"===a?e>=10?e:e+12:"साँझ"===a?e+12:void 0},meridiem:function(e,a,t){return e<3?"राति":e<12?"बिहान":e<16?"दिउँसो":e<20?"साँझ":"राति"},calendar:{sameDay:"[आज] LT",nextDay:"[भोलि] LT",nextWeek:"[आउँदो] dddd[,] LT",lastDay:"[हिजो] LT",lastWeek:"[गएको] dddd[,] LT",sameElse:"L"},relativeTime:{future:"%sमा",past:"%s अगाडि",s:"केही क्षण",m:"एक मिनेट",mm:"%d मिनेट",h:"एक घण्टा",hh:"%d घण्टा",d:"एक दिन",dd:"%d दिन",M:"एक महिना",MM:"%d महिना",y:"एक बर्ष",yy:"%d बर्ष"},week:{dow:0,doy:6}});var M_="jan._feb._mrt._apr._mei_jun._jul._aug._sep._okt._nov._dec.".split("_"),h_="jan_feb_mrt_apr_mei_jun_jul_aug_sep_okt_nov_dec".split("_"),L_=[/^jan/i,/^feb/i,/^maart|mrt.?$/i,/^apr/i,/^mei$/i,/^jun[i.]?$/i,/^jul[i.]?$/i,/^aug/i,/^sep/i,/^okt/i,/^nov/i,/^dec/i],c_=/^(januari|februari|maart|april|mei|april|ju[nl]i|augustus|september|oktober|november|december|jan\.?|feb\.?|mrt\.?|apr\.?|ju[nl]\.?|aug\.?|sep\.?|okt\.?|nov\.?|dec\.?)/i;e.defineLocale("nl-be",{months:"januari_februari_maart_april_mei_juni_juli_augustus_september_oktober_november_december".split("_"),monthsShort:function(e,a){return e?/-MMM-/.test(a)?h_[e.month()]:M_[e.month()]:M_},monthsRegex:c_,monthsShortRegex:c_,monthsStrictRegex:/^(januari|februari|maart|mei|ju[nl]i|april|augustus|september|oktober|november|december)/i,monthsShortStrictRegex:/^(jan\.?|feb\.?|mrt\.?|apr\.?|mei|ju[nl]\.?|aug\.?|sep\.?|okt\.?|nov\.?|dec\.?)/i,monthsParse:L_,longMonthsParse:L_,shortMonthsParse:L_,weekdays:"zondag_maandag_dinsdag_woensdag_donderdag_vrijdag_zaterdag".split("_"),weekdaysShort:"zo._ma._di._wo._do._vr._za.".split("_"),weekdaysMin:"Zo_Ma_Di_Wo_Do_Vr_Za".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D MMMM YYYY HH:mm"},calendar:{sameDay:"[vandaag om] LT",nextDay:"[morgen om] LT",nextWeek:"dddd [om] LT",lastDay:"[gisteren om] LT",lastWeek:"[afgelopen] dddd [om] LT",sameElse:"L"},relativeTime:{future:"over %s",past:"%s geleden",s:"een paar seconden",m:"één minuut",mm:"%d minuten",h:"één uur",hh:"%d uur",d:"één dag",dd:"%d dagen",M:"één maand",MM:"%d maanden",y:"één jaar",yy:"%d jaar"},dayOfMonthOrdinalParse:/\d{1,2}(ste|de)/,ordinal:function(e){return e+(1===e||8===e||e>=20?"ste":"de")},week:{dow:1,doy:4}});var Y_="jan._feb._mrt._apr._mei_jun._jul._aug._sep._okt._nov._dec.".split("_"),y_="jan_feb_mrt_apr_mei_jun_jul_aug_sep_okt_nov_dec".split("_"),f_=[/^jan/i,/^feb/i,/^maart|mrt.?$/i,/^apr/i,/^mei$/i,/^jun[i.]?$/i,/^jul[i.]?$/i,/^aug/i,/^sep/i,/^okt/i,/^nov/i,/^dec/i],p_=/^(januari|februari|maart|april|mei|april|ju[nl]i|augustus|september|oktober|november|december|jan\.?|feb\.?|mrt\.?|apr\.?|ju[nl]\.?|aug\.?|sep\.?|okt\.?|nov\.?|dec\.?)/i;e.defineLocale("nl",{months:"januari_februari_maart_april_mei_juni_juli_augustus_september_oktober_november_december".split("_"),monthsShort:function(e,a){return e?/-MMM-/.test(a)?y_[e.month()]:Y_[e.month()]:Y_},monthsRegex:p_,monthsShortRegex:p_,monthsStrictRegex:/^(januari|februari|maart|mei|ju[nl]i|april|augustus|september|oktober|november|december)/i,monthsShortStrictRegex:/^(jan\.?|feb\.?|mrt\.?|apr\.?|mei|ju[nl]\.?|aug\.?|sep\.?|okt\.?|nov\.?|dec\.?)/i,monthsParse:f_,longMonthsParse:f_,shortMonthsParse:f_,weekdays:"zondag_maandag_dinsdag_woensdag_donderdag_vrijdag_zaterdag".split("_"),weekdaysShort:"zo._ma._di._wo._do._vr._za.".split("_"),weekdaysMin:"Zo_Ma_Di_Wo_Do_Vr_Za".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD-MM-YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D MMMM YYYY HH:mm"},calendar:{sameDay:"[vandaag om] LT",nextDay:"[morgen om] LT",nextWeek:"dddd [om] LT",lastDay:"[gisteren om] LT",lastWeek:"[afgelopen] dddd [om] LT",sameElse:"L"},relativeTime:{future:"over %s",past:"%s geleden",s:"een paar seconden",m:"één minuut",mm:"%d minuten",h:"één uur",hh:"%d uur",d:"één dag",dd:"%d dagen",M:"één maand",MM:"%d maanden",y:"één jaar",yy:"%d jaar"},dayOfMonthOrdinalParse:/\d{1,2}(ste|de)/,ordinal:function(e){return e+(1===e||8===e||e>=20?"ste":"de")},week:{dow:1,doy:4}}),e.defineLocale("nn",{months:"januar_februar_mars_april_mai_juni_juli_august_september_oktober_november_desember".split("_"),monthsShort:"jan_feb_mar_apr_mai_jun_jul_aug_sep_okt_nov_des".split("_"),weekdays:"sundag_måndag_tysdag_onsdag_torsdag_fredag_laurdag".split("_"),weekdaysShort:"sun_mån_tys_ons_tor_fre_lau".split("_"),weekdaysMin:"su_må_ty_on_to_fr_lø".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY [kl.] H:mm",LLLL:"dddd D. MMMM YYYY [kl.] HH:mm"},calendar:{sameDay:"[I dag klokka] LT",nextDay:"[I morgon klokka] LT",nextWeek:"dddd [klokka] LT",lastDay:"[I går klokka] LT",lastWeek:"[Føregåande] dddd [klokka] LT",sameElse:"L"},relativeTime:{future:"om %s",past:"%s sidan",s:"nokre sekund",m:"eit minutt",
mm:"%d minutt",h:"ein time",hh:"%d timar",d:"ein dag",dd:"%d dagar",M:"ein månad",MM:"%d månader",y:"eit år",yy:"%d år"},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}});var D_={1:"੧",2:"੨",3:"੩",4:"੪",5:"੫",6:"੬",7:"੭",8:"੮",9:"੯",0:"੦"},k_={"੧":"1","੨":"2","੩":"3","੪":"4","੫":"5","੬":"6","੭":"7","੮":"8","੯":"9","੦":"0"};e.defineLocale("pa-in",{months:"ਜਨਵਰੀ_ਫ਼ਰਵਰੀ_ਮਾਰਚ_ਅਪ੍ਰੈਲ_ਮਈ_ਜੂਨ_ਜੁਲਾਈ_ਅਗਸਤ_ਸਤੰਬਰ_ਅਕਤੂਬਰ_ਨਵੰਬਰ_ਦਸੰਬਰ".split("_"),monthsShort:"ਜਨਵਰੀ_ਫ਼ਰਵਰੀ_ਮਾਰਚ_ਅਪ੍ਰੈਲ_ਮਈ_ਜੂਨ_ਜੁਲਾਈ_ਅਗਸਤ_ਸਤੰਬਰ_ਅਕਤੂਬਰ_ਨਵੰਬਰ_ਦਸੰਬਰ".split("_"),weekdays:"ਐਤਵਾਰ_ਸੋਮਵਾਰ_ਮੰਗਲਵਾਰ_ਬੁਧਵਾਰ_ਵੀਰਵਾਰ_ਸ਼ੁੱਕਰਵਾਰ_ਸ਼ਨੀਚਰਵਾਰ".split("_"),weekdaysShort:"ਐਤ_ਸੋਮ_ਮੰਗਲ_ਬੁਧ_ਵੀਰ_ਸ਼ੁਕਰ_ਸ਼ਨੀ".split("_"),weekdaysMin:"ਐਤ_ਸੋਮ_ਮੰਗਲ_ਬੁਧ_ਵੀਰ_ਸ਼ੁਕਰ_ਸ਼ਨੀ".split("_"),longDateFormat:{LT:"A h:mm ਵਜੇ",LTS:"A h:mm:ss ਵਜੇ",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY, A h:mm ਵਜੇ",LLLL:"dddd, D MMMM YYYY, A h:mm ਵਜੇ"},calendar:{sameDay:"[ਅਜ] LT",nextDay:"[ਕਲ] LT",nextWeek:"dddd, LT",lastDay:"[ਕਲ] LT",lastWeek:"[ਪਿਛਲੇ] dddd, LT",sameElse:"L"},relativeTime:{future:"%s ਵਿੱਚ",past:"%s ਪਿਛਲੇ",s:"ਕੁਝ ਸਕਿੰਟ",m:"ਇਕ ਮਿੰਟ",mm:"%d ਮਿੰਟ",h:"ਇੱਕ ਘੰਟਾ",hh:"%d ਘੰਟੇ",d:"ਇੱਕ ਦਿਨ",dd:"%d ਦਿਨ",M:"ਇੱਕ ਮਹੀਨਾ",MM:"%d ਮਹੀਨੇ",y:"ਇੱਕ ਸਾਲ",yy:"%d ਸਾਲ"},preparse:function(e){return e.replace(/[੧੨੩੪੫੬੭੮੯੦]/g,function(e){return k_[e]})},postformat:function(e){return e.replace(/\d/g,function(e){return D_[e]})},meridiemParse:/ਰਾਤ|ਸਵੇਰ|ਦੁਪਹਿਰ|ਸ਼ਾਮ/,meridiemHour:function(e,a){return 12===e&&(e=0),"ਰਾਤ"===a?e<4?e:e+12:"ਸਵੇਰ"===a?e:"ਦੁਪਹਿਰ"===a?e>=10?e:e+12:"ਸ਼ਾਮ"===a?e+12:void 0},meridiem:function(e,a,t){return e<4?"ਰਾਤ":e<10?"ਸਵੇਰ":e<17?"ਦੁਪਹਿਰ":e<20?"ਸ਼ਾਮ":"ਰਾਤ"},week:{dow:0,doy:6}});var T_="styczeń_luty_marzec_kwiecień_maj_czerwiec_lipiec_sierpień_wrzesień_październik_listopad_grudzień".split("_"),g_="stycznia_lutego_marca_kwietnia_maja_czerwca_lipca_sierpnia_września_października_listopada_grudnia".split("_");e.defineLocale("pl",{months:function(e,a){return e?""===a?"("+g_[e.month()]+"|"+T_[e.month()]+")":/D MMMM/.test(a)?g_[e.month()]:T_[e.month()]:T_},monthsShort:"sty_lut_mar_kwi_maj_cze_lip_sie_wrz_paź_lis_gru".split("_"),weekdays:"niedziela_poniedziałek_wtorek_środa_czwartek_piątek_sobota".split("_"),weekdaysShort:"ndz_pon_wt_śr_czw_pt_sob".split("_"),weekdaysMin:"Nd_Pn_Wt_Śr_Cz_Pt_So".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD.MM.YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd, D MMMM YYYY HH:mm"},calendar:{sameDay:"[Dziś o] LT",nextDay:"[Jutro o] LT",nextWeek:"[W] dddd [o] LT",lastDay:"[Wczoraj o] LT",lastWeek:function(){switch(this.day()){case 0:return"[W zeszłą niedzielę o] LT";case 3:return"[W zeszłą środę o] LT";case 6:return"[W zeszłą sobotę o] LT";default:return"[W zeszły] dddd [o] LT"}},sameElse:"L"},relativeTime:{future:"za %s",past:"%s temu",s:"kilka sekund",m:en,mm:en,h:en,hh:en,d:"1 dzień",dd:"%d dni",M:"miesiąc",MM:en,y:"rok",yy:en},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}}),e.defineLocale("pt-br",{months:"Janeiro_Fevereiro_Março_Abril_Maio_Junho_Julho_Agosto_Setembro_Outubro_Novembro_Dezembro".split("_"),monthsShort:"Jan_Fev_Mar_Abr_Mai_Jun_Jul_Ago_Set_Out_Nov_Dez".split("_"),weekdays:"Domingo_Segunda-feira_Terça-feira_Quarta-feira_Quinta-feira_Sexta-feira_Sábado".split("_"),weekdaysShort:"Dom_Seg_Ter_Qua_Qui_Sex_Sáb".split("_"),weekdaysMin:"Do_2ª_3ª_4ª_5ª_6ª_Sá".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D [de] MMMM [de] YYYY",LLL:"D [de] MMMM [de] YYYY [às] HH:mm",LLLL:"dddd, D [de] MMMM [de] YYYY [às] HH:mm"},calendar:{sameDay:"[Hoje às] LT",nextDay:"[Amanhã às] LT",nextWeek:"dddd [às] LT",lastDay:"[Ontem às] LT",lastWeek:function(){return 0===this.day()||6===this.day()?"[Último] dddd [às] LT":"[Última] dddd [às] LT"},sameElse:"L"},relativeTime:{future:"em %s",past:"%s atrás",s:"poucos segundos",m:"um minuto",mm:"%d minutos",h:"uma hora",hh:"%d horas",d:"um dia",dd:"%d dias",M:"um mês",MM:"%d meses",y:"um ano",yy:"%d anos"},dayOfMonthOrdinalParse:/\d{1,2}º/,ordinal:"%dº"}),e.defineLocale("pt",{months:"Janeiro_Fevereiro_Março_Abril_Maio_Junho_Julho_Agosto_Setembro_Outubro_Novembro_Dezembro".split("_"),monthsShort:"Jan_Fev_Mar_Abr_Mai_Jun_Jul_Ago_Set_Out_Nov_Dez".split("_"),weekdays:"Domingo_Segunda-Feira_Terça-Feira_Quarta-Feira_Quinta-Feira_Sexta-Feira_Sábado".split("_"),weekdaysShort:"Dom_Seg_Ter_Qua_Qui_Sex_Sáb".split("_"),weekdaysMin:"Do_2ª_3ª_4ª_5ª_6ª_Sá".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D [de] MMMM [de] YYYY",LLL:"D [de] MMMM [de] YYYY HH:mm",LLLL:"dddd, D [de] MMMM [de] YYYY HH:mm"},calendar:{sameDay:"[Hoje às] LT",nextDay:"[Amanhã às] LT",nextWeek:"dddd [às] LT",lastDay:"[Ontem às] LT",lastWeek:function(){return 0===this.day()||6===this.day()?"[Último] dddd [às] LT":"[Última] dddd [às] LT"},sameElse:"L"},relativeTime:{future:"em %s",past:"há %s",s:"segundos",m:"um minuto",mm:"%d minutos",h:"uma hora",hh:"%d horas",d:"um dia",dd:"%d dias",M:"um mês",MM:"%d meses",y:"um ano",yy:"%d anos"},dayOfMonthOrdinalParse:/\d{1,2}º/,ordinal:"%dº",week:{dow:1,doy:4}}),e.defineLocale("ro",{months:"ianuarie_februarie_martie_aprilie_mai_iunie_iulie_august_septembrie_octombrie_noiembrie_decembrie".split("_"),monthsShort:"ian._febr._mart._apr._mai_iun._iul._aug._sept._oct._nov._dec.".split("_"),monthsParseExact:!0,weekdays:"duminică_luni_marți_miercuri_joi_vineri_sâmbătă".split("_"),weekdaysShort:"Dum_Lun_Mar_Mie_Joi_Vin_Sâm".split("_"),weekdaysMin:"Du_Lu_Ma_Mi_Jo_Vi_Sâ".split("_"),longDateFormat:{LT:"H:mm",LTS:"H:mm:ss",L:"DD.MM.YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY H:mm",LLLL:"dddd, D MMMM YYYY H:mm"},calendar:{sameDay:"[azi la] LT",nextDay:"[mâine la] LT",nextWeek:"dddd [la] LT",lastDay:"[ieri la] LT",lastWeek:"[fosta] dddd [la] LT",sameElse:"L"},relativeTime:{future:"peste %s",past:"%s în urmă",s:"câteva secunde",m:"un minut",mm:an,h:"o oră",hh:an,d:"o zi",dd:an,M:"o lună",MM:an,y:"un an",yy:an},week:{dow:1,doy:7}});var w_=[/^янв/i,/^фев/i,/^мар/i,/^апр/i,/^ма[йя]/i,/^июн/i,/^июл/i,/^авг/i,/^сен/i,/^окт/i,/^ноя/i,/^дек/i];e.defineLocale("ru",{months:{format:"января_февраля_марта_апреля_мая_июня_июля_августа_сентября_октября_ноября_декабря".split("_"),standalone:"январь_февраль_март_апрель_май_июнь_июль_август_сентябрь_октябрь_ноябрь_декабрь".split("_")},monthsShort:{format:"янв._февр._мар._апр._мая_июня_июля_авг._сент._окт._нояб._дек.".split("_"),standalone:"янв._февр._март_апр._май_июнь_июль_авг._сент._окт._нояб._дек.".split("_")},weekdays:{standalone:"воскресенье_понедельник_вторник_среда_четверг_пятница_суббота".split("_"),format:"воскресенье_понедельник_вторник_среду_четверг_пятницу_субботу".split("_"),isFormat:/\[ ?[Вв] ?(?:прошлую|следующую|эту)? ?\] ?dddd/},weekdaysShort:"вс_пн_вт_ср_чт_пт_сб".split("_"),weekdaysMin:"вс_пн_вт_ср_чт_пт_сб".split("_"),monthsParse:w_,longMonthsParse:w_,shortMonthsParse:w_,monthsRegex:/^(январ[ья]|янв\.?|феврал[ья]|февр?\.?|марта?|мар\.?|апрел[ья]|апр\.?|ма[йя]|июн[ья]|июн\.?|июл[ья]|июл\.?|августа?|авг\.?|сентябр[ья]|сент?\.?|октябр[ья]|окт\.?|ноябр[ья]|нояб?\.?|декабр[ья]|дек\.?)/i,monthsShortRegex:/^(январ[ья]|янв\.?|феврал[ья]|февр?\.?|марта?|мар\.?|апрел[ья]|апр\.?|ма[йя]|июн[ья]|июн\.?|июл[ья]|июл\.?|августа?|авг\.?|сентябр[ья]|сент?\.?|октябр[ья]|окт\.?|ноябр[ья]|нояб?\.?|декабр[ья]|дек\.?)/i,monthsStrictRegex:/^(январ[яь]|феврал[яь]|марта?|апрел[яь]|ма[яй]|июн[яь]|июл[яь]|августа?|сентябр[яь]|октябр[яь]|ноябр[яь]|декабр[яь])/i,monthsShortStrictRegex:/^(янв\.|февр?\.|мар[т.]|апр\.|ма[яй]|июн[ья.]|июл[ья.]|авг\.|сент?\.|окт\.|нояб?\.|дек\.)/i,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD.MM.YYYY",LL:"D MMMM YYYY г.",LLL:"D MMMM YYYY г., HH:mm",LLLL:"dddd, D MMMM YYYY г., HH:mm"},calendar:{sameDay:"[Сегодня в] LT",nextDay:"[Завтра в] LT",lastDay:"[Вчера в] LT",nextWeek:function(e){if(e.week()===this.week())return 2===this.day()?"[Во] dddd [в] LT":"[В] dddd [в] LT";switch(this.day()){case 0:return"[В следующее] dddd [в] LT";case 1:case 2:case 4:return"[В следующий] dddd [в] LT";case 3:case 5:case 6:return"[В следующую] dddd [в] LT"}},lastWeek:function(e){if(e.week()===this.week())return 2===this.day()?"[Во] dddd [в] LT":"[В] dddd [в] LT";switch(this.day()){case 0:return"[В прошлое] dddd [в] LT";case 1:case 2:case 4:return"[В прошлый] dddd [в] LT";case 3:case 5:case 6:return"[В прошлую] dddd [в] LT"}},sameElse:"L"},relativeTime:{future:"через %s",past:"%s назад",s:"несколько секунд",m:sn,mm:sn,h:"час",hh:sn,d:"день",dd:sn,M:"месяц",MM:sn,y:"год",yy:sn},meridiemParse:/ночи|утра|дня|вечера/i,isPM:function(e){return/^(дня|вечера)$/.test(e)},meridiem:function(e,a,t){return e<4?"ночи":e<12?"утра":e<17?"дня":"вечера"},dayOfMonthOrdinalParse:/\d{1,2}-(й|го|я)/,ordinal:function(e,a){switch(a){case"M":case"d":case"DDD":return e+"-й";case"D":return e+"-го";case"w":case"W":return e+"-я";default:return e}},week:{dow:1,doy:7}});var v_=["جنوري","فيبروري","مارچ","اپريل","مئي","جون","جولاءِ","آگسٽ","سيپٽمبر","آڪٽوبر","نومبر","ڊسمبر"],H_=["آچر","سومر","اڱارو","اربع","خميس","جمع","ڇنڇر"];e.defineLocale("sd",{months:v_,monthsShort:v_,weekdays:H_,weekdaysShort:H_,weekdaysMin:H_,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd، D MMMM YYYY HH:mm"},meridiemParse:/صبح|شام/,isPM:function(e){return"شام"===e},meridiem:function(e,a,t){return e<12?"صبح":"شام"},calendar:{sameDay:"[اڄ] LT",nextDay:"[سڀاڻي] LT",nextWeek:"dddd [اڳين هفتي تي] LT",lastDay:"[ڪالهه] LT",lastWeek:"[گزريل هفتي] dddd [تي] LT",sameElse:"L"},relativeTime:{future:"%s پوء",past:"%s اڳ",s:"چند سيڪنڊ",m:"هڪ منٽ",mm:"%d منٽ",h:"هڪ ڪلاڪ",hh:"%d ڪلاڪ",d:"هڪ ڏينهن",dd:"%d ڏينهن",M:"هڪ مهينو",MM:"%d مهينا",y:"هڪ سال",yy:"%d سال"},preparse:function(e){return e.replace(/،/g,",")},postformat:function(e){return e.replace(/,/g,"،")},week:{dow:1,doy:4}}),e.defineLocale("se",{months:"ođđajagemánnu_guovvamánnu_njukčamánnu_cuoŋománnu_miessemánnu_geassemánnu_suoidnemánnu_borgemánnu_čakčamánnu_golggotmánnu_skábmamánnu_juovlamánnu".split("_"),monthsShort:"ođđj_guov_njuk_cuo_mies_geas_suoi_borg_čakč_golg_skáb_juov".split("_"),weekdays:"sotnabeaivi_vuossárga_maŋŋebárga_gaskavahkku_duorastat_bearjadat_lávvardat".split("_"),weekdaysShort:"sotn_vuos_maŋ_gask_duor_bear_láv".split("_"),weekdaysMin:"s_v_m_g_d_b_L".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD.MM.YYYY",LL:"MMMM D. [b.] YYYY",LLL:"MMMM D. [b.] YYYY [ti.] HH:mm",LLLL:"dddd, MMMM D. [b.] YYYY [ti.] HH:mm"},calendar:{sameDay:"[otne ti] LT",nextDay:"[ihttin ti] LT",nextWeek:"dddd [ti] LT",lastDay:"[ikte ti] LT",lastWeek:"[ovddit] dddd [ti] LT",sameElse:"L"},relativeTime:{future:"%s geažes",past:"maŋit %s",s:"moadde sekunddat",m:"okta minuhta",mm:"%d minuhtat",h:"okta diimmu",hh:"%d diimmut",d:"okta beaivi",dd:"%d beaivvit",M:"okta mánnu",MM:"%d mánut",y:"okta jahki",yy:"%d jagit"},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}}),e.defineLocale("si",{months:"ජනවාරි_පෙබරවාරි_මාර්තු_අප්‍රේල්_මැයි_ජූනි_ජූලි_අගෝස්තු_සැප්තැම්බර්_ඔක්තෝබර්_නොවැම්බර්_දෙසැම්බර්".split("_"),monthsShort:"ජන_පෙබ_මාර්_අප්_මැයි_ජූනි_ජූලි_අගෝ_සැප්_ඔක්_නොවැ_දෙසැ".split("_"),weekdays:"ඉරිදා_සඳුදා_අඟහරුවාදා_බදාදා_බ්‍රහස්පතින්දා_සිකුරාදා_සෙනසුරාදා".split("_"),weekdaysShort:"ඉරි_සඳු_අඟ_බදා_බ්‍රහ_සිකු_සෙන".split("_"),weekdaysMin:"ඉ_ස_අ_බ_බ්‍ර_සි_සෙ".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"a h:mm",LTS:"a h:mm:ss",L:"YYYY/MM/DD",LL:"YYYY MMMM D",LLL:"YYYY MMMM D, a h:mm",LLLL:"YYYY MMMM D [වැනි] dddd, a h:mm:ss"},calendar:{sameDay:"[අද] LT[ට]",nextDay:"[හෙට] LT[ට]",nextWeek:"dddd LT[ට]",lastDay:"[ඊයේ] LT[ට]",lastWeek:"[පසුගිය] dddd LT[ට]",sameElse:"L"},relativeTime:{future:"%sකින්",past:"%sකට පෙර",s:"තත්පර කිහිපය",m:"මිනිත්තුව",mm:"මිනිත්තු %d",h:"පැය",hh:"පැය %d",d:"දිනය",dd:"දින %d",M:"මාසය",MM:"මාස %d",y:"වසර",yy:"වසර %d"},dayOfMonthOrdinalParse:/\d{1,2} වැනි/,ordinal:function(e){return e+" වැනි"},meridiemParse:/පෙර වරු|පස් වරු|පෙ.ව|ප.ව./,isPM:function(e){return"ප.ව."===e||"පස් වරු"===e},meridiem:function(e,a,t){return e>11?t?"ප.ව.":"පස් වරු":t?"පෙ.ව.":"පෙර වරු"}});var S_="január_február_marec_apríl_máj_jún_júl_august_september_október_november_december".split("_"),b_="jan_feb_mar_apr_máj_jún_júl_aug_sep_okt_nov_dec".split("_");e.defineLocale("sk",{months:S_,monthsShort:b_,weekdays:"nedeľa_pondelok_utorok_streda_štvrtok_piatok_sobota".split("_"),weekdaysShort:"ne_po_ut_st_št_pi_so".split("_"),weekdaysMin:"ne_po_ut_st_št_pi_so".split("_"),longDateFormat:{LT:"H:mm",LTS:"H:mm:ss",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY H:mm",LLLL:"dddd D. MMMM YYYY H:mm"},calendar:{sameDay:"[dnes o] LT",nextDay:"[zajtra o] LT",nextWeek:function(){switch(this.day()){case 0:return"[v nedeľu o] LT";case 1:case 2:return"[v] dddd [o] LT";case 3:return"[v stredu o] LT";case 4:return"[vo štvrtok o] LT";case 5:return"[v piatok o] LT";case 6:return"[v sobotu o] LT"}},lastDay:"[včera o] LT",lastWeek:function(){switch(this.day()){case 0:return"[minulú nedeľu o] LT";case 1:case 2:return"[minulý] dddd [o] LT";case 3:return"[minulú stredu o] LT";case 4:case 5:return"[minulý] dddd [o] LT";case 6:return"[minulú sobotu o] LT"}},sameElse:"L"},relativeTime:{future:"za %s",past:"pred %s",s:rn,m:rn,mm:rn,h:rn,hh:rn,d:rn,dd:rn,M:rn,MM:rn,y:rn,yy:rn},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}}),e.defineLocale("sl",{months:"januar_februar_marec_april_maj_junij_julij_avgust_september_oktober_november_december".split("_"),monthsShort:"jan._feb._mar._apr._maj._jun._jul._avg._sep._okt._nov._dec.".split("_"),monthsParseExact:!0,weekdays:"nedelja_ponedeljek_torek_sreda_četrtek_petek_sobota".split("_"),weekdaysShort:"ned._pon._tor._sre._čet._pet._sob.".split("_"),weekdaysMin:"ne_po_to_sr_če_pe_so".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"H:mm",LTS:"H:mm:ss",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY H:mm",LLLL:"dddd, D. MMMM YYYY H:mm"},calendar:{sameDay:"[danes ob] LT",nextDay:"[jutri ob] LT",nextWeek:function(){switch(this.day()){case 0:return"[v] [nedeljo] [ob] LT";case 3:return"[v] [sredo] [ob] LT";case 6:return"[v] [soboto] [ob] LT";case 1:case 2:case 4:case 5:return"[v] dddd [ob] LT"}},lastDay:"[včeraj ob] LT",lastWeek:function(){switch(this.day()){case 0:return"[prejšnjo] [nedeljo] [ob] LT";case 3:return"[prejšnjo] [sredo] [ob] LT";case 6:return"[prejšnjo] [soboto] [ob] LT";case 1:case 2:case 4:case 5:return"[prejšnji] dddd [ob] LT"}},sameElse:"L"},relativeTime:{future:"čez %s",past:"pred %s",s:dn,m:dn,mm:dn,h:dn,hh:dn,d:dn,dd:dn,M:dn,MM:dn,y:dn,yy:dn},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:7}}),e.defineLocale("sq",{months:"Janar_Shkurt_Mars_Prill_Maj_Qershor_Korrik_Gusht_Shtator_Tetor_Nëntor_Dhjetor".split("_"),monthsShort:"Jan_Shk_Mar_Pri_Maj_Qer_Kor_Gus_Sht_Tet_Nën_Dhj".split("_"),weekdays:"E Diel_E Hënë_E Martë_E Mërkurë_E Enjte_E Premte_E Shtunë".split("_"),weekdaysShort:"Die_Hën_Mar_Mër_Enj_Pre_Sht".split("_"),weekdaysMin:"D_H_Ma_Më_E_P_Sh".split("_"),weekdaysParseExact:!0,meridiemParse:/PD|MD/,isPM:function(e){return"M"===e.charAt(0)},meridiem:function(e,a,t){return e<12?"PD":"MD"},longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd, D MMMM YYYY HH:mm"},calendar:{sameDay:"[Sot në] LT",nextDay:"[Nesër në] LT",nextWeek:"dddd [në] LT",lastDay:"[Dje në] LT",lastWeek:"dddd [e kaluar në] LT",sameElse:"L"},relativeTime:{future:"në %s",past:"%s më parë",s:"disa sekonda",m:"një minutë",mm:"%d minuta",h:"një orë",hh:"%d orë",d:"një ditë",dd:"%d ditë",M:"një muaj",MM:"%d muaj",y:"një vit",yy:"%d vite"},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}});var j_={words:{m:["један минут","једне минуте"],mm:["минут","минуте","минута"],h:["један сат","једног сата"],hh:["сат","сата","сати"],dd:["дан","дана","дана"],MM:["месец","месеца","месеци"],yy:["година","године","година"]},correctGrammaticalCase:function(e,a){return 1===e?a[0]:e>=2&&e<=4?a[1]:a[2]},translate:function(e,a,t){var s=j_.words[t];return 1===t.length?a?s[0]:s[1]:e+" "+j_.correctGrammaticalCase(e,s)}};e.defineLocale("sr-cyrl",{months:"јануар_фебруар_март_април_мај_јун_јул_август_септембар_октобар_новембар_децембар".split("_"),monthsShort:"јан._феб._мар._апр._мај_јун_јул_авг._сеп._окт._нов._дец.".split("_"),monthsParseExact:!0,weekdays:"недеља_понедељак_уторак_среда_четвртак_петак_субота".split("_"),weekdaysShort:"нед._пон._уто._сре._чет._пет._суб.".split("_"),weekdaysMin:"не_по_ут_ср_че_пе_су".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"H:mm",LTS:"H:mm:ss",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY H:mm",LLLL:"dddd, D. MMMM YYYY H:mm"},calendar:{sameDay:"[данас у] LT",nextDay:"[сутра у] LT",nextWeek:function(){switch(this.day()){case 0:return"[у] [недељу] [у] LT";case 3:return"[у] [среду] [у] LT";case 6:return"[у] [суботу] [у] LT";case 1:case 2:case 4:case 5:return"[у] dddd [у] LT"}},lastDay:"[јуче у] LT",lastWeek:function(){return["[прошле] [недеље] [у] LT","[прошлог] [понедељка] [у] LT","[прошлог] [уторка] [у] LT","[прошле] [среде] [у] LT","[прошлог] [четвртка] [у] LT","[прошлог] [петка] [у] LT","[прошле] [суботе] [у] LT"][this.day()]},sameElse:"L"},relativeTime:{future:"за %s",past:"пре %s",s:"неколико секунди",m:j_.translate,mm:j_.translate,h:j_.translate,hh:j_.translate,d:"дан",dd:j_.translate,M:"месец",MM:j_.translate,y:"годину",yy:j_.translate},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:7}});var x_={words:{m:["jedan minut","jedne minute"],mm:["minut","minute","minuta"],h:["jedan sat","jednog sata"],hh:["sat","sata","sati"],dd:["dan","dana","dana"],MM:["mesec","meseca","meseci"],yy:["godina","godine","godina"]},correctGrammaticalCase:function(e,a){return 1===e?a[0]:e>=2&&e<=4?a[1]:a[2]},translate:function(e,a,t){var s=x_.words[t];return 1===t.length?a?s[0]:s[1]:e+" "+x_.correctGrammaticalCase(e,s)}};e.defineLocale("sr",{months:"januar_februar_mart_april_maj_jun_jul_avgust_septembar_oktobar_novembar_decembar".split("_"),monthsShort:"jan._feb._mar._apr._maj_jun_jul_avg._sep._okt._nov._dec.".split("_"),monthsParseExact:!0,weekdays:"nedelja_ponedeljak_utorak_sreda_četvrtak_petak_subota".split("_"),weekdaysShort:"ned._pon._uto._sre._čet._pet._sub.".split("_"),weekdaysMin:"ne_po_ut_sr_če_pe_su".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"H:mm",LTS:"H:mm:ss",L:"DD.MM.YYYY",LL:"D. MMMM YYYY",LLL:"D. MMMM YYYY H:mm",LLLL:"dddd, D. MMMM YYYY H:mm"},calendar:{sameDay:"[danas u] LT",nextDay:"[sutra u] LT",nextWeek:function(){switch(this.day()){case 0:return"[u] [nedelju] [u] LT";case 3:return"[u] [sredu] [u] LT";case 6:return"[u] [subotu] [u] LT";case 1:case 2:case 4:case 5:return"[u] dddd [u] LT"}},lastDay:"[juče u] LT",lastWeek:function(){return["[prošle] [nedelje] [u] LT","[prošlog] [ponedeljka] [u] LT","[prošlog] [utorka] [u] LT","[prošle] [srede] [u] LT","[prošlog] [četvrtka] [u] LT","[prošlog] [petka] [u] LT","[prošle] [subote] [u] LT"][this.day()]},sameElse:"L"},relativeTime:{future:"za %s",past:"pre %s",s:"nekoliko sekundi",m:x_.translate,mm:x_.translate,h:x_.translate,hh:x_.translate,d:"dan",dd:x_.translate,M:"mesec",MM:x_.translate,y:"godinu",yy:x_.translate},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:7}}),e.defineLocale("ss",{months:"Bhimbidvwane_Indlovana_Indlov'lenkhulu_Mabasa_Inkhwekhweti_Inhlaba_Kholwane_Ingci_Inyoni_Imphala_Lweti_Ingongoni".split("_"),monthsShort:"Bhi_Ina_Inu_Mab_Ink_Inh_Kho_Igc_Iny_Imp_Lwe_Igo".split("_"),weekdays:"Lisontfo_Umsombuluko_Lesibili_Lesitsatfu_Lesine_Lesihlanu_Umgcibelo".split("_"),weekdaysShort:"Lis_Umb_Lsb_Les_Lsi_Lsh_Umg".split("_"),weekdaysMin:"Li_Us_Lb_Lt_Ls_Lh_Ug".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"h:mm A",LTS:"h:mm:ss A",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY h:mm A",LLLL:"dddd, D MMMM YYYY h:mm A"},calendar:{sameDay:"[Namuhla nga] LT",nextDay:"[Kusasa nga] LT",nextWeek:"dddd [nga] LT",lastDay:"[Itolo nga] LT",lastWeek:"dddd [leliphelile] [nga] LT",sameElse:"L"},relativeTime:{future:"nga %s",past:"wenteka nga %s",s:"emizuzwana lomcane",m:"umzuzu",mm:"%d emizuzu",h:"lihora",hh:"%d emahora",d:"lilanga",dd:"%d emalanga",M:"inyanga",MM:"%d tinyanga",y:"umnyaka",yy:"%d iminyaka"},meridiemParse:/ekuseni|emini|entsambama|ebusuku/,meridiem:function(e,a,t){return e<11?"ekuseni":e<15?"emini":e<19?"entsambama":"ebusuku"},meridiemHour:function(e,a){return 12===e&&(e=0),"ekuseni"===a?e:"emini"===a?e>=11?e:e+12:"entsambama"===a||"ebusuku"===a?0===e?0:e+12:void 0},dayOfMonthOrdinalParse:/\d{1,2}/,ordinal:"%d",week:{dow:1,doy:4}}),e.defineLocale("sv",{months:"januari_februari_mars_april_maj_juni_juli_augusti_september_oktober_november_december".split("_"),monthsShort:"jan_feb_mar_apr_maj_jun_jul_aug_sep_okt_nov_dec".split("_"),weekdays:"söndag_måndag_tisdag_onsdag_torsdag_fredag_lördag".split("_"),weekdaysShort:"sön_mån_tis_ons_tor_fre_lör".split("_"),weekdaysMin:"sö_må_ti_on_to_fr_lö".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"YYYY-MM-DD",LL:"D MMMM YYYY",LLL:"D MMMM YYYY [kl.] HH:mm",LLLL:"dddd D MMMM YYYY [kl.] HH:mm",lll:"D MMM YYYY HH:mm",llll:"ddd D MMM YYYY HH:mm"},calendar:{sameDay:"[Idag] LT",nextDay:"[Imorgon] LT",lastDay:"[Igår] LT",nextWeek:"[På] dddd LT",lastWeek:"[I] dddd[s] LT",sameElse:"L"},relativeTime:{future:"om %s",past:"för %s sedan",s:"några sekunder",m:"en minut",mm:"%d minuter",h:"en timme",hh:"%d timmar",d:"en dag",dd:"%d dagar",M:"en månad",MM:"%d månader",y:"ett år",yy:"%d år"},dayOfMonthOrdinalParse:/\d{1,2}(e|a)/,ordinal:function(e){var a=e%10;return e+(1==~~(e%100/10)?"e":1===a?"a":2===a?"a":"e")},week:{dow:1,doy:4}}),e.defineLocale("sw",{months:"Januari_Februari_Machi_Aprili_Mei_Juni_Julai_Agosti_Septemba_Oktoba_Novemba_Desemba".split("_"),monthsShort:"Jan_Feb_Mac_Apr_Mei_Jun_Jul_Ago_Sep_Okt_Nov_Des".split("_"),weekdays:"Jumapili_Jumatatu_Jumanne_Jumatano_Alhamisi_Ijumaa_Jumamosi".split("_"),weekdaysShort:"Jpl_Jtat_Jnne_Jtan_Alh_Ijm_Jmos".split("_"),weekdaysMin:"J2_J3_J4_J5_Al_Ij_J1".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD.MM.YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd, D MMMM YYYY HH:mm"},calendar:{sameDay:"[leo saa] LT",nextDay:"[kesho saa] LT",nextWeek:"[wiki ijayo] dddd [saat] LT",lastDay:"[jana] LT",lastWeek:"[wiki iliyopita] dddd [saat] LT",sameElse:"L"},relativeTime:{future:"%s baadaye",past:"tokea %s",s:"hivi punde",m:"dakika moja",mm:"dakika %d",h:"saa limoja",hh:"masaa %d",d:"siku moja",dd:"masiku %d",M:"mwezi mmoja",MM:"miezi %d",y:"mwaka mmoja",yy:"miaka %d"},week:{dow:1,doy:7}});var P_={1:"௧",2:"௨",3:"௩",4:"௪",5:"௫",6:"௬",7:"௭",8:"௮",9:"௯",0:"௦"},O_={"௧":"1","௨":"2","௩":"3","௪":"4","௫":"5","௬":"6","௭":"7","௮":"8","௯":"9","௦":"0"};e.defineLocale("ta",{months:"ஜனவரி_பிப்ரவரி_மார்ச்_ஏப்ரல்_மே_ஜூன்_ஜூலை_ஆகஸ்ட்_செப்டெம்பர்_அக்டோபர்_நவம்பர்_டிசம்பர்".split("_"),monthsShort:"ஜனவரி_பிப்ரவரி_மார்ச்_ஏப்ரல்_மே_ஜூன்_ஜூலை_ஆகஸ்ட்_செப்டெம்பர்_அக்டோபர்_நவம்பர்_டிசம்பர்".split("_"),weekdays:"ஞாயிற்றுக்கிழமை_திங்கட்கிழமை_செவ்வாய்கிழமை_புதன்கிழமை_வியாழக்கிழமை_வெள்ளிக்கிழமை_சனிக்கிழமை".split("_"),weekdaysShort:"ஞாயிறு_திங்கள்_செவ்வாய்_புதன்_வியாழன்_வெள்ளி_சனி".split("_"),weekdaysMin:"ஞா_தி_செ_பு_வி_வெ_ச".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY, HH:mm",LLLL:"dddd, D MMMM YYYY, HH:mm"},calendar:{sameDay:"[இன்று] LT",nextDay:"[நாளை] LT",nextWeek:"dddd, LT",lastDay:"[நேற்று] LT",lastWeek:"[கடந்த வாரம்] dddd, LT",sameElse:"L"},relativeTime:{future:"%s இல்",past:"%s முன்",s:"ஒரு சில விநாடிகள்",m:"ஒரு நிமிடம்",mm:"%d நிமிடங்கள்",h:"ஒரு மணி நேரம்",hh:"%d மணி நேரம்",d:"ஒரு நாள்",dd:"%d நாட்கள்",M:"ஒரு மாதம்",MM:"%d மாதங்கள்",y:"ஒரு வருடம்",yy:"%d ஆண்டுகள்"},dayOfMonthOrdinalParse:/\d{1,2}வது/,ordinal:function(e){return e+"வது"},preparse:function(e){return e.replace(/[௧௨௩௪௫௬௭௮௯௦]/g,function(e){return O_[e]})},postformat:function(e){return e.replace(/\d/g,function(e){return P_[e]})},meridiemParse:/யாமம்|வைகறை|காலை|நண்பகல்|எற்பாடு|மாலை/,meridiem:function(e,a,t){return e<2?" யாமம்":e<6?" வைகறை":e<10?" காலை":e<14?" நண்பகல்":e<18?" எற்பாடு":e<22?" மாலை":" யாமம்"},meridiemHour:function(e,a){return 12===e&&(e=0),"யாமம்"===a?e<2?e:e+12:"வைகறை"===a||"காலை"===a?e:"நண்பகல்"===a&&e>=10?e:e+12},week:{dow:0,doy:6}}),e.defineLocale("te",{months:"జనవరి_ఫిబ్రవరి_మార్చి_ఏప్రిల్_మే_జూన్_జూలై_ఆగస్టు_సెప్టెంబర్_అక్టోబర్_నవంబర్_డిసెంబర్".split("_"),monthsShort:"జన._ఫిబ్ర._మార్చి_ఏప్రి._మే_జూన్_జూలై_ఆగ._సెప్._అక్టో._నవ._డిసె.".split("_"),monthsParseExact:!0,weekdays:"ఆదివారం_సోమవారం_మంగళవారం_బుధవారం_గురువారం_శుక్రవారం_శనివారం".split("_"),weekdaysShort:"ఆది_సోమ_మంగళ_బుధ_గురు_శుక్ర_శని".split("_"),weekdaysMin:"ఆ_సో_మం_బు_గు_శు_శ".split("_"),longDateFormat:{LT:"A h:mm",LTS:"A h:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY, A h:mm",LLLL:"dddd, D MMMM YYYY, A h:mm"},calendar:{sameDay:"[నేడు] LT",nextDay:"[రేపు] LT",nextWeek:"dddd, LT",lastDay:"[నిన్న] LT",lastWeek:"[గత] dddd, LT",sameElse:"L"},relativeTime:{future:"%s లో",past:"%s క్రితం",s:"కొన్ని క్షణాలు",m:"ఒక నిమిషం",mm:"%d నిమిషాలు",h:"ఒక గంట",hh:"%d గంటలు",d:"ఒక రోజు",dd:"%d రోజులు",M:"ఒక నెల",MM:"%d నెలలు",y:"ఒక సంవత్సరం",yy:"%d సంవత్సరాలు"},dayOfMonthOrdinalParse:/\d{1,2}వ/,ordinal:"%dవ",meridiemParse:/రాత్రి|ఉదయం|మధ్యాహ్నం|సాయంత్రం/,meridiemHour:function(e,a){return 12===e&&(e=0),"రాత్రి"===a?e<4?e:e+12:"ఉదయం"===a?e:"మధ్యాహ్నం"===a?e>=10?e:e+12:"సాయంత్రం"===a?e+12:void 0},meridiem:function(e,a,t){return e<4?"రాత్రి":e<10?"ఉదయం":e<17?"మధ్యాహ్నం":e<20?"సాయంత్రం":"రాత్రి"},week:{dow:0,doy:6}}),e.defineLocale("tet",{months:"Janeiru_Fevereiru_Marsu_Abril_Maiu_Juniu_Juliu_Augustu_Setembru_Outubru_Novembru_Dezembru".split("_"),monthsShort:"Jan_Fev_Mar_Abr_Mai_Jun_Jul_Aug_Set_Out_Nov_Dez".split("_"),weekdays:"Domingu_Segunda_Tersa_Kuarta_Kinta_Sexta_Sabadu".split("_"),weekdaysShort:"Dom_Seg_Ters_Kua_Kint_Sext_Sab".split("_"),weekdaysMin:"Do_Seg_Te_Ku_Ki_Sex_Sa".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd, D MMMM YYYY HH:mm"},calendar:{sameDay:"[Ohin iha] LT",nextDay:"[Aban iha] LT",nextWeek:"dddd [iha] LT",lastDay:"[Horiseik iha] LT",lastWeek:"dddd [semana kotuk] [iha] LT",sameElse:"L"},relativeTime:{future:"iha %s",past:"%s liuba",s:"minutu balun",m:"minutu ida",mm:"minutus %d",h:"horas ida",hh:"horas %d",d:"loron ida",dd:"loron %d",M:"fulan ida",MM:"fulan %d",y:"tinan ida",yy:"tinan %d"},dayOfMonthOrdinalParse:/\d{1,2}(st|nd|rd|th)/,ordinal:function(e){var a=e%10;return e+(1==~~(e%100/10)?"th":1===a?"st":2===a?"nd":3===a?"rd":"th")},week:{dow:1,doy:4}}),e.defineLocale("th",{months:"มกราคม_กุมภาพันธ์_มีนาคม_เมษายน_พฤษภาคม_มิถุนายน_กรกฎาคม_สิงหาคม_กันยายน_ตุลาคม_พฤศจิกายน_ธันวาคม".split("_"),monthsShort:"ม.ค._ก.พ._มี.ค._เม.ย._พ.ค._มิ.ย._ก.ค._ส.ค._ก.ย._ต.ค._พ.ย._ธ.ค.".split("_"),monthsParseExact:!0,weekdays:"อาทิตย์_จันทร์_อังคาร_พุธ_พฤหัสบดี_ศุกร์_เสาร์".split("_"),weekdaysShort:"อาทิตย์_จันทร์_อังคาร_พุธ_พฤหัส_ศุกร์_เสาร์".split("_"),weekdaysMin:"อา._จ._อ._พ._พฤ._ศ._ส.".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"H:mm",LTS:"H:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY เวลา H:mm",LLLL:"วันddddที่ D MMMM YYYY เวลา H:mm"},meridiemParse:/ก่อนเที่ยง|หลังเที่ยง/,isPM:function(e){return"หลังเที่ยง"===e},meridiem:function(e,a,t){return e<12?"ก่อนเที่ยง":"หลังเที่ยง"},calendar:{sameDay:"[วันนี้ เวลา] LT",nextDay:"[พรุ่งนี้ เวลา] LT",nextWeek:"dddd[หน้า เวลา] LT",lastDay:"[เมื่อวานนี้ เวลา] LT",lastWeek:"[วัน]dddd[ที่แล้ว เวลา] LT",sameElse:"L"},relativeTime:{future:"อีก %s",past:"%sที่แล้ว",s:"ไม่กี่วินาที",m:"1 นาที",mm:"%d นาที",h:"1 ชั่วโมง",hh:"%d ชั่วโมง",d:"1 วัน",dd:"%d วัน",M:"1 เดือน",MM:"%d เดือน",y:"1 ปี",yy:"%d ปี"}}),e.defineLocale("tl-ph",{months:"Enero_Pebrero_Marso_Abril_Mayo_Hunyo_Hulyo_Agosto_Setyembre_Oktubre_Nobyembre_Disyembre".split("_"),monthsShort:"Ene_Peb_Mar_Abr_May_Hun_Hul_Ago_Set_Okt_Nob_Dis".split("_"),weekdays:"Linggo_Lunes_Martes_Miyerkules_Huwebes_Biyernes_Sabado".split("_"),weekdaysShort:"Lin_Lun_Mar_Miy_Huw_Biy_Sab".split("_"),weekdaysMin:"Li_Lu_Ma_Mi_Hu_Bi_Sab".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"MM/D/YYYY",LL:"MMMM D, YYYY",LLL:"MMMM D, YYYY HH:mm",LLLL:"dddd, MMMM DD, YYYY HH:mm"},calendar:{sameDay:"LT [ngayong araw]",nextDay:"[Bukas ng] LT",nextWeek:"LT [sa susunod na] dddd",lastDay:"LT [kahapon]",lastWeek:"LT [noong nakaraang] dddd",sameElse:"L"},relativeTime:{future:"sa loob ng %s",past:"%s ang nakalipas",s:"ilang segundo",m:"isang minuto",mm:"%d minuto",h:"isang oras",hh:"%d oras",d:"isang araw",dd:"%d araw",M:"isang buwan",MM:"%d buwan",y:"isang taon",yy:"%d taon"},dayOfMonthOrdinalParse:/\d{1,2}/,ordinal:function(e){return e},week:{dow:1,doy:4}});var W_="pagh_wa’_cha’_wej_loS_vagh_jav_Soch_chorgh_Hut".split("_");e.defineLocale("tlh",{months:"tera’ jar wa’_tera’ jar cha’_tera’ jar wej_tera’ jar loS_tera’ jar vagh_tera’ jar jav_tera’ jar Soch_tera’ jar chorgh_tera’ jar Hut_tera’ jar wa’maH_tera’ jar wa’maH wa’_tera’ jar wa’maH cha’".split("_"),monthsShort:"jar wa’_jar cha’_jar wej_jar loS_jar vagh_jar jav_jar Soch_jar chorgh_jar Hut_jar wa’maH_jar wa’maH wa’_jar wa’maH cha’".split("_"),monthsParseExact:!0,weekdays:"lojmItjaj_DaSjaj_povjaj_ghItlhjaj_loghjaj_buqjaj_ghInjaj".split("_"),weekdaysShort:"lojmItjaj_DaSjaj_povjaj_ghItlhjaj_loghjaj_buqjaj_ghInjaj".split("_"),weekdaysMin:"lojmItjaj_DaSjaj_povjaj_ghItlhjaj_loghjaj_buqjaj_ghInjaj".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD.MM.YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd, D MMMM YYYY HH:mm"},calendar:{sameDay:"[DaHjaj] LT",nextDay:"[wa’leS] LT",nextWeek:"LLL",lastDay:"[wa’Hu’] LT",lastWeek:"LLL",sameElse:"L"},relativeTime:{future:_n,past:on,s:"puS lup",m:"wa’ tup",mm:mn,h:"wa’ rep",hh:mn,d:"wa’ jaj",dd:mn,M:"wa’ jar",MM:mn,y:"wa’ DIS",yy:mn},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}});var E_={1:"'inci",5:"'inci",8:"'inci",70:"'inci",80:"'inci",2:"'nci",7:"'nci",20:"'nci",50:"'nci",3:"'üncü",4:"'üncü",100:"'üncü",6:"'ncı",9:"'uncu",10:"'uncu",30:"'uncu",60:"'ıncı",90:"'ıncı"};e.defineLocale("tr",{months:"Ocak_Şubat_Mart_Nisan_Mayıs_Haziran_Temmuz_Ağustos_Eylül_Ekim_Kasım_Aralık".split("_"),monthsShort:"Oca_Şub_Mar_Nis_May_Haz_Tem_Ağu_Eyl_Eki_Kas_Ara".split("_"),weekdays:"Pazar_Pazartesi_Salı_Çarşamba_Perşembe_Cuma_Cumartesi".split("_"),weekdaysShort:"Paz_Pts_Sal_Çar_Per_Cum_Cts".split("_"),weekdaysMin:"Pz_Pt_Sa_Ça_Pe_Cu_Ct".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD.MM.YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd, D MMMM YYYY HH:mm"},calendar:{sameDay:"[bugün saat] LT",nextDay:"[yarın saat] LT",nextWeek:"[haftaya] dddd [saat] LT",lastDay:"[dün] LT",lastWeek:"[geçen hafta] dddd [saat] LT",sameElse:"L"},relativeTime:{future:"%s sonra",past:"%s önce",s:"birkaç saniye",m:"bir dakika",mm:"%d dakika",h:"bir saat",hh:"%d saat",d:"bir gün",dd:"%d gün",M:"bir ay",MM:"%d ay",y:"bir yıl",yy:"%d yıl"},dayOfMonthOrdinalParse:/\d{1,2}'(inci|nci|üncü|ncı|uncu|ıncı)/,ordinal:function(e){if(0===e)return e+"'ıncı";var a=e%10,t=e%100-a,s=e>=100?100:null;return e+(E_[a]||E_[t]||E_[s])},week:{dow:1,doy:7}}),e.defineLocale("tzl",{months:"Januar_Fevraglh_Març_Avrïu_Mai_Gün_Julia_Guscht_Setemvar_Listopäts_Noemvar_Zecemvar".split("_"),monthsShort:"Jan_Fev_Mar_Avr_Mai_Gün_Jul_Gus_Set_Lis_Noe_Zec".split("_"),weekdays:"Súladi_Lúneçi_Maitzi_Márcuri_Xhúadi_Viénerçi_Sáturi".split("_"),weekdaysShort:"Súl_Lún_Mai_Már_Xhú_Vié_Sát".split("_"),weekdaysMin:"Sú_Lú_Ma_Má_Xh_Vi_Sá".split("_"),longDateFormat:{LT:"HH.mm",LTS:"HH.mm.ss",L:"DD.MM.YYYY",LL:"D. MMMM [dallas] YYYY",LLL:"D. MMMM [dallas] YYYY HH.mm",LLLL:"dddd, [li] D. MMMM [dallas] YYYY HH.mm"},meridiemParse:/d\'o|d\'a/i,isPM:function(e){return"d'o"===e.toLowerCase()},meridiem:function(e,a,t){return e>11?t?"d'o":"D'O":t?"d'a":"D'A"},calendar:{sameDay:"[oxhi à] LT",nextDay:"[demà à] LT",nextWeek:"dddd [à] LT",lastDay:"[ieiri à] LT",lastWeek:"[sür el] dddd [lasteu à] LT",sameElse:"L"},relativeTime:{future:"osprei %s",past:"ja%s",s:ln,m:ln,mm:ln,h:ln,hh:ln,d:ln,dd:ln,M:ln,MM:ln,y:ln,yy:ln},dayOfMonthOrdinalParse:/\d{1,2}\./,ordinal:"%d.",week:{dow:1,doy:4}}),e.defineLocale("tzm-latn",{
months:"innayr_brˤayrˤ_marˤsˤ_ibrir_mayyw_ywnyw_ywlywz_ɣwšt_šwtanbir_ktˤwbrˤ_nwwanbir_dwjnbir".split("_"),monthsShort:"innayr_brˤayrˤ_marˤsˤ_ibrir_mayyw_ywnyw_ywlywz_ɣwšt_šwtanbir_ktˤwbrˤ_nwwanbir_dwjnbir".split("_"),weekdays:"asamas_aynas_asinas_akras_akwas_asimwas_asiḍyas".split("_"),weekdaysShort:"asamas_aynas_asinas_akras_akwas_asimwas_asiḍyas".split("_"),weekdaysMin:"asamas_aynas_asinas_akras_akwas_asimwas_asiḍyas".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D MMMM YYYY HH:mm"},calendar:{sameDay:"[asdkh g] LT",nextDay:"[aska g] LT",nextWeek:"dddd [g] LT",lastDay:"[assant g] LT",lastWeek:"dddd [g] LT",sameElse:"L"},relativeTime:{future:"dadkh s yan %s",past:"yan %s",s:"imik",m:"minuḍ",mm:"%d minuḍ",h:"saɛa",hh:"%d tassaɛin",d:"ass",dd:"%d ossan",M:"ayowr",MM:"%d iyyirn",y:"asgas",yy:"%d isgasn"},week:{dow:6,doy:12}}),e.defineLocale("tzm",{months:"ⵉⵏⵏⴰⵢⵔ_ⴱⵕⴰⵢⵕ_ⵎⴰⵕⵚ_ⵉⴱⵔⵉⵔ_ⵎⴰⵢⵢⵓ_ⵢⵓⵏⵢⵓ_ⵢⵓⵍⵢⵓⵣ_ⵖⵓⵛⵜ_ⵛⵓⵜⴰⵏⴱⵉⵔ_ⴽⵟⵓⴱⵕ_ⵏⵓⵡⴰⵏⴱⵉⵔ_ⴷⵓⵊⵏⴱⵉⵔ".split("_"),monthsShort:"ⵉⵏⵏⴰⵢⵔ_ⴱⵕⴰⵢⵕ_ⵎⴰⵕⵚ_ⵉⴱⵔⵉⵔ_ⵎⴰⵢⵢⵓ_ⵢⵓⵏⵢⵓ_ⵢⵓⵍⵢⵓⵣ_ⵖⵓⵛⵜ_ⵛⵓⵜⴰⵏⴱⵉⵔ_ⴽⵟⵓⴱⵕ_ⵏⵓⵡⴰⵏⴱⵉⵔ_ⴷⵓⵊⵏⴱⵉⵔ".split("_"),weekdays:"ⴰⵙⴰⵎⴰⵙ_ⴰⵢⵏⴰⵙ_ⴰⵙⵉⵏⴰⵙ_ⴰⴽⵔⴰⵙ_ⴰⴽⵡⴰⵙ_ⴰⵙⵉⵎⵡⴰⵙ_ⴰⵙⵉⴹⵢⴰⵙ".split("_"),weekdaysShort:"ⴰⵙⴰⵎⴰⵙ_ⴰⵢⵏⴰⵙ_ⴰⵙⵉⵏⴰⵙ_ⴰⴽⵔⴰⵙ_ⴰⴽⵡⴰⵙ_ⴰⵙⵉⵎⵡⴰⵙ_ⴰⵙⵉⴹⵢⴰⵙ".split("_"),weekdaysMin:"ⴰⵙⴰⵎⴰⵙ_ⴰⵢⵏⴰⵙ_ⴰⵙⵉⵏⴰⵙ_ⴰⴽⵔⴰⵙ_ⴰⴽⵡⴰⵙ_ⴰⵙⵉⵎⵡⴰⵙ_ⴰⵙⵉⴹⵢⴰⵙ".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd D MMMM YYYY HH:mm"},calendar:{sameDay:"[ⴰⵙⴷⵅ ⴴ] LT",nextDay:"[ⴰⵙⴽⴰ ⴴ] LT",nextWeek:"dddd [ⴴ] LT",lastDay:"[ⴰⵚⴰⵏⵜ ⴴ] LT",lastWeek:"dddd [ⴴ] LT",sameElse:"L"},relativeTime:{future:"ⴷⴰⴷⵅ ⵙ ⵢⴰⵏ %s",past:"ⵢⴰⵏ %s",s:"ⵉⵎⵉⴽ",m:"ⵎⵉⵏⵓⴺ",mm:"%d ⵎⵉⵏⵓⴺ",h:"ⵙⴰⵄⴰ",hh:"%d ⵜⴰⵙⵙⴰⵄⵉⵏ",d:"ⴰⵙⵙ",dd:"%d oⵙⵙⴰⵏ",M:"ⴰⵢoⵓⵔ",MM:"%d ⵉⵢⵢⵉⵔⵏ",y:"ⴰⵙⴳⴰⵙ",yy:"%d ⵉⵙⴳⴰⵙⵏ"},week:{dow:6,doy:12}}),e.defineLocale("uk",{months:{format:"січня_лютого_березня_квітня_травня_червня_липня_серпня_вересня_жовтня_листопада_грудня".split("_"),standalone:"січень_лютий_березень_квітень_травень_червень_липень_серпень_вересень_жовтень_листопад_грудень".split("_")},monthsShort:"січ_лют_бер_квіт_трав_черв_лип_серп_вер_жовт_лист_груд".split("_"),weekdays:Ln,weekdaysShort:"нд_пн_вт_ср_чт_пт_сб".split("_"),weekdaysMin:"нд_пн_вт_ср_чт_пт_сб".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD.MM.YYYY",LL:"D MMMM YYYY р.",LLL:"D MMMM YYYY р., HH:mm",LLLL:"dddd, D MMMM YYYY р., HH:mm"},calendar:{sameDay:cn("[Сьогодні "),nextDay:cn("[Завтра "),lastDay:cn("[Вчора "),nextWeek:cn("[У] dddd ["),lastWeek:function(){switch(this.day()){case 0:case 3:case 5:case 6:return cn("[Минулої] dddd [").call(this);case 1:case 2:case 4:return cn("[Минулого] dddd [").call(this)}},sameElse:"L"},relativeTime:{future:"за %s",past:"%s тому",s:"декілька секунд",m:hn,mm:hn,h:"годину",hh:hn,d:"день",dd:hn,M:"місяць",MM:hn,y:"рік",yy:hn},meridiemParse:/ночі|ранку|дня|вечора/,isPM:function(e){return/^(дня|вечора)$/.test(e)},meridiem:function(e,a,t){return e<4?"ночі":e<12?"ранку":e<17?"дня":"вечора"},dayOfMonthOrdinalParse:/\d{1,2}-(й|го)/,ordinal:function(e,a){switch(a){case"M":case"d":case"DDD":case"w":case"W":return e+"-й";case"D":return e+"-го";default:return e}},week:{dow:1,doy:7}});var A_=["جنوری","فروری","مارچ","اپریل","مئی","جون","جولائی","اگست","ستمبر","اکتوبر","نومبر","دسمبر"],F_=["اتوار","پیر","منگل","بدھ","جمعرات","جمعہ","ہفتہ"];return e.defineLocale("ur",{months:A_,monthsShort:A_,weekdays:F_,weekdaysShort:F_,weekdaysMin:F_,longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd، D MMMM YYYY HH:mm"},meridiemParse:/صبح|شام/,isPM:function(e){return"شام"===e},meridiem:function(e,a,t){return e<12?"صبح":"شام"},calendar:{sameDay:"[آج بوقت] LT",nextDay:"[کل بوقت] LT",nextWeek:"dddd [بوقت] LT",lastDay:"[گذشتہ روز بوقت] LT",lastWeek:"[گذشتہ] dddd [بوقت] LT",sameElse:"L"},relativeTime:{future:"%s بعد",past:"%s قبل",s:"چند سیکنڈ",m:"ایک منٹ",mm:"%d منٹ",h:"ایک گھنٹہ",hh:"%d گھنٹے",d:"ایک دن",dd:"%d دن",M:"ایک ماہ",MM:"%d ماہ",y:"ایک سال",yy:"%d سال"},preparse:function(e){return e.replace(/،/g,",")},postformat:function(e){return e.replace(/,/g,"،")},week:{dow:1,doy:4}}),e.defineLocale("uz-latn",{months:"Yanvar_Fevral_Mart_Aprel_May_Iyun_Iyul_Avgust_Sentabr_Oktabr_Noyabr_Dekabr".split("_"),monthsShort:"Yan_Fev_Mar_Apr_May_Iyun_Iyul_Avg_Sen_Okt_Noy_Dek".split("_"),weekdays:"Yakshanba_Dushanba_Seshanba_Chorshanba_Payshanba_Juma_Shanba".split("_"),weekdaysShort:"Yak_Dush_Sesh_Chor_Pay_Jum_Shan".split("_"),weekdaysMin:"Ya_Du_Se_Cho_Pa_Ju_Sha".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"D MMMM YYYY, dddd HH:mm"},calendar:{sameDay:"[Bugun soat] LT [da]",nextDay:"[Ertaga] LT [da]",nextWeek:"dddd [kuni soat] LT [da]",lastDay:"[Kecha soat] LT [da]",lastWeek:"[O'tgan] dddd [kuni soat] LT [da]",sameElse:"L"},relativeTime:{future:"Yaqin %s ichida",past:"Bir necha %s oldin",s:"soniya",m:"bir daqiqa",mm:"%d daqiqa",h:"bir soat",hh:"%d soat",d:"bir kun",dd:"%d kun",M:"bir oy",MM:"%d oy",y:"bir yil",yy:"%d yil"},week:{dow:1,doy:7}}),e.defineLocale("uz",{months:"январ_феврал_март_апрел_май_июн_июл_август_сентябр_октябр_ноябр_декабр".split("_"),monthsShort:"янв_фев_мар_апр_май_июн_июл_авг_сен_окт_ноя_дек".split("_"),weekdays:"Якшанба_Душанба_Сешанба_Чоршанба_Пайшанба_Жума_Шанба".split("_"),weekdaysShort:"Якш_Душ_Сеш_Чор_Пай_Жум_Шан".split("_"),weekdaysMin:"Як_Ду_Се_Чо_Па_Жу_Ша".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"D MMMM YYYY, dddd HH:mm"},calendar:{sameDay:"[Бугун соат] LT [да]",nextDay:"[Эртага] LT [да]",nextWeek:"dddd [куни соат] LT [да]",lastDay:"[Кеча соат] LT [да]",lastWeek:"[Утган] dddd [куни соат] LT [да]",sameElse:"L"},relativeTime:{future:"Якин %s ичида",past:"Бир неча %s олдин",s:"фурсат",m:"бир дакика",mm:"%d дакика",h:"бир соат",hh:"%d соат",d:"бир кун",dd:"%d кун",M:"бир ой",MM:"%d ой",y:"бир йил",yy:"%d йил"},week:{dow:1,doy:7}}),e.defineLocale("vi",{months:"tháng 1_tháng 2_tháng 3_tháng 4_tháng 5_tháng 6_tháng 7_tháng 8_tháng 9_tháng 10_tháng 11_tháng 12".split("_"),monthsShort:"Th01_Th02_Th03_Th04_Th05_Th06_Th07_Th08_Th09_Th10_Th11_Th12".split("_"),monthsParseExact:!0,weekdays:"chủ nhật_thứ hai_thứ ba_thứ tư_thứ năm_thứ sáu_thứ bảy".split("_"),weekdaysShort:"CN_T2_T3_T4_T5_T6_T7".split("_"),weekdaysMin:"CN_T2_T3_T4_T5_T6_T7".split("_"),weekdaysParseExact:!0,meridiemParse:/sa|ch/i,isPM:function(e){return/^ch$/i.test(e)},meridiem:function(e,a,t){return e<12?t?"sa":"SA":t?"ch":"CH"},longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D MMMM [năm] YYYY",LLL:"D MMMM [năm] YYYY HH:mm",LLLL:"dddd, D MMMM [năm] YYYY HH:mm",l:"DD/M/YYYY",ll:"D MMM YYYY",lll:"D MMM YYYY HH:mm",llll:"ddd, D MMM YYYY HH:mm"},calendar:{sameDay:"[Hôm nay lúc] LT",nextDay:"[Ngày mai lúc] LT",nextWeek:"dddd [tuần tới lúc] LT",lastDay:"[Hôm qua lúc] LT",lastWeek:"dddd [tuần rồi lúc] LT",sameElse:"L"},relativeTime:{future:"%s tới",past:"%s trước",s:"vài giây",m:"một phút",mm:"%d phút",h:"một giờ",hh:"%d giờ",d:"một ngày",dd:"%d ngày",M:"một tháng",MM:"%d tháng",y:"một năm",yy:"%d năm"},dayOfMonthOrdinalParse:/\d{1,2}/,ordinal:function(e){return e},week:{dow:1,doy:4}}),e.defineLocale("x-pseudo",{months:"J~áñúá~rý_F~ébrú~árý_~Márc~h_Áp~ríl_~Máý_~Júñé~_Júl~ý_Áú~gúst~_Sép~témb~ér_Ó~ctób~ér_Ñ~óvém~bér_~Décé~mbér".split("_"),monthsShort:"J~áñ_~Féb_~Már_~Ápr_~Máý_~Júñ_~Júl_~Áúg_~Sép_~Óct_~Ñóv_~Déc".split("_"),monthsParseExact:!0,weekdays:"S~úñdá~ý_Mó~ñdáý~_Túé~sdáý~_Wéd~ñésd~áý_T~húrs~dáý_~Fríd~áý_S~átúr~dáý".split("_"),weekdaysShort:"S~úñ_~Móñ_~Túé_~Wéd_~Thú_~Frí_~Sát".split("_"),weekdaysMin:"S~ú_Mó~_Tú_~Wé_T~h_Fr~_Sá".split("_"),weekdaysParseExact:!0,longDateFormat:{LT:"HH:mm",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY HH:mm",LLLL:"dddd, D MMMM YYYY HH:mm"},calendar:{sameDay:"[T~ódá~ý át] LT",nextDay:"[T~ómó~rró~w át] LT",nextWeek:"dddd [át] LT",lastDay:"[Ý~ést~érdá~ý át] LT",lastWeek:"[L~ást] dddd [át] LT",sameElse:"L"},relativeTime:{future:"í~ñ %s",past:"%s á~gó",s:"á ~féw ~sécó~ñds",m:"á ~míñ~úté",mm:"%d m~íñú~tés",h:"á~ñ hó~úr",hh:"%d h~óúrs",d:"á ~dáý",dd:"%d d~áýs",M:"á ~móñ~th",MM:"%d m~óñt~hs",y:"á ~ýéár",yy:"%d ý~éárs"},dayOfMonthOrdinalParse:/\d{1,2}(th|st|nd|rd)/,ordinal:function(e){var a=e%10;return e+(1==~~(e%100/10)?"th":1===a?"st":2===a?"nd":3===a?"rd":"th")},week:{dow:1,doy:4}}),e.defineLocale("yo",{months:"Sẹ́rẹ́_Èrèlè_Ẹrẹ̀nà_Ìgbé_Èbibi_Òkùdu_Agẹmo_Ògún_Owewe_Ọ̀wàrà_Bélú_Ọ̀pẹ̀̀".split("_"),monthsShort:"Sẹ́r_Èrl_Ẹrn_Ìgb_Èbi_Òkù_Agẹ_Ògú_Owe_Ọ̀wà_Bél_Ọ̀pẹ̀̀".split("_"),weekdays:"Àìkú_Ajé_Ìsẹ́gun_Ọjọ́rú_Ọjọ́bọ_Ẹtì_Àbámẹ́ta".split("_"),weekdaysShort:"Àìk_Ajé_Ìsẹ́_Ọjr_Ọjb_Ẹtì_Àbá".split("_"),weekdaysMin:"Àì_Aj_Ìs_Ọr_Ọb_Ẹt_Àb".split("_"),longDateFormat:{LT:"h:mm A",LTS:"h:mm:ss A",L:"DD/MM/YYYY",LL:"D MMMM YYYY",LLL:"D MMMM YYYY h:mm A",LLLL:"dddd, D MMMM YYYY h:mm A"},calendar:{sameDay:"[Ònì ni] LT",nextDay:"[Ọ̀la ni] LT",nextWeek:"dddd [Ọsẹ̀ tón'bọ] [ni] LT",lastDay:"[Àna ni] LT",lastWeek:"dddd [Ọsẹ̀ tólọ́] [ni] LT",sameElse:"L"},relativeTime:{future:"ní %s",past:"%s kọjá",s:"ìsẹjú aayá die",m:"ìsẹjú kan",mm:"ìsẹjú %d",h:"wákati kan",hh:"wákati %d",d:"ọjọ́ kan",dd:"ọjọ́ %d",M:"osù kan",MM:"osù %d",y:"ọdún kan",yy:"ọdún %d"},dayOfMonthOrdinalParse:/ọjọ́\s\d{1,2}/,ordinal:"ọjọ́ %d",week:{dow:1,doy:4}}),e.defineLocale("zh-cn",{months:"一月_二月_三月_四月_五月_六月_七月_八月_九月_十月_十一月_十二月".split("_"),monthsShort:"1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月".split("_"),weekdays:"星期日_星期一_星期二_星期三_星期四_星期五_星期六".split("_"),weekdaysShort:"周日_周一_周二_周三_周四_周五_周六".split("_"),weekdaysMin:"日_一_二_三_四_五_六".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"YYYY年MMMD日",LL:"YYYY年MMMD日",LLL:"YYYY年MMMD日Ah点mm分",LLLL:"YYYY年MMMD日ddddAh点mm分",l:"YYYY年MMMD日",ll:"YYYY年MMMD日",lll:"YYYY年MMMD日 HH:mm",llll:"YYYY年MMMD日dddd HH:mm"},meridiemParse:/凌晨|早上|上午|中午|下午|晚上/,meridiemHour:function(e,a){return 12===e&&(e=0),"凌晨"===a||"早上"===a||"上午"===a?e:"下午"===a||"晚上"===a?e+12:e>=11?e:e+12},meridiem:function(e,a,t){var s=100*e+a;return s<600?"凌晨":s<900?"早上":s<1130?"上午":s<1230?"中午":s<1800?"下午":"晚上"},calendar:{sameDay:"[今天]LT",nextDay:"[明天]LT",nextWeek:"[下]ddddLT",lastDay:"[昨天]LT",lastWeek:"[上]ddddLT",sameElse:"L"},dayOfMonthOrdinalParse:/\d{1,2}(日|月|周)/,ordinal:function(e,a){switch(a){case"d":case"D":case"DDD":return e+"日";case"M":return e+"月";case"w":case"W":return e+"周";default:return e}},relativeTime:{future:"%s内",past:"%s前",s:"几秒",m:"1 分钟",mm:"%d 分钟",h:"1 小时",hh:"%d 小时",d:"1 天",dd:"%d 天",M:"1 个月",MM:"%d 个月",y:"1 年",yy:"%d 年"},week:{dow:1,doy:4}}),e.defineLocale("zh-hk",{months:"一月_二月_三月_四月_五月_六月_七月_八月_九月_十月_十一月_十二月".split("_"),monthsShort:"1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月".split("_"),weekdays:"星期日_星期一_星期二_星期三_星期四_星期五_星期六".split("_"),weekdaysShort:"週日_週一_週二_週三_週四_週五_週六".split("_"),weekdaysMin:"日_一_二_三_四_五_六".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"YYYY年MMMD日",LL:"YYYY年MMMD日",LLL:"YYYY年MMMD日 HH:mm",LLLL:"YYYY年MMMD日dddd HH:mm",l:"YYYY年MMMD日",ll:"YYYY年MMMD日",lll:"YYYY年MMMD日 HH:mm",llll:"YYYY年MMMD日dddd HH:mm"},meridiemParse:/凌晨|早上|上午|中午|下午|晚上/,meridiemHour:function(e,a){return 12===e&&(e=0),"凌晨"===a||"早上"===a||"上午"===a?e:"中午"===a?e>=11?e:e+12:"下午"===a||"晚上"===a?e+12:void 0},meridiem:function(e,a,t){var s=100*e+a;return s<600?"凌晨":s<900?"早上":s<1130?"上午":s<1230?"中午":s<1800?"下午":"晚上"},calendar:{sameDay:"[今天]LT",nextDay:"[明天]LT",nextWeek:"[下]ddddLT",lastDay:"[昨天]LT",lastWeek:"[上]ddddLT",sameElse:"L"},dayOfMonthOrdinalParse:/\d{1,2}(日|月|週)/,ordinal:function(e,a){switch(a){case"d":case"D":case"DDD":return e+"日";case"M":return e+"月";case"w":case"W":return e+"週";default:return e}},relativeTime:{future:"%s內",past:"%s前",s:"幾秒",m:"1 分鐘",mm:"%d 分鐘",h:"1 小時",hh:"%d 小時",d:"1 天",dd:"%d 天",M:"1 個月",MM:"%d 個月",y:"1 年",yy:"%d 年"}}),e.defineLocale("zh-tw",{months:"一月_二月_三月_四月_五月_六月_七月_八月_九月_十月_十一月_十二月".split("_"),monthsShort:"1月_2月_3月_4月_5月_6月_7月_8月_9月_10月_11月_12月".split("_"),weekdays:"星期日_星期一_星期二_星期三_星期四_星期五_星期六".split("_"),weekdaysShort:"週日_週一_週二_週三_週四_週五_週六".split("_"),weekdaysMin:"日_一_二_三_四_五_六".split("_"),longDateFormat:{LT:"HH:mm",LTS:"HH:mm:ss",L:"YYYY年MMMD日",LL:"YYYY年MMMD日",LLL:"YYYY年MMMD日 HH:mm",LLLL:"YYYY年MMMD日dddd HH:mm",l:"YYYY年MMMD日",ll:"YYYY年MMMD日",lll:"YYYY年MMMD日 HH:mm",llll:"YYYY年MMMD日dddd HH:mm"},meridiemParse:/凌晨|早上|上午|中午|下午|晚上/,meridiemHour:function(e,a){return 12===e&&(e=0),"凌晨"===a||"早上"===a||"上午"===a?e:"中午"===a?e>=11?e:e+12:"下午"===a||"晚上"===a?e+12:void 0},meridiem:function(e,a,t){var s=100*e+a;return s<600?"凌晨":s<900?"早上":s<1130?"上午":s<1230?"中午":s<1800?"下午":"晚上"},calendar:{sameDay:"[今天]LT",nextDay:"[明天]LT",nextWeek:"[下]ddddLT",lastDay:"[昨天]LT",lastWeek:"[上]ddddLT",sameElse:"L"},dayOfMonthOrdinalParse:/\d{1,2}(日|月|週)/,ordinal:function(e,a){switch(a){case"d":case"D":case"DDD":return e+"日";case"M":return e+"月";case"w":case"W":return e+"週";default:return e}},relativeTime:{future:"%s內",past:"%s前",s:"幾秒",m:"1 分鐘",mm:"%d 分鐘",h:"1 小時",hh:"%d 小時",d:"1 天",dd:"%d 天",M:"1 個月",MM:"%d 個月",y:"1 年",yy:"%d 年"}}),e.locale("en"),e});

},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
(function(){function n(n){function t(t,r,e,u,i,o){for(;i>=0&&i<o;i+=n){var a=u?u[i]:i;e=r(e,t[a],a,t)}return e}return function(r,e,u,i){e=b(e,i,4);var o=!k(r)&&m.keys(r),a=(o||r).length,c=n>0?0:a-1;return arguments.length<3&&(u=r[o?o[c]:c],c+=n),t(r,e,u,o,c,a)}}function t(n){return function(t,r,e){r=x(r,e);for(var u=O(t),i=n>0?0:u-1;i>=0&&i<u;i+=n)if(r(t[i],i,t))return i;return-1}}function r(n,t,r){return function(e,u,i){var o=0,a=O(e);if("number"==typeof i)n>0?o=i>=0?i:Math.max(i+a,o):a=i>=0?Math.min(i+1,a):i+a+1;else if(r&&i&&a)return i=r(e,u),e[i]===u?i:-1;if(u!==u)return i=t(l.call(e,o,a),m.isNaN),i>=0?i+o:-1;for(i=n>0?o:a-1;i>=0&&i<a;i+=n)if(e[i]===u)return i;return-1}}function e(n,t){var r=I.length,e=n.constructor,u=m.isFunction(e)&&e.prototype||a,i="constructor";for(m.has(n,i)&&!m.contains(t,i)&&t.push(i);r--;)(i=I[r])in n&&n[i]!==u[i]&&!m.contains(t,i)&&t.push(i)}var u=this,i=u._,o=Array.prototype,a=Object.prototype,c=Function.prototype,f=o.push,l=o.slice,s=a.toString,p=a.hasOwnProperty,h=Array.isArray,v=Object.keys,y=c.bind,d=Object.create,g=function(){},m=function(n){return n instanceof m?n:this instanceof m?void(this._wrapped=n):new m(n)};"undefined"!=typeof exports?("undefined"!=typeof module&&module.exports&&(exports=module.exports=m),exports._=m):u._=m,m.VERSION="1.8.3";var b=function(n,t,r){if(void 0===t)return n;switch(null==r?3:r){case 1:return function(r){return n.call(t,r)};case 2:return function(r,e){return n.call(t,r,e)};case 3:return function(r,e,u){return n.call(t,r,e,u)};case 4:return function(r,e,u,i){return n.call(t,r,e,u,i)}}return function(){return n.apply(t,arguments)}},x=function(n,t,r){return null==n?m.identity:m.isFunction(n)?b(n,t,r):m.isObject(n)?m.matcher(n):m.property(n)};m.iteratee=function(n,t){return x(n,t,1/0)};var _=function(n,t){return function(r){var e=arguments.length;if(e<2||null==r)return r;for(var u=1;u<e;u++)for(var i=arguments[u],o=n(i),a=o.length,c=0;c<a;c++){var f=o[c];t&&void 0!==r[f]||(r[f]=i[f])}return r}},j=function(n){if(!m.isObject(n))return{};if(d)return d(n);g.prototype=n;var t=new g;return g.prototype=null,t},w=function(n){return function(t){return null==t?void 0:t[n]}},A=Math.pow(2,53)-1,O=w("length"),k=function(n){var t=O(n);return"number"==typeof t&&t>=0&&t<=A};m.each=m.forEach=function(n,t,r){t=b(t,r);var e,u;if(k(n))for(e=0,u=n.length;e<u;e++)t(n[e],e,n);else{var i=m.keys(n);for(e=0,u=i.length;e<u;e++)t(n[i[e]],i[e],n)}return n},m.map=m.collect=function(n,t,r){t=x(t,r);for(var e=!k(n)&&m.keys(n),u=(e||n).length,i=Array(u),o=0;o<u;o++){var a=e?e[o]:o;i[o]=t(n[a],a,n)}return i},m.reduce=m.foldl=m.inject=n(1),m.reduceRight=m.foldr=n(-1),m.find=m.detect=function(n,t,r){var e;if(void 0!==(e=k(n)?m.findIndex(n,t,r):m.findKey(n,t,r))&&-1!==e)return n[e]},m.filter=m.select=function(n,t,r){var e=[];return t=x(t,r),m.each(n,function(n,r,u){t(n,r,u)&&e.push(n)}),e},m.reject=function(n,t,r){return m.filter(n,m.negate(x(t)),r)},m.every=m.all=function(n,t,r){t=x(t,r);for(var e=!k(n)&&m.keys(n),u=(e||n).length,i=0;i<u;i++){var o=e?e[i]:i;if(!t(n[o],o,n))return!1}return!0},m.some=m.any=function(n,t,r){t=x(t,r);for(var e=!k(n)&&m.keys(n),u=(e||n).length,i=0;i<u;i++){var o=e?e[i]:i;if(t(n[o],o,n))return!0}return!1},m.contains=m.includes=m.include=function(n,t,r,e){return k(n)||(n=m.values(n)),("number"!=typeof r||e)&&(r=0),m.indexOf(n,t,r)>=0},m.invoke=function(n,t){var r=l.call(arguments,2),e=m.isFunction(t);return m.map(n,function(n){var u=e?t:n[t];return null==u?u:u.apply(n,r)})},m.pluck=function(n,t){return m.map(n,m.property(t))},m.where=function(n,t){return m.filter(n,m.matcher(t))},m.findWhere=function(n,t){return m.find(n,m.matcher(t))},m.max=function(n,t,r){var e,u,i=-1/0,o=-1/0;if(null==t&&null!=n){n=k(n)?n:m.values(n);for(var a=0,c=n.length;a<c;a++)(e=n[a])>i&&(i=e)}else t=x(t,r),m.each(n,function(n,r,e){((u=t(n,r,e))>o||u===-1/0&&i===-1/0)&&(i=n,o=u)});return i},m.min=function(n,t,r){var e,u,i=1/0,o=1/0;if(null==t&&null!=n){n=k(n)?n:m.values(n);for(var a=0,c=n.length;a<c;a++)(e=n[a])<i&&(i=e)}else t=x(t,r),m.each(n,function(n,r,e){((u=t(n,r,e))<o||u===1/0&&i===1/0)&&(i=n,o=u)});return i},m.shuffle=function(n){for(var t,r=k(n)?n:m.values(n),e=r.length,u=Array(e),i=0;i<e;i++)t=m.random(0,i),t!==i&&(u[i]=u[t]),u[t]=r[i];return u},m.sample=function(n,t,r){return null==t||r?(k(n)||(n=m.values(n)),n[m.random(n.length-1)]):m.shuffle(n).slice(0,Math.max(0,t))},m.sortBy=function(n,t,r){return t=x(t,r),m.pluck(m.map(n,function(n,r,e){return{value:n,index:r,criteria:t(n,r,e)}}).sort(function(n,t){var r=n.criteria,e=t.criteria;if(r!==e){if(r>e||void 0===r)return 1;if(r<e||void 0===e)return-1}return n.index-t.index}),"value")};var F=function(n){return function(t,r,e){var u={};return r=x(r,e),m.each(t,function(e,i){var o=r(e,i,t);n(u,e,o)}),u}};m.groupBy=F(function(n,t,r){m.has(n,r)?n[r].push(t):n[r]=[t]}),m.indexBy=F(function(n,t,r){n[r]=t}),m.countBy=F(function(n,t,r){m.has(n,r)?n[r]++:n[r]=1}),m.toArray=function(n){return n?m.isArray(n)?l.call(n):k(n)?m.map(n,m.identity):m.values(n):[]},m.size=function(n){return null==n?0:k(n)?n.length:m.keys(n).length},m.partition=function(n,t,r){t=x(t,r);var e=[],u=[];return m.each(n,function(n,r,i){(t(n,r,i)?e:u).push(n)}),[e,u]},m.first=m.head=m.take=function(n,t,r){if(null!=n)return null==t||r?n[0]:m.initial(n,n.length-t)},m.initial=function(n,t,r){return l.call(n,0,Math.max(0,n.length-(null==t||r?1:t)))},m.last=function(n,t,r){if(null!=n)return null==t||r?n[n.length-1]:m.rest(n,Math.max(0,n.length-t))},m.rest=m.tail=m.drop=function(n,t,r){return l.call(n,null==t||r?1:t)},m.compact=function(n){return m.filter(n,m.identity)};var S=function(n,t,r,e){for(var u=[],i=0,o=e||0,a=O(n);o<a;o++){var c=n[o];if(k(c)&&(m.isArray(c)||m.isArguments(c))){t||(c=S(c,t,r));var f=0,l=c.length;for(u.length+=l;f<l;)u[i++]=c[f++]}else r||(u[i++]=c)}return u};m.flatten=function(n,t){return S(n,t,!1)},m.without=function(n){return m.difference(n,l.call(arguments,1))},m.uniq=m.unique=function(n,t,r,e){m.isBoolean(t)||(e=r,r=t,t=!1),null!=r&&(r=x(r,e));for(var u=[],i=[],o=0,a=O(n);o<a;o++){var c=n[o],f=r?r(c,o,n):c;t?(o&&i===f||u.push(c),i=f):r?m.contains(i,f)||(i.push(f),u.push(c)):m.contains(u,c)||u.push(c)}return u},m.union=function(){return m.uniq(S(arguments,!0,!0))},m.intersection=function(n){for(var t=[],r=arguments.length,e=0,u=O(n);e<u;e++){var i=n[e];if(!m.contains(t,i)){for(var o=1;o<r&&m.contains(arguments[o],i);o++);o===r&&t.push(i)}}return t},m.difference=function(n){var t=S(arguments,!0,!0,1);return m.filter(n,function(n){return!m.contains(t,n)})},m.zip=function(){return m.unzip(arguments)},m.unzip=function(n){for(var t=n&&m.max(n,O).length||0,r=Array(t),e=0;e<t;e++)r[e]=m.pluck(n,e);return r},m.object=function(n,t){for(var r={},e=0,u=O(n);e<u;e++)t?r[n[e]]=t[e]:r[n[e][0]]=n[e][1];return r},m.findIndex=t(1),m.findLastIndex=t(-1),m.sortedIndex=function(n,t,r,e){r=x(r,e,1);for(var u=r(t),i=0,o=O(n);i<o;){var a=Math.floor((i+o)/2);r(n[a])<u?i=a+1:o=a}return i},m.indexOf=r(1,m.findIndex,m.sortedIndex),m.lastIndexOf=r(-1,m.findLastIndex),m.range=function(n,t,r){null==t&&(t=n||0,n=0),r=r||1;for(var e=Math.max(Math.ceil((t-n)/r),0),u=Array(e),i=0;i<e;i++,n+=r)u[i]=n;return u};var E=function(n,t,r,e,u){if(!(e instanceof t))return n.apply(r,u);var i=j(n.prototype),o=n.apply(i,u);return m.isObject(o)?o:i};m.bind=function(n,t){if(y&&n.bind===y)return y.apply(n,l.call(arguments,1));if(!m.isFunction(n))throw new TypeError("Bind must be called on a function");var r=l.call(arguments,2),e=function(){return E(n,e,t,this,r.concat(l.call(arguments)))};return e},m.partial=function(n){var t=l.call(arguments,1),r=function(){for(var e=0,u=t.length,i=Array(u),o=0;o<u;o++)i[o]=t[o]===m?arguments[e++]:t[o];for(;e<arguments.length;)i.push(arguments[e++]);return E(n,r,this,this,i)};return r},m.bindAll=function(n){var t,r,e=arguments.length;if(e<=1)throw new Error("bindAll must be passed function names");for(t=1;t<e;t++)r=arguments[t],n[r]=m.bind(n[r],n);return n},m.memoize=function(n,t){var r=function(e){var u=r.cache,i=""+(t?t.apply(this,arguments):e);return m.has(u,i)||(u[i]=n.apply(this,arguments)),u[i]};return r.cache={},r},m.delay=function(n,t){var r=l.call(arguments,2);return setTimeout(function(){return n.apply(null,r)},t)},m.defer=m.partial(m.delay,m,1),m.throttle=function(n,t,r){var e,u,i,o=null,a=0;r||(r={});var c=function(){a=!1===r.leading?0:m.now(),o=null,i=n.apply(e,u),o||(e=u=null)};return function(){var f=m.now();a||!1!==r.leading||(a=f);var l=t-(f-a);return e=this,u=arguments,l<=0||l>t?(o&&(clearTimeout(o),o=null),a=f,i=n.apply(e,u),o||(e=u=null)):o||!1===r.trailing||(o=setTimeout(c,l)),i}},m.debounce=function(n,t,r){var e,u,i,o,a,c=function(){var f=m.now()-o;f<t&&f>=0?e=setTimeout(c,t-f):(e=null,r||(a=n.apply(i,u),e||(i=u=null)))};return function(){i=this,u=arguments,o=m.now();var f=r&&!e;return e||(e=setTimeout(c,t)),f&&(a=n.apply(i,u),i=u=null),a}},m.wrap=function(n,t){return m.partial(t,n)},m.negate=function(n){return function(){return!n.apply(this,arguments)}},m.compose=function(){var n=arguments,t=n.length-1;return function(){for(var r=t,e=n[t].apply(this,arguments);r--;)e=n[r].call(this,e);return e}},m.after=function(n,t){return function(){if(--n<1)return t.apply(this,arguments)}},m.before=function(n,t){var r;return function(){return--n>0&&(r=t.apply(this,arguments)),n<=1&&(t=null),r}},m.once=m.partial(m.before,2);var M=!{toString:null}.propertyIsEnumerable("toString"),I=["valueOf","isPrototypeOf","toString","propertyIsEnumerable","hasOwnProperty","toLocaleString"];m.keys=function(n){if(!m.isObject(n))return[];if(v)return v(n);var t=[];for(var r in n)m.has(n,r)&&t.push(r);return M&&e(n,t),t},m.allKeys=function(n){if(!m.isObject(n))return[];var t=[];for(var r in n)t.push(r);return M&&e(n,t),t},m.values=function(n){for(var t=m.keys(n),r=t.length,e=Array(r),u=0;u<r;u++)e[u]=n[t[u]];return e},m.mapObject=function(n,t,r){t=x(t,r);for(var e,u=m.keys(n),i=u.length,o={},a=0;a<i;a++)e=u[a],o[e]=t(n[e],e,n);return o},m.pairs=function(n){for(var t=m.keys(n),r=t.length,e=Array(r),u=0;u<r;u++)e[u]=[t[u],n[t[u]]];return e},m.invert=function(n){for(var t={},r=m.keys(n),e=0,u=r.length;e<u;e++)t[n[r[e]]]=r[e];return t},m.functions=m.methods=function(n){var t=[];for(var r in n)m.isFunction(n[r])&&t.push(r);return t.sort()},m.extend=_(m.allKeys),m.extendOwn=m.assign=_(m.keys),m.findKey=function(n,t,r){t=x(t,r);for(var e,u=m.keys(n),i=0,o=u.length;i<o;i++)if(e=u[i],t(n[e],e,n))return e},m.pick=function(n,t,r){var e,u,i={},o=n;if(null==o)return i;m.isFunction(t)?(u=m.allKeys(o),e=b(t,r)):(u=S(arguments,!1,!1,1),e=function(n,t,r){return t in r},o=Object(o));for(var a=0,c=u.length;a<c;a++){var f=u[a],l=o[f];e(l,f,o)&&(i[f]=l)}return i},m.omit=function(n,t,r){if(m.isFunction(t))t=m.negate(t);else{var e=m.map(S(arguments,!1,!1,1),String);t=function(n,t){return!m.contains(e,t)}}return m.pick(n,t,r)},m.defaults=_(m.allKeys,!0),m.create=function(n,t){var r=j(n);return t&&m.extendOwn(r,t),r},m.clone=function(n){return m.isObject(n)?m.isArray(n)?n.slice():m.extend({},n):n},m.tap=function(n,t){return t(n),n},m.isMatch=function(n,t){var r=m.keys(t),e=r.length;if(null==n)return!e;for(var u=Object(n),i=0;i<e;i++){var o=r[i];if(t[o]!==u[o]||!(o in u))return!1}return!0};var N=function(n,t,r,e){if(n===t)return 0!==n||1/n==1/t;if(null==n||null==t)return n===t;n instanceof m&&(n=n._wrapped),t instanceof m&&(t=t._wrapped);var u=s.call(n);if(u!==s.call(t))return!1;switch(u){case"[object RegExp]":case"[object String]":return""+n==""+t;case"[object Number]":return+n!=+n?+t!=+t:0==+n?1/+n==1/t:+n==+t;case"[object Date]":case"[object Boolean]":return+n==+t}var i="[object Array]"===u;if(!i){if("object"!=typeof n||"object"!=typeof t)return!1;var o=n.constructor,a=t.constructor;if(o!==a&&!(m.isFunction(o)&&o instanceof o&&m.isFunction(a)&&a instanceof a)&&"constructor"in n&&"constructor"in t)return!1}r=r||[],e=e||[];for(var c=r.length;c--;)if(r[c]===n)return e[c]===t;if(r.push(n),e.push(t),i){if((c=n.length)!==t.length)return!1;for(;c--;)if(!N(n[c],t[c],r,e))return!1}else{var f,l=m.keys(n);if(c=l.length,m.keys(t).length!==c)return!1;for(;c--;)if(f=l[c],!m.has(t,f)||!N(n[f],t[f],r,e))return!1}return r.pop(),e.pop(),!0};m.isEqual=function(n,t){return N(n,t)},m.isEmpty=function(n){return null==n||(k(n)&&(m.isArray(n)||m.isString(n)||m.isArguments(n))?0===n.length:0===m.keys(n).length)},m.isElement=function(n){return!(!n||1!==n.nodeType)},m.isArray=h||function(n){return"[object Array]"===s.call(n)},m.isObject=function(n){var t=typeof n;return"function"===t||"object"===t&&!!n},m.each(["Arguments","Function","String","Number","Date","RegExp","Error"],function(n){m["is"+n]=function(t){return s.call(t)==="[object "+n+"]"}}),m.isArguments(arguments)||(m.isArguments=function(n){return m.has(n,"callee")}),"function"!=typeof/./&&"object"!=typeof Int8Array&&(m.isFunction=function(n){return"function"==typeof n||!1}),m.isFinite=function(n){return isFinite(n)&&!isNaN(parseFloat(n))},m.isNaN=function(n){return m.isNumber(n)&&n!==+n},m.isBoolean=function(n){return!0===n||!1===n||"[object Boolean]"===s.call(n)},m.isNull=function(n){return null===n},m.isUndefined=function(n){return void 0===n},m.has=function(n,t){return null!=n&&p.call(n,t)},m.noConflict=function(){return u._=i,this},m.identity=function(n){return n},m.constant=function(n){return function(){return n}},m.noop=function(){},m.property=w,m.propertyOf=function(n){return null==n?function(){}:function(t){return n[t]}},m.matcher=m.matches=function(n){return n=m.extendOwn({},n),function(t){return m.isMatch(t,n)}},m.times=function(n,t,r){var e=Array(Math.max(0,n));t=b(t,r,1);for(var u=0;u<n;u++)e[u]=t(u);return e},m.random=function(n,t){return null==t&&(t=n,n=0),n+Math.floor(Math.random()*(t-n+1))},m.now=Date.now||function(){return(new Date).getTime()};var B={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;"},T=m.invert(B),R=function(n){var t=function(t){return n[t]},r="(?:"+m.keys(n).join("|")+")",e=RegExp(r),u=RegExp(r,"g");return function(n){return n=null==n?"":""+n,e.test(n)?n.replace(u,t):n}};m.escape=R(B),m.unescape=R(T),m.result=function(n,t,r){var e=null==n?void 0:n[t];return void 0===e&&(e=r),m.isFunction(e)?e.call(n):e};var q=0;m.uniqueId=function(n){var t=++q+"";return n?n+t:t},m.templateSettings={evaluate:/<%([\s\S]+?)%>/g,interpolate:/<%=([\s\S]+?)%>/g,escape:/<%-([\s\S]+?)%>/g};var K={"'":"'","\\":"\\","\r":"r","\n":"n","\u2028":"u2028","\u2029":"u2029"},z=function(n){return"\\"+K[n]};m.template=function(n,t,r){!t&&r&&(t=r),t=m.defaults({},t,m.templateSettings);var e=RegExp([(t.escape||/(.)^/).source,(t.interpolate||/(.)^/).source,(t.evaluate||/(.)^/).source].join("|")+"|$","g"),u=0,i="__p+='";n.replace(e,function(t,r,e,o,a){return i+=n.slice(u,a).replace(/\\|'|\r|\n|\u2028|\u2029/g,z),u=a+t.length,r?i+="'+\n((__t=("+r+"))==null?'':_.escape(__t))+\n'":e?i+="'+\n((__t=("+e+"))==null?'':__t)+\n'":o&&(i+="';\n"+o+"\n__p+='"),t}),i+="';\n",t.variable||(i="with(obj||{}){\n"+i+"}\n"),i="var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};\n"+i+"return __p;\n";try{var o=new Function(t.variable||"obj","_",i)}catch(n){throw n.source=i,n}var a=function(n){return o.call(this,n,m)};return a.source="function("+(t.variable||"obj")+"){\n"+i+"}",a},m.chain=function(n){var t=m(n);return t._chain=!0,t};var D=function(n,t){return n._chain?m(t).chain():t};m.mixin=function(n){m.each(m.functions(n),function(t){var r=m[t]=n[t];m.prototype[t]=function(){var n=[this._wrapped];return f.apply(n,arguments),D(this,r.apply(m,n))}})},m.mixin(m),m.each(["pop","push","reverse","shift","sort","splice","unshift"],function(n){var t=o[n];m.prototype[n]=function(){var r=this._wrapped;return t.apply(r,arguments),"shift"!==n&&"splice"!==n||0!==r.length||delete r[0],D(this,r)}}),m.each(["concat","join","slice"],function(n){var t=o[n];m.prototype[n]=function(){return D(this,t.apply(this._wrapped,arguments))}}),m.prototype.value=function(){return this._wrapped},m.prototype.valueOf=m.prototype.toJSON=m.prototype.value,m.prototype.toString=function(){return""+this._wrapped},"function"==typeof define&&define.amd&&define("underscore",[],function(){return m})}).call(this);

},{}],14:[function(require,module,exports){
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

},{"ua-parser-js":12}]},{},[3])

//# sourceMappingURL=settings.js.map
