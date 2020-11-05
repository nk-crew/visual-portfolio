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

/*
 * Global Popup Gallery API.
 */
const VPPopupAPI = {
    vendor: false,

    vendors: [
        {
            vendor: 'youtube',
            embedUrl: 'https://www.youtube.com/embed/{{video_id}}',
            pattern: /(https?:\/\/)?(www.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\/(?:embed\/|v\/|watch\?v=|watch\?list=(.*)&v=|watch\?(.*[^&]&)v=)?((\w|-){11})(&list=(\w+)&?)?/,
            patternIndex: 6,
        },
        {
            vendor: 'vimeo',
            embedUrl: 'https://player.vimeo.com/video/{{video_id}}',
            // eslint-disable-next-line no-useless-escape
            pattern: /https?:\/\/(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/,
            patternIndex: 3,
        },
    ],

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
        let result = false;

        VPPopupAPI.vendors.forEach( ( vendorData ) => {
            if ( ! result ) {
                const match = url.match( vendorData.pattern );
                const videoId = match && match[ vendorData.patternIndex ] ? match[ vendorData.patternIndex ] : false;

                if ( videoId ) {
                    if ( vendorData.embedCallback ) {
                        result = vendorData.embedCallback( url, match );
                    } else {
                        let { embedUrl } = vendorData;
                        embedUrl = embedUrl.replace( /{{video_id}}/g, videoId );
                        embedUrl = embedUrl.replace( /{{video_url}}/g, url );
                        embedUrl = embedUrl.replace( /{{video_url_encoded}}/g, encodeURIComponent( url ) );

                        const width = vendorData.width || 1920;
                        const height = vendorData.height || 1080;

                        result = {
                            vendor: vendorData.vendor,
                            id: videoId,
                            embed: `<iframe width="${ width }" height="${ height }" src="${ embedUrl }" scrolling="no" frameborder="0" allowTransparency="true" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>`,
                            embedUrl,
                            url,
                            width,
                            height,
                        };
                    }
                }
            }
        } );

        return result || {
            vendor: 'unknown',
            id: url,
            url,
            embedUrl: url,
            embed: `<iframe width="1920" height="1080" src="${ url }" scrolling="no" frameborder="0" allowTransparency="true" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe>`,
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
        let item;
        let video;
        let videoData;

        // Find all gallery items
        // Prevent Swiper slider duplicates.
        $gallery.find( '.vp-portfolio__item-wrap:not(.swiper-slide-duplicate):not(.swiper-slide-duplicate-active)' ).each( function() {
            $meta = $( this ).find( '.vp-portfolio__item-popup' );

            if ( $meta && $meta.length ) {
                size = ( $meta.attr( 'data-vp-popup-img-size' ) || '1920x1080' ).split( 'x' );
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
                        width: videoData.width || 1920,
                        height: videoData.height || 1080,
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
        self.$item.on( `click.vpf-uid-${ self.uid }`, '.vp-portfolio__item a.vp-portfolio__item-meta, .vp-portfolio__item .vp-portfolio__item-img > a, .vp-portfolio__item .vp-portfolio__item-meta-title > a', function( e ) {
            const $this = $( this );

            if ( ! $this.closest( '.vp-portfolio__item-wrap' ).find( '.vp-portfolio__item-popup' ).length ) {
                return;
            }

            e.preventDefault();

            let index = -1;
            const clicked = $this.closest( '.vp-portfolio__item' )[ 0 ];

            // Find all gallery items
            // Prevent Swiper slider duplicates.
            self.$item.find( '.vp-portfolio__item-wrap:not(.swiper-slide-duplicate):not(.swiper-slide-duplicate-active) .vp-portfolio__item-popup' ).each( function( idx ) {
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
    const $link = $( link );
    let img = link.childNodes[ 0 ];
    let caption = $link.next( 'figcaption' );

    // <noscript> tag used in plugins, that adds lazy loading
    if ( 'NOSCRIPT' === img.nodeName && link.childNodes[ 1 ] ) {
        // eslint-disable-next-line prefer-destructuring
        img = link.childNodes[ 1 ];
    }

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
        if ( ! this.childNodes.length ) {
            return;
        }

        let imageNode = this.childNodes[ 0 ];

        // <noscript> tag used in plugins, that adds lazy loading
        if ( 'NOSCRIPT' === imageNode.nodeName && this.childNodes[ 1 ] ) {
            // eslint-disable-next-line prefer-destructuring
            imageNode = this.childNodes[ 1 ];
        }

        // check if child node is <img> or <picture> tag.
        // <picture> tag used in plugins, that adds WebP support
        if ( 'IMG' !== imageNode.nodeName && 'PICTURE' !== imageNode.nodeName ) {
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
