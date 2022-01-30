/**
 * Internal dependencies
 */
import ElementIcon from '../../assets/admin/images/icon-gutenberg.svg';

import metadata from './block.json';
import edit from './edit';
import save from './save';
import variations from './variations';
import transforms from './transforms';

/**
 * WordPress dependencies
 */
const { __ } = wp.i18n;

const { registerBlockType, getCategories } = wp.blocks;

const { name } = metadata;

const { plugin_name: pluginName } = window.VPGutenbergVariables;

const hasMediaCategory = getCategories().some((category) => category.slug === 'media');

const settings = {
  ...metadata,
  category: hasMediaCategory ? metadata.category : 'common',
  title: pluginName,
  description: __('Display galleries, posts and portfolio grids.', '@@text_domain'),
  icon: {
    foreground: '#2540CC',
    src: <ElementIcon width="20" height="20" />,
  },
  keywords: [
    __('gallery', '@@text_domain'),
    __('images', '@@text_domain'),
    __('vpf', '@@text_domain'),
  ],
  ghostkit: {
    supports: {
      styles: true,
      spacings: true,
      display: true,
      scrollReveal: true,
    },
  },
  example: {
    attributes: {
      preview_image_example: 'true',
    },
  },
  variations,
  edit,
  save,
  transforms,
};

registerBlockType(name, settings);
