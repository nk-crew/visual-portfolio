/*
 * External dependencies.
 */
import isNumber from 'is-number';
import { throttle } from 'throttle-debounce';

/*
 * Visual Portfolio layout Slider.
 */
const $ = window.jQuery;

// Listen for slider width change to calculate dynamic height of images.
const dynamicHeightObserver = new ResizeObserver(
  throttle(100, (entries) => {
    entries.forEach(({ target }) => {
      if (target && target.vpf) {
        const self = target.vpf;

        const calculatedHeight =
          (self.$item.width() * parseFloat(self.options.sliderItemsHeight)) / 100;

        target
          .querySelector('.vp-portfolio__items-wrap')
          .style.setProperty('--vp-layout-slider--auto-items__height', `${calculatedHeight}px`);
      }
    });
  })
);

// Init Layout.
$(document).on('initLayout.vpf', (event, self) => {
  if ('vpf' !== event.namespace) {
    return;
  }

  if ('slider' !== self.options.layout) {
    return;
  }

  ['items', 'thumbnails'].forEach((type) => {
    let itemsHeight =
      'items' === type ? self.options.sliderItemsHeight : self.options.sliderThumbnailsHeight;
    let itemsMinHeight = 'items' === type ? self.options.sliderItemsMinHeight : 0;
    const typeSingle = type.replace(/s$/g, '');

    if ('auto' === itemsHeight) {
      return;
    }

    itemsHeight = isNumber(itemsHeight) ? `${itemsHeight}px` : itemsHeight;

    // prevent minHeight option in preview, when used 'vh' units.
    if (itemsMinHeight && self.isPreview() && /vh/.test(itemsMinHeight)) {
      itemsMinHeight = 0;
    }

    const itemsPerView =
      'items' === type ? self.options.sliderSlidesPerView : self.options.sliderThumbnailsPerView;

    if ('auto' === itemsPerView) {
      // fix fade slider items width.
      // https://github.com/nk-crew/visual-portfolio/issues/95.
      let itemsWidth = 'auto';
      if ('items' === type && 'fade' === self.options.sliderEffect) {
        itemsWidth = '100%';
      }

      // Calculate dynamic height.
      // Previously we tried the pure CSS solution, but there was couple bugs like:
      // - Classic styles items wrong height
      // - FireFox wrong images width render
      if (itemsHeight.indexOf('%') === itemsHeight.length - 1) {
        dynamicHeightObserver.observe(self.$item[0]);

        // Static height.
      } else {
        self.addStyle(`.vp-portfolio__${type}-wrap`, {
          '--vp-layout-slider--auto-items__height': itemsHeight,
        });
      }

      self.addStyle(`.vp-portfolio__${typeSingle}-wrap`, {
        width: 'auto',
      });
      self.addStyle(`.vp-portfolio__${typeSingle} .vp-portfolio__${typeSingle}-img img`, {
        width: itemsWidth,
        height: 'var(--vp-layout-slider--auto-items__height)',
      });

      // min height.
      if (itemsMinHeight) {
        self.addStyle(`.vp-portfolio__${typeSingle} .vp-portfolio__${typeSingle}-img img`, {
          'min-height': itemsMinHeight,
        });
      }
    } else {
      self.addStyle(`.vp-portfolio__${typeSingle}-img-wrap::before`, {
        'margin-top': itemsHeight,
      });
      self.addStyle(`.vp-portfolio__${typeSingle}-img img`, {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      });
      self.addStyle(`.vp-portfolio__${typeSingle}-img`, {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      });
      self.addStyle(`.vp-portfolio__${typeSingle} .vp-portfolio__${typeSingle}-img img`, {
        width: '100%',
        height: '100%',
      });

      // min height.
      if (itemsMinHeight) {
        self.addStyle(`.vp-portfolio__${typeSingle}-img-wrap`, {
          'min-height': itemsMinHeight,
        });
      }
    }
  });

  // thumbnails top gap.
  if (self.options.sliderThumbnailsGap) {
    self.addStyle('.vp-portfolio__thumbnails-wrap', {
      'margin-top': `${self.options.sliderThumbnailsGap}px`,
    });
  }
});
