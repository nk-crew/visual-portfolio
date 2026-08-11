/**
 * WordPress dependencies
 */

/**
 * Internal dependencies
 */
import { ReactComponent as BlockIcon } from '../../block-icons/loop-pagination-load-more.svg';
import registerLoopBlock from '../../utils/register-loop-block';
import variations from '../pagination/variations';
import metadata from './block.json';
import edit from './edit';

/**
 * Register block
 */
registerLoopBlock(metadata.name, {
	...metadata,
	icon: {
		foreground: '#2540CC',
		src: <BlockIcon width="20" height="20" />,
	},
	variations,
	edit,
});
