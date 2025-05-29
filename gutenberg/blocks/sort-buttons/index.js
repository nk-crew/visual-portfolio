/**
 * WordPress dependencies
 */
/**
 * Internal dependencies
 */
import './sort-variations';
// Import styles for the block and its variants
import './style-minimal.scss';
import './style-classic.scss';
// Import editor-only styles
import './editor.scss';

import { registerBlockType } from '@wordpress/blocks';

import metadata from './block.json';
import edit from './edit';
import save from './save';
import variations from './variations';

/**
 * Register block
 */
registerBlockType(metadata.name, {
	...metadata,
	edit,
	save,
	variations,
});
