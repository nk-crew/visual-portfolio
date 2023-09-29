<?php
/**
 * Render data for Image popup.
 *
 * @var $title_source
 * @var $description_source
 * @var $image_data
 * @var $args
 * @var $opts
 *
 * @package visual-portfolio
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

?>
<template class="vp-portfolio__item-popup"
	style="display: none;"
	data-vp-popup-img="<?php echo esc_url( $image_data['url'] ); ?>"
	data-vp-popup-img-srcset="<?php echo esc_attr( $image_data['srcset'] ); ?>"
	data-vp-popup-img-size="<?php echo esc_attr( $image_data['width'] . 'x' . $image_data['height'] ); ?>"
	data-vp-popup-md-img="<?php echo esc_url( $image_data['md_url'] ); ?>"
	data-vp-popup-md-img-size="<?php echo esc_attr( $image_data['md_width'] . 'x' . $image_data['md_height'] ); ?>"
	data-vp-popup-sm-img="<?php echo esc_url( $image_data['sm_url'] ); ?>"
	data-vp-popup-sm-img-size="<?php echo esc_attr( $image_data['sm_width'] . 'x' . $image_data['sm_height'] ); ?>"
>
	<?php
	if ( isset( $image_data[ $title_source ] ) && $image_data[ $title_source ] ) {
		?>
		<h3 class="vp-portfolio__item-popup-title"><?php echo wp_kses_post( $image_data[ $title_source ] ); ?></h3>
		<?php
	}
	if ( isset( $image_data[ $description_source ] ) && $image_data[ $description_source ] ) {
		$content = $image_data[ $description_source ];

		if ( 'item_author' === $description_source && $image_data['item_author_url'] ) {
			$content = '<a href="' . esc_url( $image_data['item_author_url'] ) . '">' . $content . '</a>';
		}

		?>
		<div class="vp-portfolio__item-popup-description"><?php echo wp_kses_post( $content ); ?></div>
		<?php
	}
	?>
</template>
