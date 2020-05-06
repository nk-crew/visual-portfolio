/**
 * Internal dependencies
 */
import '../store';
import './store';

import BlockEdit from '../block/edit';

/**
 * WordPress dependencies
 */
const { isEqual } = window.lodash;

const {
    registerBlockType,
} = wp.blocks;

const { __ } = wp.i18n;

const { apiFetch } = wp;

const {
    Component,
} = wp.element;

const { compose } = wp.compose;

const {
    withSelect,
    withDispatch,
    dispatch,
    select,
    subscribe,
} = wp.data;

/**
 * Layouts Editor block
 */
class LayoutsEditorBlock extends Component {
    render() {
        const {
            blockData,
            updateBlockData,
            clientId,
        } = this.props;

        return (
            <BlockEdit
                attributes={ {
                    ...blockData,
                    block_id: clientId,
                } }
                setAttributes={ ( data ) => {
                    updateBlockData( data );
                } }
                clientId={ clientId }
            />
        );
    }
}

const LayoutsEditorBlockWithSelect = compose( [
    withSelect( () => {
        const blockData = select( 'visual-portfolio/saved-layout-data' ).getBlockData();

        return {
            blockData,
        };
    } ),
    withDispatch( () => ( {
        updateBlockData( data ) {
            dispatch( 'visual-portfolio/saved-layout-data' ).updateBlockData( data );
        },
    } ) ),
] )( LayoutsEditorBlock );

registerBlockType( 'visual-portfolio/saved-editor', {
    title: __( 'Visual Portfolio Editor', '@@text_domain' ),
    description: __( 'Edit saved Visual Portfolio layouts.', '@@text_domain' ),
    category: 'common',
    supports: {
        html: false,
        className: false,
        customClassName: false,
        anchor: false,
        inserter: false,
    },

    edit: LayoutsEditorBlockWithSelect,

    save() {
        return null;
    },
} );

// Add default block to post if doesn't exist.
const getBlockList = () => wp.data.select( 'core/block-editor' ).getBlocks();
let blockList = getBlockList();
let blocksRestoreBusy = false;
subscribe( () => {
    if ( blocksRestoreBusy ) {
        return;
    }

    const newBlockList = getBlockList();
    const blockListChanged = newBlockList !== blockList;
    const isValidList = 1 === newBlockList.length && newBlockList[ 0 ] && 'visual-portfolio/saved-editor' === newBlockList[ 0 ].name;
    blockList = newBlockList;

    if ( blockListChanged && ! isValidList ) {
        blocksRestoreBusy = true;
        wp.data.dispatch( 'core/block-editor' ).resetBlocks( [] );
        wp.data.dispatch( 'core/block-editor' ).insertBlocks(
            wp.blocks.createBlock( 'visual-portfolio/saved-editor' )
        );
        blocksRestoreBusy = false;
    }
} );

// always select main block.
subscribe( () => {
    const selectedBlock = wp.data.select( 'core/block-editor' ).getSelectedBlock();
    const blocks = wp.data.select( 'core/block-editor' ).getBlocks();

    if ( selectedBlock && 'visual-portfolio/saved-editor' === selectedBlock.name ) {
        return;
    }

    let selectBlockId = '';
    blocks.forEach( ( blockData ) => {
        if ( 'visual-portfolio/saved-editor' === blockData.name ) {
            selectBlockId = blockData.clientId;
        }
    } );

    if ( selectBlockId ) {
        wp.data.dispatch( 'core/block-editor' ).selectBlock( selectBlockId );
    }
} );

// check if block data changed.
let defaultBlockData = false;
let editorRefreshTimeout = false;
subscribe( () => {
    const isSavingPost = select( 'core/editor' ).isSavingPost();
    const isAutosavingPost = select( 'core/editor' ).isAutosavingPost();
    const blockData = select( 'visual-portfolio/saved-layout-data' ).getBlockData();

    if ( ! blockData || ! Object.keys( blockData ).length ) {
        return;
    }

    if ( isSavingPost || isAutosavingPost || ! defaultBlockData ) {
        defaultBlockData = { ...blockData };
        return;
    }

    clearTimeout( editorRefreshTimeout );
    editorRefreshTimeout = setTimeout( () => {
        // isEqual can't determine that resorted objects are not equal.
        const changedControls = defaultBlockData.controls
                                && blockData.controls
                                && ! isEqual( Object.keys( defaultBlockData.controls ), Object.keys( blockData.controls ) );

        if ( changedControls || ! isEqual( defaultBlockData, blockData ) ) {
            wp.data.dispatch( 'core/editor' ).editPost( { edited: true } );
        }
    }, 150 );
} );

// save meta data on post save.
let wasSavingPost = select( 'core/editor' ).isSavingPost();
let wasAutosavingPost = select( 'core/editor' ).isAutosavingPost();
subscribe( () => {
    const isSavingPost = select( 'core/editor' ).isSavingPost();
    const isAutosavingPost = select( 'core/editor' ).isAutosavingPost();
    const shouldUpdate = wasSavingPost && ! isSavingPost && ! wasAutosavingPost;

    // Save current state for next inspection.
    wasSavingPost = isSavingPost;
    wasAutosavingPost = isAutosavingPost;

    if ( shouldUpdate ) {
        const postId = select( 'core/editor' ).getCurrentPostId();
        const blockData = select( 'visual-portfolio/saved-layout-data' ).getBlockData();
        const prefixedBlockData = {};

        Object.keys( blockData ).forEach( ( name ) => {
            prefixedBlockData[ `vp_${ name }` ] = blockData[ name ];
        } );

        apiFetch( {
            path: '/visual-portfolio/v1/update_layout/',
            method: 'POST',
            data: {
                data: prefixedBlockData,
                post_id: postId,
            },
        } )
            .catch( ( response ) => {
                // eslint-disable-next-line
                console.log( response );
            } );
    }
} );
