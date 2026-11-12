<?php
/**
 * Saved Layout preview, shown scaled in the library.
 *
 * @var $args
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

?><!DOCTYPE html>
<html <?php language_attributes(); ?> style="margin-top: 0 !important;">
	<head>
		<meta charset="<?php bloginfo( 'charset' ); ?>">
		<meta name="viewport" content="width=device-width">
		<?php wp_head(); ?>
		<style>
			html,
			body {
				overflow: hidden;
			}

			.vp-layout-preview {
				box-sizing: border-box;
				padding: 40px;
			}

			.vp-layout-preview > * {
				max-width: none !important;
				margin-right: 0 !important;
				margin-left: 0 !important;
			}
		</style>
	</head>

	<body <?php body_class( 'vp-layout-preview-body' ); ?>>
		<div class="vp-layout-preview">
			<?php
				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				echo $args['gallery'];
			?>
		</div>

		<?php wp_footer(); ?>

		<script>
			window.addEventListener( 'load', function () {
				if ( window.parent === window ) {
					return;
				}

				window.parent.postMessage(
					{
						type: 'vpf-layout-preview',
						id: <?php echo (int) $args['id']; ?>,
						empty: ! document.querySelector( '.wp-block-visual-portfolio-item-template__item, .vp-portfolio__item-wrap' ),
						height: document.querySelector( '.vp-layout-preview' ).offsetHeight,
					},
					<?php echo wp_json_encode( $args['origin'] ); ?>
				);
			} );
		</script>
	</body>
</html>
