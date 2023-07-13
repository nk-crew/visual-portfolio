/*!
 * Additional js for frontend VC
 *
 * Name    : Visual Portfolio
 * Version : @@plugin_version
 * Author  : nK https://nkdev.info
 */
const { jQuery: $, vc } = window;

$(() => {
  // shortcode frontend editor
  if (typeof vc !== 'undefined') {
    // on shortcode add and update events
    vc.events.on('shortcodes:add shortcodeView:updated', (e) => {
      if (e.settings.base !== 'visual_portfolio') {
        return;
      }

      const wnd = vc.$frame[0].contentWindow;
      const jQframe = wnd ? wnd.jQuery : false;

      if (jQframe) {
        const $vp = jQframe(e.view.el).children('.vp-portfolio');
        if ($vp.length && typeof $vp.vpf !== 'undefined') {
          $vp.vpf();
        }
      }
    });
  }
});
