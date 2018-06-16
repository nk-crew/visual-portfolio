/*!
 * Name    : Visual Portfolio
 * Version : @@plugin_version
 * Author  : nK https://nkdev.info
 */
/**
 * Global Variables
 */
const $ = jQuery;
const {
    VPData,
    objectFitImages,
    PhotoSwipe,
    PhotoSwipeUI_Default, // eslint-disable-line camelcase
} = window;
const {
    __,
    settingsPopupGallery,
} = VPData;

/**
 * Get window size
 */
const $wnd = $( window );
let wndW = 0;
let wndH = 0;
function getWndSize() {
    wndW = $wnd.width();
    wndH = $wnd.height();
}
getWndSize();
$wnd.on( 'resize load orientationchange', getWndSize );

/**
 * Screen sizes for responsive feature
 */
const screenSizes = [ 320, 576, 768, 992, 1200 ];

// enable object-fit
if ( typeof objectFitImages !== 'undefined' ) {
    objectFitImages();
}

/**
 * Main VP class
 */
class VP {
    constructor( $item, userOptions ) {
        const self = this;

        self.$item = $item;

        // get id from class
        const classes = $item[ 0 ].className.split( /\s+/ );
        for ( let k = 0; k < classes.length; k++ ) {
            if ( classes[ k ] && /^vp-uid-/.test( classes[ k ] ) ) {
                self.uid = classes[ k ].replace( /^vp-uid-/, '' );
            }
            if ( classes[ k ] && /^vp-id-/.test( classes[ k ] ) ) {
                self.id = classes[ k ].replace( /^vp-id-/, '' );
            }
        }
        if ( ! self.uid ) {
            // eslint-disable-next-line no-console
            console.error( __.couldnt_retrieve_vp );
            return;
        }

        self.$items_wrap = $item.find( '.vp-portfolio__items' );
        self.$pagination = $item.find( '.vp-portfolio__pagination-wrap' );
        self.$filter = $item.find( '.vp-portfolio__filter-wrap' );

        // find single filter block.
        if ( self.id ) {
            self.$filter = self.$filter.add( `.vp-single-filter.vp-id-${ self.id } .vp-portfolio__filter-wrap` );
        }

        // user options
        self.userOptions = userOptions;

        self.firstRun = true;

        self.init();
    }

    // emit event
    // Example:
    // $(document).on('init.vpf', function (event, infiniteObject) {
    //     console.log(infiniteObject);
    // });
    emitEvent( event, data ) {
        data = data ? [ this ].concat( data ) : [ this ];
        this.$item.trigger( `${ event }.vpf.vpf-uid-${ this.uid }`, data );
    }

    /**
     * Init
     */
    init() {
        const self = this;

        // destroy if already inited
        if ( ! self.firstRun ) {
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
        self.$items_wrap.imagesLoaded( () => {
            self.$item.addClass( 'vp-portfolio__ready' );

            if ( self.id ) {
                $( `.vp-single-filter.vp-id-${ self.id }` ).addClass( 'vp-single-filter__ready' );
            }

            // isotope
            self.initIsotope();

            // justified gallery
            self.initFjGallery();

            // slider
            self.initSwiper();

            self.emitEvent( 'imagesLoaded' );
        } );

        self.emitEvent( 'init' );

        self.firstRun = false;
    }

    /**
     * Destroy
     */
    destroy() {
        const self = this;

        // remove loaded class
        self.$item.removeClass( 'vp-portfolio__ready' );

        if ( self.id ) {
            $( `.vp-single-filter.vp-id-${ self.id }` ).removeClass( 'vp-single-filter__ready' );
        }

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
        self.destroyFjGallery();

        // destroy swiper
        self.destroySwiper();

        self.emitEvent( 'destroy' );

        self.destroyed = true;
    }

    /**
     * Add style to the current portfolio list
     *
     * @param {String} selector css selector
     * @param {String} styles object with styles
     * @param {String} media string with media query
     */
    addStyle( selector, styles, media ) {
        media = media || '';

        const self = this;
        const uid = self.uid;

        if ( ! self.stylesList ) {
            self.stylesList = {};
        }

        if ( typeof self.stylesList[ uid ] === 'undefined' ) {
            self.stylesList[ uid ] = {};
        }
        if ( typeof self.stylesList[ uid ][ media ] === 'undefined' ) {
            self.stylesList[ uid ][ media ] = {};
        }
        if ( typeof self.stylesList[ uid ][ media ][ selector ] === 'undefined' ) {
            self.stylesList[ uid ][ media ][ selector ] = {};
        }

        self.stylesList[ uid ][ media ][ selector ] = $.extend( self.stylesList[ uid ][ media ][ selector ], styles );

        self.emitEvent( 'addStyle', [ selector, styles, media, self.stylesList ] );
    }

    /**
     * Remove style from the current portfolio list
     *
     * @param {String} selector css selector (if not set - removed all styles)
     * @param {String} styles object with styles
     * @param {String} media string with media query
     */
    removeStyle( selector, styles, media ) {
        media = media || '';

        const self = this;
        const uid = self.uid;

        if ( ! self.stylesList ) {
            self.stylesList = {};
        }

        if ( typeof self.stylesList[ uid ] !== 'undefined' && ! selector ) {
            self.stylesList[ uid ] = {};
        }

        if ( typeof self.stylesList[ uid ] !== 'undefined' && typeof self.stylesList[ uid ][ media ] !== 'undefined' && typeof self.stylesList[ uid ][ media ][ selector ] !== 'undefined' && selector ) {
            delete self.stylesList[ uid ][ media ][ selector ];
        }

        self.emitEvent( 'removeStyle', [ selector, styles, self.stylesList ] );
    }

    /**
     * Render style for the current portfolio list
     */
    renderStyle() {
        const self = this;

        // timeout for the case, when styles added one by one
        const uid = self.uid;
        let stylesString = '';

        if ( ! self.stylesList ) {
            self.stylesList = {};
        }

        // create string with styles
        if ( typeof self.stylesList[ uid ] !== 'undefined' ) {
            Object.keys( self.stylesList[ uid ] ).forEach( ( m ) => {
                // media
                if ( m ) {
                    stylesString += `@media ${ m } {`;
                }
                Object.keys( self.stylesList[ uid ][ m ] ).forEach( ( s ) => {
                    // selector
                    stylesString += `.vp-uid-${ uid } ${ s } {`;
                    Object.keys( self.stylesList[ uid ][ m ][ s ] ).forEach( ( p ) => {
                        // property and value
                        stylesString += `${ p }:${ self.stylesList[ uid ][ m ][ s ][ p ] };`;
                    } );
                    stylesString += '}';
                } );
                // media
                if ( m ) {
                    stylesString += '}';
                }
            } );
        }

        // add in style tag
        let $style = $( `#vp-style-${ uid }` );
        if ( ! $style.length ) {
            $style = $( '<style>' ).attr( 'id', `vp-style-${ uid }` ).appendTo( 'head' );
        }
        $style.html( stylesString );

        self.emitEvent( 'renderStyle', [ stylesString, self.stylesList, $style ] );
    }

    /**
     * First char to lower case
     *
     * @param {String} str string to transform
     * @returns {string} result string
     */
    firstToLowerCase( str ) {
        return str.substr( 0, 1 ).toLowerCase() + str.substr( 1 );
    }

    /**
     * Init options
     *
     * @param {Object} userOptions user options
     */
    initOptions( userOptions ) {
        const self = this;

        // default options
        self.defaults = {
            layout: 'tile',
            itemsGap: 0,
            tilesType: '3|1,1|',
            masonryColumns: 3,
            justifiedRowHeight: 250,
            justifiedRowHeightTolerance: 0.25,
            pagination: 'load-more',
        };

        // new user options
        if ( userOptions ) {
            self.userOptions = userOptions;
        }

        // prepare data options
        const dataOptions = self.$item[ 0 ].dataset;
        const pureDataOptions = {};
        Object.keys( dataOptions ).forEach( ( k ) => {
            if ( k && k.substring( 0, 2 ) === 'vp' ) {
                pureDataOptions[ self.firstToLowerCase( k.substring( 2 ) ) ] = dataOptions[ k ];
            }
        } );

        self.options = $.extend( {}, self.defaults, pureDataOptions, self.userOptions );

        self.emitEvent( 'initOptions' );
    }

    /**
     * Check if lines cross
     *
     * @param {object} a - first point of the first line
     * @param {object} b - second point of the first line
     * @param {object} c - first point of the second line
     * @param {object} d - second point of the second line
     *
     * @return {boolean} cross lines
     */
    isCrossLine( a, b, c, d ) {
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
        const v1 = ( ( d.x - c.x ) * ( a.y - c.y ) ) - ( ( d.y - c.y ) * ( a.x - c.x ) );
        const v2 = ( ( d.x - c.x ) * ( b.y - c.y ) ) - ( ( d.y - c.y ) * ( b.x - c.x ) );
        const v3 = ( ( b.x - a.x ) * ( c.y - a.y ) ) - ( ( b.y - a.y ) * ( c.x - a.x ) );
        const v4 = ( ( b.x - a.x ) * ( d.y - a.y ) ) - ( ( b.y - a.y ) * ( d.x - a.x ) );
        return ( ( v1 * v2 <= 0 ) && ( v3 * v4 <= 0 ) );
    }

    /**
     * Init events
     */
    initEvents() {
        const self = this;
        const evp = `.vpf.vpf-uid-${ self.uid }`;

        // Stretch
        function stretch() {
            const rect = self.$item[ 0 ].getBoundingClientRect();
            const left = rect.left;
            const right = wndW - rect.right;

            const ml = parseFloat( self.$item.css( 'margin-left' ) || 0 );
            const mr = parseFloat( self.$item.css( 'margin-right' ) || 0 );
            self.$item.css( {
                'margin-left': ml - left,
                'margin-right': mr - right,
            } );
        }
        if ( self.$item.hasClass( 'vp-portfolio__stretch' ) ) {
            $wnd.on( `load${ evp } resize${ evp } orientationchange${ evp }`, () => {
                stretch();
            } );
            stretch();
        }

        // Fly style
        if ( self.options.itemsStyle === 'fly' ) {
            // determine cursor position
            let lastCursorPos = {};
            $wnd.on( `mousemove${ evp }`, ( e ) => {
                lastCursorPos = {
                    x: e.clientX,
                    y: e.clientY,
                };
            } );

            self.$item.on( `mouseenter${ evp } mouseleave${ evp }`, '.vp-portfolio__item', function( e ) {
                const $this = $( this );
                const itemRect = $this[ 0 ].getBoundingClientRect();
                const $overlay = $this.find( '.vp-portfolio__item-overlay' );
                const enter = e.type === 'mouseenter';
                let endX = '0%';
                let endY = '0%';
                const curCursorPos = {
                    x: e.clientX,
                    y: e.clientY,
                };

                // find the corner that placed on cursor path.
                let isUp = self.isCrossLine(
                    { x: itemRect.left, y: itemRect.top },
                    { x: itemRect.left + itemRect.width, y: itemRect.top },
                    curCursorPos, lastCursorPos,
                );
                let isDown = self.isCrossLine(
                    { x: itemRect.left, y: itemRect.top + itemRect.height },
                    { x: itemRect.left + itemRect.width, y: itemRect.top + itemRect.height },
                    curCursorPos, lastCursorPos,
                );
                let isLeft = self.isCrossLine(
                    { x: itemRect.left, y: itemRect.top },
                    { x: itemRect.left, y: itemRect.top + itemRect.height },
                    curCursorPos, lastCursorPos,
                );
                let isRight = self.isCrossLine(
                    { x: itemRect.left + itemRect.width, y: itemRect.top },
                    { x: itemRect.left + itemRect.width, y: itemRect.top + itemRect.height },
                    curCursorPos, lastCursorPos,
                );

                // Sometimes self.isCrossLine returned false, so we need to check direction manually (less accurate, but it is not a big problem).
                if ( ! isUp && ! isDown && ! isLeft && ! isRight ) {
                    const x = ( ( itemRect.width / 2 ) - curCursorPos.x + itemRect.left ) / ( itemRect.width / 2 );
                    const y = ( ( itemRect.height / 2 ) - curCursorPos.y + itemRect.top ) / ( itemRect.height / 2 );
                    if ( Math.abs( x ) > Math.abs( y ) ) {
                        if ( x > 0 ) {
                            isLeft = true;
                        } else {
                            isRight = true;
                        }
                    } else if ( y > 0 ) {
                        isUp = true;
                    } else {
                        isDown = true;
                    }
                }

                if ( isUp ) {
                    endY = `-10${ endY }`;
                } else if ( isDown ) {
                    endY = `10${ endY }`;
                } else if ( isLeft ) {
                    endX = `-10${ endX }`;
                } else if ( isRight ) {
                    endX = `10${ endX }`;
                }

                if ( enter ) {
                    $overlay.css( {
                        transition: 'none',
                        transform: `translateX(${ endX }) translateY(${ endY }) translateZ(0)`,
                    } );
                    // Trigger a reflow, flushing the CSS changes. This need to fix some glithes in Safari and Firefox.
                    // Info here - https://stackoverflow.com/questions/11131875/what-is-the-cleanest-way-to-disable-css-transition-effects-temporarily
                    // eslint-disable-next-line no-unused-expressions
                    $overlay[ 0 ].offsetHeight;
                }

                $overlay.css( {
                    transition: '.2s transform ease-in-out',
                    transform: `translateX(${ enter ? '0%' : endX }) translateY(${ enter ? '0%' : endY }) translateZ(0)`,
                } );
            } );
        }

        // on filter click
        self.$filter.on( `click${ evp }`, '.vp-filter .vp-filter__item a', function( e ) {
            e.preventDefault();
            const $this = $( this );
            if ( ! self.loading ) {
                $this.closest( '.vp-filter__item' ).addClass( 'vp-filter__item-active' ).siblings().removeClass( 'vp-filter__item-active' );
            }
            self.loadNewItems( $this.attr( 'href' ), true );
        } );

        // on pagination click
        self.$item.on( `click${ evp }`, '.vp-pagination .vp-pagination__item a', function( e ) {
            e.preventDefault();
            const $this = $( this );
            if ( $this.hasClass( 'vp-pagination__no-more' ) && self.options.pagination !== 'paged' ) {
                return;
            }
            self.loadNewItems( $this.attr( 'href' ), self.options.pagination === 'paged' );
        } );

        // on categories of item click
        self.$item.on( `click${ evp }`, '.vp-portfolio__items .vp-portfolio__item-meta-category a', function( e ) {
            e.preventDefault();
            e.stopPropagation();
            self.loadNewItems( $( this ).attr( 'href' ), true );
        } );

        // infinite loading
        let scrollTimeout;
        const bottomPosToLoad = 250;
        function checkVisibilityAndLoad() {
            const rect = self.$item[ 0 ].getBoundingClientRect();

            if ( rect.bottom > 0 && ( rect.bottom - bottomPosToLoad ) <= wndH ) {
                self.loadNewItems( self.options.nextPageUrl, false, () => {
                    checkVisibilityAndLoad();
                } );
            }
        }
        if ( self.options.pagination === 'infinite' ) {
            $wnd.on( `load${ evp } scroll${ evp } resize${ evp } orientationchange${ evp }`, () => {
                clearTimeout( scrollTimeout );
                scrollTimeout = setTimeout( () => {
                    checkVisibilityAndLoad();
                }, 60 );
            } );
            checkVisibilityAndLoad();
        }

        self.emitEvent( 'initEvents' );
    }

    /**
     * Destroy events
     */
    destroyEvents() {
        const self = this;
        const evp = `.vpf.vpf-uid-${ self.uid }`;

        // destroy click events
        self.$item.off( evp );
        self.$filter.off( evp );

        // destroy infinite load events
        $wnd.off( evp );

        self.emitEvent( 'destroyEvents' );
    }

    /**
     * Get Layout Settings
     *
     * @returns {string} tiles layout
     */
    getTilesSettings() {
        const self = this;

        const layoutArr = self.options.tilesType.split( /[:|]/ );

        // remove last empty item
        if ( typeof layoutArr[ layoutArr.length - 1 ] !== 'undefined' && ! layoutArr[ layoutArr.length - 1 ] ) {
            layoutArr.pop();
        }

        return layoutArr;
    }

    /**
     * Init layout
     */
    initLayout() {
        const self = this;

        // prepare layout
        if ( self.options.layout ) {
            switch ( self.options.layout ) {
            case 'tiles': {
                const settings = self.getTilesSettings();

                // get columns number
                const columns = parseInt( settings[ 0 ], 10 ) || 1;
                settings.shift();

                // set columns
                self.addStyle( '.vp-portfolio__item-wrap', {
                    width: `${ 100 / columns }%`,
                } );

                // set items sizes
                if ( settings && settings.length ) {
                    for ( let k = 0; k < settings.length; k++ ) {
                        const size = settings[ k ].split( ',' );
                        const w = parseFloat( size[ 0 ] ) || 1;
                        const h = parseFloat( size[ 1 ] ) || 1;

                        let itemSelector = '.vp-portfolio__item-wrap';
                        if ( settings.length > 1 ) {
                            itemSelector += `:nth-of-type(${ settings.length }n+${ k + 1 })`;
                        }

                        if ( w && w !== 1 ) {
                            self.addStyle( itemSelector, {
                                width: `${ w * 100 / columns }%`,
                            } );
                        }
                        self.addStyle( `${ itemSelector } .vp-portfolio__item-img-wrap::before`, {
                            'margin-top': `${ h * 100 }%`,
                        } );
                    }
                }

                // calculate responsive.
                let count = columns - 1;
                let currentPoint = Math.min( screenSizes.length - 1, count );

                for ( ; currentPoint >= 0; currentPoint-- ) {
                    if ( count > 0 && typeof screenSizes[ currentPoint ] !== 'undefined' ) {
                        self.addStyle( '.vp-portfolio__item-wrap', {
                            width: `${ 100 / count }%`,
                        }, `screen and (max-width: ${ screenSizes[ currentPoint ] }px)` );
                        self.addStyle( '.vp-portfolio__item-wrap:nth-of-type(n)', {
                            width: `${ 100 / count }%`,
                        }, `screen and (max-width: ${ screenSizes[ currentPoint ] }px)` );
                    }
                    count -= 1;
                }
                break;
            }
            case 'masonry': {
                self.addStyle( '.vp-portfolio__item-wrap', {
                    width: `${ 100 / self.options.masonryColumns }%`,
                } );

                // calculate responsive.
                const columns = self.options.masonryColumns;
                let count = columns - 1;
                let currentPoint = Math.min( screenSizes.length - 1, count );

                for ( ; currentPoint >= 0; currentPoint-- ) {
                    if ( count > 0 && typeof screenSizes[ currentPoint ] !== 'undefined' ) {
                        self.addStyle( '.vp-portfolio__item-wrap', {
                            width: `${ 100 / count }%`,
                        }, `screen and (max-width: ${ screenSizes[ currentPoint ] }px)` );
                    }
                    count -= 1;
                }
            }
            // falls through
            case 'justified':
                break;
            case 'slider':
                if ( self.options.sliderItemsHeight !== 'auto' ) {
                    if ( self.options.sliderSlidesPerView === 'auto' ) {
                        // dynamic.
                        if ( self.options.sliderItemsHeight.indexOf( '%' ) === self.options.sliderItemsHeight.length - 1 ) {
                            self.addStyle( '.vp-portfolio__items-wrap::before', {
                                content: '""',
                                display: 'block',
                                width: '100%',
                                'margin-top': isNaN( self.options.sliderItemsHeight ) ? self.options.sliderItemsHeight : `${ self.options.sliderItemsHeight }px`,
                            } );
                            self.addStyle( '.vp-portfolio__items', {
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                            } );
                            self.addStyle( '.vp-portfolio__item-wrap', {
                                height: self.options.sliderBullets === 'true' ? 'calc( 100% - 25px )' : '100%',
                            } );
                            self.addStyle( '.vp-portfolio__item, .vp-portfolio__item-img-wrap, .vp-portfolio__item-img, .vp-portfolio__item-wrap .vp-portfolio__item .vp-portfolio__item-img a, .vp-portfolio__item-wrap .vp-portfolio__item .vp-portfolio__item-img img', {
                                width: 'auto',
                                height: '100%',
                            } );

                        // static.
                        } else {
                            self.addStyle( '.vp-portfolio__item .vp-portfolio__item-img img', {
                                width: 'auto',
                                height: isNaN( self.options.sliderItemsHeight ) ? self.options.sliderItemsHeight : `${ self.options.sliderItemsHeight }px`,
                            } );
                        }
                    } else {
                        self.addStyle( '.vp-portfolio__item-img-wrap::before', {
                            'margin-top': isNaN( self.options.sliderItemsHeight ) ? self.options.sliderItemsHeight : `${ self.options.sliderItemsHeight }px`,
                        } );
                        self.addStyle( '.vp-portfolio__item-img img, .vp-portfolio__item-img', {
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                        } );
                        self.addStyle( '.vp-portfolio__item .vp-portfolio__item-img img', {
                            width: '100%',
                            height: '100%',
                        } );
                    }
                }
                break;
            // no default
            }
        }

        // add gaps
        const gap = parseInt( self.options.itemsGap, 10 );
        if ( gap && ( self.options.layout === 'tiles' || self.options.layout === 'masonry' ) ) {
            self.addStyle( '.vp-portfolio__items', {
                'margin-left': `-${ gap }px`,
                'margin-top': `-${ gap }px`,
            } );

            const gapStyle = `${ gap }px`;

            self.addStyle( '.vp-portfolio__item-wrap .vp-portfolio__item', {
                'margin-left': gapStyle,
                'margin-top': gapStyle,
            } );

            // tiles
            if ( self.options.layout === 'tiles' ) {
                self.addStyle( '.vp-portfolio__item-wrap .vp-portfolio__item-img-wrap', {
                    'margin-left': `-${ gapStyle }`,
                    'margin-top': `-${ gapStyle }`,
                } );
                self.addStyle( '.vp-portfolio__item-wrap .vp-portfolio__item-img', {
                    left: gapStyle,
                    top: gapStyle,
                } );
            }
        }

        self.renderStyle();

        self.emitEvent( 'initLayout' );
    }

    /**
     * Init custom color by data attributes:
     * data-vp-bg-color
     * data-vp-text-color
     */
    initCustomColors() {
        const self = this;

        self.$item.find( '[data-vp-bg-color]' ).each( function() {
            const val = $( this ).attr( 'data-vp-bg-color' );
            self.addStyle( `[data-vp-bg-color="${ val }"]`, {
                'background-color': `${ val } !important`,
            } );
        } );

        self.$item.find( '[data-vp-text-color]' ).each( function() {
            const val = $( this ).attr( 'data-vp-text-color' );
            self.addStyle( `[data-vp-text-color="${ val }"]`, {
                color: `${ val } !important`,
            } );
        } );

        self.renderStyle();

        self.emitEvent( 'initCustomColors' );
    }

    /**
     * Init Isotope
     * TODO: Check for MixItUp plugin
     *
     * @param {object} options isotope options
     */
    initIsotope( options ) {
        const self = this;

        if ( self.options.layout === 'tiles' || self.options.layout === 'masonry' ) {
            self.$items_wrap.isotope( options || {
                itemSelector: '.vp-portfolio__item-wrap',
                layoutMode: 'masonry',
                // masonry: {
                //     horizontalOrder: true
                // },
                transitionDuration: '0.3s',
                percentPosition: true,
            } );

            self.emitEvent( 'initIsotope', [ options ] );
        }
    }

    /**
     * Destroy Isotope
     */
    destroyIsotope() {
        const self = this;
        const isotope = self.$items_wrap.data( 'isotope' );

        if ( isotope ) {
            self.$items_wrap.isotope( 'destroy' );

            self.emitEvent( 'destroyIsotope' );
        }
    }

    /**
     * Init fjGallery plugin
     *
     * @param {mixed} options - gallery options.
     * @param {mixed} additional - additional args.
     */
    initFjGallery( options = false, additional = null ) {
        const self = this;

        if ( self.options.layout === 'justified' ) {
            self.$items_wrap.fjGallery( options !== false ? options : {
                gutter: parseFloat( self.options.itemsGap ) || 0,
                rowHeight: parseFloat( self.options.justifiedRowHeight ) || 200,
                rowHeightTolerance: parseFloat( self.options.justifiedRowHeightTolerance ) || 0,
                itemSelector: '.vp-portfolio__item-wrap',
                imageSelector: '.vp-portfolio__item-img img',
            }, additional );

            self.emitEvent( 'initFjGallery', [ options ] );
        }
    }

    /**
     * Destroy fjGallery plugin
     */
    destroyFjGallery() {
        const self = this;
        const fjGallery = self.$items_wrap.data( 'fjGallery' );

        if ( fjGallery ) {
            self.$items_wrap.fjGallery( 'destroy' );

            self.emitEvent( 'destroyFjGallery' );
        }
    }

    /**
     * Init Swiper plugin
     *
     * @param {mixed} options - slider options.
     */
    initSwiper( options = false ) {
        const self = this;

        if ( self.options.layout === 'slider' && typeof window.Swiper !== 'undefined' ) {
            const $parent = self.$items_wrap.parent();

            $parent.addClass( 'swiper-container' );
            self.$items_wrap.addClass( 'swiper-wrapper' );
            self.$items_wrap.children().addClass( 'swiper-slide' );

            // add arrows
            if ( self.options.sliderArrows === 'true' && ! $parent.find( '.vp-portfolio__items-arrow' ).length ) {
                $parent.append( `
                    <div class="vp-portfolio__items-arrow vp-portfolio__items-arrow-prev"><span class="${ self.options.sliderArrowsIconPrev }"></span></div>
                    <div class="vp-portfolio__items-arrow vp-portfolio__items-arrow-next"><span class="${ self.options.sliderArrowsIconNext }"></span></div>
                ` );
            }

            // add bullets
            if ( self.options.sliderBullets === 'true' && ! $parent.find( '.vp-portfolio__items-bullets' ).length ) {
                $parent.append( '<div class="vp-portfolio__items-bullets"></div>' );
            }

            // calculate responsive.
            const slidesPerView = self.options.sliderSlidesPerView || 3;
            const breakPoints = {};

            if ( ! isNaN( slidesPerView ) ) {
                let count = slidesPerView - 1;
                let currentPoint = Math.min( screenSizes.length - 1, count );

                for ( ; currentPoint >= 0; currentPoint-- ) {
                    if ( count > 0 && typeof screenSizes[ currentPoint ] !== 'undefined' ) {
                        breakPoints[ screenSizes[ currentPoint ] ] = {
                            slidesPerView: count,
                        };
                    }
                    count -= 1;
                }
            }

            new window.Swiper( $parent[ 0 ], options || {
                speed: ( parseFloat( self.options.sliderSpeed, 10 ) || 0 ) * 1000,
                autoHeight: self.options.sliderItemsHeight === 'auto',
                effect: self.options.sliderEffect || 'slide',
                spaceBetween: parseFloat( self.options.itemsGap ) || 0,
                centeredSlides: self.options.sliderCenteredSlides === 'true',
                freeMode: self.options.sliderFreeMode === 'true',
                loop: self.options.sliderLoop === 'true',
                autoplay: parseFloat( self.options.sliderAutoplay ) > 0 && {
                    delay: parseFloat( self.options.sliderAutoplay ) * 1000,
                    disableOnInteraction: false,
                },
                navigation: self.options.sliderArrows === 'true' && {
                    nextEl: '.vp-portfolio__items-arrow-next',
                    prevEl: '.vp-portfolio__items-arrow-prev',
                },
                pagination: self.options.sliderBullets === 'true' && {
                    el: '.vp-portfolio__items-bullets',
                    clickable: true,
                    dynamicBullets: self.options.sliderBulletsDynamic === 'true',
                },
                slidesPerView: slidesPerView,
                breakpoints: breakPoints,
                keyboard: true,
                grabCursor: true,
            } );

            self.emitEvent( 'initSwiper', [ options ] );
        }
    }

    /**
     * Destroy Swiper plugin
     */
    destroySwiper() {
        const self = this;
        const $parent = self.$items_wrap.parent();
        const Swiper = $parent[ 0 ].swiper;

        if ( Swiper ) {
            Swiper.destroy();

            $parent.removeClass( 'swiper-container' );
            self.$items_wrap.removeClass( 'swiper-wrapper' );
            self.$items_wrap.children().removeClass( 'swiper-slide' );

            $parent.find( '.vp-portfolio__items-arrow, .vp-portfolio__items-bullets' ).remove();

            self.emitEvent( 'destroySwiper' );
        }
    }

    /**
     * Init Photoswipe plugin
     */
    initPhotoswipe() {
        const self = this;

        if ( typeof PhotoSwipe === 'undefined' || ! self.options.itemsClickAction || self.options.itemsClickAction !== 'popup_gallery' ) {
            return;
        }

        // prevent on preview page
        if ( self.$item.closest( '#vp_preview' ).length ) {
            return;
        }

        // prepare photoswipe markup
        if ( ! $( '.vp-pswp' ).length ) {
            const markup = `
            <div class="pswp vp-pswp vp-pswp-uid-'}${ self.uid }" tabindex="-1" role="dialog" aria-hidden="true">
                <div class="pswp__bg"></div>
                <div class="pswp__scroll-wrap">
                    <div class="pswp__container">
                        <div class="pswp__item"></div>
                        <div class="pswp__item"></div>
                        <div class="pswp__item"></div>
                    </div>
                    <div class="pswp__ui pswp__ui--hidden">
                        <div class="pswp__top-bar">
                            <div class="pswp__counter"></div>
                            <a class="pswp__button pswp__button--close" title="${ __.pswp_close }"></a>
                            <a class="pswp__button pswp__button--share" title="${ __.pswp_share }"></a>
                            <a class="pswp__button pswp__button--fs" title="${ __.pswp_fs }"></a>
                            <a class="pswp__button pswp__button--zoom" title="${ __.pswp_zoom }"></a>
                        </div>
                        <div class="pswp__preloader">
                            <div class="pswp__preloader__icn">
                                <div class="pswp__preloader__cut">
                                    <div class="pswp__preloader__donut"></div>
                                </div>
                            </div>
                        </div>
                        <div class="pswp__share-modal pswp__share-modal--hidden pswp__single-tap">
                            <div class="pswp__share-tooltip"></div>
                        </div>
                        <a class="pswp__button pswp__button--arrow--left" title="${ __.pswp_prev }"></a>
                        <a class="pswp__button pswp__button--arrow--right" title="${ __.pswp_next }"></a>
                        <div class="pswp__caption">
                            <div class="pswp__caption__center"></div>
                        </div>
                    </div>
                </div>
            </div>
            `;
            $( 'body' ).append( markup );
        }

        // init code
        const parseThumbnailElements = function( el ) {
            const thumbElements = $( el ).find( '.vp-portfolio__item-wrap' );
            const items = [];
            let $meta;
            let size;
            let videoSize;
            let item;
            let video;

            thumbElements.each( function() {
                $meta = $( this ).find( '.vp-portfolio__item-popup' );
                size = ( $meta.attr( 'data-vp-popup-img-size' ) || '1920x1080' ).split( 'x' );
                videoSize = ( $meta.attr( 'data-vp-popup-video-size' ) || '1920x1080' ).split( 'x' );
                video = $meta.attr( 'data-vp-popup-video' );

                if ( video ) {
                    item = {
                        html: video,
                        vw: parseInt( videoSize[ 0 ], 10 ),
                        vh: parseInt( videoSize[ 1 ], 10 ),
                    };
                } else {
                    // create slide object
                    item = {
                        src: $meta.attr( 'data-vp-popup-img' ),
                        w: parseInt( size[ 0 ], 10 ),
                        h: parseInt( size[ 1 ], 10 ),
                    };

                    const $caption = $meta.html();
                    if ( $caption ) {
                        item.title = $caption;
                    }

                    // save link to element for getThumbBoundsFn
                    item.el = this;

                    const mediumSrc = $meta.attr( 'data-vp-popup-md-img' ) || item.src;
                    if ( mediumSrc ) {
                        size = ( $meta.attr( 'data-vp-popup-md-img-size' ) || $meta.attr( 'data-vp-popup-img-size' ) || '1920x1080' ).split( 'x' );
                        // "medium-sized" image
                        item.m = {
                            src: mediumSrc,
                            w: parseInt( size[ 0 ], 10 ),
                            h: parseInt( size[ 1 ], 10 ),
                        };
                    }

                    // original image
                    item.o = {
                        src: item.src,
                        w: item.w,
                        h: item.h,
                    };
                }

                items.push( item );
            } );

            return items;
        };

        function resizeVideo( data, curItem ) {
            if ( typeof curItem === 'undefined' ) {
                if ( data && data.itemHolders.length ) {
                    data.itemHolders.forEach( ( val ) => {
                        if ( val.item && val.item.html ) {
                            resizeVideo( data, val.item );
                        }
                    } );
                }
                return;
            }

            // calculate real viewport in pixels
            const vpW = data.viewportSize.x * window.devicePixelRatio;
            let vpH = data.viewportSize.y * window.devicePixelRatio;
            const ratio = curItem.vw / curItem.vh;
            let resultW;
            const $container = $( curItem.container );

            const bars = data.options.barsSize;
            let barTop = 0;
            let barBot = 0;
            if ( bars ) {
                barTop = bars.top && bars.top !== 'auto' ? bars.top : 0;
                barBot = bars.bottom && bars.bottom !== 'auto' ? bars.bottom : 0;
            }
            vpH -= barTop + barBot;

            if ( ratio > vpW / vpH ) {
                resultW = vpW;
            } else {
                resultW = vpH * ratio;
            }

            $container.find( '.vp-pswp-video' ).css( 'max-width', resultW );
            $container.css( {
                top: barTop,
                bottom: barBot,
            } );
        }

        const openPhotoSwipe = function( index, galleryElement, disableAnimation, fromURL ) {
            const pswpElement = $( '.vp-pswp' )[ 0 ];
            const items = parseThumbnailElements( galleryElement );

            // define options (if needed)
            const options = {
                captionAndToolbarShowEmptyCaptions: false,
                closeEl: settingsPopupGallery.show_close_button,
                captionEl: settingsPopupGallery.show_caption,
                fullscreenEl: settingsPopupGallery.show_fullscreen_button,
                zoomEl: settingsPopupGallery.show_zoom_button,
                shareEl: settingsPopupGallery.show_share_button,
                counterEl: settingsPopupGallery.show_counter,
                arrowEl: settingsPopupGallery.show_arrows,
                shareButtons: [
                    { id: 'facebook', label: __.pswp_share_fb, url: 'https://www.facebook.com/sharer/sharer.php?u={{url}}' },
                    { id: 'twitter', label: __.pswp_share_tw, url: 'https://twitter.com/intent/tweet?text={{text}}&url={{url}}' },
                    {
                        id: 'pinterest',
                        label: __.pswp_share_pin,
                        url: 'https://www.pinterest.com/pin/create/button/' +
                        '?url={{url}}&media={{image_url}}&description={{text}}',
                    },
                ],
                bgOpacity: 1,
                tapToClose: true,
                tapToToggleControls: false,
                showHideOpacity: true,
                galleryUID: self.uid,
            };

            if ( fromURL ) {
                if ( options.galleryPIDs ) {
                    // parse real index when custom PIDs are used
                    // http://photoswipe.com/documentation/faq.html#custom-pid-in-url
                    for ( let j = 0; j < items.length; j++ ) {
                        if ( items[ j ].pid === index ) {
                            options.index = j;
                            break;
                        }
                    }
                } else {
                    options.index = parseInt( index, 10 ) - 1;
                }
            } else {
                options.index = parseInt( index, 10 );
            }

            // exit if index not found
            if ( Number.isNaN( options.index ) ) {
                return;
            }

            if ( disableAnimation ) {
                options.showAnimationDuration = 0;
            }

            // Pass data to PhotoSwipe and initialize it
            const gallery = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, items, options );

            // see: http://photoswipe.com/documentation/responsive-images.html
            let realViewportWidth;
            let useLargeImages = false;
            let firstResize = true;
            let imageSrcWillChange;

            gallery.listen( 'beforeResize', () => {
                // gallery.viewportSize.x - width of PhotoSwipe viewport
                // gallery.viewportSize.y - height of PhotoSwipe viewport
                // window.devicePixelRatio - ratio between physical pixels and device independent pixels (Number)
                //                          1 (regular display), 2 (@2x, retina) ...

                // calculate real pixels when size changes
                realViewportWidth = gallery.viewportSize.x * window.devicePixelRatio;

                // Code below is needed if you want image to switch dynamically on window.resize

                // Find out if current images need to be changed
                if ( useLargeImages && realViewportWidth < 1000 ) {
                    useLargeImages = false;
                    imageSrcWillChange = true;
                } else if ( ! useLargeImages && realViewportWidth >= 1000 ) {
                    useLargeImages = true;
                    imageSrcWillChange = true;
                }

                // Invalidate items only when source is changed and when it's not the first update
                if ( imageSrcWillChange && ! firstResize ) {
                    // invalidateCurrItems sets a flag on slides that are in DOM,
                    // which will force update of content (image) on window.resize.
                    gallery.invalidateCurrItems();
                }

                if ( firstResize ) {
                    firstResize = false;
                }

                imageSrcWillChange = false;
            } );

            gallery.listen( 'gettingData', ( idx, item ) => {
                if ( item.html ) {
                    return;
                }
                if ( useLargeImages ) {
                    item.src = item.o.src;
                    item.w = item.o.w;
                    item.h = item.o.h;
                } else {
                    item.src = item.m.src;
                    item.w = item.m.w;
                    item.h = item.m.h;
                }
            } );

            gallery.listen( 'resize', function() {
                resizeVideo( this );
            } );

            gallery.listen( 'afterChange', function() {
                resizeVideo( this );
            } );

            // remove video block
            gallery.listen( 'destroy', function() {
                const data = this;
                if ( data && data.itemHolders.length ) {
                    data.itemHolders.forEach( ( val ) => {
                        if ( val.el ) {
                            $( val.el ).find( '.vp-pswp-video' ).remove();
                        }
                    } );
                }
            } );

            gallery.init();
        };

        const photoswipeParseHash = function() {
            const hash = window.location.hash.substring( 1 );
            const params = {};

            if ( hash.length < 5 ) { // pid=1
                return params;
            }

            const vars = hash.split( '&' );
            for ( let i = 0; i < vars.length; i++ ) {
                if ( ! vars[ i ] ) {
                    continue;
                }
                const pair = vars[ i ].split( '=' );
                if ( pair.length < 2 ) {
                    continue;
                }
                params[ pair[ 0 ] ] = pair[ 1 ];
            }

            return params;
        };

        // click action
        self.$item.on( `click.vpf.vpf-uid-${ self.uid }`, '.vp-portfolio__item', function( e ) {
            e.preventDefault();

            let index = 0;
            const clicked = this;
            self.$item.find( '.vp-portfolio__item' ).each( function( idx ) {
                if ( this === clicked ) {
                    index = idx;
                    return false;
                }
                return true;
            } );
            openPhotoSwipe( index, self.$item[ 0 ] );
        } );

        // Parse URL and open gallery if it contains #&pid=3&gid=1
        const hashData = photoswipeParseHash();
        if ( hashData.pid && hashData.gid === self.uid ) {
            openPhotoSwipe( hashData.pid, self.$item[ 0 ], true, true );
        }
    }

    /**
     * Destroy Photoswipe plugin
     */
    destroyPhotoswipe() {
        const self = this;

        self.$item.off( `click.vpf.vpf-uid-${ self.uid }` );

        $( `.vp-pswp-uid-${ self.uid }` ).remove();
    }

    /**
     * Add New Items
     *
     * @param {object|dom|jQuery} $items - elements.
     * @param {bool} removeExisting - remove existing elements.
     */
    addItems( $items, removeExisting ) {
        const self = this;
        const isotope = self.$items_wrap.data( 'isotope' );
        const fjGallery = self.$items_wrap.data( 'fjGallery' );
        const Swiper = self.$items_wrap.parent()[ 0 ].swiper;

        if ( isotope ) {
            if ( removeExisting ) {
                const $existing = self.$items_wrap.find( '.vp-portfolio__item-wrap' );
                self.$items_wrap.isotope( 'remove', $existing );

                // we need to prepend items when remove existing just because Tiles layout have troubles with appending and removing items
                self.$items_wrap.prepend( $items )
                    .isotope( 'prepended', $items );
            } else {
                self.$items_wrap.append( $items )
                    .isotope( 'appended', $items );
            }

            self.initIsotope( 'layout' );

            // images loaded init
            self.$items_wrap.imagesLoaded().progress( () => {
                self.initIsotope( 'layout' );
            } );
        } else if ( fjGallery ) {
            if ( removeExisting ) {
                self.destroyFjGallery();
                self.$items_wrap.find( '.vp-portfolio__item-wrap' ).remove();
                self.$items_wrap.prepend( $items );
                self.initFjGallery();
            } else {
                self.$items_wrap.append( $items );
                self.initFjGallery( 'appendImages', $items );
            }
        } else if ( Swiper ) {
            if ( removeExisting ) {
                Swiper.removeAllSlides();
            }

            const appendArr = [];
            $items.addClass( 'swiper-slide' ).each( function() {
                appendArr.push( this );
            } );
            Swiper.appendSlide( appendArr );
        }

        self.emitEvent( 'addItems', [ $items, removeExisting ] );
    }

    /**
     * Remove Items
     *
     * @param {object|dom|jQuery} $items - elements.
     */
    removeItems( $items ) {
        const self = this;
        const isotope = self.$items_wrap.data( 'isotope' );

        if ( isotope ) {
            self.$items_wrap.isotope( 'remove', $items );
        }

        self.emitEvent( 'removeItems', [ $items ] );
    }

    /**
     * AJAX Load New Items
     *
     * @param {string} url - url to request.
     * @param {bool} removeExisting - remove existing elements.
     * @param {function} cb - callback.
     */
    loadNewItems( url, removeExisting, cb ) {
        const self = this;

        if ( self.loading || ! url ) {
            return;
        }
        self.loading = true;

        self.$item.addClass( 'vp-portfolio__loading' );

        self.emitEvent( 'startLoadingNewItems', [ url ] );

        // load to invisible container, then append to posts container
        $.get( url, {}, ( data ) => {
            data = data.replace( '<body', '<body><div id="vp-infinite-load-body"' ).replace( '</body>', '</div></body>' );
            const $body = $( data ).filter( '#vp-infinite-load-body' );

            // find current block on new page
            const $newVP = $body.find( `.vp-portfolio.vp-uid-${ self.uid }` );

            // insert new items
            if ( $newVP.length ) {
                const newItems = $newVP.find( '.vp-portfolio__items' ).html();

                // update filter
                if ( self.$filter.length ) {
                    self.$filter.each( function() {
                        const $filter = $( this );
                        let newFilterContent = '';

                        if ( $filter.parent().hasClass( 'vp-single-filter' ) ) {
                            newFilterContent = $body.find( `[class="${ $filter.parent().attr( 'class' ).replace( ' vp-single-filter__ready', '' ) }"] .vp-portfolio__filter-wrap` ).html();
                        } else {
                            newFilterContent = $newVP.find( '.vp-portfolio__filter-wrap' ).html();
                        }

                        $filter.html( newFilterContent );
                    } );
                }

                // update pagination
                if ( self.$pagination.length ) {
                    self.$pagination.html( $newVP.find( '.vp-portfolio__pagination-wrap' ).html() );
                }

                self.addItems( $( newItems ), removeExisting );

                self.emitEvent( 'loadedNewItems', [ $newVP, $newVP, data ] );
            }

            // update next page data
            const nextPageUrl = $newVP.attr( 'data-vp-next-page-url' );
            self.options.nextPageUrl = nextPageUrl;
            self.$item.attr( 'data-vp-next-page-url', nextPageUrl );

            self.$item.removeClass( 'vp-portfolio__loading' );

            self.loading = false;

            self.emitEvent( 'endLoadingNewItems' );

            // init custom colors
            self.initCustomColors();

            if ( cb ) {
                cb();
            }
        } );
    }
}

// global definition
const plugin = function( options ) {
    const args = Array.prototype.slice.call( arguments, 1 );
    let ret;

    this.each( function() {
        if ( typeof ret !== 'undefined' ) {
            return;
        }

        if ( typeof options === 'object' || typeof options === 'undefined' ) {
            if ( ! this.vpf ) {
                this.vpf = new VP( $( this ), options );
            }
        } else if ( this.vpf ) {
            ret = this.vpf[ options ]( ...args );
        }
    } );

    return typeof ret !== 'undefined' ? ret : this;
};
plugin.constructor = VP;

// no conflict
const oldPlugin = jQuery.fn.vpf;
jQuery.fn.vpf = plugin;
jQuery.fn.vpf.noConflict = function() {
    jQuery.fn.vpf = oldPlugin;
    return this;
};

// initialization
$( () => {
    $( '.vp-portfolio' ).vpf();
} );
