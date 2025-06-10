import { registerBlockType } from '@wordpress/blocks';

import { ReactComponent as ElementIcon } from '../../../assets/admin/images/icon-gutenberg.svg';
import metadata from './block.json';
import edit from './edit';
import save from './save';

const { name } = metadata;

const settings = {
	...metadata,
	icon: {
		foreground: '#2540CC',
		src: <ElementIcon width="20" height="20" />,
	},
	edit,
	save,
};

registerBlockType(name, settings);
