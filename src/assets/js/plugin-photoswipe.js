/*
 * External dependencies.
 */
import isNumber from 'is-number';

/*
 * Visual Portfolio plugin Photoswipe extension.
 */
const $ = window.jQuery;

const {
    VPData,
    VPPopupAPI,
    PhotoSwipe,
    PhotoSwipeUI_Default, // eslint-disable-line camelcase
} = window;

const {
    __,
    settingsPopupGallery,
} = VPData;

function resizeVideo( data, curItem ) {
    if ( 'undefined' === typeof curItem ) {
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
        barTop = bars.top && 'auto' !== bars.top ? bars.top : 0;
        barBot = bars.bottom && 'auto' !== bars.bottom ? bars.bottom : 0;
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

if ( PhotoSwipe && VPPopupAPI ) {
    let pswpInstance;

    // prepare photoswipe markup
    if ( ! $( '.vp-pswp' ).length ) {
        const markup = `
        <div class="pswp vp-pswp" tabindex="-1" role="dialog" aria-hidden="true">
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

    // Extend Popup API.
    VPPopupAPI.vendor = 'photoswipe';
    VPPopupAPI.open = function( items, index, self ) {
        const finalItems = [];

        // prepare items for fancybox api.
        items.forEach( ( item ) => {
            if ( 'embed' === item.type ) {
                finalItems.push( {
                    html: `<div class="vp-pswp-video"><div>${ item.embed }</div></div>`,
                    vw: item.width || 0,
                    vh: item.height || 0,
                } );
            } else {
                finalItems.push( {
                    src: item.src,
                    el: item.el,
                    w: item.width || 0,
                    h: item.height || 0,
                    title: item.caption,
                    o: {
                        src: item.src,
                        w: item.width || 0,
                        h: item.height || 0,
                    },
                    ...( item.srcMedium ? {
                        m: {
                            src: item.srcMedium,
                            w: item.srcMediumWidth || 0,
                            h: item.srcMediumHeight || 0,
                        },
                        msrc: item.srcMedium,
                    } : {} ),
                } );
            }
        } );

        const $pswpElement = $( '.vp-pswp' );
        const pswpElement = $pswpElement[ 0 ];

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
                    url: 'https://www.pinterest.com/pin/create/button/'
                    + '?url={{url}}&media={{image_url}}&description={{text}}',
                },
            ],
            bgOpacity: 1,
            tapToClose: false,
            tapToToggleControls: true,
            showHideOpacity: true,
            history: false,
            getThumbBoundsFn( thumbIndex ) {
                if ( ! finalItems[ thumbIndex ] || ! finalItems[ thumbIndex ].el ) {
                    return false;
                }

                const $el = $( finalItems[ thumbIndex ].el ).find( 'img' )[ 0 ];

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

        options.index = parseInt( index, 10 );

        // exit if index not found
        if ( ! isNumber( options.index ) ) {
            return;
        }

        if ( self ) {
            self.emitEvent( 'beforeInitPhotoSwipe', [ options, finalItems, index ] );
        }

        // Pass data to PhotoSwipe and initialize it
        pswpInstance = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, finalItems, options );

        // see: http://photoswipe.com/documentation/responsive-images.html
        let realViewportWidth;
        let useLargeImages = false;
        let firstResize = true;
        let imageSrcWillChange;

        pswpInstance.listen( 'beforeResize', () => {
            // pswpInstance.viewportSize.x - width of PhotoSwipe viewport
            // pswpInstance.viewportSize.y - height of PhotoSwipe viewport
            // window.devicePixelRatio - ratio between physical pixels and device independent pixels (Number)
            //                          1 (regular display), 2 (@2x, retina) ...

            // calculate real pixels when size changes
            realViewportWidth = pswpInstance.viewportSize.x * window.devicePixelRatio;

            // Code below is needed if you want image to switch dynamically on window.resize

            // Find out if current images need to be changed
            if ( useLargeImages && 1000 > realViewportWidth ) {
                useLargeImages = false;
                imageSrcWillChange = true;
            } else if ( ! useLargeImages && 1000 <= realViewportWidth ) {
                useLargeImages = true;
                imageSrcWillChange = true;
            }

            // Invalidate items only when source is changed and when it's not the first update
            if ( imageSrcWillChange && ! firstResize ) {
                // invalidateCurrItems sets a flag on slides that are in DOM,
                // which will force update of content (image) on window.resize.
                pswpInstance.invalidateCurrItems();
            }

            if ( firstResize ) {
                firstResize = false;
            }

            imageSrcWillChange = false;
        } );

        pswpInstance.listen( 'gettingData', ( idx, item ) => {
            if ( item.html ) {
                return;
            }
            if ( useLargeImages && item.o ) {
                if ( item.o.src ) {
                    item.src = item.o.src;
                }
                if ( item.o.w ) {
                    item.w = item.o.w;
                }
                if ( item.o.h ) {
                    item.h = item.o.h;
                }
            } else if ( item.m ) {
                if ( item.m.src ) {
                    item.src = item.m.src;
                }
                if ( item.m.w ) {
                    item.w = item.m.w;
                }
                if ( item.m.h ) {
                    item.h = item.m.h;
                }
            }
        } );

        pswpInstance.listen( 'imageLoadComplete', ( idx, item ) => {
            if ( 1 > item.h || 1 > item.w ) {
                const img = new Image();

                img.onload = () => {
                    item.w = img.width;
                    item.h = img.height;
                    pswpInstance.invalidateCurrItems();
                    pswpInstance.updateSize( true );
                };

                img.src = item.src;
            }
        } );

        pswpInstance.listen( 'resize', function() {
            resizeVideo( this );
        } );

        pswpInstance.listen( 'afterChange', function() {
            resizeVideo( this );
        } );

        // disable video play if no active.
        pswpInstance.listen( 'beforeChange', function() {
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
        pswpInstance.listen( 'destroy', function() {
            const data = this;

            if ( data && data.itemHolders.length ) {
                data.itemHolders.forEach( ( val ) => {
                    if ( val.el ) {
                        $( val.el ).find( '.vp-pswp-video' ).remove();
                    }
                } );
            }

            pswpInstance = false;
        } );

        pswpInstance.init();

        if ( self ) {
            self.emitEvent( 'initPhotoSwipe', [ options, finalItems, index, pswpInstance ] );
        }
    };
    VPPopupAPI.close = function() {
        if ( pswpInstance ) {
            pswpInstance.close();
            pswpInstance = false;
        }
    };
}
