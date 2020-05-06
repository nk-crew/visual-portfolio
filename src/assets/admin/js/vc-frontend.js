/*!
 * Additional js for frontend VC
 *
 * Name    : Visual Portfolio
 * Version : @@plugin_version
 * Author  : nK https://nkdev.info
 */
const {
    jQuery: $,
    vc,
} = window;

$( () => {
    // shortcode frontend editor
    if ( 'undefined' !== typeof vc ) {
        // on shortcode add and update events
        vc.events.on( 'shortcodes:add shortcodeView:updated', ( e ) => {
            if ( 'visual_portfolio' !== e.settings.base ) {
                return;
            }

            const wnd = vc.$frame[ 0 ].contentWindow;
            const jQframe = wnd ? wnd.jQuery : false;

            if ( jQframe ) {
                const $vp = jQframe( e.view.el ).children( '.vp-portfolio' );
                if ( $vp.length && 'undefined' !== typeof $vp.vpf ) {
                    $vp.vpf();
                }
            }
        } );
    }
} );
