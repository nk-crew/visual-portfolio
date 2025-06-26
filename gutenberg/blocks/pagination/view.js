import $ from 'jquery';
import { throttle } from 'lodash';

const $doc = $(document);

$doc.on(
	'click',
	'.vp-block-pagination-previous, .vp-block-pagination-next, .vp-block-pagination-numbers a, .vp-block-pagination-load-more, .vp-block-pagination-infinite',
	(e) => {
		const $current = $(e.currentTarget);
		const $loop = $current.closest('.vp-block-loop');
		const $legacyBlock = $loop.find('.vp-portfolio');
		const vpf = $legacyBlock?.[0]?.vpf;

		if (!vpf) {
			return;
		}

		e.preventDefault();

		const isPaged =
			$current.hasClass('vp-block-pagination-previous') ||
			$current.hasClass('vp-block-pagination-next') ||
			!!$current.parent('.vp-block-pagination-numbers').length;

		vpf.loadNewItems($current.attr('href'), isPaged);
	}
);

/**
 * Infinite scroll.
 */
$doc.on('loadedNewItems.vpf', function (event, vpObject) {
	if ('vpf' !== event.namespace) {
		return;
	}

	if (!vpObject.$item.find('vp-block-pagination-infinite').length) {
		return;
	}

	// Infinite pagination should start loading again in case the pagination is still in view.
	// Use setTimeout to allow DOM to settle after content insertion
	setTimeout(() => {
		const $infinitePagination = vpObject.$item.find(
			'.vp-block-pagination-infinite.is-intersecting:first'
		);

		if ($infinitePagination.length && $infinitePagination.attr('href')) {
			vpObject.loadNewItems($infinitePagination.attr('href'), false);
		}
	}, 100);
});

const infiniteObserver = new window.IntersectionObserver(
	(entries, observer) => {
		try {
			entries.forEach((entry) => {
				if (!entry.target) {
					return;
				}

				const href = entry.target.getAttribute('href');

				// Disconnect observer when no href.
				if (!href) {
					observer.disconnect();
					return;
				}

				if (entry.isIntersecting) {
					// Mark as intersecting and trigger loading
					entry.target.classList.add('is-intersecting');

					const loop = entry.target.closest('.vp-block-loop');
					const legacyBlock = loop?.querySelector('.vp-portfolio');
					const vpf = legacyBlock?.vpf;

					if (vpf) {
						vpf.loadNewItems(href, false);
					}
				} else {
					// Remove intersecting marker when out of view
					entry.target.classList.remove('is-intersecting');
				}
			});
		} catch (error) {
			// eslint-disable-next-line no-console -- we have to log errors.
			console.log(error);
		}
	},
	{ rootMargin: '300px 0px' }
);

const initInfiniteThrottled = throttle(() => {
	document
		.querySelectorAll(
			'.vp-block-pagination-infinite[href]:not(.is-handled)'
		)
		.forEach((element) => {
			element.classList.add('is-handled');
			infiniteObserver.observe(element);
		});
}, 200);

$doc.on('ready', () => {
	new window.MutationObserver(initInfiniteThrottled).observe(
		document.documentElement,
		{
			childList: true,
			subtree: true,
		}
	);
});
