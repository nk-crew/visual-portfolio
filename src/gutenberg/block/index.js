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

const {
    registerBlockType,
} = wp.blocks;

const { name } = metadata;

const settings = {
    ...metadata,
    title: __( 'Visual Portfolio', '@@text_domain' ),
    description: __( 'Display galleries, posts and portfolio grids.', '@@text_domain' ),
    icon: {
        foreground: '#2540CC',
        src: <ElementIcon width="20" height="20" />,
    },
    keywords: [
        __( 'gallery', '@@text_domain' ),
        __( 'images', '@@text_domain' ),
        __( 'vpf', '@@text_domain' ),
    ],
    ghostkit: {
        supports: {
            styles: true,
            spacings: true,
            display: true,
            scrollReveal: true,
        },
    },
    variations,
    edit,
    save,
    transforms,
};

registerBlockType( name, settings );
