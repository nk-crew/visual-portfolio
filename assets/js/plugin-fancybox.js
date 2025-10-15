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

			share: {
				url(instance, item) {
					return (
						(!instance.currentHash &&
						!(item.type === 'inline' || item.type === 'html')
							? item.origSrc || item.src
							: false) || window.location
					);
				},
				tpl:
					'<div class="fancybox-share">' +
					'<h1>{{SHARE}}</h1>' +
					'<p>' +
					'<a class="fancybox-share__button fancybox-share__button--fb" href="https://www.facebook.com/sharer/sharer.php?u={{url}}">' +
					'<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="m287 456v-299c0-21 6-35 35-35h38v-63c-7-1-29-3-55-3-54 0-91 33-91 94v306m143-254h-205v72h196" /></svg>' +
					'<span>Facebook</span>' +
					'</a>' +
					'<a class="fancybox-share__button fancybox-share__button--x" href="https://x.com/intent/tweet?url={{url}}&text={{descr}}">' +
					'<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.0248 4H16.1725L11.4815 9.08269L17 16H12.6801L9.29422 11.8058L5.4246 16H3.27379L8.29031 10.5625L3 4H7.42938L10.4867 7.83365L14.0248 4ZM13.2703 14.7827H14.4598L6.7814 5.15385H5.50369L13.2703 14.7827Z" fill="currentColor" /></svg>' +
					'<span>X</span>' +
					'</a>' +
					'<a class="fancybox-share__button fancybox-share__button--pt" href="https://www.pinterest.com/pin/create/button/?url={{url}}&description={{descr}}&media={{media}}">' +
					'<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="m265 56c-109 0-164 78-164 144 0 39 15 74 47 87 5 2 10 0 12-5l4-19c2-6 1-8-3-13-9-11-15-25-15-45 0-58 43-110 113-110 62 0 96 38 96 88 0 67-30 122-73 122-24 0-42-19-36-44 6-29 20-60 20-81 0-19-10-35-31-35-25 0-44 26-44 60 0 21 7 36 7 36l-30 125c-8 37-1 83 0 87 0 3 4 4 5 2 2-3 32-39 42-75l16-64c8 16 31 29 56 29 74 0 124-67 124-157 0-69-58-132-146-132z" fill="#fff"/></svg>' +
					'<span>Pinterest</span>' +
					'</a>' +
					'</p>' +
					'<p><input class="fancybox-share__input" type="text" value="{{url_raw}}" onclick="select()" /></p>' +
					'</div>',
			},

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

				VPPopupAPI.emitEvent(
					'beforeCloseFancybox',
					[options, items, fancyboxInstance],
					self
				);

				fancyboxInstance = false;
			},
			beforeShow(e, instance) {
				VPPopupAPI.emitEvent('beforeShowFancybox', [e, instance], self);
			},
			afterShow(e, instance) {
				VPPopupAPI.emitEvent('afterShowFancybox', [e, instance], self);
			},
		};

		VPPopupAPI.emitEvent(
			'beforeInitFancybox',
			[options, finalItems, index],
			self
		);

		// Disable Loop if only 1 item in gallery.
		// We need this because Fancybox still let us scroll gallery using keyboard.
		if (items.length === 1) {
			options.loop = false;
		}

		// Start new fancybox instance
		fancyboxInstance = $.fancybox.open(finalItems, options, index);

		VPPopupAPI.emitEvent(
			'initFancybox',
			[options, finalItems, index, fancyboxInstance],
			self
		);
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
