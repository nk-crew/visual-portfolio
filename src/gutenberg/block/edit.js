/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';
import shorthash from 'shorthash';

/**
 * Internal dependencies
 */
import ElementIcon from '../../assets/admin/images/icon-gutenberg.svg';
import ControlsRender from '../components/controls-render';
import IframePreview from '../components/iframe-preview';

/**
 * WordPress dependencies
 */
const { __ } = wp.i18n;

const {
    Component,
    Fragment,
} = wp.element;

const {
    Placeholder,
    PanelBody,
} = wp.components;

const {
    InspectorControls,
} = wp.blockEditor;

const usedIds = {};

/**
 * Block Edit Class.
 */
export default class BlockEdit extends Component {
    constructor( ...args ) {
        super( ...args );

        this.generateUniqueId = this.generateUniqueId.bind( this );
    }

    componentDidMount() {
        this.generateUniqueId();
    }

    componentDidUpdate() {
        this.generateUniqueId();
    }

    generateUniqueId() {
        const {
            clientId,
            attributes,
            setAttributes,
        } = this.props;

        let {
            block_id: blockId,
        } = attributes;

        // prepare new block id.
        if ( clientId && ! blockId ) {
            let ID = blockId || '';

            // check if ID already exist.
            let tryCount = 10;
            while ( ! ID || ( 'undefined' !== typeof usedIds[ ID ] && usedIds[ ID ] !== clientId && 0 < tryCount ) ) {
                ID = shorthash.unique( clientId );
                tryCount -= 1;
            }

            if ( ID && 'undefined' === typeof usedIds[ ID ] ) {
                usedIds[ ID ] = clientId;
            }

            if ( ID !== blockId ) {
                blockId = ID;
            }

            if ( attributes.block_id !== blockId ) {
                setAttributes( {
                    block_id: blockId,
                } );
            }
        }
    }

    render() {
        const {
            attributes,
        } = this.props;

        let {
            className,
        } = this.props;

        const {
            ghostkitClassname,
        } = attributes;

        let {
            content_source: contentSource,
        } = attributes;

        let contentSourceTitle = '';

        switch ( contentSource ) {
        case 'post-based':
            contentSourceTitle = __( 'Posts Settings', '@@text_domain' );
            break;
        case 'images':
            contentSourceTitle = __( 'Images Settings', '@@text_domain' );
            break;
        case 'social-stream':
            contentSourceTitle = __( 'Social Stream Settings', '@@text_domain' );
            break;
        // no default
        }

        // Saved layouts by default displaying Portfolio source.
        if ( 'portfolio' === contentSource ) {
            contentSource = '';
        }

        // add custom classname.
        if ( ghostkitClassname ) {
            className = classnames( className, ghostkitClassname );
        }

        return (
            <Fragment>
                <InspectorControls>
                    <PanelBody title={ __( 'Content Source', '@@text_domain' ) }>
                        <ControlsRender category="content-source" { ...this.props } />
                    </PanelBody>
                    { contentSource ? (
                        <Fragment>
                            <PanelBody>
                                <ControlsRender category="content-source-additional" { ...this.props } />
                            </PanelBody>
                            <PanelBody title={ contentSourceTitle }>
                                <ControlsRender category={ `content-source-${ contentSource }` } { ...this.props } />
                            </PanelBody>
                            <PanelBody title={ __( 'Layout', '@@text_domain' ) } initialOpen={ false }>
                                <ControlsRender category="layouts" { ...this.props } />
                            </PanelBody>
                            <PanelBody title={ __( 'Items Style', '@@text_domain' ) } initialOpen={ false }>
                                <ControlsRender category="items-style" { ...this.props } />
                            </PanelBody>
                            <PanelBody title={ __( 'Items Click Action', '@@text_domain' ) } initialOpen={ false }>
                                <ControlsRender category="items-click-action" { ...this.props } />
                            </PanelBody>
                            <PanelBody title={ __( 'Filter', '@@text_domain' ) } initialOpen={ false }>
                                <ControlsRender category="filter" { ...this.props } />
                            </PanelBody>
                            <PanelBody title={ __( 'Sort', '@@text_domain' ) } initialOpen={ false }>
                                <ControlsRender category="sort" { ...this.props } />
                            </PanelBody>
                            <PanelBody title={ __( 'Pagination', '@@text_domain' ) } initialOpen={ false }>
                                <ControlsRender category="pagination" { ...this.props } />
                            </PanelBody>
                            <PanelBody title={ __( 'Custom CSS', '@@text_domain' ) } initialOpen={ false }>
                                <ControlsRender category="custom_css" { ...this.props } />
                            </PanelBody>
                        </Fragment>
                    ) : '' }
                </InspectorControls>
                <div className={ className }>
                    { contentSource ? (
                        <IframePreview { ...this.props } />
                    ) : (
                        <Placeholder
                            className="vpf-component-placeholder"
                            icon={ <ElementIcon width="20" height="20" /> }
                            label={ __( 'Visual Portfolio' ) }
                        >
                            <ControlsRender category="content-source" { ...this.props } />
                        </Placeholder>
                    ) }
                </div>
            </Fragment>
        );
    }
}
