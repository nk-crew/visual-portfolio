/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import metadata from './block.json';
import edit from './edit';

/**
 * Register block
 */
registerBlockType(metadata.name, {
	...metadata,
	edit,
});
