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

$meta_enabled = $opts['show_comments_count'] && '' !== $args['comments_count'];

/**
 * Allow extensions to enable comments meta output.
 *
 * @param bool  $meta_enabled Whether comments meta should be rendered.
 * @param array $args         Item arguments.
 * @param array $opts         Portfolio options.
 */
$meta_enabled = apply_filters( 'vpf_each_item_meta_comments_enabled', $meta_enabled, $args, $opts );

if ( ! $meta_enabled ) {
	return;
}

$allow_links    = isset( $allow_links ) ? $allow_links : false;
$link_data      = array(
	'href' => $allow_links ? $args['comments_url'] : false,
);
$templates_data = array(
	'args'        => $args,
	'opts'        => $opts,
	'allow_links' => $allow_links,
);

?>

<?php do_action( 'vpf_each_item_meta_comments_before', $templates_data ); ?>

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

<?php do_action( 'vpf_each_item_meta_comments_after', $templates_data ); ?>
