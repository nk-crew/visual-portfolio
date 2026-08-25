/**
 * Keeps a preview iframe exactly as tall as its content, and carries messages both ways.
 *
 * The editor renders a gallery by loading the real front-end markup into an iframe. That frame
 * has to be as tall as what it contains and show no scrollbar of its own, but only the frame can
 * measure itself - so it reports its height and the page that embeds it applies it. The same
 * channel carries the two messages the editor needs: viewport width and dynamic CSS going down,
 * and a click going up so the block can select itself.
 *
 * Every message is namespaced with `CHANNEL`, so nothing else listening for `message` on the page
 * reacts to it, and both ends check who sent a payload before acting on it.
 *
 * Measuring is driven by a ResizeObserver on the element the height comes from, which covers
 * every cause of a height change - images arriving, fonts swapping, a masonry relayout - without
 * polling. A MutationObserver catches the one thing a resize cannot: content replaced wholesale
 * by AJAX, which swaps the measured element for a different one.
 */

export const CHANNEL = 'vp-preview-frame';

// One frame at 60Hz. See `scheduleMeasure` for why this is a timer and not an animation frame.
const MEASURE_INTERVAL = 16;

/**
 * Resolve the origin a message may be posted to.
 *
 * @param {string} url - absolute or relative URL of the other end.
 *
 * @return {string} origin, or '*' when the URL cannot be parsed.
 */
export function resolveTargetOrigin(url) {
	try {
		return new URL(url, window.location.href).origin;
	} catch {
		return '*';
	}
}

/**
 * Rate-limit a function, running it immediately and then at most once per `delay`.
 *
 * Leading edge so the first height lands with no delay, trailing edge so the last one always
 * lands too - without it the preview would settle on whatever height happened to fall on a tick
 * rather than the real one.
 *
 * @param {number}   delay - smallest gap between calls, in ms. Zero disables the limiting.
 * @param {Function} fn    - the function to rate-limit.
 *
 * @return {Function} the rate-limited function, with a `cancel` method.
 */
function throttleTrailing(delay, fn) {
	if (!delay) {
		const immediate = (...args) => fn(...args);

		immediate.cancel = () => {};

		return immediate;
	}

	let lastRun = 0;
	let timer = null;
	let pending = null;

	function run(args) {
		lastRun = Date.now();
		pending = null;
		fn(...args);
	}

	function throttled(...args) {
		const remaining = delay - (Date.now() - lastRun);

		pending = args;

		if (remaining <= 0) {
			if (timer !== null) {
				clearTimeout(timer);
				timer = null;
			}

			run(args);

			return;
		}

		if (timer === null) {
			timer = setTimeout(() => {
				timer = null;

				if (pending) {
					run(pending);
				}
			}, remaining);
		}
	}

	throttled.cancel = () => {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}

		pending = null;
	};

	return throttled;
}

/**
 * Host side. Connect to a preview iframe.
 *
 * @param {HTMLIFrameElement} iframe               - the frame to drive.
 * @param {Object}            options              - connection options.
 * @param {string}            options.targetOrigin - origin the frame is served from.
 * @param {boolean}           options.sizeHeight   - write the reported height onto the frame.
 * @param {Function}          options.onResized    - called with `{ height }` on every change.
 * @param {Function}          options.onMessage    - called with `{ message }` from the frame.
 * @param {Function}          options.onInit       - called once the frame reports it is ready.
 *
 * @return {Object} handle with `sendMessage`, `resize` and `destroy`.
 */
export function connectPreviewFrame(iframe, options = {}) {
	const {
		targetOrigin = window.location.origin,
		sizeHeight = true,
		applyInterval = 0,
		onResized,
		onMessage,
		onInit,
	} = options;

	let destroyed = false;
	let initialised = false;

	// A frame sized to its content never wants a scrollbar of its own, whoever applies the
	// height. The frame hides its own document's overflow as well; this covers the moment
	// before its script has run.
	iframe.style.overflow = 'hidden';

	// The frame posts to its own `window.parent`, which is the window that owns the frame's
	// document - not necessarily the window this code runs in. Since WordPress 7.1 always
	// iframes the editor canvas, a block's preview frame sits inside the canvas while the
	// editor script runs in the admin page, so listening on the global `window` would never
	// see the frame's messages.
	const hostWindow = iframe.ownerDocument.defaultView || window;

	// Settling content reports a new height many times a second, and applying every one of them
	// makes the preview jitter. Rate-limiting here rather than in the caller keeps the frame and
	// whatever the caller sizes around it moving as one - split between two limiters they drift
	// apart and the frame visibly lags its own container.
	const applyHeight = throttleTrailing(applyInterval, (height) => {
		if (destroyed) {
			return;
		}

		if (sizeHeight) {
			iframe.style.height = `${height}px`;
		}

		if (onResized) {
			onResized({ height });
		}
	});

	function post(type, payload) {
		if (destroyed || !iframe.contentWindow) {
			return;
		}

		try {
			iframe.contentWindow.postMessage(
				{ channel: CHANNEL, dir: 'down', type, payload },
				targetOrigin
			);
		} catch {
			// Cheap insurance. Reaching `contentWindow` and calling `postMessage` across a
			// frame boundary is allowed by spec and should not throw, but this runs
			// synchronously from `componentDidMount`, so a browser quirk here would take the
			// whole block mount down with it.
		}
	}

	function handleMessage(event) {
		if (destroyed || !iframe.contentWindow) {
			return;
		}

		// Only trust the frame we are actually driving.
		if (event.source !== iframe.contentWindow) {
			return;
		}

		const data = event.data;

		if (!data || data.channel !== CHANNEL || data.dir !== 'up') {
			return;
		}

		switch (data.type) {
			case 'ready':
				// Ask for a measurement before running the caller's hook. The frame may have
				// loaded before this listener existed, so its own `ready` announcement can be
				// long gone - and if `onInit` throws, the frame must still get sized rather
				// than being left at zero height because someone else's callback failed.
				post('measure');

				if (!initialised) {
					initialised = true;

					if (onInit) {
						onInit();
					}
				}
				break;
			case 'height': {
				const height = data.payload && data.payload.height;

				if (typeof height !== 'number' || !Number.isFinite(height)) {
					break;
				}

				applyHeight(height);
				break;
			}
			case 'message':
				if (onMessage) {
					onMessage({ message: data.payload });
				}
				break;
			// no default
		}
	}

	hostWindow.addEventListener('message', handleMessage);

	// The frame announces itself with `ready`, but it may already have loaded by now, in which
	// case that announcement is long gone. Asking costs one message and covers both orders.
	post('measure');

	return {
		sendMessage(payload) {
			post('message', payload);
		},
		resize() {
			post('measure');
		},
		destroy() {
			destroyed = true;
			applyHeight.cancel();
			hostWindow.removeEventListener('message', handleMessage);
		},
	};
}

/**
 * Frame side. Report height to the host and receive its messages.
 *
 * @param {Object}   options             - connection options.
 * @param {Function} options.getHeight   - measures the content height, in pixels.
 * @param {Function} options.getTarget   - returns the element the height is measured from.
 * @param {Array}    options.hostOrigins - extra origins the host may drive this frame from.
 * @param {Function} options.onMessage   - called with whatever the host sends.
 *
 * @return {Object} handle with `sendMessage`, `measure` and `destroy`.
 */
export function initPreviewFrameChild(options = {}) {
	const { getHeight, getTarget, hostOrigins = [], onMessage } = options;

	if (window.parent === window) {
		return { sendMessage() {}, measure() {}, destroy() {} };
	}

	let destroyed = false;
	let lastHeight = -1;
	let timeout = null;
	let observedTarget = null;
	let resizeObserver = null;

	// The host sizes this frame from what we report, so it never needs to scroll itself.
	if (document.documentElement) {
		document.documentElement.style.overflow = 'hidden';
	}

	// Learned from the first message the host sends; until then we cannot know which origin
	// the host is on, and the payloads going up are a height and a click notice.
	let hostOrigin = '*';

	function post(type, payload) {
		if (destroyed) {
			return;
		}

		window.parent.postMessage(
			{ channel: CHANNEL, dir: 'up', type, payload },
			hostOrigin
		);
	}

	function observeTarget() {
		if (!resizeObserver || !getTarget) {
			return;
		}

		const target = getTarget();

		if (!target || target === observedTarget) {
			return;
		}

		if (observedTarget) {
			resizeObserver.unobserve(observedTarget);
		}

		observedTarget = target;
		resizeObserver.observe(target);
	}

	function measure() {
		if (destroyed) {
			return;
		}

		observeTarget();

		const height = Math.ceil(getHeight());

		if (!height || height === lastHeight) {
			return;
		}

		lastHeight = height;
		post('height', { height });
	}

	function clearPending() {
		if (timeout !== null) {
			window.clearTimeout(timeout);
			timeout = null;
		}
	}

	// One measurement per frame's worth of time, however many changes arrive in it.
	//
	// Nothing here polls: a measurement only ever happens because an observer reported a real
	// change. What this adds is a ceiling, because settling content is animated - a masonry
	// relayout mutates the DOM and ticks the height down over several hundred milliseconds - and
	// without a ceiling every one of those steps would be measured and sent on. Sixteen
	// milliseconds is one frame at 60Hz: fast enough that no one can see the height lag, slow
	// enough that a burst collapses into a single pass.
	//
	// A timer rather than `requestAnimationFrame`, for two measured reasons. The frame is sized
	// by what it reports, so before the first report it is zero pixels tall inside a
	// hidden-overflow wrapper, and a frame that is not painted never receives an animation
	// frame - the first measurement would deadlock. And this content sits in a frame inside the
	// editor canvas inside a pane the browser may hide entirely; measured in WordPress 7.1, with
	// that pane hidden no animation frame arrives at all and the height stops tracking until it
	// comes back. A timer keeps working in both cases.
	function scheduleMeasure() {
		if (destroyed || timeout !== null) {
			return;
		}

		timeout = window.setTimeout(() => {
			timeout = null;
			measure();
		}, MEASURE_INTERVAL);
	}

	function handleMessage(event) {
		if (destroyed) {
			return;
		}

		const data = event.data;

		if (!data || data.channel !== CHANNEL || data.dir !== 'down') {
			return;
		}

		// `event.source` is the window whose script called `postMessage`, not the frame that
		// contains us. The editor runs in the admin page while this preview sits inside the
		// canvas frame, so the sender is an ancestor rather than `window.parent` itself.
		//
		// Accept a direct parent, our own origin, or one of the origins the server told us the
		// editor lives on. That last one matters when a site puts `admin_url` and `home_url`
		// on different hosts: the frame is served from one and driven from the other, and
		// without it the dynamic CSS and resize messages would be dropped in silence.
		const fromParent = event.source === window.parent;
		const sameOrigin = event.origin === window.location.origin;
		const knownHost = hostOrigins.indexOf(event.origin) !== -1;

		if (!fromParent && !sameOrigin && !knownHost) {
			return;
		}

		if (hostOrigin === '*' && event.origin && event.origin !== 'null') {
			hostOrigin = event.origin;
		}

		switch (data.type) {
			case 'measure':
				// Answer synchronously. The host only asks when it believes the frame is stale,
				// so there is nothing to gain by deferring. Forcing `lastHeight` makes the
				// answer unconditional.
				clearPending();
				lastHeight = -1;
				measure();
				break;
			case 'message':
				if (onMessage) {
					onMessage(data.payload);
				}

				// A host message usually changes the layout - re-measure once it has settled.
				lastHeight = -1;
				scheduleMeasure();
				break;
			// no default
		}
	}

	window.addEventListener('message', handleMessage);

	// Watch the element the height is actually measured from, not just the document. Measured in
	// the WordPress 7.1 editor: growing the content inside `#vp_preview` by 300px moved neither
	// `documentElement` nor `body`, so an observer on the document alone never fired and the
	// frame kept its old height. The document is still watched, because it is what exists before
	// the measured element does.
	resizeObserver =
		typeof window.ResizeObserver === 'undefined'
			? null
			: new window.ResizeObserver(scheduleMeasure);

	if (resizeObserver) {
		resizeObserver.observe(document.documentElement);

		if (document.body) {
			resizeObserver.observe(document.body);
		}
	}

	observeTarget();

	// Loading a page of results over AJAX replaces the measured element with a different one,
	// which no resize reports. That is the only job of this observer, so its callback does
	// nothing but schedule - re-resolving the element happens inside the coalesced measurement
	// rather than once per mutation.
	const mutationObserver =
		typeof window.MutationObserver === 'undefined' || !document.body
			? null
			: new window.MutationObserver(scheduleMeasure);

	if (mutationObserver) {
		mutationObserver.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	window.addEventListener('load', scheduleMeasure);

	post('ready');
	measure();

	return {
		sendMessage(payload) {
			post('message', payload);
		},
		measure: scheduleMeasure,
		destroy() {
			destroyed = true;

			clearPending();

			if (resizeObserver) {
				resizeObserver.disconnect();
			}

			if (mutationObserver) {
				mutationObserver.disconnect();
			}

			window.removeEventListener('message', handleMessage);
			window.removeEventListener('load', scheduleMeasure);
		},
	};
}
