/**
 * Internal dependencies
 */
import { ReactComponent as BlockIcon } from '../../block-icons/item-image.svg';
import registerLoopBlock from '../../utils/register-loop-block';
import metadata from './block.json';
import BlockEdit from './edit';

registerLoopBlock(metadata.name, {
	...metadata,
	icon: {
		foreground: '#2540CC',
		src: <BlockIcon width="20" height="20" />,
	},
	edit: BlockEdit,
});
