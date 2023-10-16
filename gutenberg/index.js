import './block';
import './block-saved';
import './extensions/block-id';
import './extensions/classic-icon-with-overlay';
import './extensions/items-count-all';
import './extensions/link-rel';
import './extensions/stretch-for-saved-only';
import './store';
import './components/dropdown';

import { registerBlockCollection } from '@wordpress/blocks';

import { ReactComponent as ElementIcon } from '../assets/admin/images/icon-gutenberg.svg';

const { plugin_name: pluginName } = window.VPGutenbergVariables;

// Collection.
registerBlockCollection('visual-portfolio', {
	title: pluginName,
	icon: <ElementIcon width="20" height="20" />,
});
