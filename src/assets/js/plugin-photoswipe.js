/*
 * Visual Portfolio plugin Photoswipe extension.
 */
const $ = window.jQuery;

const {
    VPData,
    PhotoSwipe,
    PhotoSwipeUI_Default, // eslint-disable-line camelcase
} = window;

const {
    __,
    settingsPopupGallery,
} = VPData;

// Extend VP class.
$( document ).on( 'extendClass.vpf', ( event, VP ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    /**
     * Init Photoswipe plugin
     */
    VP.prototype.initPhotoswipe = function() {
        const self = this;

        if ( typeof PhotoSwipe === 'undefined' || ! self.options.itemsClickAction || self.options.itemsClickAction !== 'popup_gallery' || 'photoswipe' !== settingsPopupGallery.vendor ) {
            return;
        }

        // prevent on preview page
        if ( self.isPreview() ) {
            return;
        }

        // prepare photoswipe markup
        if ( ! $( '.vp-pswp' ).length ) {
            const markup = `
            <div class="pswp vp-pswp vp-pswp-uid-${ self.uid }" tabindex="-1" role="dialog" aria-hidden="true">
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
                            <button class="pswp__button pswp__button--close" title="${ __.pswp_close }"></button>
                            <button class="pswp__button pswp__button--share" title="${ __.pswp_share }"></button>
                            <button class="pswp__button pswp__button--fs" title="${ __.pswp_fs }"></button>
                            <button class="pswp__button pswp__button--zoom" title="${ __.pswp_zoom }"></button>
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
                        <button class="pswp__button pswp__button--arrow--left" title="${ __.pswp_prev }"></button>
                        <button class="pswp__button pswp__button--arrow--right" title="${ __.pswp_next }"></button>
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
            let videoData;

            thumbElements.each( function() {
                $meta = $( this ).find( '.vp-portfolio__item-popup' );

                if ( $meta && $meta.length ) {
                    size = ( $meta.attr( 'data-vp-popup-img-size' ) || '1920x1080' ).split( 'x' );
                    videoSize = '1920x1080'.split( 'x' );
                    video = $meta.attr( 'data-vp-popup-video' );
                    videoData = false;

                    if ( video ) {
                        videoData = self.parseVideo( video );
                    }

                    if ( videoData ) {
                        item = {
                            html: `<div class="vp-pswp-video"><div>${ videoData.embed }</div></div>`,
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

                        const $captionTitle = $meta.children( '.vp-portfolio__item-popup-title' ).get( 0 );
                        const $captionDescription = $meta.children( '.vp-portfolio__item-popup-description' ).get( 0 );
                        if ( $captionTitle || $captionDescription ) {
                            item.title = ( $captionTitle ? $captionTitle.outerHTML : '' ) + ( $captionDescription ? $captionDescription.outerHTML : '' );
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

                            // thumbnail
                            item.msrc = mediumSrc;
                        }

                        // original image
                        item.o = {
                            src: item.src,
                            w: item.w,
                            h: item.h,
                        };
                    }

                    items.push( item );
                }
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
            const vpW = data.viewportSize.x;
            let vpH = data.viewportSize.y;
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
            const $pswpElement = $( '.vp-pswp' );
            const pswpElement = $pswpElement[ 0 ];
            const items = parseThumbnailElements( galleryElement );

            // define options (if needed)
            const options = {
                captionAndToolbarShowEmptyCaptions: false,
                closeEl: settingsPopupGallery.show_close_button,
                captionEl: true,
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
                tapToClose: false,
                tapToToggleControls: true,
                showHideOpacity: true,
                galleryUID: self.uid,
                getThumbBoundsFn( thumbIndex ) {
                    if ( ! items[ thumbIndex ] || ! items[ thumbIndex ].el ) {
                        return false;
                    }

                    const $el = $( items[ thumbIndex ].el ).find( 'img' )[ 0 ];

                    if ( ! $el ) {
                        return false;
                    }

                    const rect = $el.getBoundingClientRect();
                    const pageYScroll = window.pageYOffset || document.documentElement.scrollTop;
                    const pswpTop = parseFloat( $pswpElement.css( 'top' ) ) || 0;

                    return {
                        x: rect.left,
                        y: rect.top + pageYScroll - pswpTop,
                        w: rect.width,
                        h: rect.height,
                    };
                },
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
            if ( isNaN( options.index ) ) {
                return;
            }

            if ( disableAnimation ) {
                options.showAnimationDuration = 0;
            }

            self.emitEvent( 'beforeInitPhotoSwipe', [ options, items, index ] );

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

            // disable video play if no active.
            gallery.listen( 'beforeChange', function() {
                const data = this;
                if ( data && data.itemHolders.length ) {
                    const currentIndex = data.getCurrentIndex();

                    data.itemHolders.forEach( ( val ) => {
                        if ( val.el && val.index !== currentIndex ) {
                            const $iframe = $( val.el ).find( '.vp-pswp-video iframe' );
                            if ( $iframe.length ) {
                                $iframe.attr( 'src', $iframe.attr( 'src' ) );
                            }
                        }
                    } );
                }
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

            self.emitEvent( 'initPhotoSwipe', [ options, items, index ] );
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
        self.$item.on( `click.vpf-uid-${ self.uid }`, '.vp-portfolio__item', function( e ) {
            if ( ! $( this ).closest( '.vp-portfolio__item-wrap' ).find( '.vp-portfolio__item-popup' ).length ) {
                return;
            }

            e.preventDefault();

            let index = -1;
            const clicked = this;
            self.$item.find( '.vp-portfolio__item-wrap .vp-portfolio__item-popup' ).each( function( idx ) {
                if ( -1 === index && $( this ).closest( '.vp-portfolio__item-wrap' ).find( '.vp-portfolio__item' )[ 0 ] === clicked ) {
                    index = idx;
                }
            } );

            if ( index < 0 ) {
                index = 0;
            }

            openPhotoSwipe( index, self.$item[ 0 ] );
        } );

        // Parse URL and open gallery if it contains #&pid=3&gid=1
        const hashData = photoswipeParseHash();
        if ( hashData.pid && hashData.gid === self.uid ) {
            openPhotoSwipe( hashData.pid, self.$item[ 0 ], true, true );
        }
    };

    /**
     * Destroy Photoswipe plugin
     */
    VP.prototype.destroyPhotoswipe = function() {
        const self = this;

        if ( typeof PhotoSwipe === 'undefined' || ! self.options.itemsClickAction || self.options.itemsClickAction !== 'popup_gallery' || 'photoswipe' !== settingsPopupGallery.vendor ) {
            return;
        }

        self.$item.off( `click.vpf-uid-${ self.uid }` );

        $( `.vp-pswp-uid-${ self.uid }` ).remove();

        self.emitEvent( 'destroyPhotoSwipe' );
    };
} );

// Init.
$( document ).on( 'init.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.initPhotoswipe();
} );

// Destroy.
$( document ).on( 'destroy.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.destroyPhotoswipe();
} );
