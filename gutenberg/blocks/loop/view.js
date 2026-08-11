import { getContext, getElement, store } from '@wordpress/interactivity';

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
const TRIGGER_SELECTOR =
	'.vp-block-loop-pagination-load-more, .vp-block-loop-pagination-infinite';
const MASONRY_CLASS = 'vp-layout-masonry';

const masonryLayouts = new WeakMap();
const resizeObservers = new WeakMap();
const observedWidths = new WeakMap();
const pendingRequests = new WeakMap();
const loopUndos = new WeakMap();

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
		initMasonry(list);
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
	// The sort control is a `<select>`, every other control is a link.
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

	undos.push(undo);
	loopUndos.set(loop, undos);
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

	// The fetched page has no trigger of its own: that was the last one.
	const node = trigger.closest(PAGINATION_SELECTOR) || trigger;
	const parent = node.parentNode;
	const sibling = node.nextSibling;

	node.remove();
	registerUndo(loop, () => parent.insertBefore(node, sibling));
}

/**
 * Append the next page of items to a loop.
 *
 * The router can only replace a region, never extend it, so this is the one
 * control that fetches for itself.
 *
 * @param {HTMLElement} trigger Load more or infinite trigger.
 * @param {Object}      context Loop context.
 *
 * @return {Promise<boolean>} Whether items were appended.
 */
async function loadNextPage(trigger, context) {
	const href = getControlUrl(trigger);
	const loop = trigger.closest(LOOP_SELECTOR);
	const list = loop ? loop.querySelector(LIST_SELECTOR) : null;
	const region = loop ? loop.getAttribute('data-wp-router-region') : '';

	if (!href || !list || !region) {
		return false;
	}

	const previous = pendingRequests.get(loop);

	if (previous) {
		previous.abort();
	}

	const controller = new window.AbortController();

	pendingRequests.set(loop, controller);
	context.isLoading = true;

	try {
		const response = await window.fetch(href, {
			signal: controller.signal,
		});

		if (!response.ok) {
			throw new Error(response.statusText);
		}

		const html = await response.text();
		const parsed = new window.DOMParser().parseFromString(
			html,
			'text/html'
		);
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
		advanceTrigger(trigger, nextLoop, loop);
		refreshLayout(list, added);
		announceUpdate(context);

		return true;
	} catch (error) {
		if ('AbortError' === error.name) {
			return false;
		}

		// Never leave a control that does nothing behind.
		window.location.assign(href);

		return false;
	} finally {
		if (pendingRequests.get(loop) === controller) {
			pendingRequests.delete(loop);
			context.isLoading = false;
		}
	}
}

store('visual-portfolio/loop', {
	state: {
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
		*navigate(event) {
			const { ref } = getElement();
			const href = getControlUrl(ref);

			if (!href || !isPlainActivation(event)) {
				return;
			}

			event.preventDefault();

			const context = getLoopContext();
			// The loop wrapper is the region root, so the router keeps this
			// node while everything inside it is replaced.
			const loop = ref.closest(LOOP_SELECTOR);

			if (loop) {
				undoManualEdits(loop);
			}

			context.isLoading = true;

			try {
				const router = yield import('@wordpress/interactivity-router');

				yield router.actions.navigate(href);
			} catch {
				window.location.assign(href);
				return;
			} finally {
				context.isLoading = false;
			}

			const list = loop ? loop.querySelector(LIST_SELECTOR) : null;

			if (list) {
				refreshLayout(list);
			}
		},

		/**
		 * Append the next page of items.
		 *
		 * @param {Event} event Control event.
		 */
		*loadMore(event) {
			const { ref } = getElement();

			if (!getControlUrl(ref) || !isPlainActivation(event)) {
				return;
			}

			event.preventDefault();

			yield loadNextPage(ref, getLoopContext());
		},
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
		 * Load the next page as the trigger comes into view.
		 *
		 * @return {Function} Teardown.
		 */
		observeInfinite() {
			const { ref } = getElement();
			// The observer fires outside of any directive, so the context is
			// taken while there still is one.
			const context = getLoopContext();
			const observer = new window.IntersectionObserver(
				(entries) => {
					if (!entries.some((entry) => entry.isIntersecting)) {
						return;
					}

					loadNextPage(ref, context).then((appended) => {
						// Intersection is reported on change, and appending
						// items does not move a trigger that was already in
						// view. Observing it again reports where it is now.
						if (appended && ref.isConnected) {
							observer.unobserve(ref);
							observer.observe(ref);
						}
					});
				},
				{ rootMargin: '300px' }
			);

			observer.observe(ref);

			return () => observer.disconnect();
		},
	},
});
