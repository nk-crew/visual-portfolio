/*!
 * Additional js for frontend VC
 *
 * Name    : Visual Portfolio
 * Version : @@plugin_version
 * Author  : nK https://nkdev.info
 */
const {
    vc,
} = window;

jQuery(() => {
    // shortcode frontend editor
    if (typeof vc !== 'undefined') {
        // on shortcode add and update events
        vc.events.on('shortcodes:add shortcodeView:updated', (e) => {
            if (e.settings.base !== 'visual_portfolio') {
                return;
            }

            const wnd = vc.$frame[0].contentWindow;
            const $ = wnd ? wnd.jQuery : false;

            if ($) {
                const $vp = $(e.view.el).children('.vp-portfolio');
                if ($vp.length && typeof $vp.vp !== 'undefined') {
                    $vp.vp();
                }
            }
        });
    }
});
