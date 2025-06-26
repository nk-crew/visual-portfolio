import './style.scss';

import { registerBlockType } from '@wordpress/blocks';

import { ReactComponent as BlockIcon } from '../block-icons/visual-portfolio.svg';
import metadata from './block.json';
import deprecated from './deprecated';
import edit from './edit';
import save from './save';
import transforms from './transforms';
import variations from './variations';

const { name, usesContext } = metadata;

const settings = {
	icon: {
		foreground: '#2540CC',
		src: <BlockIcon width="20" height="20" />,
	},
	example: {
		attributes: {
			preview_image_example: 'true',
		},
	},
	variations,
	edit,
	save,
	transforms,
	deprecated,
	usesContext,
};

registerBlockType(name, settings);
