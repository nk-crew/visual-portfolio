import { registerBlockType } from '@wordpress/blocks';

const { loop_blocks: loopBlocksSupported } = window.VPGutenbergVariables;

/**
 * Register a block of the Gallery Loop family.
 *
 * The family is built on the Interactivity API, script modules and block
 * bindings, none of which are guaranteed before WordPress 6.5. Below that PHP
 * does not register these blocks at all, and a block registered on the client
 * alone would let the editor save markup that nothing renders.
 *
 * @param {string} name     Block name.
 * @param {Object} settings Block settings.
 */
export default function registerLoopBlock(name, settings) {
	if (!loopBlocksSupported) {
		return;
	}

	registerBlockType(name, settings);
}
