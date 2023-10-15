import isNumber from 'is-number';
import $ from 'jquery';

const {
	Image,
	VPData,
	VPPopupAPI,
	PhotoSwipe,
	PhotoSwipeUI_Default: PhotoSwipeUIDefault,
} = window;
const { __, settingsPopupGallery } = VPData;

function resizeVideo(data, curItem) {
	if (typeof curItem === 'undefined') {
		if (data && data.itemHolders.length) {
			data.itemHolders.forEach((val) => {
				if (val.item && val.item.html) {
					resizeVideo(data, val.item);
				}
			});
		}
		return;
	}

	// calculate real viewport in pixels
	const vpW = data.viewportSize.x;
	let vpH = data.viewportSize.y;
	const ratio = curItem.vw / curItem.vh;
	let resultW;
	const $container = $(curItem.container);

	const bars = data.options.barsSize;
	let barTop = 0;
	let barBot = 0;
	if (bars) {
		barTop = bars.top && bars.top !== 'auto' ? bars.top : 0;
		barBot = bars.bottom && bars.bottom !== 'auto' ? bars.bottom : 0;
	}
	vpH -= barTop + barBot;

	if (ratio > vpW / vpH) {
		resultW = vpW;
	} else {
		resultW = vpH * ratio;
	}

	const $videoCont = $container.find('.vp-pswp-video');

	$videoCont.css('max-width', resultW);
	$videoCont.children().css({
		paddingBottom: `${100 * (curItem.vh / curItem.vw)}%`,
	});

	$container.css({
		top: barTop,
		bottom: barBot,
	});
}

if (PhotoSwipe && VPPopupAPI) {
	let pswpInstance;

	// prepare photoswipe markup
	if (!$('.vp-pswp').length) {
		const markup = `
        <div class="pswp vp-pswp${
			settingsPopupGallery.click_to_zoom ? '' : ' vp-pswp-no-zoom'
		}" tabindex="-1" role="dialog" aria-hidden="true">
            <div class="pswp__bg"></div>
            <div class="pswp__scroll-wrap">
                <div class="pswp__container">
                    <div class="pswp__item"></div>
                    <div class="pswp__item"></div>
                    <div class="pswp__item"></div>
                </div>
                <div class="pswp__ui pswp__ui--hidden">
                    <div class="pswp__top-bar">
                        <div class="pswp__counter"></div>
                        <button class="pswp__button pswp__button--close" title="${
							__.pswp_close
						}"></button>
                        <button class="pswp__button pswp__button--share" title="${
							__.pswp_share
						}"></button>
                        <button class="pswp__button pswp__button--fs" title="${
							__.pswp_fs
						}"></button>
                        <button class="pswp__button pswp__button--zoom" title="${
							__.pswp_zoom
						}"></button>
                    </div>
                    <div class="pswp__preloader">
                        <div class="pswp__preloader__icn">
                            <div class="pswp__preloader__cut">
                                <div class="pswp__preloader__donut"></div>
                            </div>
                        </div>
                    </div>
                    <div class="pswp__share-modal pswp__share-modal--hidden pswp__single-tap">
                        <div class="pswp__share-tooltip"></div>
                    </div>
                    <button class="pswp__button pswp__button--arrow--left" title="${
						__.pswp_prev
					}"></button>
                    <button class="pswp__button pswp__button--arrow--right" title="${
						__.pswp_next
					}"></button>
                    <div class="pswp__caption">
                        <div class="pswp__caption__center"></div>
                    </div>
                </div>
            </div>
        </div>
        `;
		$('body').append(markup);
	}

	// Extend Popup API.
	VPPopupAPI.vendor = 'photoswipe';
	VPPopupAPI.open = function (items, index, self) {
		const finalItems = [];

		// prepare items for fancybox api.
		items.forEach((item) => {
			if (item.type === 'embed') {
				finalItems.push({
					html: `<div class="vp-pswp-video"><div>${item.embed}</div></div>`,
					vw: item.width || 0,
					vh: item.height || 0,
					title: item.caption,
				});
			} else {
				finalItems.push({
					src: item.src,
					el: item.el,
					w: item.width || 0,
					h: item.height || 0,
					title: item.caption,
					o: {
						src: item.src,
						w: item.width || 0,
						h: item.height || 0,
					},
					...(item.srcMedium
						? {
								m: {
									src: item.srcMedium,
									w: item.srcMediumWidth || 0,
									h: item.srcMediumHeight || 0,
								},
								msrc: item.srcMedium,
						  }
						: {}),
				});
			}
		});

		const $pswpElement = $('.vp-pswp');
		const pswpElement = $pswpElement[0];

		// define options (if needed)
		const options = {
			captionAndToolbarShowEmptyCaptions: false,
			closeEl: settingsPopupGallery.show_close_button,
			captionEl: true,
			fullscreenEl: settingsPopupGallery.show_fullscreen_button,
			zoomEl: settingsPopupGallery.show_zoom_button,
			shareEl: settingsPopupGallery.show_share_button,
			counterEl: settingsPopupGallery.show_counter,
			arrowEl: settingsPopupGallery.show_arrows,
			shareButtons: [
				{
					id: 'facebook',
					label: __.pswp_share_fb,
					url: 'https://www.facebook.com/sharer/sharer.php?u={{url}}',
				},
				{
					id: 'twitter',
					label: __.pswp_share_tw,
					url: 'https://twitter.com/intent/tweet?text={{text}}&url={{url}}',
				},
				{
					id: 'pinterest',
					label: __.pswp_share_pin,
					url: 'https://www.pinterest.com/pin/create/button/?url={{url}}&media={{image_url}}&description={{text}}',
				},
			],
			getImageURLForShare() {
				const currentItem = items[pswpInstance.getCurrentIndex()];

				if (currentItem.type === 'image' && currentItem.src) {
					return currentItem.src;
				}

				return pswpInstance.currItem.src || '';
			},
			getPageURLForShare() {
				const currentItem = items[pswpInstance.getCurrentIndex()];

				if (currentItem.type === 'image' && currentItem.src) {
					return currentItem.src;
				}

				return window.location.href;
			},
			getTextForShare() {
				const currentItem = items[pswpInstance.getCurrentIndex()];

				if (currentItem.caption) {
					const $caption = $(currentItem.caption);

					if (
						$caption.filter('.vp-portfolio__item-popup-title')
							.length
					) {
						return $caption
							.filter('.vp-portfolio__item-popup-title')
							.text();
					}
					if (
						$caption.filter('.vp-portfolio__item-popup-description')
							.length
					) {
						return $caption
							.filter('.vp-portfolio__item-popup-description')
							.text();
					}
				}

				return '';
			},
			bgOpacity: 1,
			tapToClose: false,
			tapToToggleControls: true,
			showHideOpacity: true,
			history: false,
			getThumbBoundsFn(thumbIndex) {
				if (!finalItems[thumbIndex] || !finalItems[thumbIndex].el) {
					return false;
				}

				const $el = $(finalItems[thumbIndex].el).find('img')[0];

				if (!$el) {
					return false;
				}

				const rect = $el.getBoundingClientRect();
				const pageYScroll =
					window.pageYOffset || document.documentElement.scrollTop;
				const pswpTop = parseFloat($pswpElement.css('top')) || 0;

				return {
					x: rect.left,
					y: rect.top + pageYScroll - pswpTop,
					w: rect.width,
					h: rect.height,
				};
			},
			getDoubleTapZoom(isMouseClick, item) {
				// isMouseClick          - true if mouse, false if double-tap
				// item                  - slide object that is zoomed, usually current
				// item.initialZoomLevel - initial scale ratio of image
				//                         e.g. if viewport is 700px and image is 1400px,
				//                              initialZoomLevel will be 0.5
				if (isMouseClick) {
					// is mouse click on image or zoom icon

					// Click to zoom disabled.
					if (!settingsPopupGallery.click_to_zoom) {
						return item.initialZoomLevel;
					}

					// In case the image is vertically wide, zoom it to fit screen width only.
					// - check if original image size is wider than screen
					// - check if zoomed out image in less than 25% of the screen width
					if (
						item.w > window.innerWidth &&
						(item.w * item.initialZoomLevel) / window.innerWidth <
							0.25
					) {
						return window.innerWidth / item.w;
					}

					// zoom to original
					return 1;

					// e.g. for 1400px image:
					// 0.5 - zooms to 700px
					// 2   - zooms to 2800px
				}

				// zoom to original if initial zoom is less than 0.7x,
				// otherwise to 1.5x, to make sure that double-tap gesture always zooms image.
				return item.initialZoomLevel < 0.7 ? 1 : 1.5;
			},
		};

		options.index = parseInt(index, 10);

		// exit if index not found
		if (!isNumber(options.index)) {
			return;
		}

		// Pass data to PhotoSwipe and initialize it
		pswpInstance = new PhotoSwipe(
			pswpElement,
			PhotoSwipeUIDefault,
			finalItems,
			options
		);

		// see: http://photoswipe.com/documentation/responsive-images.html
		let realViewportWidth;
		let useLargeImages = false;
		let firstResize = true;
		let imageSrcWillChange;

		pswpInstance.listen('beforeResize', () => {
			// pswpInstance.viewportSize.x - width of PhotoSwipe viewport
			// pswpInstance.viewportSize.y - height of PhotoSwipe viewport
			// window.devicePixelRatio - ratio between physical pixels and device independent pixels (Number)
			//                          1 (regular display), 2 (@2x, retina) ...

			// calculate real pixels when size changes
			realViewportWidth =
				pswpInstance.viewportSize.x * window.devicePixelRatio;

			// Code below is needed if you want image to switch dynamically on window.resize

			// Find out if current images need to be changed
			if (useLargeImages && realViewportWidth < 1000) {
				useLargeImages = false;
				imageSrcWillChange = true;
			} else if (!useLargeImages && realViewportWidth >= 1000) {
				useLargeImages = true;
				imageSrcWillChange = true;
			}

			// Invalidate items only when source is changed and when it's not the first update
			if (imageSrcWillChange && !firstResize) {
				// invalidateCurrItems sets a flag on slides that are in DOM,
				// which will force update of content (image) on window.resize.
				pswpInstance.invalidateCurrItems();
			}

			if (firstResize) {
				firstResize = false;
			}

			imageSrcWillChange = false;
		});

		pswpInstance.listen('gettingData', (idx, item) => {
			// Prepare iframes.
			if (item.html) {
				// -- Iframe Autoplay - Part 1 --
				// Disable autoplay parameter in iframes on inactive slides.
				// Mostly for Youtube and Vimeo to prevent video playing in background.
				// Later we add autoplay only to active slides.
				item.html = item.html.replace(/autoplay=1/, 'autoplay=0');

				return;
			}

			// Prepare image sizes.
			if (useLargeImages && item.o) {
				if (item.o.src) {
					item.src = item.o.src;
				}
				if (item.o.w) {
					item.w = item.o.w;
				}
				if (item.o.h) {
					item.h = item.o.h;
				}
			} else if (item.m) {
				if (item.m.src) {
					item.src = item.m.src;
				}
				if (item.m.w) {
					item.w = item.m.w;
				}
				if (item.m.h) {
					item.h = item.m.h;
				}
			}
		});

		pswpInstance.listen('imageLoadComplete', (idx, item) => {
			if (item.h < 1 || item.w < 1) {
				const img = new Image();

				img.onload = () => {
					item.w = img.width;
					item.h = img.height;
					pswpInstance.invalidateCurrItems();
					pswpInstance.updateSize(true);
				};

				img.src = item.src;
			}
		});

		pswpInstance.listen('resize', function () {
			resizeVideo(this);
		});

		pswpInstance.listen('afterChange', function () {
			resizeVideo(this);

			if (self) {
				self.emitEvent('afterChangePhotoSwipe', [this, pswpInstance]);
			}
		});

		// disable video play if no active.
		pswpInstance.listen('beforeChange', function () {
			const data = this;

			// -- Iframe Autoplay - Part 2 --
			// Set autoplay to 1 on active slides and to 0 on inactive.
			if (data && data.itemHolders.length) {
				const currentIndex = data.getCurrentIndex();

				data.itemHolders.forEach((val) => {
					const $iframe = val.el
						? $(val.el).find('.vp-pswp-video iframe')
						: false;

					if ($iframe && $iframe.length) {
						if (val.index === currentIndex) {
							$iframe.attr(
								'src',
								$iframe
									.attr('src')
									.replace(/autoplay=0/, 'autoplay=1')
							);
						} else {
							$iframe.attr(
								'src',
								$iframe
									.attr('src')
									.replace(/autoplay=1/, 'autoplay=0')
							);
						}
					}
				});
			}

			if (self) {
				self.emitEvent('beforeChangePhotoSwipe', [data, pswpInstance]);
			}
		});

		// destroy event.
		pswpInstance.listen('destroy', function () {
			const data = this;

			if (data) {
				// Remove video block.
				if (data.itemHolders.length) {
					data.itemHolders.forEach((val) => {
						if (val.el) {
							$(val.el).find('.vp-pswp-video').remove();
						}
					});
				}

				const currentItemData = items[data.getCurrentIndex()];

				if (currentItemData) {
					VPPopupAPI.maybeFocusGalleryItem(currentItemData);
				}

				if (self) {
					self.emitEvent('beforeClosePhotoSwipe', [
						options,
						items,
						pswpInstance,
					]);
				}
			}

			pswpInstance = false;
		});

		if (self) {
			self.emitEvent('beforeInitPhotoSwipe', [
				options,
				finalItems,
				index,
				pswpInstance,
			]);
		}

		pswpInstance.init();

		if (self) {
			self.emitEvent('initPhotoSwipe', [
				options,
				finalItems,
				index,
				pswpInstance,
			]);
		}
	};
	VPPopupAPI.close = function () {
		if (pswpInstance) {
			pswpInstance.close();
			pswpInstance = false;
		}
	};
}
