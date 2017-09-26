/*!
 * Name    : Visual Portfolio
 * Version : 1.1.2
 * Author  : nK https://nkdev.info
 */
(function ($) {
    var $portfolio = $('#vp_preview > .vp-portfolio');
    $portfolio.on('click', '.vp-portfolio__item, .vp-portfolio__item a', function (e) {
        e.preventDefault();
        e.stopPropagation();
    });
    window.iFrameResizer = {
        heightCalculationMethod: function () {
            return $portfolio.outerHeight(true);
        }
    };
}(jQuery));