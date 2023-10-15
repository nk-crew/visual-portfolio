import $ from 'jquery';

const { SimpleBar, navigator } = window;
const $doc = $(document);

// Don't run on Mac and mobile devices.
const allowScrollbar =
	!/Mac|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
		navigator.userAgent
	);

if (allowScrollbar && typeof SimpleBar !== 'undefined') {
	// Extend VP class.
	$doc.on('extendClass.vpf', (event, VP) => {
		if (event.namespace !== 'vpf') {
			return;
		}

		/**
		 * Init Simplebar plugin
		 */
		VP.prototype.initCustomScrollbar = function () {
			const self = this;

			self.emitEvent('beforeInitCustomScrollbar');

			self.$items_wrap
				.find('.vp-portfolio__custom-scrollbar')
				.each(function () {
					const instance = SimpleBar.instances.get(this);

					if (!instance) {
						new SimpleBar(this);
					}
				});

			self.emitEvent('initCustomScrollbar');
		};

		/**
		 * Destroy Simplebar plugin
		 */
		VP.prototype.destroyCustomScrollbar = function () {
			const self = this;

			self.$items_wrap
				.find('[data-simplebar="init"].vp-portfolio__custom-scrollbar')
				.each(function () {
					const instance = SimpleBar.instances.get(this);

					if (instance) {
						instance.unMount();
					}
				});

			self.emitEvent('destroyCustomScrollbar');
		};
	});

	// Add Items.
	$doc.on('addItems.vpf', (event, self, $items, removeExisting) => {
		if (event.namespace !== 'vpf') {
			return;
		}

		if (removeExisting) {
			self.destroyCustomScrollbar();
		}

		self.initCustomScrollbar();
	});

	// Init.
	$doc.on('init.vpf', (event, self) => {
		if (event.namespace !== 'vpf') {
			return;
		}

		self.initCustomScrollbar();
	});

	// Destroy.
	$doc.on('destroy.vpf', (event, self) => {
		if (event.namespace !== 'vpf') {
			return;
		}

		self.destroyCustomScrollbar();
	});

	// Init Swiper duplicated slides scrollbars.
	$doc.on('initSwiper.vpf', (event, self) => {
		if (event.namespace !== 'vpf') {
			return;
		}

		if (self.options.sliderLoop === 'true') {
			self.initCustomScrollbar();
		}
	});

	// Fix Simplebar content size in some themes.
	// For example, in Astra theme in content with enabled sidebar, Simplebar calculate wrong height automatically.
	$(() => {
		$('[data-simplebar="init"].vp-portfolio__custom-scrollbar').each(
			function () {
				const instance = SimpleBar.instances.get(this);

				if (instance) {
					instance.recalculate();
				}
			}
		);
	});
}
