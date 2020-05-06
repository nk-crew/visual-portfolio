/**
 * Internal dependencies
 */
import ElementIcon from '../../assets/admin/images/icon-gutenberg.svg';

import metadata from './block.json';
import edit from './edit';
import save from './save';
import transforms from './transforms';
import deprecated from './deprecated';

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
    title: __( 'Saved Visual Portfolio', '@@text_domain' ),
    description: __( 'Display saved Visual Portfolio layouts.', '@@text_domain' ),
    icon: ElementIcon,
    keywords: [
        __( 'saved', '@@text_domain' ),
        __( 'portfolio', '@@text_domain' ),
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
    transforms,
    deprecated,
};

registerBlockType( name, settings );
