import { applyFilters } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { getProLabel } from '../components/pro-teaser';

const { pro: isProPlugin } = window.VPGutenbergVariables;

// The item's own link when it has one, the lightbox otherwise. See
// `Visual_Portfolio_Popup::resolve_click_action()`.
export const URL_OR_POPUP = 'url-or-popup';

// What a click on an item block does, the choices the free plugin draws.
const CLICK_ACTIONS = [
	{ label: __('None', 'visual-portfolio'), value: 'none' },
	{ label: __('Open the item', 'visual-portfolio'), value: 'url' },
	{ label: __('Open in lightbox', 'visual-portfolio'), value: 'popup' },
	{
		label: __('Open its link, else in lightbox', 'visual-portfolio'),
		value: URL_OR_POPUP,
	},
];

/**
 * Whether a click action may follow a link, and so takes a target and a rel.
 *
 * @param {string} action - click action.
 * @return {boolean} whether it may.
 */
export function followsLink(action) {
	return 'url' === action || URL_OR_POPUP === action;
}

/**
 * Whether a click action may open the lightbox.
 *
 * @param {string} action - click action.
 * @return {boolean} whether it may.
 */
export function mayOpenLightbox(action) {
	return 'popup' === action || URL_OR_POPUP === action;
}

// The choices Pro adds, for an install without them.
const PRO_CLICK_ACTIONS = [
	{ label: __('Quick View', 'visual-portfolio'), value: 'quick-view' },
];

/**
 * The click actions of the clickable item blocks.
 *
 * An extension adds its own through `vpf.itemClickActions` - `{ label, value,
 * icon }` - and renders them through `vpf_loop_item_click_attributes`. A Pro
 * choice this install lacks is shown disabled.
 *
 * @return {Array} `{ label, value, icon, disabled }`.
 */
export function getClickActions() {
	const added = applyFilters('vpf.itemClickActions', []);
	const teasers = isProPlugin
		? []
		: PRO_CLICK_ACTIONS.filter(
				({ value }) => !added.some((action) => action.value === value)
			).map((action) => ({
				...action,
				label: getProLabel(action.label),
				disabled: true,
			}));

	return [...CLICK_ACTIONS, ...added, ...teasers];
}
