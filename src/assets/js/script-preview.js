/*!
 * Name    : Visual Portfolio
 * Version : @@plugin_version
 * Author  : nK https://nkdev.info
 */
(function ($) {
    const $portfolio = $('#vp_preview > .vp-portfolio');
    $portfolio.on('click', '.vp-portfolio__item, .vp-portfolio__item a', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    window.iFrameResizer = {
        heightCalculationMethod() {
            return $portfolio.outerHeight(true);
        },
    };
}(jQuery));
