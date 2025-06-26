import './block';
import './block-saved';
import './blocks/loop';
import './blocks/filter-by-category';
import './blocks/filter-by-category-item';
import './blocks/pagination';
import './blocks/pagination-infinite';
import './blocks/pagination-load-more';
import './blocks/pagination-next';
import './blocks/pagination-numbers';
import './blocks/pagination-previous';
import './blocks/sort';
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
