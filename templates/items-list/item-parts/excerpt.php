<?php
/**
 * Item excerpt template.
 *
 * @var $args
 * @var $opts
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! $opts['show_excerpt'] || ! $args['excerpt'] ) {
	return;
}

?>

<div class="vp-portfolio__item-meta-excerpt">
	<div>
		<?php echo wp_kses_post( $args['excerpt'] ); ?>
	</div>
</div>
