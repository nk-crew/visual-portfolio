/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ReactComponent as CommentsIcon } from '../../block-icons/item-meta-variation-comments.svg';
import { ReactComponent as ReadingTimeIcon } from '../../block-icons/item-meta-variation-reading-time.svg';
import { ReactComponent as ViewsIcon } from '../../block-icons/item-meta-variation-views.svg';

// The inserter mark of a variation. Kept apart from `META_TYPES[].icon`, which
// is the mark the block itself prints - in the editor and on the front end.
const VARIATION_ICONS = {
	comments: CommentsIcon,
	views: ViewsIcon,
	'reading-time': ReadingTimeIcon,
};

/**
 * Build the variation of a meta type.
 *
 * One implementation, three inserter entries. The `comments` one is the default
 * variation, which is what keeps the block itself out of the inserter - three
 * entries rather than four.
 *
 * @param {string} name        - meta type.
 * @param {string} title       - inserter title.
 * @param {string} description - inserter description.
 * @return {Object} block variation.
 */
function getVariation(name, title, description) {
	const Icon = VARIATION_ICONS[name];

	return {
		name,
		title,
		description,
		scope: ['inserter', 'block', 'transform'],
		attributes: { metaType: name },
		isActive: ['metaType'],
		icon: {
			foreground: '#2540CC',
			src: <Icon width="20" height="20" />,
		},
	};
}

export default [
	{
		...getVariation(
			'comments',
			__('Gallery Item Comments (Experimental)', 'visual-portfolio'),
			__(
				'Displays the number of comments of a gallery item. Block is experimental and will change in future releases. Please use with caution.',
				'visual-portfolio'
			)
		),
		isDefault: true,
	},
	getVariation(
		'views',
		__('Gallery Item Views (Experimental)', 'visual-portfolio'),
		__(
			'Displays the number of views of a gallery item. Block is experimental and will change in future releases. Please use with caution.',
			'visual-portfolio'
		)
	),
	getVariation(
		'reading-time',
		__('Gallery Item Reading Time (Experimental)', 'visual-portfolio'),
		__(
			'Displays the reading time of a gallery item. Block is experimental and will change in future releases. Please use with caution.',
			'visual-portfolio'
		)
	),
];
