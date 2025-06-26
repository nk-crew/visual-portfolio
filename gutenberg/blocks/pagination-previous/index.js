/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { ReactComponent as BlockIcon } from '../../block-icons/pagination-previous.svg';
import metadata from './block.json';
import edit from './edit';

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
});
