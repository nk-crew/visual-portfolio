import { ReactComponent as BlockIcon } from '../../block-icons/loop-filter-item.svg';
import registerLoopBlock from '../../utils/register-loop-block';
import metadata from './block.json';
import BlockEdit from './edit';

// No `save`: the render callback prints the item, and the default save already
// stores nothing.
registerLoopBlock(metadata.name, {
	...metadata,
	icon: {
		foreground: '#2540CC',
		src: <BlockIcon width="20" height="20" />,
	},
	edit: BlockEdit,
});
