<?php
/**
 * Yoast SEO Plugin.
 *
 * @package @@plugin_name
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
        // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound
        if ( in_array( 'wordpress-seo/wp-seo.php', apply_filters( 'active_plugins', get_option( 'active_plugins' ) ), true ) ) {
            // Fixed canonical links.
            add_filter( 'wpseo_canonical', array( $this, 'canonical' ), 12, 2 );
        }
    }

    /**
     * Optimize url by supported GET variables: vp_page, vp_filter, vp_sort and vp_search.
     *
     * @param string $canonical - Not optimized URL.
     * @param string $presentation - The indexable presentation.
     * @return string
     */
    public function canonical( $canonical, $presentation = null ) {
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
