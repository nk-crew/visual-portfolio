import { createLightbox } from '@reuse-sh/lightbox';
import { embed } from '@reuse-sh/lightbox/embed';
import { html } from '@reuse-sh/lightbox/html';
import { iframe } from '@reuse-sh/lightbox/iframe';
import { video } from '@reuse-sh/lightbox/video';
import '@reuse-sh/lightbox/unlayered/base.css';
import '@reuse-sh/lightbox/unlayered/theme.css';
import './reuse.scss';

const { __, settingsPopupGallery: settings } = window.VPData;
let active;

function toSlide(item) {
	const image = item.el?.querySelector('img');
	const template = window.VPPopupAPI.parseItem(item.el);
	const caption = document.createElement('template');
	caption.innerHTML =
		item.caption ||
		(template?.$title?.outerHTML || '') +
			(template?.$description?.outerHTML || '');
	const poster = item.poster || template?.data?.vpPopupPoster;
	const slide = {
		width: item.width,
		height: item.height,
		alt: image?.alt,
		caption: caption.content.textContent.trim(),
		captionMarkup: caption.content,
		origin: settings.restore_focus ? () => item.linkEl : null,
		previewSrc: poster || image?.currentSrc || item.srcSmall,
		thumbnailSrc: item.srcSmall,
		raw: item,
	};

	if (item.type === 'embed' && item.embed && !item.src) {
		return {
			...slide,
			type: 'html',
			html() {
				const content = document.createElement('template');
				content.innerHTML = item.embed;
				return content.content;
			},
		};
	}

	if (item.type === 'embed' && item.src) {
		let url;
		try {
			url = new URL(item.src, document.baseURI);
		} catch {
			return null;
		}
		if (!['http:', 'https:'].includes(url.protocol)) {
			return null;
		}

		return {
			...slide,
			type: /\.(mp4|webm|ogv|ogg|mov|m4v)$/i.test(url.pathname)
				? 'video'
				: /^(www\.(youtube|youtube-nocookie)\.com|player\.vimeo\.com)$/.test(
							url.hostname
						)
					? 'embed'
					: 'iframe',
			src: url.href,
		};
	}

	const src = item.src;
	if (!src || item.type !== 'image') {
		return null;
	}

	const srcset =
		item.srcset ||
		[
			[item.srcSmall, item.srcSmallWidth],
			[item.srcMedium, item.srcMediumWidth],
			[src, item.width],
		]
			.filter(([url, width]) => url && width > 0)
			.filter(
				([url], index, candidates) =>
					candidates.findIndex(([candidate]) => candidate === url) ===
					index
			)
			.map(([url, width]) => `${url} ${width}w`)
			.join(', ');

	return { ...slide, src, srcset };
}

function captionSlot({ document: doc }) {
	const node = doc.createElement('div');
	node.className = 're-lightbox-caption';
	let previous;

	return {
		node,
		update({ item }) {
			if (item !== previous) {
				previous = item;
				node.replaceChildren(item?.captionMarkup.cloneNode(true) ?? '');
			}
		},
	};
}

function shareSlot({ document: doc }) {
	const node = doc.createElement('details');
	node.className = 'vp-loop-lightbox-share';
	const button = doc.createElement('summary');
	button.className = 're-lightbox-button';
	button.textContent = __.pswp_share;
	const links = doc.createElement('div');
	const services = [
		[__.pswp_share_fb, 'https://www.facebook.com/sharer/sharer.php', 'u'],
		[__.pswp_share_x, 'https://x.com/intent/tweet', 'url'],
		[
			__.pswp_share_li,
			'https://www.linkedin.com/sharing/share-offsite/',
			'url',
		],
		[
			__.pswp_share_pin,
			'https://www.pinterest.com/pin/create/button/',
			'url',
		],
	].map(([label, href, key]) => {
		const link = doc.createElement('a');
		link.textContent = label;
		link.target = '_blank';
		link.rel = 'noopener noreferrer';
		links.append(link);
		return { link, href, key };
	});
	node.append(button, links);

	return {
		node,
		update({ item }) {
			for (const { link, href, key } of services) {
				const url = new URL(href);
				url.searchParams.set(key, doc.location.href);
				if (url.hostname === 'www.pinterest.com' && item?.src) {
					url.searchParams.set(
						'media',
						new URL(item.src, doc.baseURI).href
					);
				}
				link.href = url.href;
			}
		},
	};
}

function toolbarSlot(context) {
	const { document: doc, lightbox } = context;
	const node = doc.createDocumentFragment();
	const share = settings.show_share_button ? shareSlot(context) : null;
	let button;

	if (settings.show_thumbs) {
		button = doc.createElement('button');
		button.type = 'button';
		button.className = 're-lightbox-button vp-loop-lightbox-thumbnails';
		button.setAttribute('aria-label', __.fancybox_thumbs);
		node.append(button);
	}

	if (share) {
		node.append(share.node);
	}

	const hasThumbnails = () =>
		!!button?.closest('.re-lightbox')?.hasAttribute('data-thumbnails');
	const sync = () => {
		button?.setAttribute('aria-expanded', String(hasThumbnails()));
	};
	const toggle = () => {
		lightbox.setOptions({ thumbnailsVisible: !hasThumbnails() });
		sync();
	};
	button?.addEventListener('click', toggle);

	return {
		node,
		update(state) {
			sync();
			share?.update(state);
		},
		destroy() {
			button?.removeEventListener('click', toggle);
		},
	};
}

export function openReuse(items, index, gallery) {
	const api = window.VPPopupAPI;
	const selected = items[index];
	const slides = items.map(toSlide).filter(Boolean);
	const start = slides.findIndex(({ raw }) => raw === selected);

	if (start < 0) {
		return false;
	}

	const controls = {
		arrows: !!settings.show_arrows,
		counter: !!settings.show_counter,
		zoom: !!settings.show_zoom_button,
		fullscreen: !!settings.show_fullscreen_button,
		download: !!settings.show_download_button,
		close: !!settings.show_close_button,
		slideshow: !!settings.show_slideshow,
	};
	const options = {
		className: 'vp-loop-lightbox',
		content: [embed(), iframe(), video(), html()],
		controls,
		imageClick: settings.click_to_zoom ? 'zoom' : 'none',
		thumbnails: settings.show_thumbs ? 'bottom' : false,
		thumbnailsVisible: !!settings.thumbs_auto_start,
		loop: true,
		history: false,
		slots: {
			footer: captionSlot,
			...(settings.show_share_button || settings.show_thumbs
				? { toolbarEnd: toolbarSlot }
				: {}),
		},
		strings: {
			close: __.pswp_close,
			previous: __.pswp_prev,
			next: __.pswp_next,
			zoomIn: __.pswp_zoom,
			zoomOut: __.pswp_zoom,
			fullscreenEnter: __.pswp_fs,
			fullscreenExit: __.pswp_fs,
			download: __.pswp_download,
			thumbnails: __.fancybox_thumbs,
			slideshowStart: __.fancybox_play_start,
			slideshowStop: __.fancybox_play_stop,
		},
	};

	gallery.emitEvent('beforeInitPopup', [options, slides, start]);
	active?.destroy();
	if (api.instance) {
		api.close();
	}

	const lightbox = createLightbox(options);
	const rawItems = slides.map(({ raw }) => raw);
	const { close, append } = api;
	const closeReuse = () => lightbox.close();
	const appendReuse = (more = []) => {
		const added = more.map(toSlide).filter(Boolean);
		lightbox.append(added);
		rawItems.push(...added.map(({ raw }) => raw));
	};
	const clear = () => {
		if (active === lightbox) {
			active = undefined;
		}
		if (api.close === closeReuse) {
			api.close = close;
		}
		if (api.append === appendReuse) {
			api.append = append;
		}
		if (api.instance === lightbox) {
			api.instance = false;
			api.rawItems = false;
			api.portfolio = false;
		}
	};

	lightbox.on('open', ({ slide }) => {
		if (CSS.supports('background-color', settings.background_color)) {
			slide
				.closest('.re-lightbox')
				.style.setProperty(
					'--re-lightbox-background',
					settings.background_color
				);
		}
	});
	lightbox.on('beforechange', (event) =>
		gallery.emitEvent('beforeChangePopup', [lightbox, event])
	);
	lightbox.on('change', (event) =>
		gallery.emitEvent('afterChangePopup', [lightbox, event])
	);
	lightbox.on('beforeclose', (event) =>
		gallery.emitEvent('beforeClosePopup', [lightbox, event])
	);
	lightbox.on('closed', (event) => {
		clear();
		gallery.emitEvent('destroyPopup', [lightbox, event]);
	});

	// Reuse falls back to the element focused before open when there is no origin.
	if (
		!settings.restore_focus &&
		gallery.$item[0].contains(document.activeElement)
	) {
		document.activeElement.blur();
	}

	active = lightbox;
	Object.assign(api, {
		instance: lightbox,
		rawItems,
		portfolio: gallery,
		close: closeReuse,
		append: appendReuse,
	});

	try {
		lightbox.open(slides, start);
	} catch {
		clear();
		lightbox.destroy();
		return false;
	}

	gallery.emitEvent('initPopup', [options, slides, start, lightbox]);
	return true;
}
