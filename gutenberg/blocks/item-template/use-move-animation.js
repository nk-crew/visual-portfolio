/**
 * WordPress dependencies
 */
import { useLayoutEffect, useRef } from '@wordpress/element';

const DURATION = 300;
const KEY_ATTRIBUTE = 'data-vp-item-key';

/**
 * Where each shown item of the list is on the screen.
 *
 * @param {HTMLElement} list - item template list.
 * @return {Map} rects by item key.
 */
function measure(list) {
	const rects = new Map();

	list.querySelectorAll(`:scope > [${KEY_ATTRIBUTE}]`).forEach((item) => {
		const rect = item.getBoundingClientRect();

		if (rect.width || rect.height) {
			rects.set(item.getAttribute(KEY_ATTRIBUTE), rect);
		}
	});

	return rects;
}

/**
 * Slide the items of a preview from where they stood to where a new order put
 * them, the way the block editor slides a block the mover moved.
 *
 * Written by hand because the block editor's move animation is private to blocks.
 *
 * @param {Object}  listRef   - ref of the list.
 * @param {Array}   keys      - item keys in the order shown.
 * @param {boolean} isEnabled - whether the layout can slide its items.
 */
export default function useMoveAnimation(listRef, keys, isEnabled) {
	const order = keys.join('\n');
	const shownOrder = useRef(order);
	const before = useRef(null);

	// Measured during render, because after React commits the old places are gone.
	if (order !== shownOrder.current) {
		shownOrder.current = order;
		before.current =
			isEnabled && listRef.current ? measure(listRef.current) : null;
	}

	useLayoutEffect(() => {
		const list = listRef.current;
		const from = before.current;

		before.current = null;

		if (!list || !from?.size) {
			return undefined;
		}

		const view = list.ownerDocument.defaultView || window;

		if (view.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
			return undefined;
		}

		const items = Array.from(
			list.querySelectorAll(`:scope > [${KEY_ATTRIBUTE}]`)
		);

		items.forEach((item) => {
			item.style.transition = '';
			item.style.transform = '';
		});

		const moved = items.filter((item) => {
			const old = from.get(item.getAttribute(KEY_ATTRIBUTE));

			if (!old) {
				return false;
			}

			const now = item.getBoundingClientRect();
			const x = old.left - now.left;
			const y = old.top - now.top;

			if (Math.abs(x) < 1 && Math.abs(y) < 1) {
				return false;
			}

			item.style.transform = `translate(${x}px, ${y}px)`;

			return true;
		});

		if (!moved.length) {
			return undefined;
		}

		// The old places have to be drawn once before the items can leave them.
		const frame = view.requestAnimationFrame(() => {
			moved.forEach((item) => {
				item.style.transition = `transform ${DURATION}ms cubic-bezier(0.2, 0, 0, 1)`;
				item.style.transform = '';
			});
		});

		const timeout = view.setTimeout(() => {
			moved.forEach((item) => {
				item.style.transition = '';
			});
		}, DURATION + 50);

		return () => {
			view.cancelAnimationFrame(frame);
			view.clearTimeout(timeout);
		};
	}, [order, listRef]);
}
