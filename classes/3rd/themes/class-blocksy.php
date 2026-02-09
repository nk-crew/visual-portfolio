<?php
/**
 * Blocksy Theme Support.
 *
 * Adds compatibility between Visual Portfolio and the Blocksy theme,
 * enabling Blocksy's meta box (page options panel) and Customizer
 * options for the portfolio post type.
 *
 * Can be used as a standalone Code Snippet or placed in the theme's functions.php.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_3rd_Blocksy
 */
class Visual_Portfolio_3rd_Blocksy {
	/**
	 * Visual_Portfolio_3rd_Blocksy constructor.
	 */
	public function __construct() {
		// Only load if Blocksy theme is active.
		if ( ! self::is_blocksy_active() ) {
			return;
		}

		// Ensure portfolio post type is in Blocksy's supported CPT list.
		add_filter( 'blocksy:custom_post_types:supported_list', array( $this, 'add_portfolio_to_supported_list' ) );

		// Register portfolio post type for Blocksy's REST meta field (required for meta box in editor).
		add_filter( 'blocksy:editor:post_types_for_rest_field', array( $this, 'add_portfolio_to_rest_field' ) );
	}

	/**
	 * Check if Blocksy theme is active.
	 *
	 * @return bool
	 */
	public static function is_blocksy_active() {
		return 'blocksy' === get_template();
	}

	/**
	 * Add portfolio post type to Blocksy's supported CPT list.
	 *
	 * This enables Blocksy Customizer options for single portfolio and archive pages.
	 *
	 * @param array $post_types - Supported post types.
	 * @return array
	 */
	public function add_portfolio_to_supported_list( $post_types ) {
		if ( ! in_array( 'portfolio', $post_types, true ) ) {
			$post_types[] = 'portfolio';
		}

		return $post_types;
	}

	/**
	 * Add portfolio post type to Blocksy's REST field registration.
	 *
	 * This enables the Blocksy meta box (page options icon) in the block editor
	 * for portfolio posts.
	 *
	 * @param array $post_types - Post types with REST field.
	 * @return array
	 */
	public function add_portfolio_to_rest_field( $post_types ) {
		if ( ! in_array( 'portfolio', $post_types, true ) ) {
			$post_types[] = 'portfolio';
		}

		return $post_types;
	}
}

new Visual_Portfolio_3rd_Blocksy();
