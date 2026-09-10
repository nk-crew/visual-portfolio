/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { arrowLeft, chevronLeft } from '@wordpress/icons';

/**
 * What the arrow is drawn as.
 *
 * A variation each, so the glyph is switched where the editor switches every
 * other kind of block - the row of icons above the settings, and the block
 * switcher - rather than in a control of ours further down the sidebar. The
 * icons are the glyphs themselves.
 */
export default [
	{
		name: 'chevron',
		scope: ['block', 'transform'],
		isDefault: true,
		title: __('Chevron', 'visual-portfolio'),
		description: __(
			'A thin angle bracket, the way the editor draws its own arrows.',
			'visual-portfolio'
		),
		attributes: { icon: 'chevron' },
		isActive: ['icon'],
		icon: chevronLeft,
	},
	{
		name: 'arrow',
		scope: ['block', 'transform'],
		title: __('Arrow', 'visual-portfolio'),
		description: __(
			'A line with a head, for a gallery that reads better with one.',
			'visual-portfolio'
		),
		attributes: { icon: 'arrow' },
		isActive: ['icon'],
		icon: arrowLeft,
	},
];
