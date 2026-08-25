<?php
/**
 * Vendored front-end libraries of the Gallery Loop family.
 *
 * @package visual-portfolio
 */

/**
 * The libraries the loop family loads by address.
 *
 * Both of them are imported at run time rather than bundled - the lightbox
 * because two blocks want it and only when they open one, the carousel because
 * its engine is a pointer enhancement. An address is not a build error: a file
 * that never arrived is a 404, and both failures are silent by design. The
 * lightbox falls back to opening the picture by its URL, and the carousel to a
 * plain scroll container with a visible scrollbar.
 *
 * That is exactly what shipped once. `assets/vendor/` was swallowed by an
 * unanchored `vendor` rule in `.gitignore`, so PhotoSwipe was never committed;
 * Blossom was never copied out of `node_modules` at all. Neither reached a
 * checkout that had not run webpack - which is every checkout of the Pro
 * plugin, where this one is a git submodule.
 *
 * These tests are the guard: a library that stops being produced fails here
 * rather than in a browser nobody was watching.
 */
class ClassLoopVendoredAssets extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * The files, and what each one is for.
	 *
	 * @return array
	 */
	public function data_vendored_files() {
		return array(
			'lightbox script'  => array( 'assets/vendor/photoswipe-5/photoswipe.esm.min.js' ),
			'lightbox styles'  => array( 'assets/vendor/photoswipe-5/photoswipe.css' ),
			'carousel script'  => array( 'assets/vendor/blossom-carousel/dist/blossom-carousel-core.js' ),
			'carousel styles'  => array( 'assets/vendor/blossom-carousel/dist/blossom-carousel-core.css' ),
		);
	}

	/**
	 * Every vendored library is where the plugin says it is.
	 *
	 * @dataProvider data_vendored_files
	 *
	 * @param string $path - path of the file, relative to the plugin.
	 *
	 * @return void
	 */
	public function test_vendored_file_is_present( $path ) {
		$this->assertFileExists(
			visual_portfolio()->plugin_path . $path,
			sprintf( '%s is loaded by address, so a missing file is a silent 404.', $path )
		);
	}

	/**
	 * The lightbox is asked for by the address it is vendored at.
	 *
	 * Holds the constant to the file rather than to itself: a rename that
	 * touches one of the two is the mistake this catches.
	 *
	 * @return void
	 */
	public function test_lightbox_constant_points_at_the_vendored_file() {
		// The lightbox class is only included where the family is registered.
		$this->skip_without_loop_blocks();

		$this->assertFileExists(
			visual_portfolio()->plugin_path . Visual_Portfolio_Popup::LIBRARY_PATH
		);
	}
}
