import $ from 'jquery';

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
				const vendorData = this;
				const videoId =
					match && match[vendorData.patternIndex]
						? match[vendorData.patternIndex]
						: false;

				if (videoId) {
					const isShorts = /\/shorts\//.test(url);

					const width = isShorts ? 476 : 1920;
					const height = isShorts ? 847 : 1080;

					result = VPPopupAPI.embedCallback(
						{
							...vendorData,
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
	open() {},
	close() {},

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

		const $dataElement =
			itemElement &&
			itemElement.querySelector('.vp-portfolio__item-popup');

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
	 * @param {jQuery} $gallery - gallery element.
	 *
	 * @return {Array} gallery data
	 */
	parseGallery($gallery) {
		const items = [];
		let size;
		let item;
		let video;
		let videoData;

		// Find all gallery items
		// Skip Swiper slider duplicates.
		// Previously we also used the `:not(.swiper-slide-duplicate-active)`, but it contains a valid first slide.
		$gallery
			.find('.vp-portfolio__item-wrap:not(.swiper-slide-duplicate)')
			.each(function () {
				const itemData = VPPopupAPI.parseItem(this);

				if (itemData) {
					size = (
						itemData?.data?.vpPopupImgSize || '1920x1080'
					).split('x');
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
							el: this,
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
							el: this,
							src: itemData?.data?.vpPopupImg,
							srcset: itemData?.data?.vpPopupImgSrcset,
							width: parseInt(size[0], 10),
							height: parseInt(size[1], 10),
						};

						const srcSmall =
							itemData?.data?.vpPopupSmImg || item.src;
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

						const srcMedium =
							itemData?.data?.vpPopupMdImg || item.src;
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
			$(data.linkEl).focus();

			// Focus Visual Portfolio gallery item.
		} else if (data.el) {
			$(data.el).find('.vp-portfolio__item-img > a').focus();
		}
	},
};

window.VPPopupAPI = VPPopupAPI;

// Extend VP class.
$(document).on('extendClass.vpf', (event, VP) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	/**
	 * Init popup gallery
	 */
	VP.prototype.initPopupGallery = function () {
		const self = this;
		if (
			!self.options.itemsClickAction ||
			self.options.itemsClickAction === 'url'
		) {
			return;
		}

		// prevent on preview page
		if (self.isPreview()) {
			return;
		}

		// click action
		// `a.vp-portfolio__item-overlay` added as fallback for old templates, used in themes.
		self.$item.on(
			`click.vpf-uid-${self.uid}`,
			`
        .vp-portfolio__item a.vp-portfolio__item-meta,
        .vp-portfolio__item .vp-portfolio__item-img > a,
        .vp-portfolio__item .vp-portfolio__item-meta-title > a,
        .vp-portfolio__item a.vp-portfolio__item-overlay
      `,
			function (e) {
				if (e.isDefaultPrevented()) {
					return;
				}

				const $this = $(this);
				let $itemWrap = $this.closest('.vp-portfolio__item-wrap');

				// Use Swiper data-attribute to support slide duplicates.
				if (
					$itemWrap.hasClass('swiper-slide-duplicate') &&
					$itemWrap.attr('data-swiper-slide-index')
				) {
					$itemWrap = self.$item.find(
						`[data-swiper-slide-index="${$itemWrap.attr(
							'data-swiper-slide-index'
						)}"].swiper-slide:not(.swiper-slide-duplicate)`
					);
				}

				if (!$itemWrap.find('.vp-portfolio__item-popup').length) {
					return;
				}

				const items = VPPopupAPI.parseGallery(self.$item);
				let index = -1;

				// Get gallery item index.
				// We should check all items with gallery data to prevent
				// issue with items and custom URL used.
				items.forEach((item, idx) => {
					if (item.el === $itemWrap[0]) {
						index = idx;
					}
				});

				// Let's open popup once item index found.
				if (index !== -1) {
					e.preventDefault();
					VPPopupAPI.open(items, index, self);
				}
			}
		);
	};

	/**
	 * Destroy popup gallery
	 */
	VP.prototype.destroyPopupGallery = function () {
		const self = this;

		if (
			!self.options.itemsClickAction ||
			self.options.itemsClickAction === 'url'
		) {
			return;
		}

		self.$item.off(`click.vpf-uid-${self.uid}`);

		self.emitEvent('destroyPopupGallery');
	};
});

// Init.
$(document).on('init.vpf', (event, self) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	self.initPopupGallery();
});

// Destroy.
$(document).on('destroy.vpf', (event, self) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	self.destroyPopupGallery();
});

// Check if link is image.
function isLinkImage(link) {
	return /(.png|.jpg|.jpeg|.gif|.tiff|.tif|.jfif|.jpe|.svg|.bmp|.webp)$/.test(
		link.href.toLowerCase().split('?')[0].split('#')[0]
	);
}

// Parse image data from link.
function parseImgData(link) {
	const $link = $(link);
	let img = link.childNodes[0];
	let caption = $link.next('figcaption');

	// <noscript> tag used in plugins, that adds lazy loading
	if (img.nodeName === 'NOSCRIPT' && link.childNodes[1]) {
		img = link.childNodes[1];
	}

	if (!caption.length && $link.parent('.gallery-icon').length) {
		caption = $link.parent('.gallery-icon').next('figcaption');
	}

	caption = caption.html();

	if (caption) {
		caption = `<div class="vp-portfolio__item-popup-description">${caption}</div>`;
	}

	return {
		type: 'image',
		el: img,
		linkEl: link,
		src: link.href,
		caption,
	};
}

/* Popup for default WordPress images */
if (settingsPopupGallery.enable_on_wordpress_images) {
	$(document).on(
		'click',
		`
      .wp-block-image > a,
      .wp-block-image > figure > a,
      .wp-block-gallery .blocks-gallery-item > figure > a,
      .wp-block-gallery .wp-block-image > a,
      .wp-block-media-text > figure > a,
      .gallery .gallery-icon > a,
      figure.wp-caption > a,
      figure.tiled-gallery__item > a,
      p > a
    `,
		function (e) {
			if (e.isDefaultPrevented()) {
				return;
			}

			if (!this.childNodes.length) {
				return;
			}

			let imageNode = this.childNodes[0];

			// <noscript> tag used in plugins, that adds lazy loading
			if (imageNode.nodeName === 'NOSCRIPT' && this.childNodes[1]) {
				imageNode = this.childNodes[1];
			}

			// check if child node is <img> or <picture> tag.
			// <picture> tag used in plugins, that adds WebP support
			if (
				imageNode.nodeName !== 'IMG' &&
				imageNode.nodeName !== 'PICTURE'
			) {
				return;
			}

			// check if link is image.
			if (!isLinkImage(this)) {
				return;
			}

			e.preventDefault();

			const $this = $(this);
			const items = [];
			const currentImage = parseImgData(this);
			const $gallery = $this.closest(
				'.wp-block-gallery, .gallery, .tiled-gallery__gallery'
			);
			let activeIndex = 0;

			// Block gallery, WordPress default gallery, Jetpack gallery.
			if ($gallery.length) {
				const $galleryItems = $gallery.find(
					'.blocks-gallery-item > figure > a, .wp-block-image > a, .gallery-icon > a, figure.tiled-gallery__item > a'
				);
				let i = 0;

				$galleryItems.each(function () {
					// check if link is image.
					if (isLinkImage(this)) {
						if (this === currentImage.linkEl) {
							activeIndex = i;
						}

						items.push(parseImgData(this));

						i += 1;
					}
				});

				// WordPress gallery.
			} else {
				items.push(currentImage);
			}

			VPPopupAPI.open(items, activeIndex);
		}
	);
}
