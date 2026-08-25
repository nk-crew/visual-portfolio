import { ReactComponent as BlockIcon } from '../../block-icons/loop-filter.svg';
import registerLoopBlock from '../../utils/register-loop-block';
import metadata from './block.json';
import BlockEdit from './edit';
import BlockSave from './save';

registerLoopBlock(metadata.name, {
	...metadata,
	icon: {
		foreground: '#2540CC',
		src: <BlockIcon width="20" height="20" />,
	},
	edit: BlockEdit,
	save: BlockSave,
});
