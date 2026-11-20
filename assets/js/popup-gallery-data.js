import { LOOP_POPUP_OPEN } from '../../gutenberg/popup/open';

const { VPData } = window;
const { settingsPopupGallery } = VPData;
const templatesSupport = 'content' in document.createElement('template');

/*
 * Global Popup Gallery API.
 */
const VPPopupAPI = {
	vendor: false,

	vendors: [
		{
			vendor: 'youtube',
			embedUrl: 'https://www.youtube.com/embed/{{video_id}}?{{params}}',
			pattern:
				/(https?:\/\/)?(www.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\/(?:embed\/|shorts\/|v\/|watch\?v=|watch\?list=(.*)&v=|watch\?(.*[^&]&)v=)?((\w|-){11})(&list=(\w+)&?)?(.*)/,
			patternIndex: 6,
			params: {
				autoplay: 1,
				autohide: 1,
				fs: 1,
				rel: 0,
				hd: 1,
				wmode: 'transparent',
				enablejsapi: 1,
				html5: 1,
			},
			paramsIndex: 10,
			embedCallback(url, match) {
				let result = false;
				const videoId =
					match && match[this.patternIndex]
						? match[this.patternIndex]
						: false;

				if (videoId) {
					const isShorts = /\/shorts\//.test(url);

					const width = isShorts ? 476 : 1920;
					const height = isShorts ? 847 : 1080;

					result = VPPopupAPI.embedCallback(
						{
							...this,
							width,
							height,
						},
						videoId,
						url,
						match
					);
				}

				return result;
			},
		},
		{
			vendor: 'vimeo',
			embedUrl: 'https://player.vimeo.com/video/{{video_id}}?{{params}}',
			pattern:
				/https?:\/\/(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)(.*)/,
			patternIndex: 3,
			params: {
				autoplay: 1,
				hd: 1,
				show_title: 1,
				show_byline: 1,
				show_portrait: 0,
				fullscreen: 1,
			},
			paramsIndex: 4,
		},
	],

	init() {},
	open(items, index, self) {
		return self?.[LOOP_POPUP_OPEN]?.(items, index, self);
	},
	close() {},
	append() {},

	/**
	 * Active popup session references.
	 * Set by vendor scripts while a popup is open.
	 */
	instance: false,
	rawItems: false,
	portfolio: false,

	/**
	 * Parse query parameters.
	 * Thanks to https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
	 *
	 * @param {string} query - query string.
	 *
	 * @return {string}
	 */
	getQueryStringParams(query) {
		return query
			? (/^[?#]/.test(query) ? query.slice(1) : query)
					.split('&')
					.reduce((params, param) => {
						const [key, value] = param.split('=');
						params[key] = value
							? decodeURIComponent(value.replace(/\+/g, ' '))
							: '';
						return params;
					}, {})
			: {};
	},

	/**
	 * Prepare params from parsed URL.
	 *
	 * @param {Object} match      - url match data.
	 * @param {Object} vendorData - vendor data.
	 *
	 * @return {string}
	 */
	prepareParams(match, vendorData) {
		let result = '';

		// Prepare default params.
		const params = vendorData.params || {};

		// Parse params from URL.
		if (vendorData.paramsIndex && match && match[vendorData.paramsIndex]) {
			const newParams = VPPopupAPI.getQueryStringParams(
				match[vendorData.paramsIndex]
			);

			if (newParams && typeof newParams === 'object') {
				Object.keys(newParams).forEach((key) => {
					if (key && newParams[key]) {
						params[key] = newParams[key];
					}
				});
			}
		}

		if (params && Object.keys(params).length) {
			Object.keys(params).forEach((key) => {
				if (key && params[key]) {
					if (result) {
						result += '&';
					}
					result += `${key}=${params[key]}`;
				}
			});
		}

		return result;
	},

	/**
	 * Prepare data for embed.
	 *
	 * @param {Object}           vendorData current video vendor data.
	 * @param {string}           videoId    parsed video ID.
	 * @param {string}           url        video URL provided.
	 * @param {Object | boolean} match      URL match data.
	 *
	 * @return {Object}
	 */
	embedCallback(vendorData, videoId, url, match = false) {
		let { embedUrl } = vendorData;
		embedUrl = embedUrl.replace(/{{video_id}}/g, videoId);
		embedUrl = embedUrl.replace(/{{video_url}}/g, url);
		embedUrl = embedUrl.replace(
			/{{video_url_encoded}}/g,
			encodeURIComponent(url)
		);
		embedUrl = embedUrl.replace(
			/{{params}}/g,
			match ? VPPopupAPI.prepareParams(match, vendorData) : ''
		);

		const width = vendorData.width || 1920;
		const height = vendorData.height || 1080;

		return {
			vendor: vendorData.vendor,
			id: videoId,
			embed: `<iframe width="${width}" height="${height}" src="${embedUrl}" scrolling="no" frameborder="0" allowTransparency="true" allow="accelerometer; autoplay; clipboard-write; fullscreen; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`,
			embedUrl,
			url,
			width,
			height,
		};
	},

	/**
	 * Parse video URL and return object with data
	 *
	 * @param {string} url    - video url.
	 * @param {string} url    - optional poster url.
	 *
	 * @param          poster
	 * @return {object|boolean} video data
	 */
	parseVideo(url, poster) {
		let result = false;

		VPPopupAPI.vendors.forEach((vendorData) => {
			if (!result) {
				const match = url.match(vendorData.pattern);
				const videoId =
					match && match[vendorData.patternIndex]
						? match[vendorData.patternIndex]
						: false;

				if (videoId) {
					// Custom embed callback.
					if (vendorData.embedCallback) {
						result = vendorData.embedCallback(url, match, poster);

						// Predefined embed callback.
					} else {
						result = VPPopupAPI.embedCallback(
							vendorData,
							videoId,
							url,
							match
						);
					}
				}
			}
		});

		// Unknown vendor.
		if (!result) {
			result = VPPopupAPI.embedCallback(
				{
					vendor: 'unknown',
					embedUrl: url,
				},
				url,
				url,
				false
			);
		}

		return result;
	},

	/**
	 * Parse gallery item popup data.
	 *
	 * @param {element} itemElement - gallery item
	 */
	parseItem(itemElement) {
		let result = false;

		// The item's own data, a child of it: a gallery inside the item's
		// content carries data of its own further down.
		const $dataElement =
			itemElement &&
			itemElement.querySelector(':scope > .vp-portfolio__item-popup');

		if ($dataElement) {
			result = {
				$dataElement,
				$content: $dataElement,
				data: $dataElement.dataset,
			};

			// Support for <template> tag.
			if (
				templatesSupport &&
				$dataElement.nodeName === 'TEMPLATE' &&
				$dataElement.content
			) {
				result.$content = $dataElement.content;
			}

			result.$title = result?.$content?.querySelector(
				'.vp-portfolio__item-popup-title'
			);
			result.$description = result?.$content?.querySelector(
				'.vp-portfolio__item-popup-description'
			);
		}

		return result;
	},

	/**
	 * Parse gallery
	 *
	 * @param {Element|ArrayLike<Element>} gallery - gallery element.
	 *
	 * @return {Array} gallery data
	 */
	parseGallery(gallery) {
		const items = [];
		let size;
		let item;
		let video;
		let videoData;
		const roots =
			gallery.nodeType === Node.ELEMENT_NODE
				? [gallery]
				: Array.from(gallery);
		const list = '.wp-block-visual-portfolio-item-template';
		const classicItem =
			'.vp-portfolio__item-wrap:not(.swiper-slide-duplicate)';
		const selector = roots.some((root) => root.matches(list))
			? ':scope > .wp-block-visual-portfolio-item-template__item'
			: classicItem;
		const slider = roots
			.map((root) =>
				root.querySelector(':scope > .vp-portfolio__items-wrap.swiper')
			)
			.find(Boolean);
		const galleryItems = slider?.swiper
			? Array.from(
					slider.querySelectorAll(
						`:scope > .vp-portfolio__items > ${classicItem}`
					)
				).sort(
					(a, b) =>
						Number(a.getAttribute('data-swiper-slide-index')) -
						Number(b.getAttribute('data-swiper-slide-index'))
				)
			: new Set(
					roots.flatMap((root) =>
						Array.from(root.querySelectorAll(selector))
					)
				);

		galleryItems.forEach((element) => {
			const itemData = VPPopupAPI.parseItem(element);

			if (itemData) {
				size = (itemData?.data?.vpPopupImgSize || '1920x1080').split(
					'x'
				);
				video = itemData?.data?.vpPopupVideo;
				videoData = false;

				if (video) {
					videoData = VPPopupAPI.parseVideo(
						video,
						itemData?.data?.vpPopupPoster
					);
				}

				if (videoData) {
					item = {
						type: 'embed',
						el: element,
						poster: videoData.poster,
						src: videoData.embedUrl,
						embed: videoData.embed,
						width: videoData.width || 1920,
						height: videoData.height || 1080,
					};
				} else {
					// create slide object
					item = {
						type: 'image',
						el: element,
						src: itemData?.data?.vpPopupImg,
						srcset: itemData?.data?.vpPopupImgSrcset,
						width: parseInt(size[0], 10),
						height: parseInt(size[1], 10),
					};

					const srcSmall = itemData?.data?.vpPopupSmImg || item.src;
					if (srcSmall) {
						const smallSize = (
							itemData?.data?.vpPopupSmImgSize ||
							itemData?.data?.vpPopupImgSize ||
							'1920x1080'
						).split('x');

						item.srcSmall = srcSmall;
						item.srcSmallWidth = parseInt(smallSize[0], 10);
						item.srcSmallHeight = parseInt(smallSize[1], 10);
					}

					const srcMedium = itemData?.data?.vpPopupMdImg || item.src;
					if (srcMedium) {
						const mediumSize = (
							itemData?.data?.vpPopupMdImgSize ||
							itemData?.data?.vpPopupImgSize ||
							'1920x1080'
						).split('x');

						item.srcMedium = srcMedium;
						item.srcMediumWidth = parseInt(mediumSize[0], 10);
						item.srcMediumHeight = parseInt(mediumSize[1], 10);
					}
				}

				if (itemData?.$title || itemData?.$description) {
					item.caption =
						(itemData?.$title?.outerHTML || '') +
						(itemData?.$description?.outerHTML || '');
				}

				items.push(item);
			}
		});

		return items;
	},

	/**
	 * Try to focus gallery item link.
	 * Used when popup gallery is closed.
	 *
	 * @param {Object} data - data of the current item
	 */
	maybeFocusGalleryItem(data) {
		if (!settingsPopupGallery.restore_focus) {
			return;
		}

		// Focus native gallery item.
		if (data.linkEl) {
			data.linkEl.focus();

			// Focus Visual Portfolio gallery item.
		} else if (data.el) {
			data.el
				.querySelectorAll('.vp-portfolio__item-img > a')
				.forEach((link) => {
					link.focus();
				});
		}
	},

	/**
	 * Emit popup event with fallback for non-Visual Portfolio galleries
	 * Uses self.emitEvent() when available, otherwise triggers document event manually
	 *
	 * @param {string}        eventName - Event name (e.g., 'initFancybox')
	 * @param {Array}         eventArgs - Event arguments array
	 * @param {Object | null} self      - Gallery instance (null for 3rd-party)
	 */
	emitEvent(eventName, eventArgs, self) {
		if (self && self.emitEvent) {
			// Use instance method for Visual Portfolio galleries
			self.emitEvent(eventName, eventArgs);
		} else {
			// Manually trigger event for 3rd-party galleries
			const globalEventArgs = [null].concat(eventArgs);
			window
				.jQuery?.(document)
				.trigger(`${eventName}.vpf`, globalEventArgs);
		}
	},
};

window.VPPopupAPI = VPPopupAPI;
