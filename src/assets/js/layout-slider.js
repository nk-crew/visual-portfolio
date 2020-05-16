/*
 * External dependencies.
 */
import isNumber from 'is-number';

/*
 * Visual Portfolio layout Slider.
 */
const $ = window.jQuery;

// Init Layout.
$( document ).on( 'initLayout.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    if ( 'slider' !== self.options.layout ) {
        return;
    }

    [ 'items', 'thumbnails' ].forEach( ( type ) => {
        let itemsHeight = 'items' === type ? self.options.sliderItemsHeight : self.options.sliderThumbnailsHeight;
        let itemsMinHeight = 'items' === type ? self.options.sliderItemsMinHeight : 0;
        const typeSingle = type.replace( /s$/g, '' );

        if ( 'auto' === itemsHeight ) {
            return;
        }

        itemsHeight = isNumber( itemsHeight ) ? `${ itemsHeight }px` : itemsHeight;

        // prevent minHeight option in preview, when used 'vh' units.
        if ( itemsMinHeight && self.isPreview() && /vh/.test( itemsMinHeight ) ) {
            itemsMinHeight = 0;
        }

        const itemsPerView = 'items' === type ? self.options.sliderSlidesPerView : self.options.sliderThumbnailsPerView;

        if ( 'auto' === itemsPerView ) {
            // fix fade slider items width.
            // https://github.com/nk-o/visual-portfolio/issues/95.
            let itemsWidth = 'auto';
            if ( 'items' === type && 'fade' === self.options.sliderEffect ) {
                itemsWidth = '100%';
            }

            // dynamic.
            if ( itemsHeight.indexOf( '%' ) === itemsHeight.length - 1 ) {
                self.addStyle( `.vp-portfolio__${ type }-wrap::before`, {
                    content: '""',
                    display: 'block',
                    width: '100%',
                    'margin-top': itemsHeight,
                } );
                self.addStyle( `.vp-portfolio__${ type }`, {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                } );
                self.addStyle( `.vp-portfolio__${ typeSingle }-wrap`, {
                    width: 'auto',
                    height: 'true' === self.options.sliderBullets ? 'calc( 100% - 25px )' : '100%',
                } );
                self.addStyle( `.vp-portfolio__${ typeSingle }, .vp-portfolio__${ typeSingle }-img-wrap, .vp-portfolio__${ typeSingle }-img, .vp-portfolio__${ typeSingle }-wrap .vp-portfolio__${ typeSingle } .vp-portfolio__${ typeSingle }-img a, .vp-portfolio__${ typeSingle }-wrap .vp-portfolio__${ typeSingle } .vp-portfolio__${ typeSingle }-img img`, {
                    width: itemsWidth,
                    height: '100%',
                } );

                // min height.
                if ( itemsMinHeight ) {
                    self.addStyle( `.vp-portfolio__${ type }-wrap`, {
                        'min-height': itemsMinHeight,
                    } );
                }

            // static.
            } else {
                self.addStyle( `.vp-portfolio__${ typeSingle }-wrap`, {
                    width: 'auto',
                } );
                self.addStyle( `.vp-portfolio__${ typeSingle } .vp-portfolio__${ typeSingle }-img img`, {
                    width: itemsWidth,
                    height: itemsHeight,
                } );

                // min height.
                if ( itemsMinHeight ) {
                    self.addStyle( `.vp-portfolio__${ typeSingle } .vp-portfolio__${ typeSingle }-img img`, {
                        'min-height': itemsMinHeight,
                    } );
                }
            }
        } else {
            self.addStyle( `.vp-portfolio__${ typeSingle }-img-wrap::before`, {
                'margin-top': itemsHeight,
            } );
            self.addStyle( `.vp-portfolio__${ typeSingle }-img img`, {
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
            } );
            self.addStyle( `.vp-portfolio__${ typeSingle }-img`, {
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
            } );
            self.addStyle( `.vp-portfolio__${ typeSingle } .vp-portfolio__${ typeSingle }-img img`, {
                width: '100%',
                height: '100%',
            } );

            // min height.
            if ( itemsMinHeight ) {
                self.addStyle( `.vp-portfolio__${ typeSingle }-img-wrap`, {
                    'min-height': itemsMinHeight,
                } );
            }
        }
    } );

    // thumbnails top gap.
    if ( self.options.sliderThumbnailsGap ) {
        self.addStyle( '.vp-portfolio__thumbnails-wrap', {
            'margin-top': `${ self.options.sliderThumbnailsGap }px`,
        } );
    }
} );
