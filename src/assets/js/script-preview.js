/*!
 * Name    : Visual Portfolio
 * Version : 1.1.2
 * Author  : nK https://nkdev.info
 */
(function ($) {
    $('#vp_preview').on('click', '.vp-portfolio__item, .vp-portfolio__item a', function (e) {
        e.preventDefault();
        e.stopPropagation();
    });
}(jQuery));