/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { grid } from '@wordpress/icons';

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
		icon: (
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M18.5 3C19.6046 3 20.5 3.89543 20.5 5V14.6865C20.5015 14.7058 20.5029 14.7254 20.5029 14.7451C20.5029 14.7642 20.5014 14.783 20.5 14.8018V18.5C20.5 19.6046 19.6046 20.5 18.5 20.5H5C3.89543 20.5 3 19.6046 3 18.5V5C3 3.89543 3.89543 3 5 3H18.5ZM4.5 9.49512V18.5C4.5 18.7761 4.72386 19 5 19H10.998V9.49512H4.5ZM12.498 19H18.5C18.7761 19 19 18.7761 19 18.5V15.4951H12.498V19ZM12.498 8.66113C12.5011 8.68868 12.5029 8.71676 12.5029 8.74512C12.5029 8.77285 12.501 8.80019 12.498 8.82715V13.9951H19V5C19 4.72386 18.7761 4.5 18.5 4.5H12.498V8.66113ZM5 4.5C4.72386 4.5 4.5 4.72386 4.5 5V7.99512H10.998V4.5H5Z"
					fill="currentColor"
				/>
			</svg>
		),
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
		icon: (
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M18.5 3C19.6046 3 20.5 3.89543 20.5 5V18.5C20.5 19.6046 19.6046 20.5 18.5 20.5H5C3.89543 20.5 3 19.6046 3 18.5V5C3 3.89543 3.89543 3 5 3H18.5ZM4.5 12.4951V18.5C4.5 18.7761 4.72386 19 5 19H11.0078V12.4951H4.5ZM12.5078 19H18.5C18.7761 19 19 18.7761 19 18.5V5C19 4.72386 18.7761 4.5 18.5 4.5H12.5078V19ZM5 4.5C4.72386 4.5 4.5 4.72386 4.5 5V10.9951H11.0078V4.5H5Z"
					fill="currentColor"
				/>
			</svg>
		),
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
		icon: (
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M3.00146 5.00146C3.00146 3.8969 3.89689 3.00146 5.00146 3.00146L14.688 3.00146C14.7073 2.99997 14.7269 2.99853 14.7466 2.99853C14.7657 2.99854 14.7845 3.00006 14.8032 3.00146L18.5015 3.00146C19.606 3.00146 20.5015 3.89689 20.5015 5.00146L20.5015 18.5015C20.5015 19.606 19.606 20.5015 18.5015 20.5015L5.00146 20.5015C3.8969 20.5015 3.00146 19.606 3.00146 18.5015L3.00146 5.00146ZM9.49658 19.0015L18.5015 19.0015C18.7776 19.0015 19.0015 18.7776 19.0015 18.5015L19.0015 12.5034L9.49658 12.5034L9.49658 19.0015ZM19.0015 11.0034L19.0015 5.00146C19.0015 4.72532 18.7776 4.50146 18.5015 4.50146L15.4966 4.50146L15.4966 11.0034L19.0015 11.0034ZM8.6626 11.0034C8.69014 11.0004 8.71822 10.9985 8.74658 10.9985C8.77432 10.9985 8.80166 11.0005 8.82861 11.0034L13.9966 11.0034L13.9966 4.50146L5.00146 4.50146C4.72532 4.50146 4.50146 4.72532 4.50146 5.00146L4.50146 11.0034L8.6626 11.0034ZM4.50146 18.5015C4.50146 18.7776 4.72532 19.0015 5.00146 19.0015L7.99658 19.0015L7.99658 12.5034L4.50146 12.5034L4.50146 18.5015Z"
					fill="currentColor"
				/>
			</svg>
		),
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
		icon: (
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M11.5 3C12.6046 3 13.5 3.89543 13.5 5V18.5C13.5 19.6046 12.6046 20.5 11.5 20.5H5C3.89543 20.5 3 19.6046 3 18.5V5C3 3.89543 3.89543 3 5 3H11.5ZM19.75 3C20.1642 3 20.5 3.33579 20.5 3.75C20.5 4.16421 20.1642 4.5 19.75 4.5H17C16.7239 4.5 16.5 4.72386 16.5 5V18.5C16.5 18.7761 16.7239 19 17 19H19.75C20.1642 19 20.5 19.3358 20.5 19.75C20.5 20.1642 20.1642 20.5 19.75 20.5H17C15.8954 20.5 15 19.6046 15 18.5V5C15 3.89543 15.8954 3 17 3H19.75ZM5 4.5C4.72386 4.5 4.5 4.72386 4.5 5V18.5C4.5 18.7761 4.72386 19 5 19H11.5C11.7761 19 12 18.7761 12 18.5V5C12 4.72386 11.7761 4.5 11.5 4.5H5Z"
					fill="currentColor"
				/>
			</svg>
		),
	},
];
