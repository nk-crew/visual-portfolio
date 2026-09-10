/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	gallery,
	grid,
	image,
	postFeaturedImage,
	stretchWide,
} from '@wordpress/icons';

/**
 * The shapes a gallery can take.
 *
 * A variation each, the way the Group block offers Group, Row, Stack and Grid:
 * the editor then draws the switcher itself - a row of icons above the settings
 * and an entry in the block switcher - and there is one place a layout is
 * changed rather than three.
 *
 * `transform` is the scope that row reads; `inserter` is left out, since the
 * item template is never inserted on its own.
 */
export default [
	{
		name: 'grid',
		scope: ['block', 'transform'],
		isDefault: true,
		title: __('Grid', 'visual-portfolio'),
		description: __('Equal cells in a fixed grid.', 'visual-portfolio'),
		attributes: { layoutType: 'grid' },
		isActive: ['layoutType'],
		icon: grid,
	},
	{
		name: 'masonry',
		scope: ['block', 'transform'],
		title: __('Masonry', 'visual-portfolio'),
		description: __(
			'Columns of equal width, items keep their own height.',
			'visual-portfolio'
		),
		attributes: { layoutType: 'masonry' },
		isActive: ['layoutType'],
		icon: gallery,
	},
	{
		name: 'tiles',
		scope: ['block', 'transform'],
		title: __('Tiles', 'visual-portfolio'),
		description: __(
			'A repeating pattern of differently sized cells.',
			'visual-portfolio'
		),
		attributes: { layoutType: 'tiles' },
		isActive: ['layoutType'],
		icon: postFeaturedImage,
	},
	{
		name: 'justified',
		scope: ['block', 'transform'],
		title: __('Justified', 'visual-portfolio'),
		description: __(
			'Rows of equal height, items keep their own aspect ratio.',
			'visual-portfolio'
		),
		attributes: { layoutType: 'justified' },
		isActive: ['layoutType'],
		icon: stretchWide,
	},
	{
		name: 'carousel',
		scope: ['block', 'transform'],
		title: __('Carousel', 'visual-portfolio'),
		description: __(
			'A single row the visitor scrolls through.',
			'visual-portfolio'
		),
		attributes: { layoutType: 'carousel' },
		isActive: ['layoutType'],
		icon: image,
	},
];
