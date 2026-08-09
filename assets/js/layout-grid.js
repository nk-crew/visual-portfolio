import $ from 'jquery';

const { screenSizes } = window.VPData;

//
// Our custom Grid layout for Isotope.
//
// * fixes grid items position in FireFox - https://wordpress.org/support/topic/gallery-difference-between-firefox-and-all-other-browsers/
//
if (
	typeof window.Isotope !== 'undefined' &&
	typeof window.Isotope.LayoutMode !== 'undefined'
) {
	const VPRows = window.Isotope.LayoutMode.create('vpRows');
	const proto = VPRows.prototype;

	proto.measureColumns = function () {
		// set items, used if measuring first item
		this.items = this.isotope.filteredItems;

		this.getContainerWidth();

		// if columnWidth is 0, default to outerWidth of first item
		if (!this.columnWidth) {
			const firstItem = this.items[0];
			const firstItemElem = firstItem && firstItem.element;

			// columnWidth fall back to item of first element
			this.columnWidth =
				(firstItemElem && window.getSize(firstItemElem).outerWidth) ||
				// if first elem has no width, default to size of container
				this.containerWidth;
		}

		this.columnWidth += this.gutter;

		// calculate columns
		const containerWidth = this.containerWidth + this.gutter;
		let cols = containerWidth / this.columnWidth;

		// fix rounding errors, typically with gutters
		const excess = this.columnWidth - (containerWidth % this.columnWidth);

		// if overshoot is less than a pixel, round up, otherwise floor it
		const mathMethod = excess && excess < 1 ? 'round' : 'floor';

		cols = Math[mathMethod](cols);
		this.cols = Math.max(cols, 1);
	};

	proto.getContainerWidth = function () {
		// container is parent if fit width
		const isFitWidth = this._getOption
			? this._getOption('fitWidth')
			: false;
		const container = isFitWidth ? this.element.parentNode : this.element;

		// check that this.size and size are there
		// IE8 triggers resize on body size change, so they might not be
		const size = window.getSize(container);
		this.containerWidth = size && size.innerWidth;
	};

	proto._resetLayout = function () {
		this.x = 0;
		this.y = 0;
		this.maxY = 0;
		this.horizontalColIndex = 0;

		this._getMeasurement('columnWidth', 'outerWidth');
		this._getMeasurement('gutter', 'outerWidth');
		this.measureColumns();
	};

	proto._getItemLayoutPosition = function (item) {
		item.getSize();

		// how many columns does this brick span
		const remainder = item.size.outerWidth % this.columnWidth;
		const mathMethod = remainder && remainder < 1 ? 'round' : 'ceil';

		// round if off by 1 pixel, otherwise use ceil
		let colSpan = Math[mathMethod](item.size.outerWidth / this.columnWidth);
		colSpan = Math.min(colSpan, this.cols);

		let col = this.horizontalColIndex % this.cols;
		const isOver = colSpan > 1 && col + colSpan > this.cols;

		// shift to next row if item can't fit on current row
		col = isOver ? 0 : col;

		// don't let zero-size items take up space
		const hasSize = item.size.outerWidth && item.size.outerHeight;
		this.horizontalColIndex = hasSize
			? col + colSpan
			: this.horizontalColIndex;

		const itemWidth = item.size.outerWidth + this.gutter;

		// if this element cannot fit in the current row
		if (this.x !== 0 && this.horizontalColIndex === 1) {
			this.x = 0;
			this.y = this.maxY;
		}

		const position = {
			x: this.x,
			y: this.y,
		};

		this.maxY = Math.max(this.maxY, this.y + item.size.outerHeight);
		this.x += itemWidth;

		return position;
	};

	proto._getContainerSize = function () {
		return { height: this.maxY };
	};
}

// Init Options.
$(document).on('initOptions.vpf', (event, self) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	self.defaults.gridColumns = 3;

	if (!self.options.gridColumns) {
		self.options.gridColumns = self.defaults.gridColumns;
	}
	if (!self.options.gridImagesAspectRatio) {
		self.options.gridImagesAspectRatio =
			self.defaults.gridImagesAspectRatio;
	}
});

// Init Layout.
$(document).on('initLayout.vpf', (event, self) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	if (self.options.layout !== 'grid') {
		return;
	}

	// columns.
	self.addStyle('.vp-portfolio__item-wrap', {
		width: `${100 / self.options.gridColumns}%`,
	});

	// calculate responsive.
	let count = self.options.gridColumns - 1;
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
		}
		count -= 1;
	}
});

// Change Isotope Layout Mode.
$(document).on('beforeInitIsotope.vpf', (event, self, initOptions) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	if (self.options.layout !== 'grid' || typeof initOptions !== 'object') {
		return;
	}

	initOptions.layoutMode = 'vpRows';
});
