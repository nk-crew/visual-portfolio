<?php
/**
 * Item image template.
 *
 * @var $args
 * @var $opts
 *
 * @package visual-portfolio
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$link_data = array(
	'href'       => $args['url'],
	'target'     => $args['url_target'],
	'rel'        => $args['url_rel'],
	'aria_label' => isset( $args['title'] ) && $args['title'] ? wp_strip_all_tags( $args['title'] ) : esc_html__( 'Open item', 'visual-portfolio' ),
);

?>

<div class="vp-portfolio__item-img-wrap">
	<div class="vp-portfolio__item-img">
		<?php visual_portfolio()->include_template( 'global/link-start', $link_data ); ?>

		<?php
		// Show Image.
		visual_portfolio()->include_template(
			'items-list/item-parts/image',
			array( 'image' => $args['image'] )
		);
		?>

		<div class="vp-portfolio__item-overlay"></div>

		<?php visual_portfolio()->include_template( 'global/link-end', $link_data ); ?>
	</div>
</div>
