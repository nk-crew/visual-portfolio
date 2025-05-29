/**
 * WordPress dependencies
 */
// Import styles for the block
//import './style.scss';
// Import editor-only styles
import './editor.scss';

import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

import metadata from './block.json';
/**
 * Internal dependencies
 */
import edit from './edit';
import save from './save';
import variations from './variations';

/**
 * Register block
 */
registerBlockType(metadata.name, {
	title: __('Sort', 'visual-portfolio'),
	description: __(
		'Add sorting options to your portfolio.',
		'visual-portfolio'
	),
	category: 'visual-portfolio',
	parent: ['visual-portfolio/loop'],
	keywords: [__('sort', 'visual-portfolio'), __('order', 'visual-portfolio')],
	variations,
	example: {},
	edit,
	save,
	supports: metadata.supports,
	attributes: metadata.attributes,
	apiVersion: metadata.apiVersion,
	editorStyle: metadata.editorStyle,
	style: metadata.style,
});
