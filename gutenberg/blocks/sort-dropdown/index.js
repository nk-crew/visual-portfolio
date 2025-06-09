/**
 * WordPress dependencies
 */
import './editor.scss';

import { registerBlockType } from '@wordpress/blocks';

import variations from '../sort-buttons/variations';
import metadata from './block.json';
/**
 * Internal dependencies
 */
import edit from './edit';
import save from './save';

/**
 * Register block
 */
registerBlockType(metadata.name, {
	...metadata,
	edit,
	save,
	variations,
});
