import $ from 'jquery';

const { screenSizes } = window.VPData;

// fix masonry items position for Tiles layout.
// https://github.com/nk-crew/visual-portfolio/issues/111
if (
	typeof window.Isotope !== 'undefined' &&
	typeof window.Isotope.LayoutMode !== 'undefined'
) {
	const MasonryMode = window.Isotope.LayoutMode.modes.masonry;

	if (MasonryMode) {
		const defaultMeasureColumns = MasonryMode.prototype.measureColumns;
		MasonryMode.prototype.measureColumns = function () {
			let runDefault = true;

			// if columnWidth is 0, default to columns count size.
			if (!this.columnWidth) {
				const $vp = $(this.element).closest(
					'.vp-portfolio[data-vp-layout="tiles"]'
				);

				// change column size for Tiles type only.
				if ($vp.length && $vp[0].vpf) {
					this.getContainerWidth();

					const { vpf } = $vp[0];
					const settings = vpf.getTilesSettings();

					// get columns number
					let columns = parseInt(settings[0], 10) || 1;

					// calculate responsive.
					let count = columns - 1;
					let currentPoint = Math.min(screenSizes.length - 1, count);

					for (; currentPoint >= 0; currentPoint -= 1) {
						if (
							count > 0 &&
							typeof screenSizes[currentPoint] !== 'undefined'
						) {
							if (
								window.innerWidth <= screenSizes[currentPoint]
							) {
								columns = count;
							}
						}
						count -= 1;
					}

					if (columns) {
						this.columnWidth = this.containerWidth / columns;
						this.columnWidth += this.gutter;
						this.cols = columns;
						runDefault = false;
					}
				}
			}

			if (runDefault) {
				defaultMeasureColumns.call(this);
			}
		};
	}
}

// Extend VP class.
$(document).on('extendClass.vpf', (event, VP) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	/**
	 * Get Tiles Layout Settings
	 *
	 * @return {string} tiles layout
	 */
	VP.prototype.getTilesSettings = function () {
		const self = this;

		const layoutArr = self.options.tilesType.split(/[:|]/);

		// remove last empty item
		if (
			typeof layoutArr[layoutArr.length - 1] !== 'undefined' &&
			!layoutArr[layoutArr.length - 1]
		) {
			layoutArr.pop();
		}

		return layoutArr;
	};
});

// Init Options.
$(document).on('initOptions.vpf', (event, self) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	self.defaults.tilesType = '3|1,1|';

	if (!self.options.tilesType) {
		self.options.tilesType = self.defaults.tilesType;
	}
});

// Init Layout.
$(document).on('initLayout.vpf', (event, self) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	if (self.options.layout !== 'tiles') {
		return;
	}

	const settings = self.getTilesSettings();

	// get columns number
	const columns = parseInt(settings[0], 10) || 1;
	settings.shift();

	// set columns
	self.addStyle('.vp-portfolio__item-wrap', {
		width: `${100 / columns}%`,
	});

	// set items sizes
	if (settings && settings.length) {
		for (let k = 0; k < settings.length; k += 1) {
			const size = settings[k].split(',');
			const w = parseFloat(size[0]) || 1;
			const h = parseFloat(size[1]) || 1;

			let itemSelector = '.vp-portfolio__item-wrap';
			if (settings.length > 1) {
				itemSelector += `:nth-of-type(${settings.length}n+${k + 1})`;
			}

			if (w && w !== 1) {
				self.addStyle(itemSelector, {
					width: `${(w * 100) / columns}%`,
				});
			}
			self.addStyle(
				`${itemSelector} .vp-portfolio__item-img-wrap::before`,
				{
					'padding-top': `${h * 100}%`,
				}
			);
		}
	}

	// calculate responsive.
	let count = columns - 1;
	let currentPoint = Math.min(screenSizes.length - 1, count);

	for (; currentPoint >= 0; currentPoint -= 1) {
		if (count > 0 && typeof screenSizes[currentPoint] !== 'undefined') {
			self.addStyle(
				'.vp-portfolio__item-wrap',
				{
					width: `${100 / count}%`,
				},
				`screen and (max-width: ${screenSizes[currentPoint]}px)`
			);
			self.addStyle(
				'.vp-portfolio__item-wrap:nth-of-type(n)',
				{
					width: `${100 / count}%`,
				},
				`screen and (max-width: ${screenSizes[currentPoint]}px)`
			);
		}
		count -= 1;
	}
});
