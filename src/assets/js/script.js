/*!
 * Name    : Visual Portfolio
 * Version : 1.1.2
 * Author  : nK https://nkdev.info
 */
(function ($) {
    "use strict";

    /**
     * Get window size
     */
    var $wnd = $(window);
    var wndW = 0;
    var wndH = 0;
    function getWndSize () {
        wndW = $wnd.width();
        wndH = $wnd.height();
    }
    getWndSize();
    $wnd.on('resize load orientationchange', getWndSize);

    // enable object-fit
    if (typeof objectFitImages !== 'undefined') {
        objectFitImages();
    }

    /**
     * Main VP class
     */
    var VP = (function () {
        function VP_inner ($item, userOptions) {
            var self = this;

            self.$item = $item;
            self.$items_wrap = $item.find('.vp-portfolio__items');
            self.$pagination = $item.find('.vp-portfolio__pagination-wrap');
            self.$filter = $item.find('.vp-portfolio__filter-wrap');

            // get id from class
            var classes = $item[0].className.split(/\s+/);
            for (var k = 0; k < classes.length; k++) {
                if (classes[k] && /^vp-uid-/.test(classes[k])) {
                    self.uid = classes[k].replace(/^vp-uid-/, '');
                    break;
                }
            }
            if (!self.uid) {
                console.error('Couldn\'t retrieve Visual Portfolio ID.');
                return;
            }

            // user options
            self.userOptions = userOptions;

            self.firstRun = true;

            self.init();
        }

        return VP_inner;
    }());

    // emit event
    // Example:
    // $(document).on('init.vp', function (event, infiniteObject) {
    //     console.log(infiniteObject);
    // });
    VP.prototype.emitEvent = function emitEvent (event, data) {
        data = data ? [this].concat(data) : [this];
        this.$item.trigger(event + '.vp.vp-uid-' + this.uid, data);
    };

    /**
     * Init
     */
    VP.prototype.init = function init () {
        var self = this;

        // destroy if already inited
        if (!self.firstRun) {
            self.destroy();
        }

        self.destroyed = false;

        // init options
        self.initOptions();

        // init events
        self.initEvents();

        // init layout
        self.initLayout();

        // init custom colors
        self.initCustomColors();

        // init photoswipe
        self.initPhotoswipe();

        // images loaded
        self.$items_wrap.imagesLoaded(function() {
            self.$item.addClass('vp-portfolio__ready');

            // isotope
            self.initIsotope();

            // justified gallery
            self.initJustifiedGallery();

            self.emitEvent('imagesLoaded');
        });

        self.emitEvent('init');

        self.firstRun = false;
    };

    /**
     * Destroy
     */
    VP.prototype.destroy = function destroy () {
        var self = this;

        // remove loaded class
        self.$item.removeClass('vp-portfolio__ready');

        // destroy events
        self.destroyEvents();

        // remove all generated styles
        self.removeStyle();
        self.renderStyle();

        // destroy photoswipe
        self.destroyPhotoswipe();

        // destroy isotope
        self.destroyIsotope();

        // destroy justified gallery
        self.destroyJustifiedGallery();

        self.emitEvent('destroy');

        self.destroyed = true;
    };


    var stylesList = {};
    /**
     * Add style to the current portfolio list
     *
     * @param selector css selector
     * @param styles object with styles
     * @param media string with media query
     */
    VP.prototype.addStyle = function addStyle (selector, styles, media) {
        media = media || '';

        var self = this;
        var uid = self.uid;

        if (typeof stylesList[uid] === 'undefined') {
            stylesList[uid] = {};
        }
        if (typeof stylesList[uid][media] === 'undefined') {
            stylesList[uid][media] = {};
        }
        if (typeof stylesList[uid][media][selector] === 'undefined') {
            stylesList[uid][media][selector] = {};
        }

        stylesList[uid][media][selector] = $.extend(stylesList[uid][media][selector], styles);

        self.emitEvent('addStyle', [selector, styles, media, stylesList]);
    };

    /**
     * Remove style from the current portfolio list
     *
     * @param selector css selector (if not set - removed all styles)
     * @param styles object with styles
     * @param media string with media query
     */
    VP.prototype.removeStyle = function removeStyle (selector, styles, media) {
        media = media || '';

        var self = this;
        var uid = self.uid;

        if (typeof stylesList[uid] !== 'undefined' && !selector) {
            stylesList[uid] = {};
        }

        if (typeof stylesList[uid] !== 'undefined' && typeof stylesList[uid][media] !== 'undefined' && typeof stylesList[uid][media][selector] !== 'undefined' && selector) {
            delete stylesList[uid][media][selector];
        }

        self.emitEvent('removeStyle', [selector, styles, stylesList]);
    };

    /**
     * Render style for the current portfolio list
     */
    VP.prototype.renderStyle = function renderStyle () {
        var self = this;

        // timeout for the case, when styles added one by one
        var uid = self.uid;
        var stylesString = '';

        // create string with styles
        if (typeof stylesList[uid] !== 'undefined') {
            // current uid styles
            for (var m in stylesList[uid]) {
                // media
                if (m) {
                    stylesString += '@media ' + m + ' {';
                }
                for (var s in stylesList[uid][m]) {
                    // selector
                    stylesString += '.vp-uid-' + uid + ' ' + s + ' {';
                    for (var p in stylesList[uid][m][s]) {
                        // property and value
                        stylesString += p + ':' + stylesList[uid][m][s][p] + ';';
                    }
                    stylesString += '}';
                }
                // media
                if (m) {
                    stylesString += '}';
                }
            }
        }

        // add in style tag
        var $style = $('#vp-style-' + uid);
        if (!$style.length) {
            $style = $('<style>').attr('id', 'vp-style-' + uid).appendTo('head');
        }
        $style.html(stylesString);

        self.emitEvent('renderStyle', [stylesString, stylesList, $style]);
    };

    /**
     * First char to lower case
     *
     * @param str
     * @returns {string}
     */
    VP.prototype.firstToLowerCase = function firstToLowerCase(str) {
        return str.substr(0, 1).toLowerCase() + str.substr(1);
    };

    /**
     * Init options
     */
    VP.prototype.initOptions = function initOptions (userOptions) {
        var self = this;

        // default options
        self.defaults = {
            layout: 'tile',
            itemsGap: 0,
            tilesType: '3|1,1|',
            masonryColumns: 3,
            pagination: 'load-more'
        };

        // new user options
        if (userOptions) {
            self.userOptions = userOptions;
        }

        // prepare data options
        var dataOptions = self.$item[0].dataset;
        var pureDataOptions = {};
        for (var k in dataOptions) {
            if (k && k.substring(0, 2) === 'vp') {
                pureDataOptions[self.firstToLowerCase(k.substring(2))] = dataOptions[k];
            }
        }

        self.options = $.extend({}, self.defaults, pureDataOptions, self.userOptions);

        self.emitEvent('initOptions');
    };

    /**
     * Check if lines cross
     *
     * @param {object} a - first point of the first line
     * @param {object} b - second point of the first line
     * @param {object} c - first point of the second line
     * @param {object} d - second point of the second line
     * @returns {boolean}
     */
    var isCrossLine = function (a, b, c, d) {
        // Working code #1:
        //
        // var common = (b.x - a.x)*(d.y - c.y) - (b.y - a.y)*(d.x - c.x);
        // if (common === 0) {
        //     return false;
        // }
        //
        // var rH = (a.y - c.y)*(d.x - c.x) - (a.x - c.x)*(d.y - c.y);
        // var sH = (a.y - c.y)*(b.x - a.x) - (a.x - c.x)*(b.y - a.y);
        //
        // var r = rH / common;
        // var s = sH / common;
        //
        // return r >= 0 && r <= 1 && s >= 0 && s <= 1;

        // Working code #2:
        var v1=(d.x-c.x)*(a.y-c.y)-(d.y-c.y)*(a.x-c.x);
        var v2=(d.x-c.x)*(b.y-c.y)-(d.y-c.y)*(b.x-c.x);
        var v3=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
        var v4=(b.x-a.x)*(d.y-a.y)-(b.y-a.y)*(d.x-a.x);
        return ((v1*v2<=0) && (v3*v4<=0));
    };

    /**
     * Init events
     */
    VP.prototype.initEvents = function initEvents () {
        var self = this;
        var evp = '.vp.vp-uid-' + self.uid;

        // Stretch
        function stretch () {
            var rect = self.$item[0].getBoundingClientRect();
            var left = rect.left;
            var right = wndW - rect.right;

            var ml = parseFloat(self.$item.css('margin-left') || 0);
            var mr = parseFloat(self.$item.css('margin-right') || 0);
            self.$item.css({
                'margin-left': ml - left,
                'margin-right': mr - right
            });
        }
        if ( self.$item.hasClass('vp-portfolio__stretch') ) {
            $wnd.on('load' + evp + ' resize' + evp + ' orientationchange' + evp, function() {
                stretch();
            });
            stretch();
        }

        // Fly style
        if ( 'fly' === self.options.itemsStyle ) {

            // determine cursor position
            var lastCursorPos = {};
            $wnd.on('mousemove' + evp, function (e) {
                lastCursorPos = {
                    x : e.clientX,
                    y : e.clientY
                };
            });

            self.$item.on('mouseenter'  + evp + ' mouseleave' + evp, '.vp-portfolio__item', function (e) {
                var $this = $(this);
                var itemRect = $this[0].getBoundingClientRect();
                var $overlay = $this.find('.vp-portfolio__item-overlay');
                var enter = e.type === 'mouseenter';
                var endX = '0%';
                var endY = '0%';
                var curCursorPos = {
                    x: e.clientX,
                    y: e.clientY
                };

                // find the corner that placed on cursor path.
                var isUp = isCrossLine(
                    { x: itemRect.left, y: itemRect.top },
                    { x: itemRect.left + itemRect.width, y: itemRect.top },
                    curCursorPos, lastCursorPos);
                var isDown = isCrossLine(
                    { x: itemRect.left, y: itemRect.top + itemRect.height },
                    { x: itemRect.left + itemRect.width, y: itemRect.top + itemRect.height },
                    curCursorPos, lastCursorPos);
                var isLeft = isCrossLine(
                    { x: itemRect.left, y: itemRect.top },
                    { x: itemRect.left, y: itemRect.top + itemRect.height },
                    curCursorPos, lastCursorPos);
                var isRight = isCrossLine(
                    { x: itemRect.left + itemRect.width, y: itemRect.top },
                    { x: itemRect.left + itemRect.width, y: itemRect.top + itemRect.height },
                    curCursorPos, lastCursorPos);

                // Sometimes isCrossLine returned false, so we need to check direction manually (less accurate, but it is not a big problem).
                if (!isUp && !isDown && !isLeft && !isRight) {
                    var x = (itemRect.width / 2 - curCursorPos.x + itemRect.left) / (itemRect.width / 2);
                    var y = (itemRect.height / 2 - curCursorPos.y + itemRect.top) / (itemRect.height / 2);
                    if (Math.abs(x) > Math.abs(y)) {
                        if (x > 0) {
                            isLeft = true;
                        } else {
                            isRight = true;
                        }
                    } else {
                        if (y > 0) {
                            isUp = true;
                        } else {
                            isDown = true;
                        }
                    }
                }

                if (isUp) {
                    endY = '-10' + endY;
                } else if (isDown) {
                    endY = '10' + endY;
                } else if (isLeft) {
                    endX = '-10' + endX;
                } else if (isRight) {
                    endX = '10' + endX;
                }

                if (enter) {
                    $overlay.css({
                        transition: 'none',
                        transform: 'translateX(' + endX + ') translateY(' + endY + ') translateZ(0)'
                    });
                }

                setTimeout(function () {
                    $overlay.css({
                        transition: '.2s transform ease-in-out',
                        transform: 'translateX(' + (enter ? '0%' : endX) + ') translateY(' + (enter ? '0%' : endY) + ') translateZ(0)'
                    });
                });
            });
        }

        // on filter click
        self.$item.on('click' + evp, '.vp-filter .vp-filter__item a', function (e) {
            e.preventDefault();
            if ( ! self.loading ) {
                $(this).closest('.vp-filter__item').addClass('vp-filter__item-active').siblings().removeClass('vp-filter__item-active');
            }
            self.loadNewItems(this.href, true);
        });

        // on pagination click
        self.$item.on('click' + evp, '.vp-pagination .vp-pagination__item a', function (e) {
            e.preventDefault();
            if ( $(this).hasClass('vp-pagination__no-more') && self.options.pagination !== 'paged') {
                return;
            }
            self.loadNewItems(this.href, self.options.pagination === 'paged');
        });

        // on categories of item click
        self.$item.on('click' + evp, '.vp-portfolio__items .vp-portfolio__item-meta-category a', function (e) {
            e.preventDefault();
            e.stopPropagation();
            self.loadNewItems(this.href, true);
        });

        // infinite loading
        var scrollTimeout;
        var bottomPosToLoad = 250;
        function checkVisibilityAndLoad () {
            var rect = self.$item[0].getBoundingClientRect();

            if (rect.bottom > 0 && (rect.bottom - bottomPosToLoad) <= wndH) {
                self.loadNewItems(self.options.nextPageUrl, false, function () {
                    checkVisibilityAndLoad();
                });
            }
        }
        if (self.options.pagination === 'infinite') {
            $wnd.on('load' + evp + ' scroll' + evp + ' resize' + evp + ' orientationchange' + evp, function() {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(function() {
                    checkVisibilityAndLoad();
                }, 60);
            });
            checkVisibilityAndLoad();
        }

        self.emitEvent('initEvents');
    };

    /**
     * Destroy events
     */
    VP.prototype.destroyEvents = function destroyEvents () {
        var self = this;
        var evp = '.vp.vp-uid-' + self.uid;

        // destroy click events
        self.$item.off(evp);

        // destroy infinite load events
        $wnd.off(evp);

        self.emitEvent('destroyEvents');
    };

    /**
     * Get Layout Settings
     *
     * @returns string
     */
    VP.prototype.getTilesSettings = function getTilesSettings() {
        var self = this;

        var layoutArr = self.options.tilesType.split(/[:|]/);

        // remove last empty item
        if (typeof layoutArr[layoutArr.length-1] !== 'undefined' && !layoutArr[layoutArr.length-1]) {
            layoutArr.pop();
        }

        return layoutArr;
    };

    /**
     * Init layout
     */
    VP.prototype.initLayout = function initLayout () {
        var self = this;

        var screenSizes = [576, 768, 992, 1200];

        // prepare layout
        if (self.options.layout) {
            switch (self.options.layout) {
                case 'tiles':
                    var settings = self.getTilesSettings();

                    // get columns number
                    var columns = parseInt(settings[0], 10);
                    settings.shift();

                    columns = columns || 1;

                    // set columns
                    self.addStyle('.vp-portfolio__item-wrap', {
                        'width': (100 / columns) + '%'
                    });

                    // set items sizes
                    if (settings && settings.length) {
                        for (var k = 0; k < settings.length; k++) {
                            var size = settings[k].split(',');
                            var w = parseFloat(size[0]) || 1;
                            var h = parseFloat(size[1]) || 1;

                            var itemSelector = '.vp-portfolio__item-wrap';
                            if (settings.length > 1) {
                                itemSelector += ':nth-of-type(' + settings.length + 'n+' + (k + 1) + ')';
                            }

                            if (w && w !== 1) {
                                self.addStyle(itemSelector, {
                                    'width': (w * 100 / columns) + '%'
                                });
                            }
                            self.addStyle(itemSelector + ' .vp-portfolio__item-img-wrap:before', {
                                'margin-top': (h * 100) + '%'
                            });
                        }
                    }

                    // responsive
                    for (var count = columns; count > 0; count--) {
                        if (typeof screenSizes[count - 1] !== 'undefined') {
                            self.addStyle('.vp-portfolio__item-wrap', {
                                'width': (100 / count) + '%'
                            }, 'screen and (max-width: ' + screenSizes[count - 1] + 'px)');
                            self.addStyle('.vp-portfolio__item-wrap:nth-of-type(n)', {
                                'width': (100 / count) + '%'
                            }, 'screen and (max-width: ' + screenSizes[count - 1] + 'px)');
                        }
                    }
                    break;
                case 'masonry':
                    self.addStyle('.vp-portfolio__item-wrap', {
                        'width': (100 / self.options.masonryColumns) + '%'
                    });

                    // responsive
                    for (var count = self.options.masonryColumns; count > 0; count--) {
                        if (typeof screenSizes[count - 1] !== 'undefined') {
                            self.addStyle('.vp-portfolio__item-wrap', {
                                'width': (100 / count) + '%'
                            }, 'screen and (max-width: ' + screenSizes[count - 1] + 'px)');
                        }
                    }
                case 'justified':
                    break;
            }
        }

        // add gaps
        var gap = parseInt(self.options.itemsGap, 10);
        if (gap && ('tiles' === self.options.layout || 'masonry' === self.options.layout)) {
            self.addStyle('.vp-portfolio__items', {
                'margin-left': '-' + gap + 'px',
                'margin-top': '-' + gap + 'px'
            });

            var gapStyle = gap + 'px';

            self.addStyle('.vp-portfolio__item-wrap .vp-portfolio__item', {
                'margin-left': gapStyle,
                'margin-top': gapStyle
            });

            // tiles
            if ('tiles' === self.options.layout) {
                self.addStyle('.vp-portfolio__item-wrap .vp-portfolio__item-img-wrap', {
                    'margin-left': '-' + gapStyle,
                    'margin-top': '-' + gapStyle
                });
                self.addStyle('.vp-portfolio__item-wrap .vp-portfolio__item-img', {
                    'left': gapStyle,
                    'top': gapStyle
                });
            }
        }

        self.renderStyle();

        self.emitEvent('initLayout');
    };

    /**
     * Init custom color by data attributes:
     * data-vp-bg-color
     * data-vp-text-color
     */
    VP.prototype.initCustomColors = function initCustomColors () {
        var self = this;

        self.$item.find('[data-vp-bg-color]').each(function () {
            var val = $(this).attr('data-vp-bg-color');
            self.addStyle('[data-vp-bg-color="' + val + '"]', {
                'background-color': val + ' !important'
            });
        });

        self.$item.find('[data-vp-text-color]').each(function () {
            var val = $(this).attr('data-vp-text-color');
            self.addStyle('[data-vp-text-color="' + val + '"]', {
                'color': val + ' !important'
            });
        });

        self.renderStyle();

        self.emitEvent('initCustomColors');
    };

    /**
     * Init Isotope
     *
     * TODO: Check for MixItUp plugin
     */
    VP.prototype.initIsotope = function initIsotope (options) {
        var self = this;

        if (self.options.layout === 'tiles' || self.options.layout === 'masonry') {
            self.$items_wrap.isotope(options || {
                itemSelector: '.vp-portfolio__item-wrap',
                layoutMode: 'masonry',
                // masonry: {
                //     horizontalOrder: true
                // },
                transitionDuration: '0.3s',
                percentPosition: true
            });

            self.emitEvent('initIsotope', [options]);
        }
    };

    /**
     * Destroy Isotope
     */
    VP.prototype.destroyIsotope = function destroyIsotope () {
        var self = this;
        var isotope = self.$items_wrap.data('isotope');

        if (isotope) {
            self.$items_wrap.isotope('destroy');

            self.emitEvent('destroyIsotope');
        }
    };

    /**
     * Init Justified Gallery plugin
     */
    VP.prototype.initJustifiedGallery = function initJustifiedGallery () {
        var self = this;

        if (self.options.layout === 'justified') {
            self.$items_wrap.justifiedGallery({
                lastRow: 'justify',
                margins: self.options.itemsGap || 0,
                border: 0,
                selector: '.vp-portfolio__item-wrap',
                waitThumbnailsLoad: false
            });

            self.emitEvent('initJustifiedGallery');
        }
    };

    /**
     * Destroy Justified Gallery plugin
     *
     * TODO: when this issue will be fixed (https://github.com/miromannino/Justified-Gallery/issues/228), need to use default destroy method
     */
    VP.prototype.destroyJustifiedGallery = function destroyJustifiedGallery () {
        var self = this;
        var jg = self.$items_wrap.data('jg.controller');

        if (jg) {
            // jg.destroy();

            clearInterval(jg.checkWidthIntervalId);
            $.each(jg.entries, function(_, entry) {
                var $entry = $(entry);

                // Reset entry style
                $entry.css('width', '');
                $entry.css('height', '');
                $entry.css('top', '');
                $entry.css('left', '');
                $entry.data('jg.loaded', undefined);
                $entry.removeClass('jg-entry');

                // Reset image style
                var $img = $entry.find('.vp-portfolio__item-img img');
                if ($img.length) {
                    $img.css('width', '');
                    $img.css('height', '');
                    $img.css('margin-left', '');
                    $img.css('margin-top', '');
                    $img.attr('src', $img.data('jg.originalSrc'));
                    $img.data('jg.originalSrc', undefined);
                }

                // Remove caption
                jg.removeCaptionEventsHandlers($entry);
                var $caption = jg.captionFromEntry($entry);
                if ($entry.data('jg.createdCaption')) {
                    // remove also the caption element (if created by jg)
                    $entry.data('jg.createdCaption', undefined);
                    if ($caption !== null) $caption.remove();
                } else {
                    if ($caption !== null) $caption.fadeTo(0, 1);
                }

            });

            jg.$gallery.css('height', '');
            jg.$gallery.removeClass('justified-gallery');
            jg.$gallery.data('jg.controller', undefined);

            self.emitEvent('destroyJustifiedGallery');
        }
    };

    /**
     * Init Photoswipe plugin
     */
    VP.prototype.initPhotoswipe = function initPhotoswipe () {
        var self = this;

        if(typeof PhotoSwipe === 'undefined' || ! self.options.itemsClickAction || self.options.itemsClickAction !== 'popup_gallery') {
            return;
        }

        // prevent on preview page
        if ( self.$item.closest('#vp_preview').length ) {
            return;
        }

        // prepare photoswipe markup
        var markup = '<div class="pswp vp-pswp vp-pswp-uid-' + self.uid + '" tabindex="-1" role="dialog" aria-hidden="true">\n          <div class="pswp__bg"></div>\n          <div class="pswp__scroll-wrap">\n            <div class="pswp__container">\n              <div class="pswp__item"></div>\n              <div class="pswp__item"></div>\n              <div class="pswp__item"></div>\n            </div>\n            <div class="pswp__ui pswp__ui--hidden">\n              <div class="pswp__top-bar">\n                <div class="pswp__counter"></div>\n                <a class="pswp__button pswp__button--close" title="Close (Esc)"></a>\n                <a class="pswp__button pswp__button--fs" title="Toggle fullscreen"></a>\n                <a class="pswp__button pswp__button--zoom" title="Zoom in/out"></a>\n                <div class="pswp__preloader">\n                  <div class="pswp__preloader__icn">\n                    <div class="pswp__preloader__cut">\n                      <div class="pswp__preloader__donut"></div>\n                    </div>\n                  </div>\n                </div>\n              </div>\n              <div class="pswp__loading-indicator"><div class="pswp__loading-indicator__line"></div></div>\n              <a class="pswp__button pswp__button--arrow--left" title="Previous (arrow left)"></a>\n              <a class="pswp__button pswp__button--arrow--right" title="Next (arrow right)"></a>\n              <div class="pswp__caption">\n                <div class="pswp__caption__center">\n                </div>\n              </div>\n            </div>\n          </div>\n        </div>';
        $('body').append(markup);

        // init code
        var parseThumbnailElements = function (el) {
            var thumbElements = $(el).find('.vp-portfolio__item-wrap'),
                items = [],
                $meta,
                size,
                item;

            thumbElements.each(function () {
                $meta = $(this).find('.vp-portfolio__item-popup');
                size = ($meta.attr('data-vp-popup-img-size') || '1920x1080').split('x');

                // create slide object
                item = {
                    src: $meta.attr('data-vp-popup-img'),
                    w: parseInt(size[0], 10),
                    h: parseInt(size[1], 10)
                };

                var $caption = $meta.html();
                if ($caption) {
                    item.title = $caption;
                }

                // save link to element for getThumbBoundsFn
                item.el = this;

                var mediumSrc = $meta.attr('data-vp-popup-md-img') || item.src;
                if(mediumSrc) {
                    size = ($meta.attr('data-vp-popup-md-img-size') || $meta.attr('data-vp-popup-img-size') || '1920x1080').split('x');
                    // "medium-sized" image
                    item.m = {
                        src: mediumSrc,
                        w: parseInt(size[0], 10),
                        h: parseInt(size[1], 10)
                    };
                }

                // original image
                item.o = {
                    src: item.src,
                    w: item.w,
                    h: item.h
                };
                items.push(item);
            });

            return items;
        };

        var openPhotoSwipe = function (index, galleryElement, disableAnimation, fromURL) {
            var pswpElement = $('.vp-pswp')[0],
                gallery,
                options,
                items;

            items = parseThumbnailElements(galleryElement);

            // define options (if needed)
            options = {
                captionAndToolbarShowEmptyCaptions: false,
                captionEl: true,
                fullscreenEl: true,
                shareEl: false,
                bgOpacity: 1,
                tapToClose: true,
                tapToToggleControls: false,
                showHideOpacity: true,
                galleryUID: self.uid
            };

            if(fromURL) {
                if(options.galleryPIDs) {
                    // parse real index when custom PIDs are used
                    // http://photoswipe.com/documentation/faq.html#custom-pid-in-url
                    for(var j = 0; j < items.length; j++) {
                        if(items[j].pid === index) {
                            options.index = j;
                            break;
                        }
                    }
                } else {
                    options.index = parseInt(index, 10) - 1;
                }
            } else {
                options.index = parseInt(index, 10);
            }

            // exit if index not found
            if(isNaN(options.index)) {
                return;
            }

            if(disableAnimation) {
                options.showAnimationDuration = 0;
            }

            // Pass data to PhotoSwipe and initialize it
            gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);

            // see: http://photoswipe.com/documentation/responsive-images.html
            var realViewportWidth,
                useLargeImages = false,
                firstResize = true,
                imageSrcWillChange;

            gallery.listen('beforeResize', function () {
                var dpiRatio = window.devicePixelRatio ? window.devicePixelRatio : 1;
                dpiRatio = Math.min(dpiRatio, 2.5);
                realViewportWidth = gallery.viewportSize.x * dpiRatio;

                if(realViewportWidth >= 1200 || !gallery.likelyTouchDevice && realViewportWidth > 800 || screen.width > 1200 ) {
                    if(!useLargeImages) {
                        useLargeImages = true;
                        imageSrcWillChange = true;
                    }
                } else {
                    if(useLargeImages) {
                        useLargeImages = false;
                        imageSrcWillChange = true;
                    }
                }

                if(imageSrcWillChange && !firstResize) {
                    gallery.invalidateCurrItems();
                }

                if(firstResize) {
                    firstResize = false;
                }

                imageSrcWillChange = false;
            });

            gallery.listen('gettingData', function (idx, item) {
                if( useLargeImages ) {
                    item.src = item.o.src;
                    item.w = item.o.w;
                    item.h = item.o.h;
                } else {
                    item.src = item.m.src;
                    item.w = item.m.w;
                    item.h = item.m.h;
                }
            });

            gallery.init();
        };

        var photoswipeParseHash = function () {
            var hash = window.location.hash.substring(1),
                params = {};

            if(hash.length < 5) { // pid=1
                return params;
            }

            var vars = hash.split('&');
            for (var i = 0; i < vars.length; i++) {
                if(!vars[i]) {
                    continue;
                }
                var pair = vars[i].split('=');
                if(pair.length < 2) {
                    continue;
                }
                params[pair[0]] = pair[1];
            }

            return params;
        };

        // click action
        self.$item.on('click.vp.vp-uid-' + self.uid, '.vp-portfolio__item', function (e) {
            e.preventDefault();

            var index = 0;
            var clicked = this;
            self.$item.find('.vp-portfolio__item').each(function (idx) {
                if (this === clicked) {
                    index = idx;
                    return false;
                }
                return true;
            });
            openPhotoSwipe(index, self.$item[0]);
        });

        // Parse URL and open gallery if it contains #&pid=3&gid=1
        var hashData = photoswipeParseHash();
        if(hashData.pid && hashData.gid === self.uid) {
            openPhotoSwipe(hashData.pid, self.$item[0], true, true);
        }
    };

    /**
     * Destroy Photoswipe plugin
     */
    VP.prototype.destroyPhotoswipe = function destroyPhotoswipe () {
        var self = this;

        self.$item.off('click.vp.vp-uid-' + self.uid);

        $('.vp-pswp-uid-' + self.uid).remove();
    };

    /**
     * Add New Items
     */
    VP.prototype.addItems = function addItems ($items, removeExisting) {
        var self = this;
        var isotope = self.$items_wrap.data('isotope');

        if (isotope) {
            if (removeExisting) {
                var $existing = self.$items_wrap.find('.vp-portfolio__item-wrap');
                self.$items_wrap.isotope('remove', $existing);
            }

            self.$items_wrap.isotope('insert', $items);
            self.initIsotope('layout');

            // images loaded init
            self.$items_wrap.imagesLoaded(function() {
                self.initIsotope('layout');
            });
        }

        self.emitEvent('addItems', [$items, removeExisting]);
    };

    /**
     * Remove Items
     */
    VP.prototype.removeItems = function removeItems ($items) {
        var self = this;
        var isotope = self.$items_wrap.data('isotope');

        if (isotope) {
            self.$items_wrap.isotope('remove', $items);
        }

        self.emitEvent('removeItems', [$items]);
    };

    /**
     * AJAX Load New Items
     */
    VP.prototype.loadNewItems = function loadNewItems (url, removeExisting, cb) {
        var self = this;

        if(self.loading || ! url) {
            return;
        }
        self.loading = true;

        self.$item.addClass('vp-portfolio__loading');

        self.emitEvent('startLoadingNewItems', [url]);

        // load to invisible container, then append to posts container
        $.get(url, {}, function(data) {
            data = data.replace('<body', '<body><div id="vp-infinite-load-body"').replace('</body>','</div></body>');
            var $body = $(data).filter('#vp-infinite-load-body');

            // find current block on new page
            var $new_vp = $body.find('.vp-portfolio.vp-uid-' + self.uid);

            // insert new items
            if ($new_vp.length) {
                var newItems = $new_vp.find('.vp-portfolio__items').html();

                // update filter
                if (self.$filter.length) {
                    self.$filter.html($new_vp.find('.vp-portfolio__filter-wrap').html());
                }

                // update pagination
                if (self.$pagination.length) {
                    self.$pagination.html($new_vp.find('.vp-portfolio__pagination-wrap').html());
                }

                self.addItems($(newItems), removeExisting);

                self.emitEvent('loadedNewItems', [$new_vp, $new_vp, data]);
            }

            // update next page data
            var nextPageUrl = $new_vp.attr('data-vp-next-page-url');
            self.options.nextPageUrl = nextPageUrl;
            self.$item.attr('data-vp-next-page-url', nextPageUrl);

            self.$item.removeClass('vp-portfolio__loading');

            self.loading = false;

            self.emitEvent('endLoadingNewItems');

            // init custom colors
            self.initCustomColors();

            if (cb) {
                cb();
            }
        });
    };

    // global definition
    var plugin = function (options) {
        var args = Array.prototype.slice.call(arguments, 1),
            ret;

        this.each(function () {
            if (typeof ret !== 'undefined') {
                return;
            }

            if (typeof options === 'object' || typeof options === 'undefined') {
                if(!this.vp) {
                    this.vp = new VP($(this), options);
                }
            } else if (this.vp) {
                ret = this.vp[options].apply(this.vp, args);
            }
        });

        return typeof ret !== 'undefined' ? ret : this;
    };
    plugin.constructor = VP;

    // no conflict
    var oldPlugin = jQuery.fn.vp;
    jQuery.fn.vp = plugin;
    jQuery.fn.vp.noConflict = function () {
        jQuery.fn.vp = oldPlugin;
        return this;
    };

    // initialization
    $(function () {
        $('.vp-portfolio').vp();
    });
})(jQuery);