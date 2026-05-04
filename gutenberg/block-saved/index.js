import './style.scss';

import { createBlock, registerBlockType } from '@wordpress/blocks';
import { useDispatch } from '@wordpress/data';

import { ReactComponent as BlockIcon } from '../block-icons/saved-layouts.svg';
import metadata from './block.json';
import edit from './edit';
import save from './save';
import transforms from './transforms';

const { name, title } = metadata;
const legacyBlockName = 'nk/visual-portfolio';

const settings = {
	icon: {
		foreground: '#2540CC',
		src: <BlockIcon width="20" height="20" />,
	},
	edit,
	save,
	transforms,
};

registerBlockType( name, settings );

// Fallback.
registerBlockType( legacyBlockName, {
	...settings,
	apiVersion: metadata.apiVersion,
	category: metadata.category,
	description: metadata.description,
	keywords: metadata.keywords,
	title,
	attributes: {
		id: {
			type: 'string',
		},
		align: {
			type: 'string',
		},
		className: {
			type: 'string',
		},
		anchor: {
			type: 'string',
		},
	},
	edit: ( props ) => {
		const { replaceBlocks } = useDispatch( 'core/block-editor' );

		replaceBlocks(
			[ props.clientId ],
			createBlock( name, props.attributes || {} )
		);

		return null;
	},
	supports: {
		...metadata.supports,
		inserter: false,
	},
} );
