import $ from 'jquery';

const { VPData, VPPopupAPI } = window;
const { __, settingsPopupGallery } = VPData;
const $doc = $(document);
const $window = $(window);

if (typeof $.fancybox !== 'undefined' && VPPopupAPI) {
	let fancyboxInstance;

	// Extend Popup API.
	VPPopupAPI.vendor = 'fancybox';
	VPPopupAPI.open = function (items, index, self) {
		const finalItems = [];

		// prepare items for fancybox api.
		items.forEach((item) => {
			if (item.type === 'embed' && item.src) {
				finalItems.push({
					type: 'iframe',
					src: item.src,
					opts: {
						width: item.width,
						height: item.height,
						caption: item.caption,
					},
				});
			} else if (item.type === 'embed' && item.embed) {
				finalItems.push({
					type: 'html',
					src: item.embed,
					opts: {
						width: item.width,
						height: item.height,
						caption: item.caption,
					},
				});
			} else {
				finalItems.push({
					type: 'image',
					src: item.src,
					el: item.el,
					opts: {
						width: item.width,
						height: item.height,
						srcset: item.srcset,
						caption: item.caption,
						thumb: item.srcSmall,
					},
				});
			}
		});

		const buttons = [];
		if (settingsPopupGallery.show_zoom_button) {
			buttons.push('zoom');
		}
		if (settingsPopupGallery.show_fullscreen_button) {
			buttons.push('fullScreen');
		}
		if (settingsPopupGallery.show_slideshow) {
			buttons.push('slideShow');
		}
		if (settingsPopupGallery.show_thumbs) {
			buttons.push('thumbs');
		}
		if (settingsPopupGallery.show_share_button) {
			buttons.push('share');
		}
		if (settingsPopupGallery.show_download_button) {
			buttons.push('download');
		}
		if (settingsPopupGallery.show_close_button) {
			buttons.push('close');
		}

		// define options
		const options = {
			// Close existing modals
			// Set this to false if you do not need to stack multiple instances
			closeExisting: true,

			// Enable infinite gallery navigation
			loop: true,

			// Should display navigation arrows at the screen edges
			arrows: settingsPopupGallery.show_arrows,

			// Should display counter at the top left corner
			infobar: settingsPopupGallery.show_counter,

			// Should display close button (using `btnTpl.smallBtn` template) over the content
			// Can be true, false, "auto"
			// If "auto" - will be automatically enabled for "html", "inline" or "ajax" items
			smallBtn: false,

			// Should display toolbar (buttons at the top)
			// Can be true, false, "auto"
			// If "auto" - will be automatically hidden if "smallBtn" is enabled
			toolbar: 'auto',

			// What buttons should appear in the top right corner.
			// Buttons will be created using templates from `btnTpl` option
			// and they will be placed into toolbar (class="fancybox-toolbar"` element)
			buttons,

			// Custom CSS class for layout
			baseClass: 'vp-fancybox',

			// Hide browser vertical scrollbars; use at your own risk
			hideScrollbar: true,

			// Use mousewheel to navigate gallery
			// If 'auto' - enabled for images only
			wheel: false,

			// Clicked on the content
			clickContent(current) {
				return current.type === 'image' &&
					settingsPopupGallery.click_to_zoom
					? 'zoom'
					: false;
			},

			lang: 'wordpress',
			i18n: {
				wordpress: {
					CLOSE: __.fancybox_close,
					NEXT: __.fancybox_next,
					PREV: __.fancybox_prev,
					ERROR: __.fancybox_error,
					PLAY_START: __.fancybox_play_start,
					PLAY_STOP: __.fancybox_play_stop,
					FULL_SCREEN: __.fancybox_full_screen,
					THUMBS: __.fancybox_thumbs,
					DOWNLOAD: __.fancybox_download,
					SHARE: __.fancybox_share,
					ZOOM: __.fancybox_zoom,
				},
			},

			beforeClose() {
				const currentItemData = items[fancyboxInstance.currIndex];

				if (currentItemData) {
					VPPopupAPI.maybeFocusGalleryItem(currentItemData);
				}

				if (self) {
					self.emitEvent('beforeCloseFancybox', [
						options,
						items,
						fancyboxInstance,
					]);
				}

				fancyboxInstance = false;
			},
			beforeShow(e, instance) {
				if (self) {
					self.emitEvent('beforeShowFancybox', [e, instance]);
				}
			},
			afterShow(e, instance) {
				if (self) {
					self.emitEvent('afterShowFancybox', [e, instance]);
				}
			},
		};

		if (self) {
			self.emitEvent('beforeInitFancybox', [options, finalItems, index]);
		}

		// Disable Loop if only 1 item in gallery.
		// We need this because Fancybox still let us scroll gallery using keyboard.
		if (items.length === 1) {
			options.loop = false;
		}

		// Start new fancybox instance
		fancyboxInstance = $.fancybox.open(finalItems, options, index);

		if (self) {
			self.emitEvent('initFancybox', [
				options,
				finalItems,
				index,
				fancyboxInstance,
			]);
		}
	};
	VPPopupAPI.close = function () {
		if (fancyboxInstance) {
			fancyboxInstance.close();
			fancyboxInstance = false;
		}
	};

	// Fix zoom image sizes attribute.
	// https://wordpress.org/support/topic/blurry-zoom-images/
	$doc.on('transitionend', '.fancybox-content', function () {
		const $img = $(this).find('.fancybox-image[sizes]');

		const sizes = `${Math.round(100 * ($img.width() / $window.width()))}vw`;

		$img.attr('sizes', sizes);
	});
}
