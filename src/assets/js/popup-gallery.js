/* eslint-disable class-methods-use-this */

/*
 * Popup gallery with global API.
 */
const $ = window.jQuery;

const {
    VPData,
} = window;

const {
    settingsPopupGallery,
} = VPData;

const $wnd = $( window );

/*
 * Global Popup Gallery API.
 */
const VPPopupAPI = {
    vendor: false,

    init() {},
    open() {},
    close() {},

    /**
     * Parse video URL and return object with data
     *
     * @param {string} url - video url.
     *
     * @returns {object|boolean} video data
     */
    parseVideo( url ) {
        // Parse Youtube ID
        function getYoutubeID( ytUrl ) {
            // eslint-disable-next-line no-useless-escape
            const regExp = /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/;
            const match = ytUrl.match( regExp );
            return match && 11 === match[ 1 ].length ? match[ 1 ] : false;
        }

        // Parse Vimeo ID
        function getVimeoID( vmUrl ) {
            // eslint-disable-next-line no-useless-escape
            const regExp = /https?:\/\/(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
            const match = vmUrl.match( regExp );
            return match && match[ 3 ] ? match[ 3 ] : false;
        }

        const Youtube = getYoutubeID( url );
        const Vimeo = getVimeoID( url );
        let embedUrl = url;

        if ( Youtube ) {
            embedUrl = `https://www.youtube.com/embed/${ Youtube }`;

            return {
                vendor: 'youtube',
                id: Youtube,
                url,
                embedUrl,
                embed: `<iframe width="1920" height="1080" src="${ embedUrl }" frameborder="0" allowfullscreen></iframe>`,
            };
        } if ( Vimeo ) {
            embedUrl = `//player.vimeo.com/video/${ Vimeo }`;

            return {
                vendor: 'vimeo',
                id: Vimeo,
                url,
                embedUrl,
                embed: `<iframe width="1920" height="1080" src="${ embedUrl }" frameborder="0" allowfullscreen></iframe>`,
            };
        }

        return {
            vendor: 'unknown',
            id: url,
            url,
            embedUrl,
            embed: `<iframe width="1920" height="1080" src="${ url }" frameborder="0" allowfullscreen></iframe>`,
        };
    },

    /**
     * Parse gallery
     *
     * @param {jQuery} $gallery - gallery element.
     *
     * @returns {array} gallery data
     */
    parseGallery( $gallery ) {
        const items = [];
        let $meta;
        let size;
        let videoSize;
        let item;
        let video;
        let videoData;

        $gallery.find( '.vp-portfolio__item-wrap' ).each( function() {
            $meta = $( this ).find( '.vp-portfolio__item-popup' );

            if ( $meta && $meta.length ) {
                size = ( $meta.attr( 'data-vp-popup-img-size' ) || '1920x1080' ).split( 'x' );
                videoSize = '1920x1080'.split( 'x' );
                video = $meta.attr( 'data-vp-popup-video' );
                videoData = false;

                if ( video ) {
                    videoData = VPPopupAPI.parseVideo( video );
                }

                if ( videoData ) {
                    item = {
                        type: 'embed',
                        el: this,
                        src: videoData.embedUrl,
                        embed: videoData.embed,
                        width: parseInt( videoSize[ 0 ], 10 ),
                        height: parseInt( videoSize[ 1 ], 10 ),
                    };
                } else {
                    // create slide object
                    item = {
                        type: 'image',
                        el: this,
                        src: $meta.attr( 'data-vp-popup-img' ),
                        srcset: $meta.attr( 'data-vp-popup-img-srcset' ),
                        width: parseInt( size[ 0 ], 10 ),
                        height: parseInt( size[ 1 ], 10 ),
                    };

                    const srcSmall = $meta.attr( 'data-vp-popup-sm-img' ) || item.src;
                    if ( srcSmall ) {
                        const smallSize = ( $meta.attr( 'data-vp-popup-sm-img-size' ) || $meta.attr( 'data-vp-popup-img-size' ) || '1920x1080' ).split( 'x' );

                        item.srcSmall = srcSmall;
                        item.srcSmallWidth = parseInt( smallSize[ 0 ], 10 );
                        item.srcSmallHeight = parseInt( smallSize[ 1 ], 10 );
                    }

                    const srcMedium = $meta.attr( 'data-vp-popup-md-img' ) || item.src;
                    if ( srcMedium ) {
                        const mediumSize = ( $meta.attr( 'data-vp-popup-md-img-size' ) || $meta.attr( 'data-vp-popup-img-size' ) || '1920x1080' ).split( 'x' );

                        item.srcMedium = srcMedium;
                        item.srcMediumWidth = parseInt( mediumSize[ 0 ], 10 );
                        item.srcMediumHeight = parseInt( mediumSize[ 1 ], 10 );
                    }

                    const $captionTitle = $meta.children( '.vp-portfolio__item-popup-title' ).get( 0 );
                    const $captionDescription = $meta.children( '.vp-portfolio__item-popup-description' ).get( 0 );
                    if ( $captionTitle || $captionDescription ) {
                        item.caption = ( $captionTitle ? $captionTitle.outerHTML : '' ) + ( $captionDescription ? $captionDescription.outerHTML : '' );
                    }
                }

                items.push( item );
            }
        } );

        return items;
    },
};

window.VPPopupAPI = VPPopupAPI;

// Extend VP class.
$( document ).on( 'extendClass.vpf', ( event, VP ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    /**
     * Init popup gallery
     */
    VP.prototype.initPopupGallery = function() {
        const self = this;

        if ( ! self.options.itemsClickAction || 'popup_gallery' !== self.options.itemsClickAction ) {
            return;
        }

        // prevent on preview page
        if ( self.isPreview() ) {
            return;
        }

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

            if ( 0 > index ) {
                index = 0;
            }

            const items = VPPopupAPI.parseGallery( self.$item );

            VPPopupAPI.open( items, index, self );
        } );

        // close on scroll
        $wnd.on( `scroll.vpf-uid-${ self.uid }`, () => {
            VPPopupAPI.close();
        } );
    };

    /**
     * Destroy popup gallery
     */
    VP.prototype.destroyPopupGallery = function() {
        const self = this;

        if ( ! self.options.itemsClickAction || 'popup_gallery' !== self.options.itemsClickAction ) {
            return;
        }

        self.$item.off( `click.vpf-uid-${ self.uid }` );

        self.emitEvent( 'destroyPopupGallery' );
    };
} );

// Init.
$( document ).on( 'init.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.initPopupGallery();
} );

// Destroy.
$( document ).on( 'destroy.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.destroyPopupGallery();
} );

// Check if link is image.
function isLinkImage( link ) {
    return /(.png|.jpg|.jpeg|.gif|.tiff|.bmp|.webp)$/.test( link.href.toLowerCase().split( '?' )[ 0 ].split( '#' )[ 0 ] );
}

// Parse image data from link.
function parseImgData( link ) {
    const img = link.childNodes[ 0 ];
    const $link = $( link );
    let caption = $link.next( 'figcaption' );

    if ( ! caption.length && $link.parent( '.gallery-icon' ).length ) {
        caption = $link.parent( '.gallery-icon' ).next( 'figcaption' );
    }

    caption = caption.html();

    if ( caption ) {
        caption = `<div class="vp-portfolio__item-popup-description">${ caption }</div>`;
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
if ( settingsPopupGallery.enable_on_wordpress_images ) {
    $( document ).on( 'click', `
        .wp-block-image > a,
        .wp-block-image > figure > a,
        .wp-block-gallery .blocks-gallery-item > figure > a,
        .wp-block-media-text > figure > a,
        .gallery .gallery-icon > a,
        figure.wp-caption > a,
        figure.tiled-gallery__item > a,
        p > a
    `, function( e ) {
        // check if child node is <img> tag.
        if ( 1 !== this.childNodes.length || 'IMG' !== this.childNodes[ 0 ].nodeName ) {
            return;
        }

        // check if link is image.
        if ( ! isLinkImage( this ) ) {
            return;
        }

        e.preventDefault();

        const $this = $( this );
        const items = [];
        const currentImage = parseImgData( this );
        const $gallery = $this.closest( '.wp-block-gallery, .gallery, .tiled-gallery__gallery' );
        let activeIndex = 0;

        // Block gallery, WordPress default gallery, Jetpack gallery.
        if ( $gallery.length ) {
            const $galleryItems = $gallery.find( '.blocks-gallery-item > figure > a, .gallery-icon > a, figure.tiled-gallery__item > a' );
            let i = 0;

            $galleryItems.each( function() {
                // check if link is image.
                if ( isLinkImage( this ) ) {
                    if ( this === currentImage.linkEl ) {
                        activeIndex = i;
                    }

                    items.push( parseImgData( this ) );

                    i += 1;
                }
            } );

            // WordPress gallery.
        } else {
            items.push( currentImage );
        }

        VPPopupAPI.open( items, activeIndex );
    } );
}
