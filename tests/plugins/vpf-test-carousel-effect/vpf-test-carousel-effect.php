<?php
/**
 * Plugin Name: vpf-test-carousel-effect
 * Description: Adds a carousel effect the plugin does not draw itself, the way an install extends the item template. For the end-to-end tests.
 * Version: 1.0.0
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Author: Visual Portfolio
 * License: GPL-2.0-only
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// The two halves an effect is registered with, and nothing else: the effect
// has no stylesheet, so the tests can only look for its name.
add_filter(
	'vpf_carousel_effects',
	function ( $effects ) {
		$effects['acme-flip'] = array( 'columns' => false );

		return $effects;
	}
);

add_action(
	'enqueue_block_editor_assets',
	function () {
		wp_add_inline_script(
			'wp-hooks',
			"wp.hooks.addFilter( 'vpf.carouselEffects', 'vpf-test-carousel-effect/acme-flip', ( options ) => [ ...options, { label: 'Acme flip', value: 'acme-flip', columns: false } ] );"
		);
	}
);
