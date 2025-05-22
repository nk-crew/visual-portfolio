import { registerBlockType } from '@wordpress/blocks';

import metadata from './block.json';
import BlockEdit from './edit';

registerBlockType('visual-portfolio/filter-item', {
	...metadata,
	edit: BlockEdit,
	save: () => {
		return null;
	},
});
