import $ from 'jquery';
import { throttle } from 'lodash';

const $doc = $(document);

$doc.on(
	'click',
	'.wp-block-visual-portfolio-pagination-previous, .wp-block-visual-portfolio-pagination-next, .wp-block-visual-portfolio-pagination-numbers a, .wp-block-visual-portfolio-pagination-load-more, .wp-block-visual-portfolio-pagination-infinite',
	(e) => {
		const $current = $(e.currentTarget);
		const $loop = $current.closest('.wp-block-visual-portfolio-loop');
		const vpf = $loop?.[0]?.vpf;

		if (!vpf) {
			return;
		}

		e.preventDefault();

		const isPaged =
			$current.hasClass(
				'wp-block-visual-portfolio-pagination-previous'
			) ||
			$current.hasClass('wp-block-visual-portfolio-pagination-next') ||
			!!$current.parent('.wp-block-visual-portfolio-pagination-numbers')
				.length;

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

	if (
		!vpObject.$item.find('wp-block-visual-portfolio-pagination-infinite')
			.length
	) {
		return;
	}

	// Infinite pagination should start loading again in case the pagination is still in view.
	// Use setTimeout to allow DOM to settle after content insertion
	setTimeout(() => {
		const $infinitePagination = vpObject.$item.find(
			'.wp-block-visual-portfolio-pagination-infinite.is-intersecting:first'
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

					const loop = entry.target.closest(
						'.wp-block-visual-portfolio-loop'
					);
					const vpf = loop?.vpf;

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
			'.wp-block-visual-portfolio-pagination-infinite[href]:not(.is-handled)'
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
