/* eslint-disable class-methods-use-this */

/*
 * Popup gallery with global API.
 */
const $ = window.jQuery;

const { VPData } = window;

const { settingsPopupGallery } = VPData;

/*
 * Global Popup Gallery API.
 */
const VPPopupAPI = {
  vendor: false,

  vendors: [
    {
      vendor: 'youtube',
      embedUrl: 'https://www.youtube.com/embed/{{video_id}}?{{params}}',
      pattern:
        /(https?:\/\/)?(www.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\/(?:embed\/|v\/|watch\?v=|watch\?list=(.*)&v=|watch\?(.*[^&]&)v=)?((\w|-){11})(&list=(\w+)&?)?(.*)/,
      patternIndex: 6,
      params: {
        autoplay: 1,
        autohide: 1,
        fs: 1,
        rel: 0,
        hd: 1,
        wmode: 'transparent',
        enablejsapi: 1,
        html5: 1,
      },
      paramsIndex: 10,
    },
    {
      vendor: 'vimeo',
      embedUrl: 'https://player.vimeo.com/video/{{video_id}}?{{params}}',
      // eslint-disable-next-line no-useless-escape
      pattern:
        /https?:\/\/(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)(.*)/,
      patternIndex: 3,
      params: {
        autoplay: 1,
        hd: 1,
        show_title: 1,
        show_byline: 1,
        show_portrait: 0,
        fullscreen: 1,
      },
      paramsIndex: 4,
    },
  ],

  init() {},
  open() {},
  close() {},

  /**
   * Parse query parameters.
   * Thanks to https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
   *
   * @param {string} query - query string.
   *
   * @returns {string}
   */
  getQueryStringParams(query) {
    return query
      ? (/^[?#]/.test(query) ? query.slice(1) : query).split('&').reduce((params, param) => {
          const [key, value] = param.split('=');
          params[key] = value ? decodeURIComponent(value.replace(/\+/g, ' ')) : '';
          return params;
        }, {})
      : {};
  },

  /**
   * Prepare params from parsed URL.
   *
   * @param {object} match - url match data.
   * @param {object} vendorData - vendor data.
   *
   * @returns {string}
   */
  prepareParams(match, vendorData) {
    let result = '';

    // Prepare default params.
    const params = vendorData.params || {};

    // Parse params from URL.
    if (vendorData.paramsIndex && match && match[vendorData.paramsIndex]) {
      const newParams = VPPopupAPI.getQueryStringParams(match[vendorData.paramsIndex]);

      if (newParams && 'object' === typeof newParams) {
        Object.keys(newParams).forEach((key) => {
          if (key && newParams[key]) {
            params[key] = newParams[key];
          }
        });
      }
    }

    if (params && Object.keys(params).length) {
      Object.keys(params).forEach((key) => {
        if (key && params[key]) {
          if (result) {
            result += '&';
          }
          result += `${key}=${params[key]}`;
        }
      });
    }

    return result;
  },

  /**
   * Parse video URL and return object with data
   *
   * @param {string} url - video url.
   * @param {string} url - optional poster url.
   *
   * @returns {object|boolean} video data
   */
  parseVideo(url, poster) {
    let result = false;

    VPPopupAPI.vendors.forEach((vendorData) => {
      if (!result) {
        const match = url.match(vendorData.pattern);
        const videoId =
          match && match[vendorData.patternIndex] ? match[vendorData.patternIndex] : false;

        if (videoId) {
          if (vendorData.embedCallback) {
            result = vendorData.embedCallback(url, match, poster);
          } else {
            let { embedUrl } = vendorData;
            embedUrl = embedUrl.replace(/{{video_id}}/g, videoId);
            embedUrl = embedUrl.replace(/{{video_url}}/g, url);
            embedUrl = embedUrl.replace(/{{video_url_encoded}}/g, encodeURIComponent(url));
            embedUrl = embedUrl.replace(/{{params}}/g, VPPopupAPI.prepareParams(match, vendorData));

            const width = vendorData.width || 1920;
            const height = vendorData.height || 1080;

            result = {
              vendor: vendorData.vendor,
              id: videoId,
              embed: `<iframe width="${width}" height="${height}" src="${embedUrl}" scrolling="no" frameborder="0" allowTransparency="true" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>`,
              embedUrl,
              url,
              width,
              height,
            };
          }
        }
      }
    });

    return (
      result || {
        vendor: 'unknown',
        id: url,
        url,
        embedUrl: url,
        embed: `<iframe width="1920" height="1080" src="${url}" scrolling="no" frameborder="0" allowTransparency="true" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>`,
      }
    );
  },

  /**
   * Parse gallery
   *
   * @param {jQuery} $gallery - gallery element.
   *
   * @returns {array} gallery data
   */
  parseGallery($gallery) {
    const items = [];
    let $meta;
    let size;
    let item;
    let video;
    let videoData;

    // Find all gallery items
    // Skip Swiper slider duplicates.
    // Previously we also used the `:not(.swiper-slide-duplicate-active)`, but it contains a valid first slide.
    $gallery.find('.vp-portfolio__item-wrap:not(.swiper-slide-duplicate)').each(function () {
      $meta = $(this).find('.vp-portfolio__item-popup');

      if ($meta && $meta.length) {
        size = ($meta.attr('data-vp-popup-img-size') || '1920x1080').split('x');
        video = $meta.attr('data-vp-popup-video');
        videoData = false;

        if (video) {
          videoData = VPPopupAPI.parseVideo(video, $meta.attr('data-vp-popup-poster'));
        }

        if (videoData) {
          item = {
            type: 'embed',
            el: this,
            poster: videoData.poster,
            src: videoData.embedUrl,
            embed: videoData.embed,
            width: videoData.width || 1920,
            height: videoData.height || 1080,
          };
        } else {
          // create slide object
          item = {
            type: 'image',
            el: this,
            src: $meta.attr('data-vp-popup-img'),
            srcset: $meta.attr('data-vp-popup-img-srcset'),
            width: parseInt(size[0], 10),
            height: parseInt(size[1], 10),
          };

          const srcSmall = $meta.attr('data-vp-popup-sm-img') || item.src;
          if (srcSmall) {
            const smallSize = (
              $meta.attr('data-vp-popup-sm-img-size') ||
              $meta.attr('data-vp-popup-img-size') ||
              '1920x1080'
            ).split('x');

            item.srcSmall = srcSmall;
            item.srcSmallWidth = parseInt(smallSize[0], 10);
            item.srcSmallHeight = parseInt(smallSize[1], 10);
          }

          const srcMedium = $meta.attr('data-vp-popup-md-img') || item.src;
          if (srcMedium) {
            const mediumSize = (
              $meta.attr('data-vp-popup-md-img-size') ||
              $meta.attr('data-vp-popup-img-size') ||
              '1920x1080'
            ).split('x');

            item.srcMedium = srcMedium;
            item.srcMediumWidth = parseInt(mediumSize[0], 10);
            item.srcMediumHeight = parseInt(mediumSize[1], 10);
          }

          const $captionTitle = $meta.children('.vp-portfolio__item-popup-title').get(0);
          const $captionDescription = $meta
            .children('.vp-portfolio__item-popup-description')
            .get(0);
          if ($captionTitle || $captionDescription) {
            item.caption =
              ($captionTitle ? $captionTitle.outerHTML : '') +
              ($captionDescription ? $captionDescription.outerHTML : '');
          }
        }

        items.push(item);
      }
    });

    return items;
  },

  /**
   * Try to focus gallery item link.
   * Used when popup gallery is closed.
   *
   * @param {object} data - data of the current item
   */
  maybeFocusGalleryItem(data) {
    // Focus native gallery item.
    if (data.linkEl) {
      $(data.linkEl).focus();

      // Focus Visual Portfolio gallery item.
    } else if (data.el) {
      $(data.el).find('.vp-portfolio__item-img > a').focus();
    }
  },
};

window.VPPopupAPI = VPPopupAPI;

// Extend VP class.
$(document).on('extendClass.vpf', (event, VP) => {
  if ('vpf' !== event.namespace) {
    return;
  }

  /**
   * Init popup gallery
   */
  VP.prototype.initPopupGallery = function () {
    const self = this;
    if (!self.options.itemsClickAction || 'url' === self.options.itemsClickAction) {
      return;
    }

    // prevent on preview page
    if (self.isPreview()) {
      return;
    }
    // click action
    // `a.vp-portfolio__item-overlay` added as fallback for old templates, used in themes.
    self.$item.on(
      `click.vpf-uid-${self.uid}`,
      `
        .vp-portfolio__item a.vp-portfolio__item-meta,
        .vp-portfolio__item .vp-portfolio__item-img > a,
        .vp-portfolio__item .vp-portfolio__item-meta-title > a,
        .vp-portfolio__item a.vp-portfolio__item-overlay
      `,
      function (e) {
        if (e.isDefaultPrevented()) {
          return;
        }

        const $this = $(this);
        const $itemWrap = $this.closest('.vp-portfolio__item-wrap');
        let index = 0;

        if (!$itemWrap.find('.vp-portfolio__item-popup').length) {
          return;
        }

        e.preventDefault();

        const items = VPPopupAPI.parseGallery(self.$item);

        // Get gallery item index.
        // Use Swiper data-attribute to support slide duplicates.
        if ($itemWrap.attr('data-swiper-slide-index')) {
          index = parseInt($itemWrap.attr('data-swiper-slide-index'), 10);
        } else {
          index = $itemWrap.index();
          // fixed Wrong popup image if custom URL used
          $this
            .closest('.vp-portfolio__items')
            .find('.vp-portfolio__item-wrap .vp-portfolio__item-popup')
            .each((key, item) => {
              if (
                'undefined' !== typeof $(item.closest('.vp-portfolio__item-wrap'))[0] &&
                $(item.closest('.vp-portfolio__item-wrap'))[0] === $($itemWrap)[0]
              ) {
                index = key;
              }
            });
        }

        VPPopupAPI.open(items, index, self);
      }
    );
  };

  /**
   * Destroy popup gallery
   */
  VP.prototype.destroyPopupGallery = function () {
    const self = this;

    if (!self.options.itemsClickAction || 'url' === self.options.itemsClickAction) {
      return;
    }

    self.$item.off(`click.vpf-uid-${self.uid}`);

    self.emitEvent('destroyPopupGallery');
  };
});

// Init.
$(document).on('init.vpf', (event, self) => {
  if ('vpf' !== event.namespace) {
    return;
  }

  self.initPopupGallery();
});

// Destroy.
$(document).on('destroy.vpf', (event, self) => {
  if ('vpf' !== event.namespace) {
    return;
  }

  self.destroyPopupGallery();
});

// Check if link is image.
function isLinkImage(link) {
  return /(.png|.jpg|.jpeg|.gif|.tiff|.tif|.jfif|.jpe|.svg|.bmp|.webp)$/.test(
    link.href.toLowerCase().split('?')[0].split('#')[0]
  );
}

// Parse image data from link.
function parseImgData(link) {
  const $link = $(link);
  let img = link.childNodes[0];
  let caption = $link.next('figcaption');

  // <noscript> tag used in plugins, that adds lazy loading
  if ('NOSCRIPT' === img.nodeName && link.childNodes[1]) {
    // eslint-disable-next-line prefer-destructuring
    img = link.childNodes[1];
  }

  if (!caption.length && $link.parent('.gallery-icon').length) {
    caption = $link.parent('.gallery-icon').next('figcaption');
  }

  caption = caption.html();

  if (caption) {
    caption = `<div class="vp-portfolio__item-popup-description">${caption}</div>`;
  }

  return {
    type: 'image',
    el: img,
    linkEl: link,
    src: link.href,
    caption,
  };
}

/* Popup for default WordPress images */
if (settingsPopupGallery.enable_on_wordpress_images) {
  $(document).on(
    'click',
    `
      .wp-block-image > a,
      .wp-block-image > figure > a,
      .wp-block-gallery .blocks-gallery-item > figure > a,
      .wp-block-gallery .wp-block-image > a,
      .wp-block-media-text > figure > a,
      .gallery .gallery-icon > a,
      figure.wp-caption > a,
      figure.tiled-gallery__item > a,
      p > a
    `,
    function (e) {
      if (e.isDefaultPrevented()) {
        return;
      }

      if (!this.childNodes.length) {
        return;
      }

      let imageNode = this.childNodes[0];

      // <noscript> tag used in plugins, that adds lazy loading
      if ('NOSCRIPT' === imageNode.nodeName && this.childNodes[1]) {
        // eslint-disable-next-line prefer-destructuring
        imageNode = this.childNodes[1];
      }

      // check if child node is <img> or <picture> tag.
      // <picture> tag used in plugins, that adds WebP support
      if ('IMG' !== imageNode.nodeName && 'PICTURE' !== imageNode.nodeName) {
        return;
      }

      // check if link is image.
      if (!isLinkImage(this)) {
        return;
      }

      e.preventDefault();

      const $this = $(this);
      const items = [];
      const currentImage = parseImgData(this);
      const $gallery = $this.closest('.wp-block-gallery, .gallery, .tiled-gallery__gallery');
      let activeIndex = 0;

      // Block gallery, WordPress default gallery, Jetpack gallery.
      if ($gallery.length) {
        const $galleryItems = $gallery.find(
          '.blocks-gallery-item > figure > a, .wp-block-image > a, .gallery-icon > a, figure.tiled-gallery__item > a'
        );
        let i = 0;

        $galleryItems.each(function () {
          // check if link is image.
          if (isLinkImage(this)) {
            if (this === currentImage.linkEl) {
              activeIndex = i;
            }

            items.push(parseImgData(this));

            i += 1;
          }
        });

        // WordPress gallery.
      } else {
        items.push(currentImage);
      }

      VPPopupAPI.open(items, activeIndex);
    }
  );
}
