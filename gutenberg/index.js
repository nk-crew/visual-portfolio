import './block';
import './block-saved';
import './blocks/loop';
import './blocks/loop-filter';
import './blocks/loop-filter-item';
import './blocks/loop-pagination';
import './blocks/loop-pagination-infinite';
import './blocks/loop-pagination-load-more';
import './blocks/loop-pagination-next';
import './blocks/loop-pagination-numbers';
import './blocks/loop-pagination-previous';
import './blocks/loop-sort';
import './blocks/item-template';
import './blocks/item-image';
import './blocks/item-title';
import './blocks/item-description';
import './blocks/item-categories';
import './blocks/item-author';
import './blocks/item-date';
import './blocks/item-read-more';
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
