import {
	getContext,
	getElement,
	store,
	withScope,
	withSyncEvent,
} from '@wordpress/interactivity';

import { syncColumns } from '../item-template/auto-columns';

/**
 * The front end of the whole Gallery Loop family - the loop wrapper, its filter,
 * sort and pagination controls and the item template all run on this one store.
 *
 * Nothing here is required for the loop to work: every control is a real link
 * resolved by the server, so with this module absent, blocked or broken the
 * loop still navigates by full page loads. It only replaces the load with a
 * region swap, and hands the navigation back to the browser whenever it cannot.
 *
 * Pro composes onto the same namespace with another `store()` call.
 */

const LOOP_SELECTOR = '.vp-block-loop';
const LIST_SELECTOR = '.wp-block-visual-portfolio-item-template';
const ITEM_SELECTOR = '.wp-block-visual-portfolio-item-template__item';
const PAGINATION_SELECTOR = '.vp-block-loop-pagination';
const TRIGGER_SELECTOR = '.vp-block-loop-pagination-trigger';
const END_SELECTOR = '.vp-block-loop-pagination-end';
const MASONRY_CLASS = 'vp-layout-masonry';
const SEARCH_INPUT_SELECTOR = '.vp-block-loop-search__input';
const RANGE_SELECTOR = '.vp-block-loop-query-total[data-vp-range-text]';
const THUMBS_SELECTOR = '.vp-block-loop-carousel-thumbnails';
const THUMB_SELECTOR = '.vp-block-loop-carousel-thumb';

// How long a search waits for the visitor to stop typing.
const SEARCH_DELAY = 500;

// Written on the list once Masonry is positioning the items, and read by the
// stylesheet: until then the browser packs them into columns on its own. Not
// the hydration-time `vp-has-script` class - `masonry` is a classic script and a
// plugin is free to defer it, so the module can be running long before it.
const MASONRY_READY_CLASS = 'vp-has-masonry';

// What a fetch of the next page came to. Only the infinite observer reads them:
// it has to know whether asking again could ever answer differently.
const APPENDED = 'appended';
const RETRY = 'retry';
const STOP = 'stop';

// The router hands back a promise that never settles when it gives a navigation
// to the browser rather than swapping the region, so waiting on it alone would
// leave the loop marked busy for good. Ten seconds is the router's own patience
// with a page - past that, nothing this loop could say about itself is true.
const NAVIGATION_TIMEOUT = 10000;

// Listened for by the item template module, which owns justified and carousel.
const RELAYOUT_EVENT = 'vp-relayout';

// Prefetching runs on a loop the server gave `callbacks.initPrefetch`. The
// delays are the classic gallery's: a pointer that only crosses a link asks for
// nothing, and the next page waits for the page itself to settle.
const NAVIGATE_LINK_SELECTOR = 'a[data-wp-on--click="actions.navigate"]';
const HOVER_DELAY = 100;
const NEXT_PAGE_DELAY = 600;

// A search is whatever the visitor typed, so its addresses never repeat.
const SEARCH_PARAM = /^vp(-\d+-|_)search$/;

const masonryLayouts = new WeakMap();
const autoColumns = new WeakMap();
const resizeObservers = new WeakMap();
const observedWidths = new WeakMap();
const pendingRequests = new WeakMap();
const loopUndos = new WeakMap();
const loopUndoAddresses = new WeakMap();
// Per infinite trigger, what makes its observer report where the trigger is now.
const infiniteRearms = new WeakMap();

// Loops whose region the router is replacing right now, each against the token
// of the navigation doing it. Two clicks in a row are two navigations, and only
// the newest of them owns the loading state - the first one to settle would
// otherwise clear the flag for both.
const navigating = new WeakMap();
// The navigation a loop was last asked for, kept after it ends.
const latestNavigations = new WeakMap();

// Per loop: the search waiting for the visitor to stop typing, what they typed
// last with where the caret was, and the address the last finished search
// wrote.
const searchTimers = new WeakMap();
const searchesInFlight = new WeakMap();
const typedSearches = new WeakMap();
const searchAddresses = new WeakMap();

// Loops that prefetch; per loop, the timer of its next page, and that page
// fetched ahead of a Load More as `{ href, html }`, where `html` settles to null
// if the fetch failed. Beside them, the fetches of link targets on their way to
// the router or already handed to it, by address.
const prefetchingLoops = new WeakSet();
const nextPageTimers = new WeakMap();
const nextPages = new WeakMap();
const prefetchedLinks = new Map();

/**
 * Context of the loop the current element belongs to.
 *
 * A loop whose block has no id keeps its controls as plain links - it never
 * gets the context directive, and its item template and controls would
 * otherwise read state off nothing.
 *
 * @return {Object} Loop context.
 */
function getLoopContext() {
	return getContext() || {};
}

/**
 * Masonry gutter, as CSS resolved it.
 *
 * Item widths are a `calc()` over the layout variables and Masonry measures
 * them off the first item. The gap is declared next to them as `column-gap`, so
 * reading it back keeps CSS the only place either number is written down - and
 * a theme that overrides the variables per breakpoint keeps working.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {number} Gutter in pixels.
 */
function getGutter(list) {
	const gap = window.getComputedStyle(list).columnGap;

	// A percentage gap is not resolved at computed-value time, and it resolves
	// against the same width the item `calc()` uses.
	if (gap.endsWith('%')) {
		return (parseFloat(gap) / 100) * list.clientWidth || 0;
	}

	return parseFloat(gap) || 0;
}

/**
 * Run a callback once the images inside the target have been measured.
 *
 * @param {HTMLElement|HTMLElement[]} target   Element or elements to watch.
 * @param {Function}                  callback Callback.
 */
function whenImagesLoaded(target, callback) {
	const { imagesLoaded } = window;

	if (!imagesLoaded) {
		return;
	}

	imagesLoaded(target, callback);
}

/**
 * Keep the layout correct while the container is resized.
 *
 * Masonry writes the container height, so a plain size observer would schedule
 * itself forever - only a width change can alter the layout.
 *
 * @param {HTMLElement} list Item template list.
 */
function observeWidth(list) {
	if (!window.ResizeObserver || resizeObservers.has(list)) {
		return;
	}

	const observer = new window.ResizeObserver((entries) => {
		entries.forEach((entry) => {
			const width = entry.contentRect.width;

			if (observedWidths.get(list) === width) {
				return;
			}

			observedWidths.set(list, width);

			const layout = masonryLayouts.get(list);

			if (layout) {
				layout.options.gutter = getGutter(list);
				layout.layout();
			}
		});
	});

	observer.observe(list);
	resizeObservers.set(list, observer);
}

/**
 * Start Masonry on a list.
 *
 * @param {HTMLElement} list Item template list.
 */
function initMasonry(list) {
	const { Masonry } = window;

	// Masonry measures the column off the first item, so an empty list would
	// leave it with the selector instead of a width.
	if (masonryLayouts.has(list) || !list.querySelector(ITEM_SELECTOR)) {
		return;
	}

	// WordPress prints its own scripts so that they run before a module, but a
	// plugin that defers them turns that around. By `load` they have all run.
	if (!Masonry) {
		window.addEventListener(
			'load',
			() => {
				if (list.isConnected) {
					initMasonry(list);
				}
			},
			{ once: true }
		);

		return;
	}

	// Masonry reads the column off the first item, and the item width is a
	// `calc()` over the column count. The count has to be settled before the
	// first placement, and the items placed again whenever it moves - which a
	// container of a fixed width does not report as a resize.
	autoColumns.set(
		list,
		syncColumns(list, () => {
			const current = masonryLayouts.get(list);

			if (current) {
				current.layout();
			}
		})
	);

	// Before the widths are read: Masonry measures the column off the first
	// item, and the column fallback gives every item the width of its column.
	list.classList.add(MASONRY_READY_CLASS);

	const layout = new Masonry(list, {
		itemSelector: ITEM_SELECTOR,
		columnWidth: ITEM_SELECTOR,
		gutter: getGutter(list),
		percentPosition: true,
		horizontalOrder: true,
		transitionDuration: 0,
	});

	masonryLayouts.set(list, layout);
	observedWidths.set(list, list.getBoundingClientRect().width);
	observeWidth(list);

	whenImagesLoaded(list, () => layout.layout());
}

/**
 * Drop the Masonry instance of a list.
 *
 * @param {HTMLElement} list Item template list.
 */
function destroyMasonry(list) {
	list.classList.remove(MASONRY_READY_CLASS);

	const stopColumns = autoColumns.get(list);

	if (stopColumns) {
		autoColumns.delete(list);
		stopColumns();
	}

	const layout = masonryLayouts.get(list);

	if (layout) {
		layout.destroy();
		masonryLayouts.delete(list);
	}

	const observer = resizeObservers.get(list);

	if (observer) {
		observer.disconnect();
		resizeObservers.delete(list);
	}
}

/**
 * Lay the list out again after its items changed.
 *
 * @param {HTMLElement}   list  Item template list.
 * @param {HTMLElement[]} added Items appended since the last layout, if any.
 */
function refreshLayout(list, added) {
	const layout = masonryLayouts.get(list);

	if (!layout) {
		// The same class `initLayout` starts from, asked again rather than
		// assumed: `window.Masonry` is on the page as soon as one loop on it is
		// a masonry, and starting Masonry on the list of a carousel or a
		// justified loop next to it would take that layout apart.
		if (list.classList.contains(MASONRY_CLASS)) {
			initMasonry(list);

			return;
		}

		// Justified and carousel are the item template module's, and its own
		// init callback does not run again on a list the router kept.
		list.dispatchEvent(new window.CustomEvent(RELAYOUT_EVENT));

		return;
	}

	if (added && added.length) {
		layout.appended(added);
	} else {
		layout.reloadItems();
	}

	layout.layout();
	whenImagesLoaded(added && added.length ? added : list, () =>
		layout.layout()
	);
}

/**
 * Target of a control.
 *
 * @param {HTMLElement} element Control element.
 *
 * @return {string} URL, or an empty string when the control leads nowhere.
 */
function getControlUrl(element) {
	// A sort or a filter shown as a dropdown is a `<select>`, every other
	// control is a link.
	if (element instanceof window.HTMLSelectElement) {
		const selected = element.selectedOptions[0];

		return selected ? selected.dataset.vpUrl || '' : '';
	}

	const href = element.getAttribute('href');

	return !href || '#' === href ? '' : element.href;
}

/**
 * Whether the browser would follow the link on its own.
 *
 * @param {Event} event Control event.
 *
 * @return {boolean} True for an unmodified primary click and for other events.
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
 * Hand the focus to the first link or button inside an element, or to the
 * element itself when it holds none.
 *
 * @param {HTMLElement} element The list after a swap, or the first item a Load
 *                             More appended.
 */
function focusIn(element) {
	const target = element.querySelector('a[href], button');

	if (target) {
		target.focus();
		return;
	}

	// Items that hold no link at all still have to catch the focus rather than
	// drop it on the body.
	element.setAttribute('tabindex', '-1');
	element.focus();
}

/**
 * Announce the update to assistive technology.
 *
 * @param {Object} context Loop context.
 */
function announceUpdate(context) {
	const message = window.VPData?.__?.loop_items_updated;

	if (!message) {
		return;
	}

	// A live region only speaks when its text changes, and every page after the
	// first would otherwise repeat the same string.
	context.ariaLiveMessage =
		context.ariaLiveMessage === message ? `${message} ` : message;
}

/**
 * Remember how to undo an edit Load More made to a loop.
 *
 * Load More writes to the DOM behind the router's back - it appends items,
 * moves the trigger href and drops the trigger on the last page. The router
 * renders a region from a virtual DOM that knows none of that and would leave
 * every one of those edits standing, so they are rolled back before it runs.
 *
 * @param {HTMLElement} loop Loop wrapper.
 * @param {Function}    undo Undo of a single edit.
 */
function registerUndo(loop, undo) {
	const undos = loopUndos.get(loop) || [];

	if (!undos.length) {
		loopUndoAddresses.set(loop, getPageAddress());
	}

	undos.push(undo);
	loopUndos.set(loop, undos);
}

/**
 * The address of the page, without the hash.
 *
 * @return {string} Address.
 */
function getPageAddress() {
	return window.location.pathname + window.location.search;
}

/**
 * Put a loop back the way the router last rendered it.
 *
 * @param {HTMLElement} loop Loop wrapper.
 */
function undoManualEdits(loop) {
	const undos = loopUndos.get(loop);

	if (!undos) {
		return;
	}

	loopUndos.delete(loop);
	// The last edit is the first to go.
	undos.reverse().forEach((undo) => {
		undo();
	});
}

// The router owns `popstate` itself, so a Back out of a region swap renders the
// page it remembers without any action of ours running first. Preact leaves the
// items a Load More appended standing - it never created them - and the visitor
// would be looking at two pages at once. Registered while the module is
// evaluated, which is before the router is ever imported, so this listener is
// always the earlier of the two.
//
// A step in the history of the hash alone - Pro's deep links write one for
// every slide a lightbox shows - leaves the page, and the edits, where they are.
window.addEventListener('popstate', () => {
	window.document.querySelectorAll(LOOP_SELECTOR).forEach((loop) => {
		if (loopUndoAddresses.get(loop) !== getPageAddress()) {
			undoManualEdits(loop);
			nextPages.delete(loop);
		}
	});
});

/**
 * Whether an address may be fetched before the visitor asks for it.
 *
 * @param {string} href Address.
 *
 * @return {boolean} False on Save-Data and 2G, as the classic gallery, and for a search.
 */
function canPrefetch(href) {
	const { connection } = window.navigator;

	if (
		connection &&
		(connection.saveData || (connection.effectiveType || '').includes('2g'))
	) {
		return false;
	}

	return !Array.from(new window.URL(href).searchParams.keys()).some((name) =>
		SEARCH_PARAM.test(name)
	);
}

/**
 * Fetch the HTML of a page.
 *
 * @param {string}      href   Address.
 * @param {AbortSignal} signal Signal that cancels the request.
 *
 * @return {Promise<string>} HTML.
 */
async function fetchPageHtml(href, signal) {
	const response = await window.fetch(href, { signal });

	if (!response.ok) {
		throw new Error(response.statusText);
	}

	return response.text();
}

/**
 * Fetch the page a Load More or infinite trigger of a loop leads to, a moment
 * from now, for `loadNextPage()` to take instead of fetching it.
 *
 * @param {HTMLElement} loop Loop wrapper.
 */
function prefetchNextPage(loop) {
	if (!prefetchingLoops.has(loop)) {
		return;
	}

	window.clearTimeout(nextPageTimers.get(loop));
	nextPageTimers.set(
		loop,
		window.setTimeout(() => {
			nextPageTimers.delete(loop);

			const trigger = Array.from(
				loop.querySelectorAll(TRIGGER_SELECTOR)
			).find((element) => element.closest(LOOP_SELECTOR) === loop);
			const href = trigger ? getControlUrl(trigger) : '';

			// A page already on its way, either one.
			if (
				!href ||
				href === nextPages.get(loop)?.href ||
				pendingRequests.has(loop) ||
				navigating.has(loop) ||
				!canPrefetch(href)
			) {
				return;
			}

			nextPages.set(loop, {
				href,
				html: fetchPageHtml(href).catch(() => null),
			});
		}, NEXT_PAGE_DELAY)
	);
}

/**
 * Hand the router the page a navigate link leads to, so that following the
 * link swaps the loop without waiting for the server.
 *
 * Fetched here rather than by the router's own prefetch, which keeps a failed
 * fetch for the address and would turn the click into a full page load.
 *
 * @param {HTMLElement} link Link.
 */
function prefetchLink(link) {
	const href = getControlUrl(link);
	const loop = link.closest(LOOP_SELECTOR);

	// A link clicked before its delay ran out is on its way already.
	if (
		!href ||
		!loop ||
		navigating.has(loop) ||
		prefetchedLinks.has(href) ||
		!canPrefetch(href)
	) {
		return;
	}

	prefetchedLinks.set(
		href,
		fetchPageHtml(href)
			.then(async (html) => {
				const router = await import('@wordpress/interactivity-router');

				await router.actions.prefetch(href, { html });
			})
			.catch(() => {
				prefetchedLinks.delete(href);
			})
	);
}

/**
 * Move the items of a fetched list into the rendered one.
 *
 * @param {HTMLElement} list     Item template list.
 * @param {HTMLElement} nextList Item template list of the fetched page.
 *
 * @return {HTMLElement[]} Appended items.
 */
function appendItems(list, nextList) {
	const fragment = window.document.createDocumentFragment();
	const added = Array.from(nextList.children);

	added.forEach((item) => {
		// The fragment is a slice of a full page render, and whatever it
		// carries already ran on the page we are standing on.
		Array.from(item.querySelectorAll('script')).forEach((script) => {
			script.remove();
		});

		fragment.appendChild(item);
	});

	list.appendChild(fragment);

	return added;
}

/**
 * Point the trigger at the page after the one just loaded.
 *
 * The node is kept and only its href moves. Replacing it with the fetched one
 * would strip its behaviour: the Interactivity API hydrates the document once,
 * and directives on a node inserted by hand never run.
 *
 * @param {HTMLElement} trigger  Load more or infinite trigger.
 * @param {HTMLElement} nextLoop Loop of the fetched page.
 * @param {HTMLElement} loop     Loop wrapper.
 */
function advanceTrigger(trigger, nextLoop, loop) {
	const next = nextLoop.querySelector(TRIGGER_SELECTOR);
	const href = next ? next.getAttribute('href') : '';
	const previousHref = trigger.getAttribute('href');

	if (href) {
		trigger.setAttribute('href', href);
		registerUndo(loop, () => trigger.setAttribute('href', previousHref));
		return;
	}

	// The fetched page has no trigger of its own: that was the last one. Every
	// end of the list the gallery has was printed hidden with this page, in
	// whichever pagination block it sits, and is revealed now.
	const ends = Array.from(loop.querySelectorAll(END_SELECTOR)).filter(
		(end) => end.hidden && end.closest(LOOP_SELECTOR) === loop
	);
	const pagination = trigger.closest(PAGINATION_SELECTOR);

	// The trigger's pagination goes with it, unless it holds an end of the list.
	const node =
		pagination && !pagination.querySelector(END_SELECTOR)
			? pagination
			: trigger;
	const parent = node.parentNode;
	const sibling = node.nextSibling;

	node.remove();
	ends.forEach((end) => {
		end.hidden = false;
	});
	registerUndo(loop, () => {
		ends.forEach((end) => {
			end.hidden = true;
		});
		parent.insertBefore(node, sibling);
	});
}

/**
 * Stretch the range of every Query Total of a loop over the page just loaded.
 *
 * The range starts where this page started and ends where the fetched one
 * ends. Only the text node is written, the one Preact renders the block with,
 * so the router finds its own node when it swaps the region.
 *
 * @param {HTMLElement} loop     Loop wrapper.
 * @param {HTMLElement} nextLoop Loop of the fetched page.
 */
function advanceRanges(loop, nextLoop) {
	const own = (root) =>
		Array.from(root.querySelectorAll(RANGE_SELECTOR)).filter(
			(total) => total.closest(LOOP_SELECTOR) === root
		);
	const nextTotals = own(nextLoop);

	own(loop).forEach((total, index) => {
		const next = nextTotals[index];
		const text = total.firstChild;

		if (!next || !text || window.Node.TEXT_NODE !== text.nodeType) {
			return;
		}

		const values = [
			total.dataset.vpRangeStart,
			next.dataset.vpRangeEnd,
			next.dataset.vpRangeTotal,
		];
		const previous = text.nodeValue;

		text.nodeValue = total.dataset.vpRangeText.replace(
			/%(\d)\$s/g,
			(match, position) => values[position - 1] ?? match
		);
		registerUndo(loop, () => {
			text.nodeValue = previous;
		});
	});
}

/**
 * Give every Carousel Thumbnails strip of a loop the thumbnails of the page
 * just loaded.
 *
 * The fetched page rendered a strip for its own items, with the pictures,
 * sizes and loading attributes the server gives this one, so its buttons are
 * moved over and only renamed: the slides they name follow the ones already
 * here.
 *
 * @param {HTMLElement} loop     Loop wrapper.
 * @param {HTMLElement} nextLoop Loop of the fetched page.
 */
function advanceThumbnails(loop, nextLoop) {
	const own = (root) =>
		Array.from(root.querySelectorAll(THUMBS_SELECTOR)).filter(
			(strip) => strip.closest(LOOP_SELECTOR) === root
		);
	const nextStrips = own(nextLoop);

	own(loop).forEach((strip, index) => {
		const next = nextStrips[index];

		if (!next) {
			return;
		}

		const offset = strip.querySelectorAll(THUMB_SELECTOR).length;
		const label = strip.dataset.vpThumbLabel || '';
		const added = Array.from(next.querySelectorAll(THUMB_SELECTOR));

		added.forEach((thumb, position) => {
			const slide = offset + position;

			thumb.dataset.vpSlide = String(slide);
			thumb.setAttribute('aria-current', 'false');
			thumb.setAttribute(
				'aria-label',
				label.replace('%d', String(slide + 1))
			);
			strip.appendChild(thumb);
		});

		registerUndo(loop, () => {
			added.forEach((thumb) => {
				thumb.remove();
			});
		});
	});
}

/**
 * Append the next page of items to a loop.
 *
 * The router can only replace a region, never extend it, so this is the one
 * control that fetches for itself.
 *
 * @param {HTMLElement} trigger  Load more or infinite trigger.
 * @param {Object}      context  Loop context.
 * @param {boolean}     byClick  Whether a visitor asked for the page.
 *
 * @return {Promise<string>} `appended`, `retry` when asking again could still
 *                           answer differently, or `stop` when it could not.
 */
async function loadNextPage(trigger, context, byClick) {
	const href = getControlUrl(trigger);
	const loop = trigger.closest(LOOP_SELECTOR);
	const list = loop ? loop.querySelector(LIST_SELECTOR) : null;
	const region = loop ? loop.getAttribute('data-wp-router-region') : '';

	if (!href || !list || !region) {
		return STOP;
	}

	// The router is about to replace this whole region, so a page appended
	// into it would land under content that is on its way out.
	if (navigating.has(loop)) {
		return RETRY;
	}

	const previous = pendingRequests.get(loop);

	if (previous) {
		previous.abort();
	}

	const controller = new window.AbortController();

	pendingRequests.set(loop, controller);
	context.isLoading = true;

	// Taken whether or not it is the page asked for: the trigger has moved on
	// from any other.
	const ahead = nextPages.get(loop);

	nextPages.delete(loop);

	try {
		// A page fetched ahead that hangs is not waited for past the deadline
		// a navigation has; the page is asked for again.
		let html =
			ahead && ahead.href === href
				? await Promise.race([
						ahead.html,
						new Promise((resolve) => {
							window.setTimeout(
								() => resolve(null),
								NAVIGATION_TIMEOUT
							);
						}),
					])
				: null;

		// A navigation that started while the page fetched ahead was awaited.
		controller.signal.throwIfAborted();

		if (null === html) {
			html = await fetchPageHtml(href, controller.signal);
		}

		const parsed = new window.DOMParser().parseFromString(
			html,
			'text/html'
		);

		// A parser without scripts reads the no-JavaScript copy of a lazy
		// image as a real one, which would load at once beside the lazy one.
		parsed.querySelectorAll('noscript').forEach((node) => {
			node.remove();
		});

		const nextLoop = parsed.querySelector(
			`[data-wp-router-region="${region}"]`
		);
		const nextList = nextLoop
			? nextLoop.querySelector(LIST_SELECTOR)
			: null;

		if (!nextList) {
			throw new Error('The loaded page carries no gallery items.');
		}

		const added = appendItems(list, nextList);

		registerUndo(loop, () => {
			added.forEach((item) => {
				item.remove();
			});
		});

		// Read before the trigger can go, since a removed node drops the focus
		// it held on the body. Moved only for a visitor who asked for this page.
		// One the observer loaded arrives while they scroll, and the trigger
		// may still hold the focus of an earlier click, so moving it would pull
		// the view to the new items.
		const hadFocus =
			byClick && trigger.contains(window.document.activeElement);

		advanceTrigger(trigger, nextLoop, loop);
		advanceRanges(loop, nextLoop);
		advanceThumbnails(loop, nextLoop);
		refreshLayout(list, added);
		announceUpdate(context);

		// The last page took the trigger away. The first of the items that
		// arrived is where the visitor was going.
		if (hadFocus && !trigger.isConnected && added.length) {
			focusIn(added[0]);
		}

		prefetchNextPage(loop);

		return APPENDED;
	} catch (error) {
		if ('AbortError' === error.name) {
			return RETRY;
		}

		// Never leave a control that does nothing behind - but only where the
		// visitor pressed one. Loading the page under an observer that fired on
		// its own would throw away their scroll position and every page already
		// appended, for a navigation nobody asked for.
		if (byClick) {
			window.location.assign(href);
		}

		return STOP;
	} finally {
		if (pendingRequests.get(loop) === controller) {
			pendingRequests.delete(loop);
			context.isLoading = false;
		}
	}
}

/**
 * Swap a loop for its state at another address.
 *
 * The region comes back from a single server render, so the items and every
 * control around them stay consistent, and the router owns the URL.
 *
 * @param {HTMLElement} ref             Control that asked.
 * @param {string}      href            Address of the state.
 * @param {Object}      context         Loop context.
 * @param {Object}      options         Options.
 * @param {boolean}     options.replace Whether the address replaces the current
 *                                      history entry rather than adding one.
 *
 * @return {Generator} Whether the swap was the loop's latest and is done.
 */
function* swapLoop(ref, href, context, { replace = false } = {}) {
	// The loop wrapper is the region root, so the router keeps this
	// node while everything inside it is replaced.
	const loop = ref.closest(LOOP_SELECTOR);

	if (loop) {
		// A search still waiting for a pause in the typing would follow this
		// navigation from the page it replaces.
		window.clearTimeout(searchTimers.get(loop));
		searchTimers.delete(loop);

		// A Load More still in flight would append its page under the
		// one the router is about to render, and register undos for a
		// rollback that already ran.
		pendingRequests.get(loop)?.abort();
		pendingRequests.delete(loop);
		nextPages.delete(loop);

		undoManualEdits(loop);
	}

	context.isLoading = true;

	// Named so that a navigation the visitor started over the top of
	// this one can be told apart from it: whichever is the loop's
	// current one is the one that gets to say it has finished.
	const token = {};

	if (loop) {
		navigating.set(loop, token);
		latestNavigations.set(loop, token);
	}

	// Ends the loading state, and says whether this navigation was
	// still the loop's own to end. A newer one owns the loop from the
	// moment it starts, this one leaves everything to it.
	const release = () => {
		if (loop && navigating.get(loop) !== token) {
			return false;
		}

		context.isLoading = false;

		if (loop) {
			navigating.delete(loop);
		}

		return true;
	};

	try {
		const router = yield import('@wordpress/interactivity-router');

		let asked = false;

		const timedOut = yield Promise.race([
			// A prefetch of this address still on its way is the request the
			// router would make again. Once it failed, the router makes its own.
			// The router takes the last navigation it is asked for, so one the
			// visitor has since replaced asks for nothing.
			Promise.resolve(prefetchedLinks.get(href)).then(async () => {
				if (!loop || latestNavigations.get(loop) === token) {
					asked = true;
					await router.actions.navigate(href, { replace });
				}

				return false;
			}),
			new Promise((resolve) => {
				window.setTimeout(() => resolve(true), NAVIGATION_TIMEOUT);
			}),
		]);

		// A page fetched ahead that has not come by the deadline is given up,
		// and the address loads in full, as when the router's own fetch hangs.
		if (timedOut && !asked) {
			// A newer navigation keeps the loop.
			if (loop && latestNavigations.get(loop) === token) {
				latestNavigations.set(loop, {});
			}

			throw new Error('Timeout');
		}
	} catch {
		// Only the navigation still wanted may fall back to a full load: an
		// older one would take the visitor off the control they used since.
		if (release()) {
			window.location.assign(href);
		}

		return false;
	}

	if (!release()) {
		return false;
	}

	// The router keeps the page it rendered.
	if (!prefetchedLinks.has(href)) {
		prefetchedLinks.set(href, Promise.resolve());
	}

	const list = loop ? loop.querySelector(LIST_SELECTOR) : null;

	if (list) {
		refreshLayout(list);
	}

	if (loop) {
		prefetchNextPage(loop);
	}

	return true;
}

/**
 * The address a search form leads to, the one it submits to without
 * JavaScript. An empty search is the default state, left out of the address.
 *
 * @param {HTMLInputElement} input Search input.
 *
 * @return {string} Address.
 */
function getSearchUrl(input) {
	// Not `form.action`, which a preserved parameter named `action` shadows.
	const url = new window.URL(
		input.form.getAttribute('action'),
		window.location.href
	);
	const params = new window.URLSearchParams(new window.FormData(input.form));

	if (!input.value.trim()) {
		params.delete(input.name);
	}

	url.search = params.toString();

	return url.href;
}

/**
 * Put back what the visitor was typing, when a swap took it away.
 *
 * The router renders the input again with the term the server read, which is
 * behind whatever was typed while the page was on its way, and a node it
 * rendered anew takes the focus with it.
 *
 * @param {HTMLElement} loop     Loop wrapper.
 * @param {string}      name     Name of the search input.
 * @param {boolean}     hadFocus Whether the input held the focus before the swap.
 */
function getSearchInput(loop, name, index) {
	return loop.querySelectorAll(`${SEARCH_INPUT_SELECTOR}[name="${name}"]`)[
		index
	];
}

function restoreSearch(loop, name, index, hadFocus) {
	const typed = typedSearches.get(loop);
	const input = getSearchInput(loop, name, index);

	// What was typed belongs to the field it was typed in.
	if (!typed || !input || typed.name !== name || typed.index !== index) {
		return;
	}

	let moved = false;

	if (input.value !== typed.value) {
		input.value = typed.value;
		moved = true;
	}

	const active = window.document.activeElement;

	// Only a focus the swap dropped, not one the visitor took elsewhere.
	if (
		hadFocus &&
		input !== active &&
		(!active || window.document.body === active)
	) {
		input.focus();
		moved = true;
	}

	if (moved && input === window.document.activeElement) {
		input.setSelectionRange(typed.start, typed.end);
	}
}

/**
 * Swap a loop for the search in its input.
 *
 * A search adds a history entry, and every search right after it replaces
 * that entry, so Back leaves the search rather than stepping through it a few
 * letters at a time.
 *
 * @param {HTMLElement} loop    Loop wrapper.
 * @param {string}      name    Name of the search input.
 * @param {Object}      context Loop context.
 *
 * @return {Generator} Done.
 */
function* searchLoop(loop, name, index, context) {
	searchTimers.delete(loop);

	// Asked for again: a swap since the visitor typed may have rendered it
	// anew. By its place, since a loop may hold two of them.
	const input = getSearchInput(loop, name, index);

	if (!input || !input.form) {
		return;
	}

	const href = getSearchUrl(input);

	// Already there, or already on the way: an Enter right after a pause
	// would push the same address twice. The address the visitor stands on is
	// still asked for while another search is on the way, or that one lands
	// over a field that no longer holds it.
	// Without the hash, which a search address never carries.
	const here = window.location.href.split('#')[0];
	const inFlight = searchesInFlight.get(loop);

	if (href === inFlight || (href === here && !inFlight)) {
		return;
	}

	// A cleared search is an entry of its own: replacing the search with the
	// address it started from would leave Back two copies of that address.
	// Asking for the address the visitor stands on is the reverse: a new entry
	// would be the second copy.
	const replace =
		href === here ||
		(!!input.value.trim() &&
			(!!inFlight || searchAddresses.get(loop) === here));
	const hadFocus = input === window.document.activeElement;

	searchesInFlight.set(loop, href);

	const done = yield* swapLoop(input, href, context, { replace });

	if (searchesInFlight.get(loop) === href) {
		searchesInFlight.delete(loop);
	}

	if (done) {
		searchAddresses.set(loop, href);
		restoreSearch(loop, name, index, hadFocus);
	}
}

store('visual-portfolio/loop', {
	state: {
		// True wherever this module is running, which is the only thing a
		// fallback control needs to know. A filter or sort form binds its
		// submit button to it, which disappears the moment the select starts
		// navigating on its own. A module that never arrives leaves the button
		// where it is.
		isEnhanced: true,

		// Read through the context so that two loops on one page keep their own
		// loading state.
		get isLoading() {
			return !!getLoopContext().isLoading;
		},
		get ariaLiveMessage() {
			return getLoopContext().ariaLiveMessage || '';
		},
	},
	actions: {
		/**
		 * Follow a filter, sort or pagination control by swapping the loop.
		 *
		 * The region comes back from a single server render, so the items and
		 * every control around them stay consistent, and the router owns the
		 * URL.
		 *
		 * @param {Event} event Control event.
		 */
		navigate: withSyncEvent(function* (event) {
			const { ref } = getElement();
			const href = getControlUrl(ref);

			if (!href || !isPlainActivation(event)) {
				return;
			}

			event.preventDefault();

			// Found before the swap, which may take the control out.
			const loop = ref.closest(LOOP_SELECTOR);

			if (!(yield* swapLoop(ref, href, getLoopContext()))) {
				return;
			}

			const list = loop ? loop.querySelector(LIST_SELECTOR) : null;

			// The node that was activated is either gone - the last page has
			// no Next - or still standing there meaning something else, and
			// either way the visitor is left somewhere they did not choose.
			// The items that just arrived are where they meant to be. A select
			// is the exception. It comes back from the swap unchanged, and
			// moving off it would lose them their place in the form.
			if (list && !(ref instanceof window.HTMLSelectElement)) {
				focusIn(list);
			}
		}),

		/**
		 * Search the loop for what the visitor typed.
		 *
		 * Typing waits for a pause, Enter searches at once. The input lives in
		 * the region it swaps, so the focus, the caret and anything typed while
		 * the page was on its way are put back afterwards.
		 *
		 * @param {Event} event Input or submit event.
		 */
		search: withSyncEvent(function* (event) {
			const { ref } = getElement();
			const loop = ref.closest(LOOP_SELECTOR);
			const input = ref
				.closest('form')
				?.querySelector(SEARCH_INPUT_SELECTOR);

			// An input method is still composing the text.
			if (!loop || !input || event.isComposing) {
				return;
			}

			const isSubmit = 'submit' === event.type;

			if (isSubmit) {
				event.preventDefault();
			}

			window.clearTimeout(searchTimers.get(loop));
			searchTimers.delete(loop);
			const { name } = input;
			const index = Array.from(
				loop.querySelectorAll(
					`${SEARCH_INPUT_SELECTOR}[name="${name}"]`
				)
			).indexOf(input);

			typedSearches.set(loop, {
				name,
				index,
				value: input.value,
				start: input.selectionStart,
				end: input.selectionEnd,
			});
			const context = getLoopContext();
			const run = function* () {
				yield* searchLoop(loop, name, index, context);
			};

			if (isSubmit) {
				yield* run();
				return;
			}

			searchTimers.set(
				loop,
				window.setTimeout(withScope(run), SEARCH_DELAY)
			);
		}),

		/**
		 * Append the next page of items.
		 *
		 * @param {Event} event Control event.
		 */
		loadMore: withSyncEvent(function* (event) {
			const { ref } = getElement();

			if (!getControlUrl(ref) || !isPlainActivation(event)) {
				return;
			}

			event.preventDefault();

			// A click from a script, such as a lightbox asking for the slides
			// of the next page, is not a visitor asking to leave for it.
			yield loadNextPage(ref, getLoopContext(), event.isTrusted);

			// A click on an infinite trigger lets it scroll on, and the page it
			// loaded may leave the trigger in view, which the observer does not
			// report as a change.
			infiniteRearms.get(ref)?.();
		}),
	},
	callbacks: {
		/**
		 * Lay the items out.
		 *
		 * Grid is CSS alone; masonry is positioned here, from the widths CSS
		 * resolved.
		 *
		 * @return {Function|undefined} Teardown, when there is one.
		 */
		initLayout() {
			const { ref } = getElement();

			if (!ref.classList.contains(MASONRY_CLASS)) {
				return undefined;
			}

			initMasonry(ref);

			return () => destroyMasonry(ref);
		},

		/**
		 * Fetch pages before the visitor asks for them: the target of a navigate
		 * link they point at or move the focus to, and the next page of a Load
		 * More or infinite trigger.
		 *
		 * Listened for on the loop, in the capture phase, since neither event
		 * bubbles, and the router renders the links anew on every swap.
		 *
		 * @return {Function} Teardown.
		 */
		initPrefetch() {
			const { ref: loop } = getElement();
			let timer;

			const isLink = (element) => element.matches(NAVIGATE_LINK_SELECTOR);
			const onEnter = ({ target }) => {
				if (isLink(target)) {
					window.clearTimeout(timer);
					timer = window.setTimeout(
						() => prefetchLink(target),
						HOVER_DELAY
					);
				}
			};
			const onLeave = ({ target }) => {
				if (isLink(target)) {
					window.clearTimeout(timer);
				}
			};
			const onFocus = ({ target }) => {
				if (isLink(target)) {
					prefetchLink(target);
				}
			};
			const onLoad = () => prefetchNextPage(loop);

			prefetchingLoops.add(loop);
			loop.addEventListener('pointerenter', onEnter, true);
			loop.addEventListener('pointerleave', onLeave, true);
			loop.addEventListener('focus', onFocus, true);

			if ('complete' === window.document.readyState) {
				onLoad();
			} else {
				window.addEventListener('load', onLoad, { once: true });
			}

			return () => {
				prefetchingLoops.delete(loop);
				window.clearTimeout(timer);
				window.clearTimeout(nextPageTimers.get(loop));
				loop.removeEventListener('pointerenter', onEnter, true);
				loop.removeEventListener('pointerleave', onLeave, true);
				loop.removeEventListener('focus', onFocus, true);
				window.removeEventListener('load', onLoad);
			};
		},

		/**
		 * Load the next page as the trigger comes into view.
		 *
		 * @return {Function} Teardown.
		 */
		observeInfinite() {
			const { ref } = getElement();
			// The observer fires outside of any directive, so the context is
			// taken while there still is one.
			const context = getLoopContext();

			// How far ahead of the viewport a page is fetched, and how often
			// the visitor is asked before it is. Written onto the trigger by
			// whoever renders it; absent, the loop scrolls on by itself from
			// the first screen, 300px early.
			const number = (name, fallback) => {
				const value = parseInt(ref.dataset[name], 10);

				return Number.isNaN(value) ? fallback : value;
			};

			const everyPages = Math.max(0, number('vpInfiniteEveryPage', 0));
			let loaded = 0;
			let paused = 'true' === ref.dataset.vpInfiniteStartupLoadMore;

			// The trigger is a Load More button as well as a sentinel: a click
			// on it lets the scrolling resume.
			const resume = () => {
				paused = false;
			};

			ref.addEventListener('click', resume);

			let observer;

			// Intersection is reported on change, and neither appending items
			// nor refusing to fetch them moves a trigger that was already in
			// view. Observing it again reports where it is now - without it a
			// page turned down because the router was mid-swap would be the
			// last one the loop ever loaded.
			const rearm = () => {
				if (ref.isConnected) {
					observer.unobserve(ref);
					observer.observe(ref);
				}
			};

			infiniteRearms.set(ref, rearm);

			observer = new window.IntersectionObserver(
				(entries) => {
					if (paused) {
						return;
					}

					if (!entries.some((entry) => entry.isIntersecting)) {
						return;
					}

					loadNextPage(ref, context, false).then((result) => {
						if (STOP === result) {
							return;
						}

						if (APPENDED === result) {
							loaded += 1;

							if (everyPages && 0 === loaded % everyPages) {
								paused = true;
							}
						}

						rearm();
					});
				},
				{ rootMargin: `${number('vpInfiniteThreshold', 300)}px` }
			);

			observer.observe(ref);

			return () => {
				ref.removeEventListener('click', resume);
				infiniteRearms.delete(ref);
				observer.disconnect();
			};
		},
	},
});
