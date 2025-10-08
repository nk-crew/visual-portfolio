import { debounce } from 'throttle-debounce';

/**
 * WP Lightbox Class Persistence Fix
 *
 * WordPress core's Lightbox Interactivity API has a critical timing issue with lazy loading.
 * The lightbox script saves the class attribute ONCE when it initializes, and then always
 * restores that same saved state every time the lightbox closes.
 *
 * The problem sequence:
 * 1. Page loads - image has 'vp-lazyload' class
 * 2. WP Lightbox script initializes - saves class attribute with 'vp-lazyload' (or 'vp-lazyloading')
 * 3. LazySizes starts loading - image gets 'vp-lazyloading' class
 * 4. Image finishes loading - LazySizes adds 'vp-lazyloaded' class
 * 5. User opens and closes lightbox
 * 6. WP Lightbox restores the OLD saved class (still has 'vp-lazyloading', missing 'vp-lazyloaded')
 * 7. Image styling breaks because it relies on 'vp-lazyloaded' class for proper display
 *
 * This happens because WP Lightbox saves the class attribute at initialization time (step 2),
 * which might be before the image finishes loading. It then permanently uses that outdated
 * snapshot, never updating it even after the image loads completely.
 *
 * Solution: Use MutationObserver to watch for class changes and call unveil() to restore
 * the proper lazy loading classes when WP Lightbox reverts them to the old state.
 * We use a debounced callback to avoid excessive DOM operations.
 *
 * @param window
 * @param factory
 */
(function (window, factory) {
	const globalInstall = function () {
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};
	factory = factory.bind(null, window, window.document);

	if (window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
})(window, (window, document, lazySizes) => {
	if (!window.addEventListener) {
		return;
	}

	const { unveil } = lazySizes.loader;

	// Map to store observers for each image to prevent duplicates.
	const observerMap = new WeakMap();

	const wpLightboxResolve = {
		observeClassChanges(img) {
			// Don't create duplicate observers.
			if (observerMap.has(img)) {
				return;
			}

			// Debounced callback to restore classes via unveil if vp-lazyloaded is removed.
			const restoreLazyloadedClass = debounce(50, () => {
				// Check if element is still in the DOM before processing.
				if (!document.contains(img)) {
					this.disconnectObserver(img);
					return;
				}

				if (!img.classList.contains('vp-lazyloaded')) {
					unveil(img);
				}
			});

			// Create observer for class attribute changes.
			const observer = new window.MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					if (
						mutation.type === 'attributes' &&
						mutation.attributeName === 'class'
					) {
						restoreLazyloadedClass();
					}
				});
			});

			// Start observing.
			observer.observe(img, {
				attributes: true,
				attributeFilter: ['class'],
			});

			// Store observer reference.
			observerMap.set(img, observer);

			// Clean up observer when element is removed from DOM.
			// Use Intersection Observer to detect when element is disconnected.
			const cleanupObserver = new window.IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						// When element is no longer intersecting and not in document, clean up.
						if (!entry.isIntersecting && !document.contains(img)) {
							this.disconnectObserver(img);
							cleanupObserver.disconnect();
						}
					});
				},
				{ threshold: 0 }
			);

			cleanupObserver.observe(img);
		},
		disconnectObserver(img) {
			const observer = observerMap.get(img);
			if (observer) {
				observer.disconnect();
				observerMap.delete(img);
			}
		},
	};

	lazySizes.wpLightboxResolve = wpLightboxResolve;

	document.addEventListener('lazyloaded', (e) => {
		// for some reason sometimes e.detail is undefined, so we need to check it.
		if (
			e.defaultPrevented ||
			!e.detail ||
			!e.target ||
			e.detail.instance !== lazySizes
		) {
			return;
		}

		// Only allow for image blocks with lightbox enabled.
		// Watch for class changes to prevent WP Lightbox from removing vp-lazyloaded.
		if (e.target.parentNode?.classList.contains('wp-lightbox-container')) {
			wpLightboxResolve.observeClassChanges(e.target);
		}
	});
});
