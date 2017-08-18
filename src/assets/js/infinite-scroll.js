/**
 * Visual Portfolio Infinite Scroll
 */
(function ($) {
    "use strict";

    var infiniteScrollObjects = [];

    /* Instance */
    function InfiniteScroll ($infiniteBlock, userOptions) {
        var self = this;

        self.$block = $infiniteBlock;

        // default options and callback functions
        self.options = $.extend({
            id: $infiniteBlock.attr('data-vp-pagination-id'),
            nextPageUrl: $infiniteBlock.attr('data-vp-pagination-next-page-url'),

            // set true if you want to load fetch new items on scrolling page
            infinite: $infiniteBlock.attr('data-vp-pagination-type') === 'infinite',

            loadMoreButton: $infiniteBlock.find('.vp-pagination__load-more')
        }, userOptions || {});

        infiniteScrollObjects.push(self);

        self.init();
    }

    InfiniteScroll.prototype = $.extend({

        // emit event
        // Example:
        // $(document).on('init.vp', function (event, infiniteObject) {
        //     console.log(infiniteObject);
        // });
        emitEvent: function emitEvent (event, data) {
            data = data ? [this].concat(data) : [this];
            this.$block.trigger(event + '.vp', data);
        },

        // init
        init: function init () {
            var self = this;

            // init event
            self.emitEvent('init');

            // on click load more
            self.options.loadMoreButton.on('click', function (e) {
                e.preventDefault();
                self.loadMore();
            });
        },

        // load more action
        loadMore: function loadMore () {
            var self = this;

            if(self.busy || !self.options.nextPageUrl) {
                return;
            }
            self.busy = true;

            // add loading class
            self.$block.addClass('vp-pagination__loading');

            // loading event
            self.emitEvent('startLoading');

            // load to invisible container, then append to posts container
            $.get(self.options.nextPageUrl, {}, function(data) {
                data = data.replace('<body', '<body><div id="vp-infinite-load-body"').replace('</body>','</div></body>');
                var $body = $(data).filter('#vp-infinite-load-body');

                // find current block on new page
                var $newBlock = $body.find('[data-vp-pagination-type="infinite"], [data-vp-pagination-type="load-more"]').filter('[data-vp-pagination-id="' + self.options.id + '"]');

                if ($newBlock.length) {
                    // on load event
                    self.emitEvent('loaded', [$newBlock, data]);
                }

                // update next page data
                self.options.nextPageUrl = $newBlock.attr('data-vp-pagination-next-page-url');

                // Update load more button
                if (self.options.nextPageUrl) {
                    self.$block.removeClass('vp-pagination__no-more');
                } else {
                    self.$block.addClass('vp-pagination__no-more');
                }

                self.busy = false;

                // end loading event
                self.emitEvent('endLoading');

                // remove loading class
                self.$block.removeClass('vp-pagination__loading');
            });
        }

    }, InfiniteScroll.prototype);


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
     * In Viewport checker
     * return visible percent from 0 to 1
     */
    function isInViewport ($item) {
        var rect = $item[0].getBoundingClientRect();
        return  rect.bottom >= 0 &&
            rect.right >= 0 &&
            rect.top <= wndH &&
            rect.left <= wndW;
    }

    /* Load new posts when scrolled page */
    var scrollTimeout;
    $(window).on('scroll resize load', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(function() {
            for (var k = 0; k < infiniteScrollObjects.length; k++) {
                var item = infiniteScrollObjects[k];
                if (item.options.infinite && isInViewport(item.$block)) {
                    item.loadMore();
                }
            }
        }, 20);
    });

    // Global init function
    window.vpInfiniteScroll = function ($block, options) {
        $block.each(function () {
            return new InfiniteScroll($(this), options);
        });
    };

    // init vp blocks
    vpInfiniteScroll($('[data-vp-pagination-type="infinite"], [data-vp-pagination-type="load-more"]'));

}(jQuery));