/**
 * Internal dependencies
 */
import { ReactComponent as ElementIcon } from '../assets/admin/images/icon-gutenberg.svg';

/**
 * Store
 */
import './store';

/**
 * Extensions
 */
import './extensions/block-id';
import './extensions/classic-icon-with-overlay';
import './extensions/items-count-all';
import './extensions/link-rel';
import './extensions/stretch-for-saved-only';

/**
 * Blocks
 */
import './block';
import './block-saved';

/**
 * WordPress dependencies
 */
import { registerBlockCollection } from '@wordpress/blocks';

const { plugin_name: pluginName } = window.VPGutenbergVariables;

// Collection.
registerBlockCollection('visual-portfolio', {
	title: pluginName,
	icon: <ElementIcon width="20" height="20" />,
});
