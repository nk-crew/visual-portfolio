/**
 * WordPress dependencies
 */
import { postCategories } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import registerLoopBlock from '../../utils/register-loop-block';
import metadata from './block.json';
import edit from './edit';

/**
 * Register block
 */
registerLoopBlock(metadata.name, {
	...metadata,
	icon: {
		foreground: '#2540CC',
		src: postCategories,
	},
	edit,
});
