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

	const getCSS = function (elem) {
		return window.getComputedStyle(elem, null) || {};
	};

	const objectFitCover = {
		calculateSize(element, width) {
			const CSS = getCSS(element);

			if (CSS && CSS.objectFit && CSS.objectFit === 'cover') {
				const blockHeight = parseInt(
					element.getAttribute('height'),
					10
				);
				const blockWidth = parseInt(element.getAttribute('width'), 10);

				if (blockHeight) {
					if (
						blockWidth / blockHeight >
						element.clientWidth / element.clientHeight
					) {
						width = parseInt(
							(element.clientHeight * blockWidth) / blockHeight,
							10
						);
					}
				}
			}

			return width;
		},
	};

	lazySizes.objectFitCover = objectFitCover;

	document.addEventListener('lazybeforesizes', (e) => {
		// for some reason sometimes e.detail is undefined, so we need to check it.
		if (
			e.defaultPrevented ||
			!e.detail ||
			!e.detail.width ||
			!e.target ||
			e.detail.instance !== lazySizes
		) {
			return;
		}

		const element = e.target;
		e.detail.width = objectFitCover.calculateSize(element, e.detail.width);
	});
});
