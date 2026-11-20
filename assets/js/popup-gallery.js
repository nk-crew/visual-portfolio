import $ from 'jquery';

const { VPPopupAPI, VPData } = window;
const { settingsPopupGallery } = VPData;

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
		if (
			!this.options.itemsClickAction ||
			this.options.itemsClickAction === 'url'
		) {
			return;
		}

		this.$item.off(`click.vpf-uid-${this.uid}`);

		this.emitEvent('destroyPopupGallery');
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

/**
 * Popup for WordPress images and custom galleries
 *
 * This code is active when the "Lightbox for WordPress Images" setting is enabled.
 * It handles:
 * - WordPress native galleries (blocks, classic galleries, Jetpack)
 * - WordPress single images in content
 * - Custom galleries marked with .vp-lightbox-gallery class
 *
 * Custom gallery usage:
 * - Single image: <a href="image.jpg" class="vp-lightbox-gallery"><img /></a>
 * - Gallery: <div class="vp-lightbox-gallery"><a href="img1.jpg">...</a></div>
 */
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
			p > a,
			a.vp-lightbox-gallery,
			.vp-lightbox-gallery a
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
				'.wp-block-gallery, .gallery, .tiled-gallery__gallery, .vp-lightbox-gallery'
			);
			let activeIndex = 0;

			// Block gallery, WordPress default gallery, Jetpack gallery, custom gallery.
			if ($gallery.length) {
				// Check if it's a custom gallery or WordPress gallery
				const isCustomGallery = $gallery.hasClass(
					'vp-lightbox-gallery'
				);
				const $galleryItems = isCustomGallery
					? $gallery.find('a')
					: $gallery.find(
							`
								.blocks-gallery-item > figure > a,
								.wp-block-image > a,
								.gallery-icon > a,
								figure.tiled-gallery__item > a
							`
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
