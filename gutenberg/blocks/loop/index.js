import { registerBlockType } from '@wordpress/blocks';
const { attributes } = window.VPGutenbergVariables;

import { ReactComponent as ElementIcon } from '../../../assets/admin/images/icon-gutenberg.svg';
import metadata from './block.json';
import edit from './edit';
import save from './save';

const { name, title, category } = metadata;

const allowedBlockAttributes = [
	'align',
	'anchor',
	'block_id',
	'className',
	'content_source',
	'custom_css',
	'images',
	'images_descriptions_source',
	'images_order_by',
	'images_order_direction',
	'images_titles_source',
	'items_count',
	'post_types_set',
	'posts_avoid_duplicate_posts',
	'posts_custom_query',
	'posts_excluded_ids',
	'posts_ids',
	'posts_offset',
	'posts_order_by',
	'posts_order_direction',
	'posts_source',
	'posts_taxonomies',
	'posts_taxonomies_relation',
	'preview_image_example',
	'setup_wizard',
	'sort',
	'stretch',
];

function filterAttributes(nonFilteredAttributes) {
	return Object.fromEntries(
		Object.entries(nonFilteredAttributes).filter(([key]) =>
			allowedBlockAttributes.includes(key)
		)
	);
}

function createBlockContext(allowedFields, namespace = 'visual-portfolio') {
	return allowedFields.reduce((context, field) => {
		// The context key should map to the actual attribute value, not the field name
		context[`${namespace}/${field}`] = field;
		return context;
	}, {});
}

const filteredAttributes = filterAttributes(attributes);
const blockContext = createBlockContext(allowedBlockAttributes);

const settings = {
	title,
	category,
	attributes: filteredAttributes,
	icon: {
		foreground: '#2540CC',
		src: <ElementIcon width="20" height="20" />,
	},
	example: {
		attributes: {
			preview_image_example: 'true',
		},
	},
	edit,
	save,
	providesContext: blockContext,
};

registerBlockType(name, settings);
