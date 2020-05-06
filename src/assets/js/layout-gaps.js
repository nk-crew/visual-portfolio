/*
 * Visual Portfolio layout Gaps.
 */
const $ = window.jQuery;

// Init Layout.
$( document ).on( 'initLayout.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    const gap = parseInt( self.options.itemsGap, 10 );

    if ( ! gap || ! ( 'tiles' === self.options.layout || 'masonry' === self.options.layout || 'grid' === self.options.layout ) ) {
        return;
    }

    self.addStyle( '.vp-portfolio__items', {
        'margin-left': `-${ gap }px`,
        'margin-top': `-${ gap }px`,
    } );

    const gapStyle = `${ gap }px`;

    // we need to add this long selector to prevent conflicts with Elementor.
    // related topic: https://wordpress.org/support/topic/gap-feature-does-not-work/#post-11403735
    self.addStyle( '.vp-portfolio__items .vp-portfolio__item-wrap .vp-portfolio__item', {
        'margin-left': gapStyle,
        'margin-top': gapStyle,
    } );

    // tiles
    if ( 'tiles' === self.options.layout ) {
        self.addStyle( '.vp-portfolio__item-wrap .vp-portfolio__item-img-wrap', {
            'margin-left': `-${ gapStyle }`,
            'margin-top': `-${ gapStyle }`,
        } );
        self.addStyle( '.vp-portfolio__item-wrap .vp-portfolio__item-img', {
            left: gapStyle,
            top: gapStyle,
        } );
    }
} );
