import $ from 'jquery';

// Extend VP class.
$(document).on('extendClass.vpf', (event, VP) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	/**
	 * Init fjGallery plugin
	 *
	 * @param {mixed} options    - gallery options.
	 * @param {mixed} additional - additional args.
	 */
	VP.prototype.initFjGallery = function (options = false, additional = null) {
		if (this.$items_wrap.fjGallery && this.options.layout === 'justified') {
			const initOptions =
				options !== false
					? options
					: {
							gutter: {
								horizontal:
									parseFloat(this.options.itemsGap) || 0,
								vertical:
									this.options.itemsGapVertical !== ''
										? parseFloat(
												this.options.itemsGapVertical
											) || 0
										: parseFloat(this.options.itemsGap) ||
											0,
							},
							rowHeight:
								parseFloat(this.options.justifiedRowHeight) ||
								200,
							maxRowsCount:
								parseInt(
									this.options.justifiedMaxRowsCount,
									10
								) || 0,
							lastRow: this.options.justifiedLastRow || 'left',
							rowHeightTolerance:
								parseFloat(
									this.options.justifiedRowHeightTolerance
								) || 0,
							calculateItemsHeight: true,
							itemSelector: '.vp-portfolio__item-wrap',
							imageSelector: '.vp-portfolio__item-img img',
							transitionDuration: '0.3s',
						};

			if (initOptions.maxRowsCount === 0) {
				initOptions.maxRowsCount = Number.POSITIVE_INFINITY;
			}

			this.emitEvent('beforeInitFjGallery', [initOptions, additional]);

			this.$items_wrap.fjGallery(initOptions, additional);

			this.emitEvent('initFjGallery', [initOptions, additional]);
		}
	};

	/**
	 * Destroy fjGallery plugin
	 */
	VP.prototype.destroyFjGallery = function () {
		const fjGallery = this.$items_wrap.data('fjGallery');

		if (fjGallery) {
			this.$items_wrap.fjGallery('destroy');

			this.emitEvent('destroyFjGallery');
		}
	};
});

// Add Items.
$(document).on('addItems.vpf', (event, self, $items, removeExisting) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	const fjGallery = self.$items_wrap.data('fjGallery');

	if (!fjGallery) {
		return;
	}

	if (removeExisting) {
		self.destroyFjGallery();
		self.$items_wrap.find('.vp-portfolio__item-wrap').remove();
		self.$items_wrap.prepend($items);
		self.initFjGallery();
	} else {
		self.$items_wrap.append($items);
		self.initFjGallery('appendImages', $items);
	}
});

// Init.
$(document).on('init.vpf', (event, self) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	self.initFjGallery();
});

// Images Loaded.
$(document).on('imagesLoaded.vpf', (event, self) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	// sometimes on iOs images failed to calculate positions, so we need this imagesLoaded event.
	// related issue: https://github.com/nk-crew/visual-portfolio/issues/55
	self.initFjGallery();
});

// Destroy.
$(document).on('destroy.vpf', (event, self) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	self.destroyFjGallery();
});
