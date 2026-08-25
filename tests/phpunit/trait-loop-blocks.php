<?php
/**
 * Helper for tests that need the Gallery Loop block family.
 *
 * @package Visual Portfolio
 */

/**
 * Skips a test where the loop family is not registered.
 *
 * The family is gated on a WordPress version of its own
 * (`Visual_Portfolio::supports_loop_blocks()`), and below it the blocks, their
 * REST route and their bindings source are not registered at all - the includes
 * never run. A test asserting on them there would be asserting against a plugin
 * that deliberately does not have them, so it is skipped rather than failed.
 *
 * The plugin minimum is lower than the family's, and CI runs the previous
 * WordPress series on purpose to keep the legacy blocks honest. Tests that cover
 * both worlds call this per test rather than from `set_up()`, so the legacy half
 * keeps running there.
 */
trait Visual_Portfolio_Loop_Blocks_Trait {
	/**
	 * Skip the current test unless the loop family is registered.
	 *
	 * @return void
	 */
	public function skip_without_loop_blocks() {
		if ( visual_portfolio()->supports_loop_blocks() ) {
			return;
		}

		$this->markTestSkipped( 'The Gallery Loop block family is not registered on this WordPress version.' );
	}
}
