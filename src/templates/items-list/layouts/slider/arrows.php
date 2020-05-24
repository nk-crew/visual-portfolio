<?php
/**
 * Slider layout arrows.
 *
 * @var $options
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

?>

<div class="vp-portfolio__items-arrow vp-portfolio__items-arrow-prev" tabindex="0" role="button" aria-label="<?php echo esc_attr__( 'Previous slide', '@@text_domain' ); ?>">
    <?php visual_portfolio()->include_template( 'icons/angle-left' ); ?>
</div>
<div class="vp-portfolio__items-arrow vp-portfolio__items-arrow-next" tabindex="0" role="button" aria-label="<?php echo esc_attr__( 'Next slide', '@@text_domain' ); ?>">
    <?php visual_portfolio()->include_template( 'icons/angle-right' ); ?>
</div>
