<?php
/**
 * Item meta categories template.
 *
 * @var $args
 * @var $opts
 * @var $allow_links
 *
 * @package visual-portfolio
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! $opts['show_categories'] || ! $args['categories'] || empty( $args['categories'] ) ) {
	return;
}

$allow_links = isset( $allow_links ) ? $allow_links : false;
$count       = $opts['categories_count'];

?>

<div class="vp-portfolio__item-meta-categories">
	<?php
	foreach ( $args['categories'] as $category ) {
		if ( ! $count ) {
			break;
		}

		$link_data = array(
			'href'     => $allow_links ? $category['url'] : false,
			'fallback' => 'span',
		);

		?>
		<div class="vp-portfolio__item-meta-category">
			<?php
			visual_portfolio()->include_template( 'global/link-start', $link_data );
			echo esc_html( $category['label'] );
			visual_portfolio()->include_template( 'global/link-end', $link_data );
			?>
		</div>
		<?php
		$count--;
	}
	?>
</div>
