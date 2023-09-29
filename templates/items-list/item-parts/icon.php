<?php
/**
 * Item meta icon template.
 *
 * @var $args
 * @var $opts
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! $opts['show_icon'] ) {
	return;
}

?>

<div class="vp-portfolio__item-meta-icon">
	<?php
	switch ( $args['format'] ) {
		case 'video':
			visual_portfolio()->include_template( 'icons/play' );
			break;
		case 'audio':
			visual_portfolio()->include_template( 'icons/music' );
			break;
		case 'gallery':
			visual_portfolio()->include_template( 'icons/gallery' );
			break;
		default:
			if ( isset( $args['vp_opts']['items_click_action'] ) && 'popup_gallery' === $args['vp_opts']['items_click_action'] ) {
				visual_portfolio()->include_template( 'icons/search' );
			} else {
				visual_portfolio()->include_template( 'icons/image' );
			}
			break;
	}
	?>
</div>
