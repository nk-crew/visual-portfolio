import { getConfig, getElement, store } from '@wordpress/interactivity';

/**
 * The lightbox of the Gallery Loop family.
 *
 * Nothing here is required for a gallery to work: a trigger is an anchor
 * pointing at the full size image, so with this module absent, blocked or
 * broken a click opens the image the way a link opens anything.
 *
 * The gallery is read off the DOM at the moment of the click and never cached.
 * That is what makes it survive both ways a loop changes its items - a region
 * swap replaces them, a Load More appends them - without either of them having
 * to tell the lightbox anything.
 *
 * Pro composes onto the same namespace with another `store()` call.
 */

const NAMESPACE = 'visual-portfolio/popup';
const TRIGGER_SELECTOR = '[data-vp-popup]';

// A popup is a page of its own as far as the browser is concerned, so the
// address of the library is published on the page rather than bundled: it is
// imported once, on the first click, and never for a gallery nobody opens.
let libraryPromise = null;

/**
 * The video services a URL can be turned into an embed for without help.
 *
 * Anything else - the video vendors of Pro among them - hands the data an
 * `embedUrl` of its own through `vpf_loop_item_popup_data`, and is played
 * without this list knowing what it is.
 */
const VIDEO_VENDORS = [
	{
		pattern:
			/(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\/(?:embed\/|shorts\/|live\/|v\/|watch\?v=|watch\?.*[?&]v=)?([\w-]{11})/,
		embed: (id) =>
			`https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1`,
	},
	{
		pattern: /vimeo\.com\/(?:.*\/)?(\d+)/,
		embed: (id) => `https://player.vimeo.com/video/${id}?autoplay=1`,
	},
];

/**
 * Address a video URL can be played from in an iframe.
 *
 * @param {Object} item Popup data of the item.
 *
 * @return {string} Embed URL, or an empty string when nothing can play it.
 */
function getEmbedUrl(item) {
	if (item.embedUrl) {
		return item.embedUrl;
	}

	for (const vendor of VIDEO_VENDORS) {
		const match = vendor.pattern.exec(item.src || '');

		if (match) {
			return vendor.embed(match[1]);
		}
	}

	return '';
}

/**
 * Popup data of a trigger.
 *
 * @param {HTMLElement} trigger Trigger element.
 *
 * @return {Object|null} Popup data, or null when the trigger carries none.
 */
function getTriggerData(trigger) {
	try {
		const data = JSON.parse(trigger.getAttribute('data-vp-popup'));

		return data && data.src ? data : null;
	} catch {
		return null;
	}
}

/**
 * A single slide, as PhotoSwipe wants it described.
 *
 * @param {Object} item Popup data of the item.
 *
 * @return {Object} Slide data.
 */
function getSlide(item) {
	if ('video' === item.type) {
		return {
			type: 'video',
			// The proportions of the box the iframe is drawn into. A video
			// arrives without any, and 16/9 is what a video is.
			width: item.width || 1920,
			height: item.height || 1080,
			embedUrl: getEmbedUrl(item),
			title: item.title || '',
			caption: item.caption || '',
		};
	}

	return {
		src: item.src,
		srcset: item.srcset || undefined,
		width: item.width || undefined,
		height: item.height || undefined,
		alt: item.alt || '',
		msrc: item.msrc || undefined,
		title: item.title || '',
		caption: item.caption || '',
	};
}

/**
 * Whether the browser would follow the link on its own.
 *
 * @param {Event} event Click event.
 *
 * @return {boolean} True for an unmodified primary click.
 */
function isPlainActivation(event) {
	return !(
		event.metaKey ||
		event.ctrlKey ||
		event.shiftKey ||
		event.altKey ||
		('number' === typeof event.button && 0 !== event.button)
	);
}

/**
 * Load the library.
 *
 * @param {string} source Address of the vendored module.
 *
 * @return {Promise<Function>} The PhotoSwipe constructor.
 */
function loadLibrary(source) {
	if (!libraryPromise) {
		libraryPromise = import(/* webpackIgnore: true */ source).then(
			(module) => module.default || module
		);
	}

	return libraryPromise;
}

/**
 * Caption under the slides.
 *
 * PhotoSwipe leaves captions to a plugin of its own. This is the whole of what
 * that plugin does for a gallery: the title and the caption of the item that is
 * on screen, written as text - the data comes from post content and is never
 * markup here.
 *
 * @param {Object} pswp  PhotoSwipe instance.
 * @param {Array}  items Slides of the gallery.
 */
function registerCaption(pswp, items) {
	pswp.on('uiRegister', () => {
		pswp.ui.registerElement({
			name: 'vp-popup-caption',
			className: 'vp-popup-caption',
			order: 9,
			appendTo: 'root',
			onInit: (element) => {
				const title = document.createElement('div');
				const caption = document.createElement('div');

				title.className = 'vp-popup-caption__title';
				caption.className = 'vp-popup-caption__text';
				element.append(title, caption);

				pswp.on('change', () => {
					const item = items[pswp.currIndex] || {};

					title.textContent = item.title || '';
					caption.textContent = item.caption || '';
					element.hidden = !item.title && !item.caption;
				});
			},
		});
	});
}

/**
 * Play video slides in an iframe.
 *
 * The `src` is written when the slide becomes the current one and taken away
 * when it stops being: PhotoSwipe keeps the neighbouring slides loaded, and a
 * video that is one swipe away must not be playing, nor even be requested.
 *
 * @param {Object} pswp PhotoSwipe instance.
 */
function registerVideo(pswp) {
	pswp.on('contentLoad', (event) => {
		const { content } = event;

		if ('video' !== content.type) {
			return;
		}

		event.preventDefault();

		content.element = document.createElement('div');
		content.element.className = 'pswp__content vp-popup-video';

		if (!content.data.embedUrl) {
			return;
		}

		const frame = document.createElement('iframe');

		frame.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
		frame.setAttribute('allowfullscreen', '');
		frame.setAttribute('frameborder', '0');
		frame.setAttribute('title', content.data.title || '');
		content.element.appendChild(frame);
	});

	pswp.on('contentActivate', ({ content }) => {
		const frame = content.element?.querySelector('iframe');

		if (frame && content.data.embedUrl) {
			frame.src = content.data.embedUrl;
		}
	});

	pswp.on('contentDeactivate', ({ content }) => {
		const frame = content.element?.querySelector('iframe');

		if (frame) {
			frame.removeAttribute('src');
		}
	});
}

// True while a click is waiting for the library to arrive.
let opening = false;

/**
 * Open the gallery.
 *
 * @param {Object}      config  Store configuration.
 * @param {Array}       items   Slides of the gallery.
 * @param {number}      index   Slide to open on.
 * @param {HTMLElement} trigger Element the popup was opened from.
 *
 * @return {Promise<void>} Resolved once the lightbox is on screen.
 */
async function openGallery(config, items, index, trigger) {
	// The first click on a page waits for the library to arrive over the
	// network, and a second one during that wait would open a second lightbox
	// over the first.
	if (opening) {
		return;
	}

	opening = true;

	let PhotoSwipe;

	try {
		PhotoSwipe = await loadLibrary(config.library);
	} finally {
		opening = false;
	}
	const strings = config.i18n || {};

	const pswp = new PhotoSwipe({
		dataSource: items,
		index,
		mainClass: 'vp-popup',
		closeTitle: strings.close,
		zoomTitle: strings.zoom,
		arrowPrevTitle: strings.prev,
		arrowNextTitle: strings.next,
		errorMsg: strings.error,
		indexIndicatorSep: strings.separator,

		// Restored below instead: the library returns the focus to whatever was
		// focused when it opened, and a mouse does not focus a link in every
		// browser. The element that was clicked is known here either way.
		returnFocus: false,
	});

	registerCaption(pswp, items);
	registerVideo(pswp);

	pswp.on('destroy', () => {
		if (trigger.isConnected) {
			trigger.focus();
		}
	});

	pswp.init();

	// The dialog has no name of its own, and its only text is the counter.
	if (pswp.element && strings.gallery) {
		pswp.element.setAttribute('aria-label', strings.gallery);
	}
}

store(NAMESPACE, {
	actions: {
		/**
		 * Open the lightbox on the trigger that was clicked.
		 *
		 * Bound to the loop rather than to the trigger, so that items appended
		 * after the page was hydrated are covered by it as well.
		 *
		 * @param {Event} event Click event.
		 */
		openPopup(event) {
			const { ref } = getElement();
			// A click on the loop is most often a click on something else - an
			// item, a control, the space between them.
			const trigger = event.target?.closest?.(TRIGGER_SELECTOR);

			if (!trigger || !ref.contains(trigger)) {
				return;
			}

			if (!isPlainActivation(event)) {
				return;
			}

			const config = getConfig(NAMESPACE);

			if (!config.library) {
				return;
			}

			// The gallery is every trigger of this loop, in the order the items
			// are rendered in - including the ones a Load More appended. `ref`
			// is the loop wrapper: the listener is on it, not on the trigger.
			const items = [];
			let index = 0;

			ref.querySelectorAll(TRIGGER_SELECTOR).forEach((element) => {
				const data = getTriggerData(element);

				if (!data) {
					return;
				}

				if (element === trigger) {
					index = items.length;
				}

				items.push(getSlide(data));
			});

			if (!items.length) {
				return;
			}

			event.preventDefault();

			openGallery(config, items, index, trigger).catch(() => {
				// The library never arrived. The trigger is a link to the full
				// size image, and that is where the click goes.
				window.location.assign(trigger.href);
			});
		},
	},
});
