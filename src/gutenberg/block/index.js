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
const { registerBlockType } = wp.blocks;

const { name } = metadata;

const settings = {
  ...metadata,
  icon: {
    foreground: '#2540CC',
    src: <ElementIcon width="20" height="20" />,
  },
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
