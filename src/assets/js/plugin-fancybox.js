/*
 * Visual Portfolio plugin Fancubox extension.
 */
const $ = window.jQuery;

const {
    VPData,
} = window;

const {
    __,
    settingsPopupGallery,
} = VPData;

const $wnd = $( window );

// Extend VP class.
$( document ).on( 'extendClass.vpf', ( event, VP ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    /**
     * Init Fancybox plugin
     */
    VP.prototype.initFancybox = function() {
        const self = this;
        let fancyboxInstance;

        if ( typeof $.fancybox === 'undefined' || ! self.options.itemsClickAction || self.options.itemsClickAction !== 'popup_gallery' || 'fancybox' !== settingsPopupGallery.vendor ) {
            return;
        }

        // prevent on preview page
        if ( self.isPreview() ) {
            return;
        }

        // find all elements
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
                            type: 'iframe',
                            src: videoData.embedUrl,
                            opts: {
                                width: parseInt( videoSize[ 0 ], 10 ),
                                height: parseInt( videoSize[ 1 ], 10 ),
                            },
                        };
                    } else {
                        // create slide object
                        item = {
                            type: 'image',
                            src: $meta.attr( 'data-vp-popup-img' ),
                            opts: {
                                width: parseInt( size[ 0 ], 10 ),
                                height: parseInt( size[ 1 ], 10 ),
                                srcset: $meta.attr( 'data-vp-popup-img-srcset' ),
                            },
                        };

                        const $captionTitle = $meta.children( '.vp-portfolio__item-popup-title' ).get( 0 );
                        const $captionDescription = $meta.children( '.vp-portfolio__item-popup-description' ).get( 0 );
                        if ( $captionTitle || $captionDescription ) {
                            item.opts.caption = ( $captionTitle ? $captionTitle.outerHTML : '' ) + ( $captionDescription ? $captionDescription.outerHTML : '' );
                        }

                        // save link to element for getThumbBoundsFn
                        item.el = this;

                        const smallSrc = $meta.attr( 'data-vp-popup-sm-img' ) || item.src;
                        if ( smallSrc ) {
                            item.opts.thumb = smallSrc;
                        }
                    }

                    items.push( item );
                }
            } );

            return items;
        };

        const openFancybox = function( index, galleryElement ) {
            const items = parseThumbnailElements( galleryElement );

            const buttons = [];
            if ( settingsPopupGallery.show_zoom_button ) {
                buttons.push( 'zoom' );
            }
            if ( settingsPopupGallery.show_fullscreen_button ) {
                buttons.push( 'fullScreen' );
            }
            if ( settingsPopupGallery.show_slideshow ) {
                buttons.push( 'slideShow' );
            }
            if ( settingsPopupGallery.show_thumbs ) {
                buttons.push( 'thumbs' );
            }
            if ( settingsPopupGallery.show_share_button ) {
                buttons.push( 'share' );
            }
            if ( settingsPopupGallery.show_download_button ) {
                buttons.push( 'download' );
            }
            if ( settingsPopupGallery.show_close_button ) {
                buttons.push( 'close' );
            }

            // define options
            const options = {
                // Close existing modals
                // Set this to false if you do not need to stack multiple instances
                closeExisting: true,

                // Enable infinite gallery navigation
                loop: true,

                // Should display navigation arrows at the screen edges
                arrows: settingsPopupGallery.show_arrows,

                // Should display counter at the top left corner
                infobar: settingsPopupGallery.show_counter,

                // Should display close button (using `btnTpl.smallBtn` template) over the content
                // Can be true, false, "auto"
                // If "auto" - will be automatically enabled for "html", "inline" or "ajax" items
                smallBtn: false,

                // Should display toolbar (buttons at the top)
                // Can be true, false, "auto"
                // If "auto" - will be automatically hidden if "smallBtn" is enabled
                toolbar: 'auto',

                // What buttons should appear in the top right corner.
                // Buttons will be created using templates from `btnTpl` option
                // and they will be placed into toolbar (class="fancybox-toolbar"` element)
                buttons,

                // Custom CSS class for layout
                baseClass: 'vp-fancybox',

                // Hide browser vertical scrollbars; use at your own risk
                hideScrollbar: false,

                // Use mousewheel to navigate gallery
                // If 'auto' - enabled for images only
                wheel: false,

                lang: 'wordpress',
                i18n: {
                    wordpress: {
                        CLOSE: __.fancybox_close,
                        NEXT: __.fancybox_next,
                        PREV: __.fancybox_prev,
                        ERROR: __.fancybox_error,
                        PLAY_START: __.fancybox_play_start,
                        PLAY_STOP: __.fancybox_play_stop,
                        FULL_SCREEN: __.fancybox_full_screen,
                        THUMBS: __.fancybox_thumbs,
                        DOWNLOAD: __.fancybox_download,
                        SHARE: __.fancybox_share,
                        ZOOM: __.fancybox_zoom,
                    },
                },

                beforeClose() {
                    fancyboxInstance = false;
                },
            };

            self.emitEvent( 'beforeInitFancybox', [ options, items, index ] );

            // Start new fancybox instance
            fancyboxInstance = $.fancybox.open( items, options, index );

            self.emitEvent( 'initFancybox', [ options, items, index ] );
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

            openFancybox( index, self.$item[ 0 ] );
        } );

        // close on scroll
        $wnd.on( `scroll.vpf-uid-${ self.uid }`, () => {
            if ( fancyboxInstance ) {
                fancyboxInstance.close();
                fancyboxInstance = false;
            }
        } );
    };

    /**
     * Destroy Fancybox plugin
     */
    VP.prototype.destroyFancybox = function() {
        const self = this;

        if ( typeof $.fancybox === 'undefined' || ! self.options.itemsClickAction || self.options.itemsClickAction !== 'popup_gallery' || 'fancybox' !== settingsPopupGallery.vendor ) {
            return;
        }

        self.$item.off( `click.vpf-uid-${ self.uid }` );

        self.emitEvent( 'destroyFancybox' );
    };
} );

// Init.
$( document ).on( 'init.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.initFancybox();
} );

// Destroy.
$( document ).on( 'destroy.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.destroyFancybox();
} );
