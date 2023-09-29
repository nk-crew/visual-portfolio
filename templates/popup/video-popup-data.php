<?php
/**
 * Render data for Video popup.
 *
 * @var $title_source
 * @var $description_source
 * @var $video_data
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
	data-vp-popup-video="<?php echo esc_url( $video_data['url'] ); ?>"
	data-vp-popup-poster="<?php echo $video_data['poster'] ? esc_url( $video_data['poster'] ) : ''; ?>"
>
	<?php
	if ( isset( $video_data[ $title_source ] ) && $video_data[ $title_source ] ) {
		?>
		<h3 class="vp-portfolio__item-popup-title"><?php echo wp_kses_post( $video_data[ $title_source ] ); ?></h3>
		<?php
	}
	if ( isset( $video_data[ $description_source ] ) && $video_data[ $description_source ] ) {
		$content = $video_data[ $description_source ];

		if ( 'item_author' === $description_source && $video_data['item_author_url'] ) {
			$content = '<a href="' . esc_url( $video_data['item_author_url'] ) . '">' . $content . '</a>';
		}

		?>
		<div class="vp-portfolio__item-popup-description"><?php echo wp_kses_post( $content ); ?></div>
		<?php
	}
	?>
</template>
