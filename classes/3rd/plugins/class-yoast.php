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
		add_filter( 'wpseo_canonical', array( $this, 'canonical' ), 12, 1 );
		add_filter( 'wpseo_opengraph_url', array( $this, 'canonical' ), 12, 1 );
		add_filter( 'wpseo_schema_webpage', array( $this, 'graph_schema' ), 12, 4 );
		add_filter( 'wpseo_opengraph_title', array( $this, 'graph_title' ), 12, 1 );
	}

	/**
	 * Optimize url by supported GET variables: vp_page, vp_filter, vp_sort and vp_search.
	 *
	 * @param string $canonical - Not optimized URL.
	 * @return string
	 */
	public function canonical( $canonical ) {
		$canonical = Visual_Portfolio_Archive_Mapping::get_current_term_link() ?? $canonical;
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		foreach ( $_GET as $key => $value ) {
			if ( 'vp_page' === $key || 'vp_filter' === $key || 'vp_sort' === $key || 'vp_search' === $key ) {
                // phpcs:ignore WordPress.Security.NonceVerification.Recommended
				$canonical = add_query_arg( array_map( 'sanitize_text_field', wp_unslash( array( $key => $value ) ) ), $canonical );
			}
		}
		return $canonical;
	}

	/**
	 * Allows changing graph piece output.
	 *
	 * @param array $graph_piece - The graph piece to filter.
	 * @return array
	 */
	public function graph_schema( $graph_piece ) {
		$graph_piece['@id']  = $this->canonical( $graph_piece['@id'] );
		$graph_piece['url']  = $this->canonical( $graph_piece['url'] );
		$graph_piece['name'] = Visual_Portfolio_Archive_Mapping::get_current_term_title() ?? $graph_piece['name'];
		return $graph_piece;
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
