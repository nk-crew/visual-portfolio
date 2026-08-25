/**
 * WordPress dependencies
 */
import { decodeEntities } from '@wordpress/html-entities';
import { __, _n, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ReactComponent as CommentsIcon } from '../../block-icons/item-meta-comments.svg';
import { ReactComponent as ReadingTimeIcon } from '../../block-icons/item-meta-reading-time.svg';
import { ReactComponent as ViewsIcon } from '../../block-icons/item-meta-views.svg';

/**
 * The context key and the mark of every meta type.
 *
 * Shared by the edit component and the variations, so a type is declared once.
 */
export const META_TYPES = {
	comments: {
		icon: CommentsIcon,
		contextKey: 'vp/itemCommentsCount',
		sample: 3,
	},
	views: {
		icon: ViewsIcon,
		contextKey: 'vp/itemViewsCount',
		sample: 128,
	},
	'reading-time': {
		icon: ReadingTimeIcon,
		contextKey: 'vp/itemReadingTime',
		sample: 4,
	},
};

/**
 * The phrase a meta value reads as.
 *
 * Mirrors `Visual_Portfolio_Block_Item_Meta::get_text()` - the preview is only
 * worth having while it says what the front end will say.
 *
 * @param {string} metaType - meta type of the block.
 * @param {*}      value    - raw context value.
 * @return {string} the phrase.
 */
export function getMetaText(metaType, value) {
	if (metaType === 'views') {
		const views = parseInt(value, 10) || 0;

		return sprintf(
			// translators: %s number of views.
			_n('%s View', '%s Views', views, 'visual-portfolio'),
			views
		);
	}

	if (metaType === 'reading-time') {
		// The reading time is the string `< 1` for anything under a minute, and
		// it arrives HTML-encoded. PHP prints it as is - `esc_html()` leaves an
		// entity alone - but here it is a text node.
		const isNumber = value !== '' && !Number.isNaN(Number(value));
		const minutes = isNumber ? parseInt(value, 10) : 1;

		return sprintf(
			// translators: %s reading time in minutes.
			_n('%s Min Read', '%s Mins Read', minutes, 'visual-portfolio'),
			isNumber ? minutes : decodeEntities(String(value))
		);
	}

	const comments = parseInt(value, 10) || 0;

	if (!comments) {
		return __('No Comments', 'visual-portfolio');
	}

	return sprintf(
		// translators: %s number of comments.
		_n('%s Comment', '%s Comments', comments, 'visual-portfolio'),
		comments
	);
}
