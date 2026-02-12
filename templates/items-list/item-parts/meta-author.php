<?php
/**
 * Item meta author template.
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

$meta_enabled = $opts['show_author'] && $args['author'];

/**
 * Allow extensions to enable author meta output.
 *
 * @param bool  $meta_enabled Whether author meta should be rendered.
 * @param array $args         Item arguments.
 * @param array $opts         Portfolio options.
 */
$meta_enabled = apply_filters( 'vpf_each_item_meta_author_enabled', $meta_enabled, $args, $opts );

if ( ! $meta_enabled ) {
	return;
}

$allow_links    = isset( $allow_links ) ? $allow_links : false;
$link_data      = array(
	'href' => $allow_links ? $args['author_url'] : false,
);
$templates_data = array(
	'args'        => $args,
	'opts'        => $opts,
	'allow_links' => $allow_links,
);

?>

<?php do_action( 'vpf_each_item_meta_author_before', $templates_data ); ?>

<div class="vp-portfolio__item-meta-part vp-portfolio__item-meta-author">
	<span class="vp-portfolio__item-meta-part-icon">
		<span class="vp-screen-reader-text">
			<?php echo esc_html__( 'Author', 'visual-portfolio' ); ?>
		</span>
		<?php
		if ( $args['author_avatar'] ) {
			visual_portfolio()->include_template( 'global/link-start', $link_data );
			?>
			<img src="<?php echo esc_url( $args['author_avatar'] ); ?>" alt="<?php echo esc_attr( $args['author'] ); ?>" width="50" height="50">
			<?php
			visual_portfolio()->include_template( 'global/link-end', $link_data );
		} else {
			visual_portfolio()->include_template( 'icons/user' );
		}
		?>
	</span>
	<span class="vp-portfolio__item-meta-part-text">
		<?php
		printf(
			// translators: %s - author name.
			esc_html__( 'By %s', 'visual-portfolio' ),
			$link_data['href'] ? '<a href="' . esc_url( $link_data['href'] ) . '">' . esc_html( $args['author'] ) . '</a>' : esc_html( $args['author'] )
		);
		?>
	</span>
</div>

<?php do_action( 'vpf_each_item_meta_author_after', $templates_data ); ?>
