/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';

/**
 * Internal dependencies
 */
import ElementIcon from '../../assets/admin/images/icon-gutenberg.svg';
import ControlsRender from '../components/controls-render';
import IframePreview from '../components/iframe-preview';

/**
 * WordPress dependencies
 */
const {
    Component,
    Fragment,
} = wp.element;

const {
    Placeholder,
} = wp.components;

const {
    InspectorControls,
} = wp.blockEditor;

const {
    plugin_name: pluginName,
    controls_categories: registeredControlsCategories,
} = window.VPGutenbergVariables;

/**
 * Block Edit Class.
 */
export default class BlockEdit extends Component {
    componentDidMount() {
        const {
            attributes,
            setAttributes,
        } = this.props;

        const {
            block_id: blockId,
            content_source: contentSource,
            setup_wizard: setupWizard,
        } = attributes;

        if ( ! setupWizard && ( ! blockId || ! contentSource ) ) {
            setAttributes( {
                setup_wizard: 'true',
            } );
        }
    }

    componentDidUpdate() {
        const {
            attributes,
            setAttributes,
        } = this.props;

        const {
            setup_wizard: setupWizard,
            content_source: contentSource,
            images,
        } = attributes;

        // Set some starter attributes for different content sources.
        // And hide the setup wizard.
        if ( setupWizard && contentSource ) {
            switch ( contentSource ) {
            case 'images':
                if ( images && images.length ) {
                    setAttributes( {
                        setup_wizard: '',
                        items_count: -1,
                        items_click_action: 'popup_gallery',
                    } );
                }
                break;
            case 'post-based':
            case 'social-stream':
                setAttributes( {
                    setup_wizard: '',
                    layout_elements: {
                        top: {
                            elements: [],
                            align: 'center',
                        },
                        items: {
                            elements: [ 'items' ],
                        },
                        bottom: {
                            elements: [ 'pagination' ],
                            align: 'center',
                        },
                    },
                } );
                break;
            default:
                setAttributes( {
                    setup_wizard: '',
                } );
                break;
            }
        }
    }

    // eslint-disable-next-line class-methods-use-this
    renderControls( props, isSetupWizard = false ) {
        const {
            attributes,
        } = props;

        let {
            content_source: contentSource,
        } = attributes;

        // Saved layouts by default displaying Portfolio source.
        if ( 'portfolio' === contentSource ) {
            contentSource = '';
        }

        return (
            <Fragment>
                <ControlsRender category="content-source" { ...props } isSetupWizard={ isSetupWizard } />
                { contentSource ? (
                    <Fragment>
                        { Object.keys( registeredControlsCategories ).map( ( name ) => {
                            if ( 'content-source' === name ) {
                                return null;
                            }

                            return (
                                <ControlsRender key={ name } category={ name } { ...props } isSetupWizard={ isSetupWizard } />
                            );
                        } ) }
                    </Fragment>
                ) : '' }
            </Fragment>
        );
    }

    render() {
        const {
            attributes,
        } = this.props;

        let {
            className,
        } = this.props;

        const {
            setup_wizard: setupWizard,
            ghostkitClassname,
        } = attributes;

        // add custom classname.
        if ( ghostkitClassname ) {
            className = classnames( className, ghostkitClassname );
        }

        return (
            <Fragment>
                { 'true' !== setupWizard ? (
                    <InspectorControls>
                        { this.renderControls( this.props ) }
                    </InspectorControls>
                ) : '' }
                <div className={ className }>
                    { 'true' !== setupWizard ? (
                        <IframePreview { ...this.props } />
                    ) : (
                        <Placeholder
                            className="vpf-setup-wizard"
                            icon={ <ElementIcon width="20" height="20" /> }
                            label={ pluginName }
                        >
                            { this.renderControls( this.props, true ) }
                        </Placeholder>
                    ) }
                </div>
            </Fragment>
        );
    }
}
