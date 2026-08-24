/**
 * WordPress dependencies
 */
import { cover } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import registerLoopBlock from '../../utils/register-loop-block';
import metadata from './block.json';
import BlockEdit from './edit';
import BlockSave from './save';

registerLoopBlock(metadata.name, {
	...metadata,
	icon: {
		foreground: '#2540CC',
		src: cover,
	},
	edit: BlockEdit,
	save: BlockSave,
});
