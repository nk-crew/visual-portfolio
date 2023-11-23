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
}
new Visual_Portfolio_3rd_All_In_One_Seo();
