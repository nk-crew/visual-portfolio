/*!
 * Additional js for frontend VC
 */
jQuery(function ($) {
    "use strict";

    // shortcode frontend editor
    if (typeof vc !== 'undefined') {

        // on shortcode add and update events
        vc.events.on('shortcodes:add shortcodeView:updated', function (e) {
            if (e.settings.base !== 'visual_portfolio') {
                return;
            }

            var wnd = vc.$frame[0].contentWindow;
            var $_frame = wnd ? wnd.jQuery : false;

            if ($_frame) {
                var $vp = $_frame(e.view.el).children('.vp-portfolio');

                console.log($vp);

                if ($vp.length && typeof $vp.vp !== 'undefined') {
                    $vp.vp();
                }
            }
        });
    }
});
