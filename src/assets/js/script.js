/**
 * Visual Portfolio
 */
(function ($) {
    "use strict";

    var VP = (function () {
        var instanceID = 1;

        function VP_inner ($item, userOptions) {
            var self = this;

            self.instanceID = instanceID++;
            self.$item = $item;
            self.$wrap = self.$item.children('.vp-portfolio-wrap');

            // add id
            self.$item.addClass('vp-id-' + self.instanceID);

            // user options
            self.userOptions = userOptions;

            self.init();
        }

        return VP_inner;
    }());

    /**
     * Init
     */
    VP.prototype.init = function init () {
        var self = this;

        self.stylesList = {};

        // init options
        self.initOptions();

        // init layout
        self.initLayout();

        // isotope
        self.initIsotope();
    };

    /**
     * Add style to the current portfolio list
     *
     * @param selector css selector
     * @param styles object with styles
     */
    VP.prototype.addStyle = function addStyle (selector, styles) {
        var self = this;
        var id = self.instanceID;
        var stylesString = '';

        if (typeof self.stylesList[id] === 'undefined') {
            self.stylesList[id] = {};
        }
        if (typeof self.stylesList[id][selector] === 'undefined') {
            self.stylesList[id][selector] = {};
        }
        self.stylesList[id][selector] = $.extend(self.stylesList[id][selector], styles);

        // create string with styles
        for (var k in self.stylesList[id]) {
            stylesString += '.vp-id-' + id + ' ' + k + ' {';
            for (var i in self.stylesList[id][k]) {
                stylesString += i + ':' + self.stylesList[id][k][i] + ';';
            }
            stylesString += '}';
        }

        // add in style tag
        var $style = $('#vp-style-' + id);
        if (!$style.length) {
            $style = $('<style>').attr('id', 'vp-style-' + id).appendTo('head');
        }
        $style.html(stylesString);
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
        self.defaults   = {
            itemsGap: 0,
            layout: '3|1,1|'
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
    };

    /**
     * Init layout
     */
    VP.prototype.initLayout = function initLayout () {
        var self = this;

        // prepare layout
        if (self.options.layout) {
            var layoutArr = self.options.layout.split('|');
            var columns = parseInt(layoutArr[0], 10);

            if (!columns) {
                columns = 1;
            }

            // set columns
            self.addStyle('.vp-portfolio__item', {
                'width': (100 / columns) + '%'
            });
            layoutArr.shift();

            // remove last empty item
            if (typeof layoutArr[layoutArr.length-1] !== 'undefined' && !layoutArr[layoutArr.length-1]) {
                layoutArr.pop();
            }

            // set items sizes
            if (layoutArr && layoutArr.length) {
                for (var k = 0; k < layoutArr.length; k++) {
                    var size = layoutArr[k].split(',');
                    var w = parseFloat(size[0]) || 1;
                    var h = parseFloat(size[1]) || 1;

                    var itemSelector = '.vp-portfolio__item';
                    if (layoutArr.length > 1) {
                        itemSelector += ':nth-of-type(' + layoutArr.length + 'n+' + (k + 1) + ')';
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
        }

        // add gaps
        if (self.options.itemsGap) {
            self.addStyle('.vp-portfolio-wrap', {
                'margin-left': '-' + self.options.itemsGap + 'px',
                'margin-top': '-' + self.options.itemsGap + 'px'
            });
            self.addStyle('.vp-portfolio__item .vp-portfolio__item-img-wrap', {
                'top': self.options.itemsGap + 'px',
                'left': self.options.itemsGap + 'px'
            });
        }
    };

    /**
     * Init Isotope
     */
    VP.prototype.initIsotope = function initIsotope () {
        var self = this;

        self.$wrap.imagesLoaded(function() {
            self.$item.addClass('vp-portfolio__loaded');
            self.$wrap.isotope({
                itemSelector: '.vp-portfolio__item',
                layoutMode: 'masonry',
                transitionDuration: 0,
                percentPosition: true
            });
        });
    };

    /**
     * Isotope Add New Items
     */
    VP.prototype.isotopeAddNew = function isotopeAddNew ($newItems) {
        var self = this;

        self.$wrap.isotope('insert', $newItems);

        // images loaded init
        self.initIsotope();
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

    // waiting for infinite load
    $(document).on('loaded.vp', function (e, obj, $newBlock) {
        if ($newBlock) {
            var newItems = $newBlock.prev('.vp-portfolio-wrap').html();
            if (newItems) {
                obj.$block.parent().vp('isotopeAddNew', $(newItems));
            }
        }
    });

    // initialization
    $(function () {
        $('.vp-portfolio').vp();
    });
})(jQuery);