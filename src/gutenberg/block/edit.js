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
                            icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="18.5" height="18.5" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M15.5 4.5H11.5" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 8H11.5" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 11.5H11.5" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 15H4.5" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><mask id="path-7-inside-1" fill="white"><rect x="3.5" y="3.5" width="6" height="8.8" rx="1"/></mask><rect x="3.5" y="3.5" width="6" height="8.8" rx="1" stroke="currentColor" stroke-width="3" mask="url(#path-7-inside-1)"/></svg>',
                        }, {
                            title: __( 'Images', '@@text_domain' ),
                            value: 'images',
                            icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.0428 14.3315V1.71123C16.0428 0.748663 15.2941 0 14.3315 0H1.71123C0.748663 0 0 0.748663 0 1.71123V14.3315C0 15.2941 0.748663 16.0428 1.71123 16.0428H14.3315C15.2941 16.0428 16.0428 15.2941 16.0428 14.3315ZM1.60428 1.71123C1.60428 1.60428 1.71123 1.60428 1.71123 1.60428H14.3315C14.4385 1.60428 14.4385 1.71123 14.4385 1.71123V9.62567L11.9786 7.80749C11.6578 7.59358 11.3369 7.59358 11.016 7.80749L7.91444 10.0535L5.34759 8.87701C5.13369 8.77005 4.81283 8.77005 4.59893 8.87701L1.49733 10.4813V1.71123H1.60428ZM1.60428 14.3315V12.4064L5.02674 10.5882L7.59358 11.8717C7.80749 11.9786 8.12834 11.9786 8.4492 11.7647L11.4438 9.62567L14.4385 11.7647V14.4385C14.4385 14.5455 14.3315 14.5455 14.3315 14.5455H1.71123C1.71123 14.4385 1.60428 14.3315 1.60428 14.3315Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M19.25 5.75C19.6642 5.75 20 6.08579 20 6.5C20 6.91421 20 17.25 20 17.25C20 18.7688 18.7688 20 17.25 20H4.27C3.85579 20 3.52 19.6642 3.52 19.25C3.52 18.8358 3.85579 18.5 4.27 18.5H17.25C17.9404 18.5 18.5 17.9404 18.5 17.25C18.5 17.25 18.5 6.91421 18.5 6.5C18.5 6.08579 18.8358 5.75 19.25 5.75Z" fill="currentColor"/></svg>',
                        }, {
                            title: __( 'Social', '@@text_domain' ),
                            value: 'social-stream',
                            icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.1429 6.57142C16.563 6.57142 17.7143 5.42015 17.7143 3.99999C17.7143 2.57983 16.563 1.42856 15.1429 1.42856C13.7227 1.42856 12.5714 2.57983 12.5714 3.99999C12.5714 5.42015 13.7227 6.57142 15.1429 6.57142Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.85715 12.5714C6.27731 12.5714 7.42858 11.4201 7.42858 9.99999C7.42858 8.57983 6.27731 7.42856 4.85715 7.42856C3.43699 7.42856 2.28572 8.57983 2.28572 9.99999C2.28572 11.4201 3.43699 12.5714 4.85715 12.5714Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.1429 18.5714C16.563 18.5714 17.7143 17.4201 17.7143 16C17.7143 14.5798 16.563 13.4286 15.1429 13.4286C13.7227 13.4286 12.5714 14.5798 12.5714 16C12.5714 17.4201 13.7227 18.5714 15.1429 18.5714Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.14285 11.4286L12.8571 14.5714" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.8571 5.42856L7.14285 8.57141" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
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
                            icon={ <ElementIcon width="20" height="20" /> }
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
