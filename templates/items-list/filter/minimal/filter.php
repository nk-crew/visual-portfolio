<?php
/**
 * Minimal filter template.
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

<div class="<?php echo esc_attr( $args['class'] ); ?> vp-filter__style-minimal">
	<?php
	foreach ( $args['items'] as $item ) {
		?>
		<div class="<?php echo esc_attr( $item['class'] ); ?>">
			<a href="<?php echo esc_url( $item['url'] ); ?>" data-vp-filter="<?php echo esc_attr( $item['filter'] ); ?>">
				<?php echo esc_html( $item['label'] ); ?>

				<?php
				if ( $args['show_count'] && $item['count'] ) {
					?>
					<span class="vp-filter__item-count">
						<?php echo esc_html( $item['count'] ); ?>
					</span>
					<?php
				}
				?>
			</a>
		</div>
		<?php
	}
	?>
</div>
