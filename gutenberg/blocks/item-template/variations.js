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
		icon: (
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M8.5 15.25C9.74264 15.25 10.75 16.2574 10.75 17.5V19.5C10.75 20.7426 9.74264 21.75 8.5 21.75H4.5C3.25736 21.75 2.25 20.7426 2.25 19.5V17.5C2.25 16.2574 3.25736 15.25 4.5 15.25H8.5ZM19.5 15.25C20.7426 15.25 21.75 16.2574 21.75 17.5V19.5C21.75 20.7426 20.7426 21.75 19.5 21.75H15.5C14.2574 21.75 13.25 20.7426 13.25 19.5V17.5C13.25 16.2574 14.2574 15.25 15.5 15.25H19.5ZM4.5 16.75C4.08579 16.75 3.75 17.0858 3.75 17.5V19.5C3.75 19.9142 4.08579 20.25 4.5 20.25H8.5C8.91421 20.25 9.25 19.9142 9.25 19.5V17.5C9.25 17.0858 8.91421 16.75 8.5 16.75H4.5ZM15.5 16.75C15.0858 16.75 14.75 17.0858 14.75 17.5V19.5C14.75 19.9142 15.0858 20.25 15.5 20.25H19.5C19.9142 20.25 20.25 19.9142 20.25 19.5V17.5C20.25 17.0858 19.9142 16.75 19.5 16.75H15.5ZM19.5 2.25C20.7426 2.25 21.75 3.25736 21.75 4.5V10.5C21.75 11.7426 20.7426 12.75 19.5 12.75H15.5C14.2574 12.75 13.25 11.7426 13.25 10.5V4.5C13.25 3.25736 14.2574 2.25 15.5 2.25H19.5ZM15.5 3.75C15.0858 3.75 14.75 4.08579 14.75 4.5V10.5C14.75 10.9142 15.0858 11.25 15.5 11.25H19.5C19.9142 11.25 20.25 10.9142 20.25 10.5V4.5C20.25 4.08579 19.9142 3.75 19.5 3.75H15.5ZM8.5 2.25C9.74264 2.25 10.75 3.25736 10.75 4.5V8.5C10.75 9.74264 9.74264 10.75 8.5 10.75H4.5C3.25736 10.75 2.25 9.74264 2.25 8.5V4.5C2.25 3.25736 3.25736 2.25 4.5 2.25H8.5ZM4.5 3.75C4.08579 3.75 3.75 4.08579 3.75 4.5V8.5C3.75 8.91421 4.08579 9.25 4.5 9.25H8.5C8.91421 9.25 9.25 8.91421 9.25 8.5V4.5C9.25 4.08579 8.91421 3.75 8.5 3.75H4.5Z"
					fill="currentColor"
				/>
			</svg>
		),
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
		icon: (
			<svg
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M9.71777 19.3555C10.2975 19.4144 10.7498 19.9048 10.75 20.5C10.7498 21.1348 10.2353 21.6491 9.60059 21.6494C9.00515 21.6494 8.51494 21.1971 8.45605 20.6172L8.4502 20.5L8.45605 20.3818C8.51522 19.8022 9.00536 19.3496 9.60059 19.3496L9.71777 19.3555ZM14.5176 19.3555C15.0973 19.4143 15.5496 19.9047 15.5498 20.5C15.5496 21.1348 15.0352 21.6492 14.4004 21.6494C13.805 21.6494 13.3147 21.1971 13.2559 20.6172L13.25 20.5L13.2559 20.3818C13.315 19.8022 13.8052 19.3496 14.4004 19.3496L14.5176 19.3555ZM16.5 3.75C18.0188 3.75 19.25 4.98122 19.25 6.5V15.5C19.25 17.0188 18.0188 18.25 16.5 18.25H7.5C5.98122 18.25 4.75 17.0188 4.75 15.5V6.5C4.75 4.98122 5.98122 3.75 7.5 3.75H16.5ZM7.5 5.25C6.80964 5.25 6.25 5.80964 6.25 6.5V15.5C6.25 16.1904 6.80964 16.75 7.5 16.75H16.5C17.1904 16.75 17.75 16.1904 17.75 15.5V6.5C17.75 5.80964 17.1904 5.25 16.5 5.25H7.5ZM3 5.75C3.41421 5.75 3.75 6.08579 3.75 6.5V15.5C3.75 15.9142 3.41421 16.25 3 16.25C2.58579 16.25 2.25 15.9142 2.25 15.5V6.5C2.25 6.08579 2.58579 5.75 3 5.75ZM21 5.75C21.4142 5.75 21.75 6.08579 21.75 6.5V15.5C21.75 15.9142 21.4142 16.25 21 16.25C20.5858 16.25 20.25 15.9142 20.25 15.5V6.5C20.25 6.08579 20.5858 5.75 21 5.75Z"
					fill="currentColor"
				/>
			</svg>
		),
	},
];
