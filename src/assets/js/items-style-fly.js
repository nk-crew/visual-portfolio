/*
 * Visual Portfolio items style Fly.
 */
const $ = window.jQuery;
const $wnd = $( window );

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
function isCrossLine( a, b, c, d ) {
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
    return ( ( 0 >= v1 * v2 ) && ( 0 >= v3 * v4 ) );
}

// Init Events.
$( document ).on( 'initEvents.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace || 'fly' !== self.options.itemsStyle ) {
        return;
    }

    const evp = `.vpf-uid-${ self.uid }`;

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
        const enter = 'mouseenter' === e.type;
        let endX = '0%';
        let endY = '0%';
        const curCursorPos = {
            x: e.clientX,
            y: e.clientY,
        };

        // find the corner that placed on cursor path.
        let isUp = isCrossLine(
            { x: itemRect.left, y: itemRect.top },
            { x: itemRect.left + itemRect.width, y: itemRect.top },
            curCursorPos, lastCursorPos,
        );
        let isDown = isCrossLine(
            { x: itemRect.left, y: itemRect.top + itemRect.height },
            { x: itemRect.left + itemRect.width, y: itemRect.top + itemRect.height },
            curCursorPos, lastCursorPos,
        );
        let isLeft = isCrossLine(
            { x: itemRect.left, y: itemRect.top },
            { x: itemRect.left, y: itemRect.top + itemRect.height },
            curCursorPos, lastCursorPos,
        );
        let isRight = isCrossLine(
            { x: itemRect.left + itemRect.width, y: itemRect.top },
            { x: itemRect.left + itemRect.width, y: itemRect.top + itemRect.height },
            curCursorPos, lastCursorPos,
        );

        // Sometimes isCrossLine returned false, so we need to check direction manually (less accurate, but it is not a big problem).
        if ( ! isUp && ! isDown && ! isLeft && ! isRight ) {
            const x = ( ( itemRect.width / 2 ) - curCursorPos.x + itemRect.left ) / ( itemRect.width / 2 );
            const y = ( ( itemRect.height / 2 ) - curCursorPos.y + itemRect.top ) / ( itemRect.height / 2 );
            if ( Math.abs( x ) > Math.abs( y ) ) {
                if ( 0 < x ) {
                    isLeft = true;
                } else {
                    isRight = true;
                }
            } else if ( 0 < y ) {
                isUp = true;
            } else {
                isDown = true;
            }
        }

        if ( isUp ) {
            endY = '-100.1%';
        } else if ( isDown ) {
            endY = '100.1%';
        } else if ( isLeft ) {
            endX = '-100.1%';
        } else if ( isRight ) {
            endX = '100.1%';
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
} );

// Destroy Events.
$( document ).on( 'destroyEvents.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace || 'fly' !== self.options.itemsStyle ) {
        return;
    }

    const evp = `.vpf-uid-${ self.uid }`;

    $wnd.off( `mousemove${ evp }` );
    self.$item.off( `mouseenter${ evp } mouseleave${ evp }` );
} );
