/**
 * Internal dependencies
 */
import '../store';
import './store';

import BlockEdit from '../block/edit';

/**
 * WordPress dependencies
 */
const {
    jQuery: $,
} = window;

const {
    registerBlockType,
    createBlock,
} = wp.blocks;

const { registerPlugin } = wp.plugins;

const {
    __,
    sprintf,
} = wp.i18n;

const { apiFetch } = wp;

const {
    applyFilters,
} = wp.hooks;

const {
    Fragment,
    Component,
} = wp.element;

const {
    PanelBody,
} = wp.components;

const {
    withSelect,
    withDispatch,
} = wp.data;

const {
    InspectorControls,
} = wp.blockEditor;

const { compose } = wp.compose;

const {
    plugin_name: pluginName,
} = window.VPGutenbergVariables;

/**
 * Layouts Editor block
 */
class LayoutsEditorBlock extends Component {
    // eslint-disable-next-line class-methods-use-this
    onShortcodeClick( event ) {
        window.getSelection().selectAllChildren( event.target );
    }

    // fix the problem with Gutenberg shortcode transform (allowed only plain text pasted).
    // eslint-disable-next-line class-methods-use-this
    onShortcodeCopy( event ) {
        // fix the problem with Gutenberg shortcode transform (allowed only plain text pasted).
        const copyText = window.getSelection().toString().replace( /[\n\r]+/g, '' );

        event.clipboardData.setData( 'text/plain', copyText );
        event.preventDefault();
    }

    render() {
        const {
            postId,
            blockData,
            updateBlockData,
            clientId,
        } = this.props;

        return (
            <Fragment>
                <InspectorControls>
                    <PanelBody
                        title={ __( 'Shortcodes', '@@text_domain' ) }
                    >
                        <p>{ __( 'To output this saved layout and its components you can use the following shortcodes:' ) }</p>

                        <p>
                            { __( 'Layout:', '@@text_domain' ) }
                            <br />
                            <code
                                role="button"
                                tabIndex="0"
                                aria-hidden="true"
                                onClick={ this.onShortcodeClick }
                                onCopy={ this.onShortcodeCopy }
                                onCut={ this.onShortcodeCopy }
                            >
                                [visual_portfolio id=&quot;
                                { postId }
                                &quot;]
                            </code>
                        </p>

                        <p>
                            { __( 'Filter (optional):', '@@text_domain' ) }
                            <br />
                            <code
                                role="button"
                                tabIndex="0"
                                aria-hidden="true"
                                onClick={ this.onShortcodeClick }
                                onCopy={ this.onShortcodeCopy }
                                onCut={ this.onShortcodeCopy }
                            >
                                [visual_portfolio_filter id=&quot;
                                { postId }
                                &quot;]
                            </code>
                        </p>

                        <p>
                            { __( 'Sort (optional):', '@@text_domain' ) }
                            <br />
                            <code
                                role="button"
                                tabIndex="0"
                                aria-hidden="true"
                                onClick={ this.onShortcodeClick }
                                onCopy={ this.onShortcodeCopy }
                                onCut={ this.onShortcodeCopy }
                            >
                                [visual_portfolio_sort id=&quot;
                                { postId }
                                &quot;]
                            </code>
                        </p>

                        { applyFilters(
                            'vpf.layouts-editor.shortcodes',
                            '',
                            this
                        ) }
                    </PanelBody>
                </InspectorControls>
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
            </Fragment>
        );
    }
}

const LayoutsEditorBlockWithSelect = compose( [
    withSelect( ( select ) => {
        const blockData = select( 'visual-portfolio/saved-layout-data' ).getBlockData();
        const postId = select( 'core/editor' ).getCurrentPostId();

        return {
            postId,
            blockData,
        };
    } ),
    withDispatch( ( dispatch ) => ( {
        updateBlockData( data ) {
            dispatch( 'visual-portfolio/saved-layout-data' ).updateBlockData( data );
        },
    } ) ),
] )( LayoutsEditorBlock );

registerBlockType( 'visual-portfolio/saved-editor', {
    title: sprintf( __( '%s Editor', '@@text_domain' ), pluginName ),
    description: sprintf( __( 'Edit saved %s layouts.', '@@text_domain' ), pluginName ),
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

class UpdateEditor extends Component {
    componentDidMount() {
        const {
            isSavingPost,
            isAutosavingPost,
        } = this.props;

        this.defaultBlockData = false;
        this.editorRefreshTimeout = false;

        this.wasSavingPost = isSavingPost;
        this.wasAutosavingPost = isAutosavingPost;

        this.update();
    }

    componentDidUpdate() {
        this.update();
    }

    /**
     * Run when something changed in editor.
     */
    update() {
        this.changeToVisualMode();
        this.addBlock();
        this.alwaysSelectBlock();
        this.checkIfPostEdited();
        this.saveMetaOnPostUpdate();
    }

    /**
     * Force change gutenberg edit mode to Visual.
     */
    changeToVisualMode() {
        const {
            editorSettings,
            editorMode,
            switchEditorMode,
        } = this.props;

        if ( ! editorSettings.richEditingEnabled ) {
            return;
        }

        if ( 'text' === editorMode ) {
            switchEditorMode();
        }
    }

    /**
     * Add default block to post if doesn't exist.
     */
    addBlock() {
        if ( this.blocksRestoreBusy ) {
            return;
        }

        const {
            resetBlocks,
            insertBlocks,
            blocks,
        } = this.props;

        const isValidList = 1 === blocks.length && blocks[ 0 ] && 'visual-portfolio/saved-editor' === blocks[ 0 ].name;

        if ( ! isValidList ) {
            this.blocksRestoreBusy = true;
            resetBlocks( [] );
            insertBlocks(
                createBlock( 'visual-portfolio/saved-editor' )
            );
            this.blocksRestoreBusy = false;
        }
    }

    /**
     * Always select block.
     */
    alwaysSelectBlock() {
        const {
            selectedBlock,
            blocks,
            selectBlock,
        } = this.props;

        // if selected block, do nothing.
        if ( selectedBlock && 'visual-portfolio/saved-editor' === selectedBlock.name ) {
            return;
        }

        // check if selected post title, also do nothing.
        // `.editor-post-title.is-selected` is added since WP 5.9
        if ( $( '.editor-post-title__block.is-selected, .editor-post-title.is-selected' ).length ) {
            return;
        }

        let selectBlockId = '';
        blocks.forEach( ( blockData ) => {
            if ( 'visual-portfolio/saved-editor' === blockData.name ) {
                selectBlockId = blockData.clientId;
            }
        } );

        if ( selectBlockId ) {
            selectBlock( selectBlockId );
        }
    }

    /**
     * Check if post meta data edited and allow to update the post.
     */
    checkIfPostEdited() {
        const {
            isSavingPost,
            isAutosavingPost,
            blockData,
            editPost,
        } = this.props;

        if ( ! blockData || ! Object.keys( blockData ).length ) {
            return;
        }

        if ( isSavingPost || isAutosavingPost || ! this.defaultBlockData ) {
            this.defaultBlockData = JSON.stringify( blockData );
            return;
        }

        clearTimeout( this.editorRefreshTimeout );
        this.editorRefreshTimeout = setTimeout( () => {
            if ( this.defaultBlockData !== JSON.stringify( blockData ) ) {
                editPost( { edited: new Date() } );
            }
        }, 150 );
    }

    /**
     * Save meta data on post save.
     */
    saveMetaOnPostUpdate() {
        const {
            isSavingPost,
            isAutosavingPost,
            postId,
            blockData,
        } = this.props;

        const shouldUpdate = this.wasSavingPost && ! isSavingPost && ! this.wasAutosavingPost;

        // Save current state for next inspection.
        this.wasSavingPost = isSavingPost;
        this.wasAutosavingPost = isAutosavingPost;

        if ( shouldUpdate ) {
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
    }

    render() {
        return null;
    }
}

registerPlugin( 'vpf-saved-layouts-editor', {
    render: compose(
        withSelect( ( select ) => {
            const {
                isSavingPost,
                isAutosavingPost,
                getCurrentPostId,
                getEditorSettings,
            } = select( 'core/editor' );

            const {
                getSelectedBlock,
                getBlocks,
            } = select( 'core/block-editor' );

            const {
                getEditorMode,
            } = select( 'core/edit-post' );

            const {
                getBlockData,
            } = select( 'visual-portfolio/saved-layout-data' );

            return {
                isSavingPost: isSavingPost(),
                isAutosavingPost: isAutosavingPost(),
                selectedBlock: getSelectedBlock(),
                editorSettings: getEditorSettings(),
                editorMode: getEditorMode(),
                blocks: getBlocks(),
                postId: getCurrentPostId(),
                blockData: getBlockData(),
            };
        } ),
        withDispatch( ( dispatch ) => {
            const {
                selectBlock,
                insertBlocks,
                resetBlocks,
            } = dispatch( 'core/block-editor' );

            const {
                editPost,
            } = dispatch( 'core/editor' );

            const {
                switchEditorMode,
            } = dispatch( 'core/edit-post' );

            return {
                selectBlock,
                insertBlocks,
                resetBlocks,
                editPost,
                switchEditorMode,
            };
        } ),
    )( UpdateEditor ),
} );
