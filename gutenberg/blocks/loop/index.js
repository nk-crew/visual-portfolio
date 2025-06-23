import { registerBlockType } from '@wordpress/blocks';

import { ReactComponent as BlockIcon } from '../../block-icons/visual-portfolio.svg';
import metadata from './block.json';
import edit from './edit';
import save from './save';

const { name } = metadata;

const settings = {
	...metadata,
	icon: {
		foreground: '#2540CC',
		src: <BlockIcon width="20" height="20" />,
	},
	edit,
	save,
};

registerBlockType(name, settings);
