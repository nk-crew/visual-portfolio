import './style.scss';

import { registerBlockType } from '@wordpress/blocks';

import metadata from './block.json';
import BlockEdit from './edit';
import BlockSave from './save';

registerBlockType(metadata.name, {
	...metadata,
	edit: BlockEdit,
	save: BlockSave,
});
