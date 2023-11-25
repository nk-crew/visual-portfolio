<?php
/**
 * Rank Math SEO Plugin.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_3rd_Rank_Math
 */
class Visual_Portfolio_3rd_Rank_Math {
	/**
	 * Visual_Portfolio_3rd_Rank_Math constructor.
	 */
	public function __construct() {
		// Fixed canonical links.
		add_filter( 'rank_math/frontend/canonical', array( 'Visual_Portfolio_Archive_Mapping', 'get_canonical' ) );
		add_filter( 'rank_math/frontend/title', array( $this, 'get_title' ) );
		add_filter( 'rank_math/opengraph/facebook/og_title', array( $this, 'get_title' ) );
		add_action( 'rank_math/head', array( $this, 'set_query_as_archive' ), 5 ); // priority one level lower than what the plugin uses.
		add_action( 'rank_math/head', array( $this, 'remove_query_as_archive' ), 23 ); // priority one level higher than what the plugin uses.
	}

	/**
	 * Allow changing the Rank Math generated title.
	 *
	 * @param string $title - Current Page Title.
	 * @return string
	 */
	public function get_title( $title ) {
		return Visual_Portfolio_Archive_Mapping::get_current_term_title() ?? $title;
	}

	/**
	 * Set query as archive temporary.
	 * This is necessary for the plugin to work correctly and set all the necessary settings in the page header.
	 * Because our custom archive and taxonomy pages override the base query and interfere with the global object,
	 * Conflicts may occur with some SEO plugins that work this way.
	 * In this case, the search plugin is trying to place the assets needed for a regular page in the header,
	 * While the page itself is defined as a taxonomy.
	 * In this case, we let the plugin know that this is not a page, but a category.
	 *
	 * @return void
	 */
	public function set_query_as_archive() {
		if ( Visual_Portfolio_Archive_Mapping::is_category() ) {
			global $wp_query;

			$wp_query->is_archive           = true;
			$wp_query->is_single            = false;
			$wp_query->is_singular          = false;
			$wp_query->is_page              = false;
			$wp_query->is_post_type_archive = true;
		}
	}

	/**
	 * Remove query as archive temporary.
	 * This is necessary for the plugin to work correctly and set all the necessary settings in the page header.
	 * Because our custom archive and taxonomy pages override the base query and interfere with the global object,
	 * Conflicts may occur with some SEO plugins that work this way.
	 * In this case, the search plugin is trying to place the assets needed for a regular page in the header,
	 * While the page itself is defined as a taxonomy.
	 * In this case, we let the plugin know that this is not a page, but a category.
	 * This function cancels previous settings so as not to interfere with further system operation.
	 *
	 * @return void
	 */
	public function remove_query_as_archive() {
		if ( Visual_Portfolio_Archive_Mapping::is_category() ) {
			global $wp_query;

			$wp_query->is_archive           = false;
			$wp_query->is_single            = true;
			$wp_query->is_singular          = true;
			$wp_query->is_page              = true;
			$wp_query->is_post_type_archive = false;
		}
	}
}
new Visual_Portfolio_3rd_Rank_Math();
