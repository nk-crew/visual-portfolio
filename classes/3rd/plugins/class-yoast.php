<?php
/**
 * Yoast SEO Plugin.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_3rd_Yoast
 */
class Visual_Portfolio_3rd_Yoast {
	/**
	 * Visual_Portfolio_3rd_Yoast constructor.
	 */
	public function __construct() {
		// Fixed canonical links.
		add_filter( 'wpseo_canonical', array( 'Visual_Portfolio_Archive_Mapping', 'get_canonical' ), 12, 1 );
		add_filter( 'wpseo_opengraph_url', array( 'Visual_Portfolio_Archive_Mapping', 'get_canonical' ), 12, 1 );
		add_filter( 'wpseo_schema_webpage', array( $this, 'graph_schema_webpage' ), 12, 1 );
		add_filter( 'wpseo_schema_breadcrumb', array( $this, 'graph_schema_breadcrumb' ), 12, 1 );
		add_filter( 'wpseo_opengraph_title', array( $this, 'graph_title' ), 12, 1 );
	}

	/**
	 * Allows changing webpage graph piece output.
	 *
	 * @param array $webpage_graph_piece - The webpage graph piece to filter.
	 * @return array
	 */
	public function graph_schema_webpage( $webpage_graph_piece ) {
		$webpage_graph_piece['@id']               = Visual_Portfolio_Archive_Mapping::get_canonical( $webpage_graph_piece['@id'] );
		$webpage_graph_piece['url']               = Visual_Portfolio_Archive_Mapping::get_canonical( $webpage_graph_piece['url'] );
		$webpage_graph_piece['breadcrumb']['@id'] = Visual_Portfolio_Archive_Mapping::get_canonical_anchor( $webpage_graph_piece['breadcrumb']['@id'] );
		$webpage_graph_piece['name']              = Visual_Portfolio_Archive_Mapping::get_current_term_title() ?? $webpage_graph_piece['name'];

		if ( ! empty( $webpage_graph_piece['potentialAction'] ) ) {
			foreach ( $webpage_graph_piece['potentialAction'] as $key => $potential_action ) {
				if ( isset( $potential_action['target'] ) && ! is_array( $potential_action['target'] ) && isset( $potential_action['@type'] ) && 'ReadAction' === $potential_action['@type'] ) {
					$webpage_graph_piece['potentialAction'][ $key ]['target'] = Visual_Portfolio_Archive_Mapping::get_canonical( $potential_action['target'] );
				}
			}
		}

		return $webpage_graph_piece;
	}

	/**
	 * Allows changing breadcrumb graph piece output.
	 *
	 * @param array $breadcrumb_graph_piece - The breadcrumb graph piece to filter.
	 * @return array
	 */
	public function graph_schema_breadcrumb( $breadcrumb_graph_piece ) {
		$breadcrumb_graph_piece['@id'] = Visual_Portfolio_Archive_Mapping::get_canonical_anchor( $breadcrumb_graph_piece['@id'] );

		return $breadcrumb_graph_piece;
	}

	/**
	 * Allow changing the Yoast SEO generated title.
	 *
	 * @param string $title - Current Graph Title.
	 * @return string
	 */
	public function graph_title( $title ) {
		return Visual_Portfolio_Archive_Mapping::get_current_term_title() ?? $title;
	}
}
new Visual_Portfolio_3rd_Yoast();
