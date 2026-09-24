import { registerBlockType } from '@wordpress/blocks';

const { loop_blocks: loopBlocksSupported } = window.VPGutenbergVariables;

// Fields of `block.json` the server translates. Settings override the
// definition the server hands the editor, so these copied in from the file
// would put the English text back over the translation.
const TRANSLATED_FIELDS = ['title', 'description', 'keywords', 'styles'];

/**
 * Register a block of the Gallery Loop family.
 *
 * The family is built on the Interactivity API, script modules and block
 * bindings, none of which are guaranteed before WordPress 6.5. Below that PHP
 * does not register these blocks at all, and a block registered on the client
 * alone would let the editor save markup that nothing renders.
 *
 * Given the metadata rather than a name, the settings only add to what the
 * server registered the block with, the way `registerBlockType()` treats it.
 * That is the form for a block whose schema the server adjusts per install.
 *
 * @param {string|Object} nameOrMetadata Block name, or its `block.json`.
 * @param {Object}        settings       Block settings.
 */
export default function registerLoopBlock(nameOrMetadata, settings) {
	if (!loopBlocksSupported) {
		return;
	}

	registerBlockType(
		nameOrMetadata,
		Object.fromEntries(
			Object.entries(settings).filter(
				([key]) => !TRANSLATED_FIELDS.includes(key)
			)
		)
	);
}
