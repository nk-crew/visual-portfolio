/**
 * WordPress dependencies
 */
import './editor.scss';

import { registerBlockType } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { ReactComponent as BlockIcon } from '../../block-icons/sort.svg';
import variations from '../sort-buttons/variations';
import metadata from './block.json';
import edit from './edit';
import save from './save';

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
