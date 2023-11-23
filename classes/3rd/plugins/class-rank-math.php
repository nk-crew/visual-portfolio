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
}
new Visual_Portfolio_3rd_Rank_Math();
