/**
 * Internal dependencies
 */
import ElementIcon from '../../assets/admin/images/icon-gutenberg.svg';

import metadata from './block.json';
import edit from './edit';
import save from './save';

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
    icon: ElementIcon,
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
    edit,
    save,
};

registerBlockType( name, settings );
