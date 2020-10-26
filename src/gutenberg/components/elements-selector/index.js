/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';

/**
 * Internal dependencies
 */
// eslint-disable-next-line import/no-cycle
import ControlsRender from '../controls-render';

/**
 * WordPress dependencies
 */
const {
    __,
} = wp.i18n;

const {
    Component,
    Fragment,
    useState,
} = wp.element;

const {
    PanelBody,
    Button,
    DropdownMenu,
    Dropdown,
    Modal,
    Toolbar,
    BaseControl,
} = wp.components;

const alignIcons = {
    left: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.75" y="0.75" width="18.5" height="18.5" rx="3.25" fill="transparent" stroke="currentColor" strokeWidth="1.5" />
            <line x1="4.5" y1="4.5" x2="4.5" y2="15.5" fill="transparent" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <line x1="9.5" y1="4.5" x2="9.5" y2="15.5" fill="transparent" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    ),
    center: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.75" y="0.75" width="18.5" height="18.5" rx="3.25" fill="transparent" stroke="currentColor" strokeWidth="1.5" />
            <line x1="7.5" y1="4.5" x2="7.5" y2="15.5" fill="transparent" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <line x1="12.5" y1="4.5" x2="12.5" y2="15.5" fill="transparent" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    ),
    right: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.75" y="0.75" width="18.5" height="18.5" rx="3.25" fill="transparent" stroke="currentColor" strokeWidth="1.5" />
            <line x1="15.5" y1="15.5" x2="15.5" y2="4.5" fill="transparent" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <line x1="10.5" y1="15.5" x2="10.5" y2="4.5" fill="transparent" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    ),
    between: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.75" y="0.75" width="18.5" height="18.5" rx="3.25" fill="transparent" stroke="currentColor" strokeWidth="1.5" />
            <line x1="15.5" y1="15.5" x2="15.5" y2="4.5" fill="transparent" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <line x1="4.5" y1="15.5" x2="4.5" y2="4.5" fill="transparent" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    ),
};

/**
 * Options render
 */
function ElementsSelectorOptions( props ) {
    const {
        location,
        locationData,
        value,
        onChange,
        options,
        optionName,
        parentProps,
    } = props;

    const [ isOpen, setOpen ] = useState( false );
    const openModal = () => setOpen( true );
    const closeModal = () => setOpen( false );

    return (
        <Fragment>
            <button
                type="button"
                aria-expanded={ isOpen }
                className="vpf-component-elements-selector-control-location-options-item"
                onClick={ openModal }
            >
                { options[ optionName ] ? options[ optionName ].title : optionName }
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 4L14 10L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
            { isOpen ? (
                <Modal
                    title={ __( 'Layout Items Settings', '@@text_domain' ) }
                    onRequestClose={ ( e ) => {
                        if ( e.relatedTarget && e.relatedTarget.classList && e.relatedTarget.classList.contains( 'media-modal' ) ) {
                            // Don't close modal if opened media modal.
                        } else {
                            closeModal( e );
                        }
                    } }
                    className="vpf-component-elements-selector-modal"
                >
                    { options[ optionName ] && options[ optionName ].category ? (
                        <ControlsRender
                            { ...parentProps.props }
                            category={ options[ optionName ].category }
                            categoryToggle={ false }
                        />
                    ) : null }
                    { 'items' !== optionName ? (
                        <PanelBody>
                            <BaseControl label={ __( 'Remove', '@@text_domain' ) }>
                                <br />
                                <Button
                                    isSecondary
                                    isSmall
                                    onClick={ () => {
                                        // eslint-disable-next-line no-alert
                                        if ( window.confirm( __( 'Are you sure you want to remove the element?', '@@text_domain' ) ) ) {
                                            onChange( {
                                                ...value,
                                                [ location ]: {
                                                    ...value[ location ],
                                                    elements: locationData.elements.filter( ( elementName ) => elementName !== optionName ),
                                                },
                                            } );
                                        }
                                    } }
                                >
                                    { __( 'Remove Element', '@@text_domain' ) }
                                </Button>
                            </BaseControl>
                        </PanelBody>
                    ) : null }
                </Modal>
            ) : null }
        </Fragment>
    );
}

/**
 * Component Class
 */
export default class ElementsSelector extends Component {
    constructor( ...args ) {
        super( ...args );

        this.getLocationData = this.getLocationData.bind( this );
        this.renderLocation = this.renderLocation.bind( this );
        this.renderAlignSettings = this.renderAlignSettings.bind( this );
    }

    getLocationData( location ) {
        const {
            options,
            locations,
            value,
        } = this.props;

        const title = ( locations[ location ] && locations[ location ].title ) || false;
        const elements = value[ location ] && value[ location ].elements ? value[ location ].elements : [];
        const align = value[ location ] && value[ location ].align ? value[ location ].align : false;
        const availableAlign = locations[ location ] && locations[ location ].align ? locations[ location ].align : [];
        const availableElements = {};

        // find all available elements
        Object.keys( options ).forEach( ( name ) => {
            const data = options[ name ];

            if (
                ( ! data.allowed_locations || -1 !== data.allowed_locations.indexOf( location ) )
                && -1 === elements.indexOf( name )
            ) {
                availableElements[ name ] = data;
            }
        } );

        return {
            title,
            elements,
            align,
            availableAlign,
            availableElements,
        };
    }

    renderAlignSettings( location ) {
        const {
            value,
            onChange,
        } = this.props;

        const locationData = this.getLocationData( location );
        const controls = [];

        if ( locationData.availableAlign.length ) {
            locationData.availableAlign.forEach( ( alignName ) => {
                controls.push( {
                    icon: alignIcons[ alignName ],
                    title: `${ alignName.charAt( 0 ).toUpperCase() + alignName.slice( 1 ) }`,
                    onClick() {
                        onChange( {
                            ...value,
                            [ location ]: {
                                ...value[ location ],
                                align: alignName,
                            },
                        } );
                    },
                    isActive: locationData.align ? locationData.align === alignName : false,
                } );
            } );
        }

        if ( ! controls.length ) {
            return null;
        }

        return (
            <Dropdown
                renderToggle={ ( { isOpen, onToggle } ) => (
                    <button
                        type="button"
                        aria-expanded={ isOpen }
                        className="vpf-component-elements-selector-control-location-options-item"
                        onClick={ onToggle }
                    >
                        { locationData.align && alignIcons[ locationData.align ] ? alignIcons[ locationData.align ] : alignIcons.center }
                    </button>
                ) }
                renderContent={ () => (
                    <PanelBody>
                        <BaseControl label={ __( 'Align', '@@text_domain' ) }>
                            <Toolbar controls={ controls } />
                        </BaseControl>
                    </PanelBody>
                ) }
            />
        );
    }

    renderLocation( location ) {
        const {
            value,
            onChange,
            options,
        } = this.props;

        const locationData = this.getLocationData( location );
        const {
            availableElements,
        } = locationData;

        return (
            <div key={ location } className="vpf-component-elements-selector-control-location">
                { locationData.title ? (
                    <div className="vpf-component-elements-selector-control-location-title">
                        { locationData.title }
                    </div>
                ) : '' }
                { locationData.availableAlign.length ? (
                    <div className="vpf-component-elements-selector-control-location-align">
                        { this.renderAlignSettings( location ) }
                    </div>
                ) : '' }
                <div className={ classnames( 'vpf-component-elements-selector-control-location-options', locationData.align ? `vpf-component-elements-selector-control-location-options-${ locationData.align }` : '' ) }>
                    { locationData.elements.length ? (
                        locationData.elements.map( ( optionName ) => (
                            <ElementsSelectorOptions
                                key={ optionName }
                                location={ location }
                                locationData={ locationData }
                                value={ value }
                                onChange={ onChange }
                                options={ options }
                                optionName={ optionName }
                                parentProps={ this.props }
                            />
                        ) )
                    ) : null }
                    { Object.keys( availableElements ).length ? (
                        <DropdownMenu
                            className="vpf-component-elements-selector-control-location-options-add-button"
                            popoverProps={ {
                                position: 'bottom center',
                            } }
                            icon={ (
                                <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 24 24" role="img" aria-hidden="true" focusable="false">
                                    <path d="M10 1c-5 0-9 4-9 9s4 9 9 9 9-4 9-9-4-9-9-9zm0 16c-3.9 0-7-3.1-7-7s3.1-7 7-7 7 3.1 7 7-3.1 7-7 7zm1-11H9v3H6v2h3v3h2v-3h3V9h-3V6zM10 1c-5 0-9 4-9 9s4 9 9 9 9-4 9-9-4-9-9-9zm0 16c-3.9 0-7-3.1-7-7s3.1-7 7-7 7 3.1 7 7-3.1 7-7 7zm1-11H9v3H6v2h3v3h2v-3h3V9h-3V6z" />
                                </svg>
                            ) }
                            controls={ Object.keys( availableElements ).map( ( optionName ) => ( {
                                title: (
                                    <Fragment>
                                        { availableElements[ optionName ].title }
                                        { availableElements[ optionName ].is_pro ? <span className="vpf-component-elements-selector-control-location-options-title-pro">{ __( 'PRO', '@@text_domain' ) }</span> : '' }
                                    </Fragment>
                                ),
                                onClick() {
                                    if ( availableElements[ optionName ].is_pro ) {
                                        return;
                                    }

                                    const newElements = [
                                        ...locationData.elements,
                                    ];

                                    if ( -1 === newElements.indexOf( optionName ) ) {
                                        newElements.push( optionName );

                                        onChange( {
                                            ...value,
                                            [ location ]: {
                                                ...value[ location ],
                                                elements: newElements,
                                            },
                                        } );
                                    }
                                },
                            } ) ) }
                        />
                    ) : '' }
                </div>
            </div>
        );
    }

    render() {
        const {
            locations,
        } = this.props;

        return (
            <div className="vpf-component-elements-selector-control">
                { Object.keys( locations ).map( ( name ) => this.renderLocation( name ) ) }
            </div>
        );
    }
}
