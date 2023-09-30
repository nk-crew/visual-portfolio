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
		add_filter( 'aioseo_canonical_url', array( $this, 'canonical' ) );
	}

	/**
	 * Optimize url by supported GET variables: vp_page, vp_filter, vp_sort and vp_search.
	 *
	 * @param string $canonical - Not optimized URL.
	 * @return string
	 */
	public function canonical( $canonical ) {
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
new Visual_Portfolio_3rd_All_In_One_Seo();
