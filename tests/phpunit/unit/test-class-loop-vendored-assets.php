<?php
/**
 * Vendored front-end libraries of the Gallery Loop family.
 *
 * @package visual-portfolio
 */

/**
 * The library the loop family loads by address.
 *
 * The carousel engine is imported at run time rather than bundled, because it
 * is a pointer enhancement. An address is not a build error: a file that never
 * arrived is a 404, and the failure is silent by design - the carousel falls
 * back to a plain scroll container with a visible scrollbar.
 *
 * That is what shipped once. `assets/vendor/` was swallowed by an unanchored
 * `vendor` rule in `.gitignore`, and Blossom was never copied out of
 * `node_modules` at all. It did not reach a checkout that had not run webpack -
 * which is every checkout of the Pro plugin, where this one is a git submodule.
 *
 * These tests are the guard: a library that stops being produced fails here
 * rather than in a browser nobody was watching.
 */
class ClassLoopVendoredAssets extends WP_UnitTestCase {
	/**
	 * The files, and what each one is for.
	 *
	 * @return array
	 */
	public function data_vendored_files() {
		return array(
			'carousel script' => array( 'assets/vendor/blossom-carousel/dist/blossom-carousel-core.js' ),
			'carousel styles' => array( 'assets/vendor/blossom-carousel/dist/blossom-carousel-core.css' ),
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
}
