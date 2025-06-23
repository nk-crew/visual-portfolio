/**
 * WordPress dependencies
 */
/**
 * Internal dependencies
 */
import './sort-variations';
// Import editor-only styles
import './editor.scss';

import { registerBlockType } from '@wordpress/blocks';

import { ReactComponent as BlockIcon } from '../../block-icons/sort.svg';
import metadata from './block.json';
import edit from './edit';
import save from './save';
import variations from './variations';

/**
 * Register block
 */
registerBlockType(metadata.name, {
	...metadata,
	icon: {
		foreground: '#2540CC',
		src: <BlockIcon width="20" height="20" />,
	},
	edit,
	save,
	variations,
});
