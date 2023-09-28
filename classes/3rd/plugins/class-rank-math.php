<?php
/**
 * Rank Math SEO Plugin.
 *
 * @package @@plugin_name
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
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		if ( ! class_exists( 'RankMath' ) || ! is_plugin_active( 'seo-by-rank-math/rank-math.php' ) ) {
			return;
		}

		// Fixed canonical links.
		add_filter( 'rank_math/frontend/canonical', array( $this, 'canonical' ) );
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
new Visual_Portfolio_3rd_Rank_Math();
