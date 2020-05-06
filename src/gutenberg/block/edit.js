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
import IconsSelector from '../components/icons-selector';
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
    BaseControl,
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
            setAttributes,
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

        const sourceControl = (
            <BaseControl>
                <IconsSelector
                    value={ contentSource }
                    options={ [
                        {
                            title: __( 'Posts', '@@text_domain' ),
                            value: 'post-based',
                            icon: '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="7.5" y="1.5" width="55" height="67" rx="2.5" stroke="currentColor" stroke-width="3"/><rect x="18" y="16" width="15" height="13" rx="1" stroke="currentColor" stroke-width="2"/><line x1="41" y1="17" x2="52" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="41" y1="23" x2="52" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="41" y1="29" x2="52" y2="29" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18" y1="35" x2="52" y2="35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18" y1="41" x2="52" y2="41" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18" y1="53" x2="52" y2="53" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="18" y1="47" x2="52" y2="47" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
                        }, {
                            title: __( 'Images', '@@text_domain' ),
                            value: 'images',
                            icon: '<svg width="71" height="70" viewBox="0 0 71 70" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="67" height="67" rx="2.5" stroke="currentColor" stroke-width="3"/><circle cx="21.5" cy="21.5" r="5" stroke="currentColor" stroke-width="3"/><line x1="9.18934" y1="68.9393" x2="47.1893" y2="30.9393" stroke="currentColor" stroke-width="3"/><line x1="47.0607" y1="28.9393" x2="69.0607" y2="50.9393" stroke="currentColor" stroke-width="3"/></svg>',
                        }, {
                            title: __( 'Social', '@@text_domain' ),
                            value: 'social-stream',
                            icon: '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M53 23C57.9706 23 62 18.9706 62 14C62 9.02944 57.9706 5 53 5C48.0294 5 44 9.02944 44 14C44 18.9706 48.0294 23 53 23Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 44C21.9706 44 26 39.9706 26 35C26 30.0294 21.9706 26 17 26C12.0294 26 8 30.0294 8 35C8 39.9706 12.0294 44 17 44Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M53 65C57.9706 65 62 60.9706 62 56C62 51.0294 57.9706 47 53 47C48.0294 47 44 51.0294 44 56C44 60.9706 48.0294 65 53 65Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M25 40L45 51" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M45 19L25 30" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                        },
                    ] }
                    onChange={ ( val ) => setAttributes( { content_source: val } ) }
                />
            </BaseControl>
        );

        return (
            <Fragment>
                <InspectorControls>
                    <PanelBody title={ __( 'Content Source', '@@text_domain' ) }>
                        { sourceControl }
                    </PanelBody>
                    { contentSource ? (
                        <Fragment>
                            <PanelBody title={ contentSourceTitle }>
                                <ControlsRender category={ `content-source-${ contentSource }` } { ...this.props } />
                                <ControlsRender category="content-source-additional" { ...this.props } />
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
                            icon={ <ElementIcon /> }
                            label={ __( 'Visual Portfolio' ) }
                        >
                            { sourceControl }
                        </Placeholder>
                    ) }
                </div>
            </Fragment>
        );
    }
}
