<?php
/**
 * Block Sort Dropdown.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Sort Dropdown block.
 */
class Visual_Portfolio_Block_Sort_Dropdown {
	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'register_block' ), 11 );
	}

	/**
	 * Register Block.
	 */
	public function register_block() {
		if ( ! function_exists( 'register_block_type_from_metadata' ) ) {
			return;
		}

		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-sort-dropdown', 'build/gutenberg/blocks/sort-dropdown/style' );
		wp_style_add_data( 'visual-portfolio-block-sort-dropdown', 'rtl', 'replace' );

		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-sort-dropdown-editor', 'build/gutenberg/blocks/sort-dropdown/editor' );
		wp_style_add_data( 'visual-portfolio-block-sort-dropdown-editor', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/sort-dropdown',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * Block output
	 *
	 * @param array $attributes - block attributes.
	 *
	 * @return string
	 */
	public function block_render( $attributes ) {
		// Get attributes with defaults.
		$sort_type    = isset( $attributes['sortType'] ) ? $attributes['sortType'] : 'dropdown';
		$align        = isset( $attributes['align'] ) ? $attributes['align'] : 'center';
		$sort_options = isset( $attributes['sortOptions'] ) ? $attributes['sortOptions'] : array(
			array(
				'label'  => __( 'Default sorting', 'visual-portfolio' ),
				'value'  => '',
				'active' => true,
			),
			array(
				'label'  => __( 'Sort by date (newest)', 'visual-portfolio' ),
				'value'  => 'date_desc',
				'active' => false,
			),
			array(
				'label'  => __( 'Sort by date (oldest)', 'visual-portfolio' ),
				'value'  => 'date',
				'active' => false,
			),
			array(
				'label'  => __( 'Sort by title (A-Z)', 'visual-portfolio' ),
				'value'  => 'title',
				'active' => false,
			),
			array(
				'label'  => __( 'Sort by title (Z-A)', 'visual-portfolio' ),
				'value'  => 'title_desc',
				'active' => false,
			),
		);

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class' => "vp-sort vp-sort-{$sort_type} vp-sort-align-{$align}",
			)
		);

		// Generate the current URL without vp_sort parameter.
		$current_url = remove_query_arg( 'vp_sort' );

		$options_html = '';
		foreach ( $sort_options as $option ) {
			$sort_value = isset( $option['value'] ) ? $option['value'] : '';
			$is_active  = isset( $option['active'] ) && $option['active'];
			$selected   = $is_active ? ' selected="selected"' : '';

			// Create the sort URL.
			$sort_url = $sort_value ? add_query_arg( 'vp_sort', $sort_value, $current_url ) : $current_url;

			$active_class = $is_active ? ' vp-sort__item-active' : '';

			$options_html .= sprintf(
				'<option class="%1$s" data-vp-url="%2$s" data-vp-sort="%3$s" value="%3$s"%4$s>%5$s</option>',
				esc_attr( $active_class ),
				esc_url( $sort_url ),
				esc_attr( $sort_value ),
				$selected,
				esc_html( $option['label'] )
			);
		}

		ob_start();
		?>
		<div <?php echo $wrapper_attributes; ?>>
			<div class="vp-sort-dropdown">
				<select>
					<?php echo $options_html; ?>
				</select>
			</div>
		</div>
		<?php
		return ob_get_clean();
	}
}
new Visual_Portfolio_Block_Sort_Dropdown();
