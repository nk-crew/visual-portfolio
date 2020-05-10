/**
 * Internal dependencies
 */
import ElementIcon from '../assets/admin/images/icon-gutenberg.svg';

/**
 * Store
 */
import './store';

/**
 * Blocks
 */
import './block';
import './block-saved';

/**
 * WordPress dependencies
 */
const {
    registerBlockCollection,
} = wp.blocks;

// Collection.
registerBlockCollection( 'visual-portfolio', {
    title: 'Visual Portfolio',
    icon: <ElementIcon width="20" height="20" />,
} );
