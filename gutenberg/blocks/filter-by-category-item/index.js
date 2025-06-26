import { registerBlockType } from '@wordpress/blocks';

import { ReactComponent as BlockIcon } from '../../block-icons/filter-by-category-item.svg';
import metadata from './block.json';
import BlockEdit from './edit';
import BlockSave from './save';

registerBlockType('vp/filter-by-category-item', {
	...metadata,
	icon: {
		foreground: '#2540CC',
		src: <BlockIcon width="20" height="20" />,
	},
	edit: BlockEdit,
	save: BlockSave,
});
