<?php
/**
 * Slider layout thumbnails.
 *
 * @var $options
 * @var $style_options
 * @var $thumbnails
 * @var $img_size
 *
 * @package visual-portfolio
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

?>

<div class="vp-portfolio__thumbnails-wrap">
	<div class="vp-portfolio__thumbnails">
		<?php
		foreach ( $thumbnails as $image_id ) {
			?>
			<div class="vp-portfolio__thumbnail-wrap">
				<div class="vp-portfolio__thumbnail">
					<div class="vp-portfolio__thumbnail-img-wrap">
						<div class="vp-portfolio__thumbnail-img">
							<?php
							// Show Image.
							visual_portfolio()->include_template(
								'items-list/item-parts/image',
								array(
									'image' => is_numeric( $image_id )
										? Visual_Portfolio_Images::get_attachment_image( $image_id, $img_size )
										: Visual_Portfolio_Images::get_remote_image( $image_id ),
								)
							);
							?>
						</div>
					</div>
				</div>
			</div>
			<?php
		}
		?>
	</div>
</div>
