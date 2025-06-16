import { registerBlockType } from '@wordpress/blocks';

import metadata from './block.json';
import BlockEdit from './edit';
import BlockSave from './save';

registerBlockType('visual-portfolio/filter-item', {
	...metadata,
	edit: BlockEdit,
	save: BlockSave,
});
