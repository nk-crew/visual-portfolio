import {
	getConfig,
	getElement,
	store,
	withSyncEvent,
} from '@wordpress/interactivity';

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
 *
 * Events
 *
 * A store is reachable from another script module and from nothing else, so
 * what the lightbox is doing is told to the page as three `CustomEvent`s on
 * `document`. They are the whole of the surface a script outside this module
 * gets, and the Pro lightbox modules are written against them.
 *
 * - `vp-popup-open`   the lightbox is on screen.
 * - `vp-popup-change` the slide on screen changed.
 * - `vp-popup-close`  the lightbox is about to close.
 *
 * All three carry the same `detail`:
 *
 * - `loop`    the loop element the lightbox was opened from. Everything else
 *             about the gallery - its items, its pagination - is found under it.
 * - `gallery` the lightbox's own root element, for a module that draws into it.
 * - `index`   index of the slide on screen.
 * - `total`   how many slides the lightbox holds.
 * - `item`    the trigger the slide on screen was built from. The item element
 *             is the `closest()` ancestor of it.
 * - `refresh` takes the triggers the loop has grown since into the lightbox and
 *             returns the total afterwards. What a module that appends a page
 *             while the lightbox is open calls once the items are in the DOM.
 */

const NAMESPACE = 'visual-portfolio/popup';
const TRIGGER_SELECTOR = '[data-vp-popup]';

const OPEN_EVENT = 'vp-popup-open';
const CHANGE_EVENT = 'vp-popup-change';
const CLOSE_EVENT = 'vp-popup-close';

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
 * Take the triggers a loop holds and the gallery does not into it.
 *
 * @param {Object}      gallery Gallery of the lightbox.
 * @param {HTMLElement} loop    Loop wrapper.
 *
 * @return {number} How many slides the gallery holds afterwards.
 */
function addTriggers(gallery, loop) {
	const known = new Set(gallery.triggers);

	loop.querySelectorAll(TRIGGER_SELECTOR).forEach((element) => {
		if (known.has(element)) {
			return;
		}

		const data = getTriggerData(element);

		if (!data) {
			return;
		}

		gallery.triggers.push(element);
		gallery.slides.push(getSlide(data));
	});

	return gallery.slides.length;
}

/**
 * Every popup trigger of a loop, in the order the items are rendered in.
 *
 * @param {HTMLElement} loop Loop wrapper.
 *
 * @return {Object} `triggers`, and the `slides` built from them index by index.
 */
function readGallery(loop) {
	const gallery = { triggers: [], slides: [] };

	addTriggers(gallery, loop);

	return gallery;
}

/**
 * Open the gallery.
 *
 * @param {Object}      config  Store configuration.
 * @param {Object}      gallery Triggers of the loop and the slides built from them.
 * @param {number}      index   Slide to open on.
 * @param {HTMLElement} loop    Loop the lightbox was opened from.
 *
 * @return {Promise<void>} Resolved once the lightbox is on screen.
 */
async function openGallery(config, gallery, index, loop) {
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
		dataSource: gallery.slides,
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

	registerCaption(pswp, gallery.slides);
	registerVideo(pswp);

	const emit = (name) => {
		document.dispatchEvent(
			new window.CustomEvent(name, {
				detail: {
					loop,
					gallery: pswp.element || null,
					index: pswp.currIndex,
					total: gallery.slides.length,
					item: gallery.triggers[pswp.currIndex] || null,
					refresh: () => {
						const total = addTriggers(gallery, loop);

						// `dataSource` is the array just extended, so the
						// library counts the new slides on its own - only the
						// counter and the arrows are written on a change.
						pswp.dispatch('change');

						return total;
					},
				},
			})
		);
	};

	// The library announces the slide it opens on as a change of its own, and
	// so does a refresh that appended slides. Neither is the visitor moving.
	let shown = index;

	pswp.on('change', () => {
		if (shown === pswp.currIndex) {
			return;
		}

		shown = pswp.currIndex;
		emit(CHANGE_EVENT);
	});

	pswp.on('close', () => emit(CLOSE_EVENT));

	pswp.on('destroy', () => {
		// The trigger of the item on screen, not the one that was clicked: the
		// visitor browsed away from that one, and where they stopped is where
		// the page they come back to should be.
		const item = gallery.triggers[pswp.currIndex];

		if (config.restoreFocus && item && item.isConnected) {
			item.focus();
		}
	});

	pswp.init();

	// The dialog has no name of its own, and its only text is the counter.
	if (pswp.element && strings.gallery) {
		pswp.element.setAttribute('aria-label', strings.gallery);
	}

	emit(OPEN_EVENT);
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
		openPopup: withSyncEvent((event) => {
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
			const gallery = readGallery(ref);

			if (!gallery.slides.length) {
				return;
			}

			// A trigger whose data could not be read is in no gallery at all,
			// and the first slide is as good a place to open on as any.
			const index = Math.max(0, gallery.triggers.indexOf(trigger));

			event.preventDefault();

			openGallery(config, gallery, index, ref).catch(() => {
				// The library never arrived. The trigger is a link to the full
				// size image, and that is where the click goes.
				window.location.assign(trigger.href);
			});
		}),
	},
});
