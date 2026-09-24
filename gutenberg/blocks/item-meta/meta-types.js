/**
 * WordPress dependencies
 */
import { applyFilters } from '@wordpress/hooks';
import { decodeEntities } from '@wordpress/html-entities';
import { __, _n, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ReactComponent as CommentsIcon } from '../../block-icons/item-meta-comments.svg';
import { ReactComponent as ReadingTimeIcon } from '../../block-icons/item-meta-reading-time.svg';
import { ReactComponent as ViewsIcon } from '../../block-icons/item-meta-views.svg';

// Every `getText` mirrors the `text` of its type in `vpf_item_meta_types` - the
// preview is only worth having while it says what the front end will say.
const META_TYPES = {
	comments: {
		icon: CommentsIcon,
		contextKey: 'vp/itemCommentsCount',
		sample: 3,
		getText(value) {
			const comments = parseInt(value, 10) || 0;

			if (!comments) {
				return __('No Comments', 'visual-portfolio');
			}

			return sprintf(
				// translators: %s number of comments.
				_n('%s Comment', '%s Comments', comments, 'visual-portfolio'),
				comments
			);
		},
	},
	views: {
		icon: ViewsIcon,
		contextKey: 'vp/itemViewsCount',
		sample: 128,
		getText(value) {
			const views = parseInt(value, 10) || 0;

			return sprintf(
				// translators: %s number of views.
				_n('%s View', '%s Views', views, 'visual-portfolio'),
				views
			);
		},
	},
	'reading-time': {
		icon: ReadingTimeIcon,
		contextKey: 'vp/itemReadingTime',
		sample: 4,
		getText(value) {
			// The reading time is the string `< 1` for anything under a minute,
			// and it arrives HTML-encoded. PHP prints it as is - `esc_html()`
			// leaves an entity alone - but here it is a text node.
			const isNumber = value !== '' && !Number.isNaN(Number(value));
			const minutes = isNumber ? parseInt(value, 10) : 1;

			return sprintf(
				// translators: %s reading time in minutes.
				_n('%s Min Read', '%s Mins Read', minutes, 'visual-portfolio'),
				isNumber ? minutes : decodeEntities(String(value))
			);
		},
	},
};

/**
 * The meta types this install offers, keyed by the `metaType` they are saved
 * as: the mark the block prints, the context key the value comes in, a value
 * to preview an item without one, and `getText( value )`.
 *
 * Pro and a theme add a type through this filter and `vpf_item_meta_types` on
 * the server, which also hands the block the context key in the editor. Its
 * inserter entry is a variation of its own, registered with
 * `registerBlockVariation()`.
 *
 * @return {Object} meta types.
 */
export function getMetaTypes() {
	return applyFilters('vpf.itemMetaTypes', META_TYPES);
}
