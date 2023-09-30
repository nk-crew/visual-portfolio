<?php
/**
 * Minimal paged pagination template.
 *
 * @var $args
 *
 * @package visual-portfolio
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

?>

<div class="<?php echo esc_attr( $args['class'] ); ?> vp-pagination__style-minimal" data-vp-pagination-type="<?php echo esc_attr( $args['type'] ); ?>">
	<?php
	foreach ( $args['items'] as $item ) {
		?>
		<div class="<?php echo esc_attr( $item['class'] ); ?>">
			<?php if ( $item['url'] ) : ?>
				<a href="<?php echo esc_url( $item['url'] ); ?>">
					<?php
					if ( $item['is_prev_arrow'] ) {
						visual_portfolio()->include_template( 'icons/arrow-left' );
					} elseif ( $item['is_next_arrow'] ) {
						visual_portfolio()->include_template( 'icons/arrow-right' );
					} else {
						echo esc_html( $item['label'] );
					}
					?>
				</a>
			<?php else : ?>
				<span><?php echo esc_html( $item['label'] ); ?></span>
			<?php endif; ?>
		</div>
		<?php
	}
	?>
</div>
