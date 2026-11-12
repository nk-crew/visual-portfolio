import { create } from '@wordpress/rich-text';

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
	// Each item is named in the List tab and the breadcrumb by the name it was
	// given there, or else by its label, rather than all by the block's title.
	__experimentalLabel: ({ text, metadata: meta }, { context }) => {
		if (meta?.name && ['list-view', 'breadcrumb'].includes(context)) {
			return meta.name;
		}

		return text ? create({ html: text }).text : undefined;
	},
});
