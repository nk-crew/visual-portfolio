<?php
/**
 * Item meta comments template.
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

if ( ! $opts['show_comments_count'] || '' === $args['comments_count'] ) {
	return;
}

$allow_links = isset( $allow_links ) ? $allow_links : false;
$link_data   = array(
	'href' => $allow_links ? $args['comments_url'] : false,
);

?>

<div class="vp-portfolio__item-meta-part vp-portfolio__item-meta-comments">
	<span class="vp-portfolio__item-meta-part-icon">
		<span class="vp-screen-reader-text">
			<?php echo esc_html__( 'Comments', 'visual-portfolio' ); ?>
		</span>
		<?php visual_portfolio()->include_template( 'icons/message' ); ?>
	</span>
	<span class="vp-portfolio__item-meta-part-text">
		<?php
		visual_portfolio()->include_template( 'global/link-start', $link_data );

		if ( ! $args['comments_count'] ) {
			echo esc_html__( 'No Comments', 'visual-portfolio' );
		} else {
			// translators: %s Number of comments.
			echo esc_html( sprintf( _n( '%s Comment', '%s Comments', $args['comments_count'], 'visual-portfolio' ), number_format_i18n( (int) $args['comments_count'] ) ) );
		}

		visual_portfolio()->include_template( 'global/link-end', $link_data );
		?>
	</span>
</div>
