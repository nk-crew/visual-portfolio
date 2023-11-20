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
}
new Visual_Portfolio_3rd_Yoast();
