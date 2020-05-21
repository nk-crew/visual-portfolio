/*
 * Visual Portfolio layout Tiles.
 */
const $ = window.jQuery;

const {
    screenSizes,
} = window.VPData;

// fix masonry items position for Tiles layout.
// https://github.com/nk-o/visual-portfolio/issues/111
if ( 'undefined' !== typeof window.Isotope && 'undefined' !== typeof window.Isotope.LayoutMode ) {
    const MasonryMode = window.Isotope.LayoutMode.modes.masonry;

    if ( MasonryMode ) {
        const defaultMeasureColumns = MasonryMode.prototype.measureColumns;
        MasonryMode.prototype.measureColumns = function() {
            let runDefault = true;

            // if columnWidth is 0, default to columns count size.
            if ( ! this.columnWidth ) {
                const $vp = $( this.element ).closest( '.vp-portfolio[data-vp-layout="tiles"]' );

                // change column size for Tiles type only.
                if ( $vp.length && $vp[ 0 ].vpf ) {
                    const { vpf } = $vp[ 0 ];
                    const settings = vpf.getTilesSettings();

                    // get columns number
                    let columns = parseInt( settings[ 0 ], 10 ) || 1;

                    // calculate responsive.
                    let count = columns - 1;
                    let currentPoint = Math.min( screenSizes.length - 1, count );

                    for ( ; 0 <= currentPoint; currentPoint -= 1 ) {
                        if ( 0 < count && 'undefined' !== typeof screenSizes[ currentPoint ] ) {
                            if ( window.innerWidth <= screenSizes[ currentPoint ] ) {
                                columns = count;
                            }
                        }
                        count -= 1;
                    }

                    if ( columns ) {
                        this.columnWidth = this.containerWidth / columns;
                        this.columnWidth += this.gutter;
                        this.cols = columns;
                        runDefault = false;
                    }
                }
            }

            if ( runDefault ) {
                defaultMeasureColumns.call( this );
            }
        };
    }
}

// Extend VP class.
$( document ).on( 'extendClass.vpf', ( event, VP ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    /**
     * Get Tiles Layout Settings
     *
     * @returns {string} tiles layout
     */
    VP.prototype.getTilesSettings = function() {
        const self = this;

        const layoutArr = self.options.tilesType.split( /[:|]/ );

        // remove last empty item
        if ( 'undefined' !== typeof layoutArr[ layoutArr.length - 1 ] && ! layoutArr[ layoutArr.length - 1 ] ) {
            layoutArr.pop();
        }

        return layoutArr;
    };
} );

// Init Options.
$( document ).on( 'initOptions.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.defaults.tilesType = '3|1,1|';

    if ( ! self.options.tilesType ) {
        self.options.tilesType = self.defaults.tilesType;
    }
} );

// Init Layout.
$( document ).on( 'initLayout.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    if ( 'tiles' !== self.options.layout ) {
        return;
    }

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
        for ( let k = 0; k < settings.length; k += 1 ) {
            const size = settings[ k ].split( ',' );
            const w = parseFloat( size[ 0 ] ) || 1;
            const h = parseFloat( size[ 1 ] ) || 1;

            let itemSelector = '.vp-portfolio__item-wrap';
            if ( 1 < settings.length ) {
                itemSelector += `:nth-of-type(${ settings.length }n+${ k + 1 })`;
            }

            if ( w && 1 !== w ) {
                self.addStyle( itemSelector, {
                    width: `${ ( w * 100 ) / columns }%`,
                } );
            }
            self.addStyle( `${ itemSelector } .vp-portfolio__item-img-wrap::before`, {
                'padding-top': `${ h * 100 }%`,
            } );
        }
    }

    // calculate responsive.
    let count = columns - 1;
    let currentPoint = Math.min( screenSizes.length - 1, count );

    for ( ; 0 <= currentPoint; currentPoint -= 1 ) {
        if ( 0 < count && 'undefined' !== typeof screenSizes[ currentPoint ] ) {
            self.addStyle( '.vp-portfolio__item-wrap', {
                width: `${ 100 / count }%`,
            }, `screen and (max-width: ${ screenSizes[ currentPoint ] }px)` );
            self.addStyle( '.vp-portfolio__item-wrap:nth-of-type(n)', {
                width: `${ 100 / count }%`,
            }, `screen and (max-width: ${ screenSizes[ currentPoint ] }px)` );
        }
        count -= 1;
    }
} );
