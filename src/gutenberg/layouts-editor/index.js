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
                    block_id: blockData.id || clientId,
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
    icon: {
        foreground: '#2540CC',
        src: (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <mask id="mask0" mask-type="alpha" maskUnits="userSpaceOnUse" x="9" y="8" width="5" height="6">
                    <path d="M11.1409 14L13.0565 8.49994H11.2789L9.55397 14H11.1409Z" fill="url(#paint0_linear)" />
                </mask>
                <g mask="url(#mask0)">
                    <path d="M11.1409 14L13.0565 8.49994H11.2789L9.55397 14H11.1409Z" fill="currentColor" />
                </g>
                <path d="M8.90795 14L6.9923 8.49994H8.76989L10.4948 14H8.90795Z" fill="currentColor" />
                <path d="M19 16.2222C19 16.6937 18.8104 17.1459 18.4728 17.4793C18.1352 17.8127 17.6774 18 17.2 18H2.8C2.32261 18 1.86477 17.8127 1.52721 17.4793C1.18964 17.1459 1 16.6937 1 16.2222V3.77778C1 3.30628 1.18964 2.8541 1.52721 2.5207C1.86477 2.1873 2.32261 2 2.8 2H7.3L9.1 4.66667H17.2C17.6774 4.66667 18.1352 4.85397 18.4728 5.18737C18.8104 5.52076 19 5.97295 19 6.44444V16.2222Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="transparent" />
                <defs>
                    <linearGradient id="paint0_linear" x1="12.191" y1="8.49994" x2="7.44436" y2="15.1301" gradientUnits="userSpaceOnUse">
                        <stop />
                        <stop offset="1" stopOpacity="0" />
                    </linearGradient>
                </defs>
            </svg>
        ),
    },
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
