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
		add_filter( 'wpseo_schema_webpage', array( $this, 'graph_schema_webpage' ), 12, 1 );
		add_filter( 'wpseo_schema_breadcrumb', array( $this, 'graph_schema_breadcrumb' ), 12, 1 );
		add_filter( 'wpseo_opengraph_title', array( $this, 'graph_title' ), 12, 1 );
	}

	/**
	 * Optimize url by supported GET variables: vp_page, vp_filter, vp_sort and vp_search.
	 * Also check term link and replaced it.
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
	 * Allows changing webpage graph piece output.
	 *
	 * @param array $webpage_graph_piece - The webpage graph piece to filter.
	 * @return array
	 */
	public function graph_schema_webpage( $webpage_graph_piece ) {
		$webpage_graph_piece['@id']               = $this->canonical( $webpage_graph_piece['@id'] );
		$webpage_graph_piece['url']               = $this->canonical( $webpage_graph_piece['url'] );
		$webpage_graph_piece['breadcrumb']['@id'] = $this->canonical_breadcrumb( $webpage_graph_piece['breadcrumb']['@id'] );
		$webpage_graph_piece['name']              = Visual_Portfolio_Archive_Mapping::get_current_term_title() ?? $webpage_graph_piece['name'];

		if ( isset( $webpage_graph_piece['potentialAction'] ) && ! empty( $webpage_graph_piece['potentialAction'] ) ) {
			foreach ( $webpage_graph_piece['potentialAction'] as $key => $potential_action ) {
				if ( isset( $potential_action['target'] ) && isset( $potential_action['@type'] ) && 'ReadAction' === $potential_action['@type'] ) {
					$webpage_graph_piece['potentialAction'][ $key ]['target'] = $this->canonical( $potential_action['target'] );
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
		$breadcrumb_graph_piece['@id'] = $this->canonical_breadcrumb( $breadcrumb_graph_piece['@id'] );

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

	/**
	 * Optimize breadcrumb url by supported GET variables: vp_page, vp_filter, vp_sort and vp_search.
	 * Also check breadcrumb term link and replaced it.
	 *
	 * @param string $breadcrumb - Not optimized breadcrumb URL.
	 * @return string
	 */
	private function canonical_breadcrumb( $breadcrumb ) {
		return str_contains( $breadcrumb, '#breadcrumb' ) ?
		str_replace( '#breadcrumb', '', $this->canonical( $breadcrumb ) ) . '#breadcrumb' :
		$this->canonical( $breadcrumb );
	}
}
new Visual_Portfolio_3rd_Yoast();
