/**
 * WordPress dependencies
 */
import { postFeaturedImage } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import registerLoopBlock from '../../utils/register-loop-block';
import metadata from './block.json';
import BlockEdit from './edit';

registerLoopBlock(metadata.name, {
	...metadata,
	icon: {
		foreground: '#2540CC',
		src: postFeaturedImage,
	},
	edit: BlockEdit,
});
