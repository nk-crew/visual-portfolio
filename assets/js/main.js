import $ from 'jquery';
import rafSchd from 'raf-schd';
import { throttle } from 'throttle-debounce';

const { VPData } = window;
const { __ } = VPData;
const $wnd = $(window);

/**
 * Emit Resize Event.
 */
function windowResizeEmit() {
	if (typeof window.Event === 'function') {
		// modern browsers
		window.dispatchEvent(new window.Event('resize'));
	} else {
		// for IE and other old browsers
		// causes deprecation warning on modern browsers
		const evt = window.document.createEvent('UIEvents');
		evt.initUIEvent('resize', true, false, window, 0);
		window.dispatchEvent(evt);
	}
}

const visibilityData = {};
let shouldCheckVisibility = false;
let checkVisibilityTimeout = false;
let isFocusVisible = false;

// fix portfolio inside Tabs and Accordions
// check visibility by timer https://stackoverflow.com/questions/19669786/check-if-element-is-visible-in-dom/33456469
//
// https://github.com/nk-crew/visual-portfolio/issues/11
// https://github.com/nk-crew/visual-portfolio/issues/113
function checkVisibility() {
	clearTimeout(checkVisibilityTimeout);

	if (!shouldCheckVisibility) {
		return;
	}

	const $items = $('.vp-portfolio__ready');

	if ($items.length) {
		let isVisibilityChanged = false;

		$items.each(function () {
			const { vpf } = this;

			if (!vpf) {
				return;
			}

			const currentState = visibilityData[vpf.uid] || 'none';

			visibilityData[vpf.uid] =
				this.offsetParent === null ? 'hidden' : 'visible';

			// changed from hidden to visible.
			if (
				currentState === 'hidden' &&
				visibilityData[vpf.uid] === 'visible'
			) {
				isVisibilityChanged = true;
			}
		});

		// resize, if visibility changed.
		if (isVisibilityChanged) {
			windowResizeEmit();
		}
	} else {
		shouldCheckVisibility = false;
	}

	// run again.
	checkVisibilityTimeout = setTimeout(checkVisibility, 500);
}

// run check function only after portfolio inited.
$(document).on('inited.vpf', (event) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	shouldCheckVisibility = true;

	checkVisibility();
});

/**
 * If the most recent user interaction was via the keyboard;
 * and the key press did not include a meta, alt/option, or control key;
 * then the modality is keyboard. Otherwise, the modality is not keyboard.
 */
document.addEventListener(
	'keydown',
	(e) => {
		if (e.metaKey || e.altKey || e.ctrlKey) {
			return;
		}

		isFocusVisible = true;
	},
	true
);

/**
 * If at any point a user clicks with a pointing device, ensure that we change
 * the modality away from keyboard.
 * This avoids the situation where a user presses a key on an already focused
 * element, and then clicks on a different element, focusing it with a
 * pointing device, while we still think we're in keyboard modality.
 */
document.addEventListener(
	'mousedown',
	() => {
		isFocusVisible = false;
	},
	true
);
document.addEventListener(
	'pointerdown',
	() => {
		isFocusVisible = false;
	},
	true
);
document.addEventListener(
	'touchstart',
	() => {
		isFocusVisible = false;
	},
	true
);

/**
 * Main VP class
 */
class VP {
	constructor($item, userOptions) {
		this.$item = $item;

		// get id from class
		const classes = $item[0].className.split(/\s+/);
		for (let k = 0; k < classes.length; k += 1) {
			if (classes[k] && /^vp-uid-/.test(classes[k])) {
				this.uid = classes[k].replace(/^vp-uid-/, '');
			}
			if (classes[k] && /^vp-id-/.test(classes[k])) {
				this.id = classes[k].replace(/^vp-id-/, '');
			}
		}
		if (!this.uid) {
			// eslint-disable-next-line no-console
			console.error(__.couldnt_retrieve_vp);
			return;
		}

		this.href = window.location.href;

		this.$items_wrap = $item.find('.vp-portfolio__items');
		this.$slider_thumbnails_wrap = $item.find('.vp-portfolio__thumbnails');
		this.$pagination = $item.find('.vp-portfolio__pagination-wrap');
		this.$filter = $item.find('.vp-portfolio__filter-wrap');
		this.$sort = $item.find('.vp-portfolio__sort-wrap');

		// find single filter block.
		if (this.id) {
			this.$filter = this.$filter.add(
				`.vp-single-filter.vp-id-${this.id} .vp-portfolio__filter-wrap`
			);
		}

		// find single sort block.
		if (this.id) {
			this.$sort = this.$sort.add(
				`.vp-single-sort.vp-id-${this.id} .vp-portfolio__sort-wrap`
			);
		}

		// user options
		this.userOptions = userOptions;

		this.firstRun = true;

		this.init();
	}

	// emit event
	// Example:
	// $(document).on('init.vpf', function (event, infiniteObject) {
	//     console.log(infiniteObject);
	// });
	emitEvent(event, data) {
		data = data ? [this].concat(data) : [this];
		this.$item.trigger(`${event}.vpf`, data);
		this.$item.trigger(`${event}.vpf-uid-${this.uid}`, data);
	}

	/**
	 * Init
	 */
	init() {
		// destroy if already inited
		if (!this.firstRun) {
			this.destroy();
		}

		this.destroyed = false;

		this.$item.addClass('vp-portfolio__ready');

		// init options
		this.initOptions();

		// init events
		this.initEvents();

		// init layout
		this.initLayout();

		// init custom colors
		this.initCustomColors();

		this.emitEvent('init');

		if (this.id) {
			$(`.vp-single-filter.vp-id-${this.id}`)
				.addClass('vp-single-filter__ready')
				.parent('.vp-portfolio__layout-elements')
				.addClass('vp-portfolio__layout-elements__ready');
			$(`.vp-single-sort.vp-id-${this.id}`)
				.addClass('vp-single-sort__ready')
				.parent('.vp-portfolio__layout-elements')
				.addClass('vp-portfolio__layout-elements__ready');
		}

		// resized
		this.resized();

		// images loaded
		this.imagesLoaded();

		this.emitEvent('inited');

		this.firstRun = false;
	}

	/**
	 * Check if script loaded in preview.
	 *
	 * @return {boolean} is in preview.
	 */
	isPreview() {
		return !!this.$item.closest('#vp_preview').length;
	}

	/**
	 * Called after resized container.
	 */
	resized() {
		windowResizeEmit();

		this.emitEvent('resized');
	}

	/**
	 * Images loaded.
	 */
	imagesLoaded() {
		if (!this.$items_wrap.imagesLoaded) {
			return;
		}

		this.$items_wrap.imagesLoaded().progress(() => {
			this.emitEvent('imagesLoaded');
		});
	}

	/**
	 * Destroy
	 */
	destroy() {
		// remove loaded class
		this.$item.removeClass('vp-portfolio__ready');

		if (this.id) {
			$(`.vp-single-filter.vp-id-${this.id}`)
				.removeClass('vp-single-filter__ready')
				.parent('.vp-portfolio__layout-elements')
				.removeClass('vp-portfolio__layout-elements__ready');
			$(`.vp-single-sort.vp-id-${this.id}`)
				.removeClass('vp-single-sort__ready')
				.parent('.vp-portfolio__layout-elements')
				.removeClass('vp-portfolio__layout-elements__ready');
		}

		// destroy events
		this.destroyEvents();

		// remove all generated styles
		this.removeStyle();
		this.renderStyle();

		this.emitEvent('destroy');

		this.destroyed = true;
	}

	/**
	 * Add style to the current portfolio list
	 *
	 * @param {string} selector css selector
	 * @param {string} styles   object with styles
	 * @param {string} media    string with media query
	 */
	addStyle(selector, styles, media) {
		media = media || '';
		const { uid } = this;

		if (!this.stylesList) {
			this.stylesList = {};
		}

		if (typeof this.stylesList[uid] === 'undefined') {
			this.stylesList[uid] = {};
		}
		if (typeof this.stylesList[uid][media] === 'undefined') {
			this.stylesList[uid][media] = {};
		}
		if (typeof this.stylesList[uid][media][selector] === 'undefined') {
			this.stylesList[uid][media][selector] = {};
		}

		this.stylesList[uid][media][selector] = $.extend(
			this.stylesList[uid][media][selector],
			styles
		);

		this.emitEvent('addStyle', [selector, styles, media, this.stylesList]);
	}

	/**
	 * Remove style from the current portfolio list
	 *
	 * @param {string} selector css selector (if not set - removed all styles)
	 * @param {string} styles   object with styles
	 * @param {string} media    string with media query
	 */
	removeStyle(selector, styles, media) {
		media = media || '';
		const { uid } = this;

		if (!this.stylesList) {
			this.stylesList = {};
		}

		if (typeof this.stylesList[uid] !== 'undefined' && !selector) {
			this.stylesList[uid] = {};
		}

		if (
			typeof this.stylesList[uid] !== 'undefined' &&
			typeof this.stylesList[uid][media] !== 'undefined' &&
			typeof this.stylesList[uid][media][selector] !== 'undefined' &&
			selector
		) {
			delete this.stylesList[uid][media][selector];
		}

		this.emitEvent('removeStyle', [selector, styles, this.stylesList]);
	}

	/**
	 * Render style for the current portfolio list
	 */
	renderStyle() {
		// timeout for the case, when styles added one by one
		const { uid } = this;
		let stylesString = '';

		if (!this.stylesList) {
			this.stylesList = {};
		}

		// create string with styles
		if (typeof this.stylesList[uid] !== 'undefined') {
			Object.keys(this.stylesList[uid]).forEach((m) => {
				// media
				if (m) {
					stylesString += `@media ${m} {`;
				}
				Object.keys(this.stylesList[uid][m]).forEach((s) => {
					// selector
					const selectorParent = `.vp-uid-${uid}`;
					let selector = `${selectorParent} ${s}`;

					// add parent selector after `,`.
					selector = selector.replace(
						/, |,/g,
						`, ${selectorParent} `
					);

					stylesString += `${selector} {`;
					Object.keys(this.stylesList[uid][m][s]).forEach((p) => {
						// property and value
						stylesString += `${p}:${this.stylesList[uid][m][s][p]};`;
					});
					stylesString += '}';
				});
				// media
				if (m) {
					stylesString += '}';
				}
			});
		}

		// add in style tag
		let $style = $(`#vp-style-${uid}`);
		if (!$style.length) {
			$style = $('<style>')
				.attr('id', `vp-style-${uid}`)
				.appendTo('head');
		}
		$style.html(stylesString);

		this.emitEvent('renderStyle', [stylesString, this.stylesList, $style]);
	}

	/**
	 * First char to lower case
	 *
	 * @param {string} str string to transform
	 * @return {string} result string
	 */
	firstToLowerCase(str) {
		return str.substr(0, 1).toLowerCase() + str.substr(1);
	}

	/**
	 * Init options
	 *
	 * @param {Object} userOptions user options
	 */
	initOptions(userOptions) {
		// default options
		this.defaults = {
			layout: 'tile',
			itemsGap: 0,
			pagination: 'load-more',
		};

		// new user options
		if (userOptions) {
			this.userOptions = userOptions;
		}

		// prepare data options
		const dataOptions = this.$item[0].dataset;

		const pureDataOptions = {};
		Object.keys(dataOptions).forEach((k) => {
			if (k && k.substring(0, 2) === 'vp') {
				pureDataOptions[this.firstToLowerCase(k.substring(2))] =
					dataOptions[k];
			}
		});

		this.options = $.extend(
			{},
			this.defaults,
			pureDataOptions,
			this.userOptions
		);

		this.emitEvent('initOptions');
	}

	/**
	 * Init events
	 */
	initEvents() {
		const self = this;
		const evp = `.vpf-uid-${self.uid}`;

		// Stretch
		function stretch() {
			const rect = self.$item[0].getBoundingClientRect();
			const { left } = rect;
			const right = window.innerWidth - rect.right;

			const ml = parseFloat(self.$item.css('margin-left') || 0);
			const mr = parseFloat(self.$item.css('margin-right') || 0);
			self.$item.css({
				marginLeft: ml - left,
				marginRight: mr - right,
				maxWidth: 'none',
				width: 'auto',
			});
		}
		if (self.$item.hasClass('vp-portfolio__stretch') && !self.isPreview()) {
			$wnd.on(`load${evp} resize${evp} orientationchange${evp}`, () => {
				stretch();
			});
			stretch();
		}

		// add helper focus class
		// TODO: change to CSS :has() when will be widely available
		// @link https://caniuse.com/?search=%3Ahas
		self.$item.on(`focus${evp}`, '.vp-portfolio__item a', function () {
			const $item = $(this).closest('.vp-portfolio__item');

			$item.addClass('vp-portfolio__item-focus');

			if (isFocusVisible) {
				$item.addClass('vp-portfolio__item-focus-visible');
			}
		});
		self.$item.on(`blur${evp}`, '.vp-portfolio__item a', function () {
			$(this)
				.closest('.vp-portfolio__item')
				.removeClass(
					'vp-portfolio__item-focus vp-portfolio__item-focus-visible'
				);
		});

		self.$filter.on(
			`click${evp}`,
			'.vp-filter .vp-filter__item a',
			function (e) {
				e.preventDefault();
				const $this = $(this);
				if (!self.loading) {
					$this
						.closest('.vp-filter__item')
						.addClass('vp-filter__item-active')
						.siblings()
						.removeClass('vp-filter__item-active');
				}
				self.loadNewItems($this.attr('href'), true);
			}
		);

		// on sort click
		self.$sort.on(`click${evp}`, '.vp-sort .vp-sort__item a', function (e) {
			e.preventDefault();
			const $this = $(this);
			if (!self.loading) {
				$this
					.closest('.vp-sort__item')
					.addClass('vp-sort__item-active')
					.siblings()
					.removeClass('vp-sort__item-active');
			}
			self.loadNewItems($this.attr('href'), true);
		});

		// on filter/sort select change
		self.$filter
			.add(self.$sort)
			.on(
				`change${evp}`,
				'.vp-filter select, .vp-sort select',
				function () {
					const $this = $(this);
					const value = $this.val();
					const $option = $this.find(
						`[value="${value}"][data-vp-url]`
					);

					if ($option.length) {
						self.loadNewItems($option.attr('data-vp-url'), true);
					}
				}
			);

		// Function to handle scrolling to top
		function scrollToTop($pagination) {
			if (
				self.options.pagination === 'paged' &&
				$pagination.hasClass('vp-pagination__scroll-top')
			) {
				const $adminBar = $('#wpadminbar');
				const currentTop =
					window.pageYOffset || document.documentElement.scrollTop;
				let { top } = self.$item.offset();

				// Custom user offset
				if ($pagination.attr('data-vp-pagination-scroll-top')) {
					top -=
						parseInt(
							$pagination.attr('data-vp-pagination-scroll-top'),
							10
						) || 0;
				}

				// Admin bar offset
				if ($adminBar.length && $adminBar.css('position') === 'fixed') {
					top -= $adminBar.outerHeight();
				}

				// Limit max offset
				top = Math.max(0, top);

				if (currentTop > top) {
					window.scrollTo({
						top,
						behavior: 'smooth',
					});
				}
			}
		}

		// Handle pagination click
		self.$item.on(
			`click${evp}`,
			'.vp-pagination .vp-pagination__item a',
			function (e) {
				e.preventDefault();

				const $this = $(this);
				const $pagination = $this.closest('.vp-pagination');

				if (
					$pagination.hasClass('vp-pagination__no-more') &&
					self.options.pagination !== 'paged'
				) {
					return;
				}

				self.loadNewItems(
					$this.attr('href'),
					self.options.pagination === 'paged'
				);

				scrollToTop($pagination);
			}
		);

		// on categories of item click
		self.$item.on(
			`click${evp}`,
			'.vp-portfolio__items .vp-portfolio__item-meta-category a',
			function (e) {
				e.preventDefault();
				e.stopPropagation();
				self.loadNewItems($(this).attr('href'), true);
			}
		);

		// resized container
		self.$item.on(`transitionend${evp}`, '.vp-portfolio__items', (e) => {
			if (e.currentTarget === e.target) {
				self.resized();
			}
		});

		self.emitEvent('initEvents');
	}

	/**
	 * Destroy events
	 */
	destroyEvents() {
		const evp = `.vpf-uid-${this.uid}`;

		// destroy click events
		this.$item.off(evp);
		this.$filter.off(evp);
		this.$sort.off(evp);

		// destroy window events
		$wnd.off(evp);

		this.emitEvent('destroyEvents');
	}

	/**
	 * Init layout
	 */
	initLayout() {
		this.emitEvent('initLayout');

		this.renderStyle();
	}

	/**
	 * Init custom color by data attributes:
	 * data-vp-bg-color
	 * data-vp-text-color
	 */
	initCustomColors() {
		const self = this;

		self.$item.find('[data-vp-bg-color]').each(function () {
			const val = $(this).attr('data-vp-bg-color');
			self.addStyle(`[data-vp-bg-color="${val}"]`, {
				'background-color': `${val} !important`,
			});
		});

		self.$item.find('[data-vp-text-color]').each(function () {
			const val = $(this).attr('data-vp-text-color');
			self.addStyle(`[data-vp-text-color="${val}"]`, {
				color: `${val} !important`,
			});
		});

		self.renderStyle();

		self.emitEvent('initCustomColors');
	}

	/**
	 * Add New Items
	 *
	 * @param {object|dom|jQuery} $items         - elements.
	 * @param {bool}              removeExisting - remove existing elements.
	 * @param {Object}            $newVP         - new visual portfolio jQuery.
	 */
	addItems($items, removeExisting, $newVP) {
		this.emitEvent('addItems', [$items, removeExisting, $newVP]);
	}

	/**
	 * Remove Items
	 *
	 * @param {object|dom|jQuery} $items - elements.
	 */
	removeItems($items) {
		this.emitEvent('removeItems', [$items]);
	}

	/**
	 * AJAX Load New Items
	 *
	 * @param {string}   url            - url to request.
	 * @param {bool}     removeExisting - remove existing elements.
	 * @param {Function} cb             - callback.
	 */
	loadNewItems(url, removeExisting, cb) {
		const self = this;
		const { randomSeed } = self.options;

		if (
			(self.loading && typeof self.loading.readyState === 'undefined') ||
			!url ||
			self.href === url
		) {
			return;
		}

		// Abort previous AJAX loader to prevent conflict.
		// We need it mostly for Search feature, because users can type also when already in loading state.
		if (self.loading && self.loading.readyState && self.loading.abort) {
			self.loading.abort();
		}

		const ajaxData = {
			method: 'POST',
			url,
			data: {
				vpf_ajax_call: true,
				vpf_random_seed:
					typeof randomSeed !== 'undefined' ? randomSeed : false,
			},
			complete({ responseText }) {
				self.href = url;
				self.replaceItems(responseText, removeExisting, cb);
			},
		};

		self.loading = true;

		self.$item.addClass('vp-portfolio__loading');

		self.emitEvent('startLoadingNewItems', [url, ajaxData]);

		self.loading = $.ajax(ajaxData);
	}

	/**
	 * Replace items to the new loaded using AJAX
	 *
	 * @param {string}   content        - new page content.
	 * @param {bool}     removeExisting - remove existing elements.
	 * @param {Function} cb             - callback.
	 */
	replaceItems(content, removeExisting, cb) {
		if (!content) {
			return;
		}

		// load to invisible container, then append to posts container
		content = content
			.replace('<body', '<body><div id="vp-ajax-load-body"')
			.replace('</body>', '</div></body>');
		const $body = $(content).filter('#vp-ajax-load-body');

		// find current block on new page
		const $newVP = $body.find(`.vp-portfolio.vp-uid-${this.uid}`);

		// insert new items
		if ($newVP.length) {
			const newItems = $newVP.find('.vp-portfolio__items').html();
			const nothingFound = $newVP.hasClass('vp-portfolio-not-found');

			// We should clean up notices here, as they may be cloned over and over.
			this.$item.find('.vp-notice').remove();

			if (nothingFound) {
				this.$item
					.find('.vp-portfolio__items-wrap')
					.before($newVP.find('.vp-notice').clone());
				this.$item.addClass('vp-portfolio-not-found');
			} else {
				this.$item.removeClass('vp-portfolio-not-found');
			}

			// update filter
			if (this.$filter.length) {
				this.$filter.each(function () {
					const $filter = $(this);
					let newFilterContent = '';

					if ($filter.parent().hasClass('vp-single-filter')) {
						newFilterContent = $body
							.find(
								`[class="${$filter
									.parent()
									.attr('class')
									.replace(
										' vp-single-filter__ready',
										''
									)}"] .vp-portfolio__filter-wrap`
							)
							.html();
					} else {
						newFilterContent = $newVP
							.find('.vp-portfolio__filter-wrap')
							.html();
					}

					$filter.html(newFilterContent);
				});
			}

			// update sort
			if (this.$sort.length) {
				this.$sort.each(function () {
					const $sort = $(this);
					let newFilterContent = '';

					if ($sort.parent().hasClass('vp-single-sort')) {
						newFilterContent = $body
							.find(
								`[class="${$sort
									.parent()
									.attr('class')
									.replace(
										' vp-single-sort__ready',
										''
									)}"] .vp-portfolio__sort-wrap`
							)
							.html();
					} else {
						newFilterContent = $newVP
							.find('.vp-portfolio__sort-wrap')
							.html();
					}

					$sort.html(newFilterContent);
				});
			}

			// update pagination
			if (this.$pagination.length) {
				this.$pagination.html(
					$newVP.find('.vp-portfolio__pagination-wrap').html()
				);
			}

			this.addItems($(newItems), removeExisting, $newVP);

			this.emitEvent('loadedNewItems', [$newVP, removeExisting, content]);

			if (cb) {
				cb();
			}
		}

		// update next page data
		const nextPageUrl = $newVP.attr('data-vp-next-page-url');
		this.options.nextPageUrl = nextPageUrl;
		this.$item.attr('data-vp-next-page-url', nextPageUrl);

		this.$item.removeClass('vp-portfolio__loading');

		this.loading = false;

		this.emitEvent('endLoadingNewItems');

		// images loaded
		this.imagesLoaded();

		// init custom colors
		this.initCustomColors();
	}
}

// extend VP object.
$(document).trigger('extendClass.vpf', [VP]);

// global definition
const plugin = function (options, ...args) {
	let ret;

	this.each(function () {
		if (typeof ret !== 'undefined') {
			return;
		}

		if (typeof options === 'object' || typeof options === 'undefined') {
			if (!this.vpf) {
				this.vpf = new VP($(this), options);
			}
		} else if (this.vpf) {
			ret = this.vpf[options](...args);
		}
	});

	return typeof ret !== 'undefined' ? ret : this;
};
plugin.constructor = VP;

// no conflict
const oldPlugin = $.fn.vpf;
$.fn.vpf = plugin;
$.fn.vpf.noConflict = function () {
	$.fn.vpf = oldPlugin;
	return this;
};

// initialization
$(() => {
	$('.vp-portfolio').vpf();
});

const throttledInit = throttle(
	200,
	rafSchd(() => {
		$('.vp-portfolio:not(.vp-portfolio__ready)').vpf();
	})
);
if (window.MutationObserver) {
	new window.MutationObserver(throttledInit).observe(
		document.documentElement,
		{
			childList: true,
			subtree: true,
		}
	);
} else {
	$(document).on('DOMContentLoaded DOMNodeInserted load', () => {
		throttledInit();
	});
}
