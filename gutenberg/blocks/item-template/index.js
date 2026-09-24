/**
 * Internal dependencies
 */
import { ReactComponent as BlockIcon } from '../../block-icons/item-template.svg';
import registerLoopBlock from '../../utils/register-loop-block';
import metadata from './block.json';
import BlockEdit from './edit';
import BlockSave from './save';
import variations from './variations';

// Registered from the metadata, the same file the server registers the block
// from, so the editor and the page agree on every attribute.
registerLoopBlock(metadata, {
	icon: {
		foreground: '#2540CC',
		src: <BlockIcon width="20" height="20" />,
	},
	edit: BlockEdit,
	save: BlockSave,
	variations,
});
