import { registerBlockType } from '@wordpress/blocks';

import { ReactComponent as ElementIcon } from '../../assets/admin/images/icon-gutenberg.svg';
import metadata from './block.json';
import deprecated from './deprecated';
import edit from './edit';
import save from './save';
import transforms from './transforms';
import variations from './variations';

const { attributes } = window.VPGutenbergVariables;
const { name } = metadata;

const settings = {
	...metadata,
	attributes,
	icon: {
		foreground: '#2540CC',
		src: <ElementIcon width="20" height="20" />,
	},
	ghostkit: {
		supports: {
			styles: true,
			spacings: true,
			display: true,
			scrollReveal: true,
		},
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
};

registerBlockType(name, settings);
