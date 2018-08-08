( function( window, factory ) {
    const globalInstall = function() {
        factory( window.lazySizes );
        window.removeEventListener( 'lazyunveilread', globalInstall, true );
    };
    factory = factory.bind( null, window, window.document );

    if ( window.lazySizes ) {
        globalInstall();
    } else {
        window.addEventListener( 'lazyunveilread', globalInstall, true );
    }
}( window, function( window, document, lazySizes ) {
    'use strict';

    if ( ! window.addEventListener ) {
        return;
    }

    const getCSS = function( elem ) {
        return ( window.getComputedStyle( elem, null ) || {} );
    };

    const objectFitCover = {
        calculateSize: function( element, width ) {
            const CSS = getCSS( element );

            if ( CSS && CSS.objectFit && CSS.objectFit === 'cover' ) {
                const blockHeight = parseInt( element.getAttribute( 'height' ) );
                const blockWidth = parseInt( element.getAttribute( 'width' ) );

                if ( blockHeight ) {
                    if ( blockWidth / blockHeight > element.clientWidth / element.clientHeight ) {
                        width = parseInt( element.clientHeight * blockWidth / blockHeight, 10 );
                    }
                }
            }

            return width;
        },
    };

    lazySizes.objectFitCover = objectFitCover;

    document.addEventListener( 'lazybeforesizes', function( e ) {
        if ( e.defaultPrevented || e.detail.instance !== lazySizes ) {
            return;
        }

        const element = e.target;
        e.detail.width = objectFitCover.calculateSize( element, e.detail.width );
    } );
} ) );
