<?php
/**
 * All In One SEO Plugin.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_3rd_All_In_One_Seo
 */
class Visual_Portfolio_3rd_All_In_One_Seo {
	/**
	 * Visual_Portfolio_3rd_All_In_One_Seo constructor.
	 */
	public function __construct() {
		// Fixed canonical links.
		add_filter( 'aioseo_canonical_url', array( 'Visual_Portfolio_Archive_Mapping', 'get_canonical' ) );
		add_filter( 'aioseo_schema_output', array( $this, 'graph_schema_output' ) );
		add_action( 'wp_print_footer_scripts', array( $this, 'set_query_as_archive' ), 8 ); // priority one level lower than what the plugin uses.
		add_action( 'wp_print_footer_scripts', array( $this, 'remove_query_as_archive' ), 13 ); // priority one level higher than what the plugin uses.
		add_action( 'wp', array( $this, 'set_query_as_archive' ), 9 );
		add_action( 'wp', array( $this, 'remove_query_as_archive' ), 13 );
	}

	/**
	 * Allows changing graph output.
	 *
	 * @param array $graph - Graph output array.
	 * @return array
	 */
	public function graph_schema_output( $graph ) {
		if ( isset( $graph ) && ! empty( $graph ) && is_array( $graph ) ) {
			foreach ( $graph as $key => $graph_item ) {
				if ( isset( $graph_item['@type'] ) ) {
					switch ( $graph_item['@type'] ) {
						case 'BreadcrumbList':
							$graph[ $key ]['@id'] = Visual_Portfolio_Archive_Mapping::get_canonical_anchor( $graph_item['@id'] );
							break;
						case 'WebPage':
						case 'CollectionPage':
							$graph[ $key ]['@id']               = Visual_Portfolio_Archive_Mapping::get_canonical_anchor( $graph_item['@id'] );
							$graph[ $key ]['url']               = Visual_Portfolio_Archive_Mapping::get_canonical( $graph_item['@id'] );
							$graph[ $key ]['breadcrumb']['@id'] = Visual_Portfolio_Archive_Mapping::get_canonical_anchor( $graph_item['@id'] );
							break;
					}
				}
			}
		}
		return $graph;
	}

	/**
	 * Set query as archive temporary.
	 * This is necessary for the plugin to work correctly and set all the necessary settings in the page footer.
	 * Because our custom archive and taxonomy pages override the base query and interfere with the global object,
	 * Conflicts may occur with some SEO plugins that work this way.
	 * In this case, the search plugin is trying to place the assets needed for a regular page in the footer,
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
			$wp_query->is_category          = true;
		}
	}

	/**
	 * Set query as archive temporary.
	 * This is necessary for the plugin to work correctly and set all the necessary settings in the page footer.
	 * Because our custom archive and taxonomy pages override the base query and interfere with the global object,
	 * Conflicts may occur with some SEO plugins that work this way.
	 * In this case, the search plugin is trying to place the assets needed for a regular page in the footer,
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
			$wp_query->is_single            = false;
			$wp_query->is_singular          = true;
			$wp_query->is_page              = true;
			$wp_query->is_post_type_archive = false;
			$wp_query->is_category          = false;
		}
	}
}
new Visual_Portfolio_3rd_All_In_One_Seo();
