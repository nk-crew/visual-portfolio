/**
 * Visual Portfolio
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

    /**
     * Main VP class
     */
    var VP = (function () {
        function VP_inner ($item, userOptions) {
            var self = this;

            self.$item = $item;
            self.$wrap = $item.children('.vp-portfolio__wrap');
            self.$pagination = $item.children('.vp-pagination');
            self.$filter = $item.children('.vp-filter');

            // add id class
            self.id = $item.attr('data-vp-id');
            self.$item.addClass('vp-id-' + self.id);

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
        this.$item.trigger(event + '.vp.vp-id-' + this.id, data);
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

        // images loaded
        self.$wrap.imagesLoaded(function() {
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
     */
    VP.prototype.addStyle = function addStyle (selector, styles) {
        var self = this;
        var id = self.id;

        if (typeof stylesList[id] === 'undefined') {
            stylesList[id] = {};
        }
        if (typeof stylesList[id][selector] === 'undefined') {
            stylesList[id][selector] = {};
        }
        stylesList[id][selector] = $.extend(stylesList[id][selector], styles);

        self.emitEvent('addStyle', [selector, styles, stylesList]);

        self.renderStyle();
    };

    /**
     * Remove style from the current portfolio list
     *
     * @param selector css selector (if not set - removed all styles)
     * @param styles object with styles
     */
    VP.prototype.removeStyle = function removeStyle (selector, styles) {
        var self = this;
        var id = self.id;

        if (typeof stylesList[id] === 'undefined' || !selector) {
            stylesList[id] = {};
        }

        if (typeof stylesList[id][selector] !== 'undefined' && selector) {
            delete stylesList[id][selector];
        }

        self.emitEvent('removeStyle', [selector, styles, stylesList]);

        self.renderStyle();
    };

    /**
     * Render style for the current portfolio list
     */
    VP.prototype.renderStyle = function renderStyle () {
        var self = this;
        var id = self.id;
        var stylesString = '';

        // create string with styles
        if (typeof stylesList[id] !== 'undefined') {
            for (var k in stylesList[id]) {
                stylesString += '.vp-id-' + id + ' ' + k + ' {';
                for (var i in stylesList[id][k]) {
                    stylesString += i + ':' + stylesList[id][k][i] + ';';
                }
                stylesString += '}';
            }
        }

        // add in style tag
        var $style = $('#vp-style-' + id);
        if (!$style.length) {
            $style = $('<style>').attr('id', 'vp-style-' + id).appendTo('head');
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
     * Init events
     */
    VP.prototype.initEvents = function initEvents () {
        var self = this;
        var evp = '.vp.vp-id-' + self.id;

        // on filter click
        self.$item.on('click' + evp, '.vp-filter .vp-filter__item a', function (e) {
            e.preventDefault();
            if ( ! self.loading ) {
                $(this).closest('.vp-filter__item').addClass('vp-filter__item-active').siblings().removeClass('vp-filter__item-active');
            }
            self.loadNewItems(this.href, true);
        });

        // on pagination click
        self.$item.on('click' + evp, '.vp-pagination:not(.vp-pagination__no-more) .vp-pagination__item a', function (e) {
            e.preventDefault();
            self.loadNewItems(this.href, self.options.pagination === 'paged');
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
        var evp = '.vp.vp-id-' + self.id;

        // destroy click events
        self.$item.off('click' + evp);

        // destroy infinite load events
        $wnd.off('load' + evp + ' scroll' + evp + ' resize' + evp + ' orientationchange' + evp);

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
                    self.addStyle('.vp-portfolio__item', {
                        'width': (100 / columns) + '%'
                    });

                    // set items sizes
                    if (settings && settings.length) {
                        for (var k = 0; k < settings.length; k++) {
                            var size = settings[k].split(',');
                            var w = parseFloat(size[0]) || 1;
                            var h = parseFloat(size[1]) || 1;

                            var itemSelector = '.vp-portfolio__item';
                            if (settings.length > 1) {
                                itemSelector += ':nth-of-type(' + settings.length + 'n+' + (k + 1) + ')';
                            }

                            if (w && w !== 1) {
                                self.addStyle(itemSelector, {
                                    'width': (w * 100 / columns) + '%'
                                });
                            }
                            self.addStyle(itemSelector + ' .vp-portfolio__item-img', {
                                'padding-bottom': (h * 100) + '%'
                            });
                        }
                    }
                    break;
                case 'masonry':
                    self.addStyle('.vp-portfolio__item', {
                        'width': (100 / self.options.masonryColumns) + '%'
                    });
                case 'justified':
                    break;
            }
        }

        // add gaps
        if (self.options.itemsGap && ('tiles' === self.options.layout || 'masonry' === self.options.layout)) {
            self.addStyle('.vp-portfolio__wrap', {
                'margin-left': '-' + self.options.itemsGap + 'px',
                'margin-top': '-' + self.options.itemsGap + 'px'
            });

            var gapStyle = self.options.itemsGap + 'px';
            var itemStyles = {};

            if ('tiles' === self.options.layout) {
                itemStyles['top'] = gapStyle;
                itemStyles['left'] = gapStyle;
            } else {
                itemStyles['padding-top'] = gapStyle;
                itemStyles['padding-left'] = gapStyle;
            }

            self.addStyle('.vp-portfolio__item .vp-portfolio__item-img-wrap', itemStyles);
        }

        self.emitEvent('initLayout');
    };

    /**
     * Init Isotope
     *
     * TODO: Check for MixItUp plugin
     */
    VP.prototype.initIsotope = function initIsotope (options) {
        var self = this;

        if (self.options.layout === 'tiles' || self.options.layout === 'masonry') {
            self.$wrap.isotope(options || {
                itemSelector: '.vp-portfolio__item',
                layoutMode: 'masonry',
                transitionDuration: 400,
                percentPosition: true
            });

            self.emitEvent('initIsotope');
        }
    };

    /**
     * Destroy Isotope
     */
    VP.prototype.destroyIsotope = function destroyIsotope () {
        var self = this;
        var isotope = self.$wrap.data('isotope');

        if (isotope) {
            self.$wrap.isotope('destroy');

            self.emitEvent('destroyIsotope');
        }
    };

    /**
     * Init Justified Gallery plugin
     */
    VP.prototype.initJustifiedGallery = function initJustifiedGallery () {
        var self = this;

        if (self.options.layout === 'justified') {
            self.$wrap.justifiedGallery({
                lastRow: 'justify',
                margins: self.options.itemsGap || 0,
                border: 0,
                selector: '.vp-portfolio__item',
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
        var jg = self.$wrap.data('jg.controller');

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
                var $img = $entry.find('.vp-portfolio__item-img-wrap img');
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
     * Add New Items
     */
    VP.prototype.addItems = function addItems ($items, removeExisting) {
        var self = this;
        var isotope = self.$wrap.data('isotope');

        if (isotope) {
            if (removeExisting) {
                var $existing = self.$wrap.find('.vp-portfolio__item');
                self.$wrap.isotope('remove', $existing);
            }

            self.$wrap.isotope('insert', $items);
            self.initIsotope('layout');

            // images loaded init
            self.$wrap.imagesLoaded(function() {
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
        var isotope = self.$wrap.data('isotope');

        if (isotope) {
            self.$wrap.isotope('remove', $items);
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
            var $new_vp = $body.find('.vp-portfolio[data-vp-id="' + self.id + '"]');

            // insert new items
            if ($new_vp.length) {
                var newItems = $new_vp.children('.vp-portfolio__wrap').html();

                // update filter
                if (self.$filter.length) {
                    self.$filter.html($new_vp.children('.vp-filter').html());
                }

                // update pagination
                if (self.$pagination.length) {
                    self.$pagination.html($new_vp.children('.vp-pagination').html());
                }

                self.addItems($(newItems), removeExisting);

                self.emitEvent('loadedNewItems', [$new_vp, $new_vp, data]);
            }

            // update next page data
            var nextPageUrl = $new_vp.attr('data-vp-next-page-url');
            self.options.nextPageUrl = nextPageUrl;
            self.$item.attr('data-vp-next-page-url', nextPageUrl);

            // Update load more button
            if (self.options.nextPageUrl) {
                self.$pagination.removeClass('vp-pagination__no-more');
            } else {
                self.$pagination.addClass('vp-pagination__no-more');
            }

            self.$item.removeClass('vp-portfolio__loading');

            self.loading = false;

            self.emitEvent('endLoadingNewItems');

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