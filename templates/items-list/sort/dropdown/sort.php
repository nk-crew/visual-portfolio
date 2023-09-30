<?php
/**
 * Dropdown sort template.
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

<div class="<?php echo esc_attr( $args['class'] ); ?> vp-sort__style-dropdown">
	<select>
		<?php
		foreach ( $args['items'] as $item ) {
			?>
			<option class="<?php echo esc_attr( $item['class'] ); ?>" data-vp-url="<?php echo esc_url( $item['url'] ); ?>" data-vp-sort="<?php echo esc_attr( $item['sort'] ); ?>" value="<?php echo esc_attr( $item['sort'] ); ?>" <?php selected( $item['active'] ); ?>>
				<?php echo esc_html( $item['label'] ); ?>
			</option>
			<?php
		}
		?>
	</select>
</div>
