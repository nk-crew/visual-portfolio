/**
 * WordPress dependencies
 */
import './editor.scss';

import { registerBlockType } from '@wordpress/blocks';

import metadata from './block.json';
/**
 * Internal dependencies
 */
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
