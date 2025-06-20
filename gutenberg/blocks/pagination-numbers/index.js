/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';

import metadata from './block.json';
/**
 * Internal dependencies
 */
import edit from './edit';

/**
 * Register block
 */
registerBlockType(metadata.name, {
	...metadata,
	edit,
});
