/* eslint-disable react/no-unused-state */
/**
 * External dependencies
 */
import { SortableContainer, SortableElement } from 'react-sortable-hoc';

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
    applyFilters,
    addFilter,
} = wp.hooks;

const {
    Fragment,
    Component,
    useState,
    createRef,
} = wp.element;

const {
    Button,
    Modal,
    FocalPointPicker,
    withNotices,
} = wp.components;

const {
    compose,
    withInstanceId,
} = wp.compose;

const {
    MediaUpload,
} = wp.blockEditor;

const ALLOWED_MEDIA_TYPES = [ 'image' ];

function arrayMove( arr, oldIndex, newIndex ) {
    if ( newIndex >= arr.length ) {
        let k = newIndex - arr.length + 1;

        while ( k ) {
            k -= 1;
            arr.push( undefined );
        }
    }

    arr.splice( newIndex, 0, arr.splice( oldIndex, 1 )[ 0 ] );

    return arr;
}

const SortableItem = SortableElement( ( props ) => {
    const {
        img,
        items,
        idx,
        onChange,
        imageControls,
        controlName,
        attributes,
        focalPoint,
        clientId,
        isSetupWizard,
    } = props;

    const [ isOpen, setOpen ] = useState( false );
    const openModal = () => setOpen( true );
    const closeModal = () => setOpen( false );

    return (
        <Fragment>
            <div className="vpf-component-gallery-control-item">
                <Button
                    className="vpf-component-gallery-control-item-button"
                    onClick={ openModal }
                    aria-expanded={ isOpen }
                >
                    <img src={ img.imgThumbnailUrl || img.imgUrl } alt={ img.alt || img.imgThumbnailUrl || img.imgUrl } />
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                </Button>
                <Button
                    className="vpf-component-gallery-control-item-remove"
                    onClick={ () => {
                        const newImages = [ ...items ];

                        if ( newImages[ idx ] ) {
                            newImages.splice( idx, 1 );

                            onChange( newImages );
                        }
                    } }
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3.5 5.5H7.5M16.5 5.5H12.5M12.5 5.5V2.5H7.5V5.5M12.5 5.5H7.5M5 8.5L6 17H14L15 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="transparent" />
                    </svg>
                </Button>
            </div>
            { isOpen ? (
                <Modal
                    title={ __( 'Image Settings', '@@text_domain' ) }
                    onRequestClose={ ( e ) => {
                        if ( e.relatedTarget && e.relatedTarget.classList && e.relatedTarget.classList.contains( 'media-modal' ) ) {
                            // Don't close modal if opened media modal.
                        } else {
                            closeModal( e );
                        }
                    } }
                >
                    <div className="vpf-component-gallery-control-item-modal">
                        { focalPoint ? (
                            <FocalPointPicker
                                url={ img.imgThumbnailUrl || img.imgUrl }
                                value={ img.focalPoint }
                                onChange={ ( val ) => {
                                    const newImages = [ ...items ];

                                    if ( newImages[ idx ] ) {
                                        newImages[ idx ] = {
                                            ...newImages[ idx ],
                                            focalPoint: val,
                                        };

                                        onChange( newImages );
                                    }
                                } }
                            />
                        ) : '' }
                        { Object.keys( imageControls ).map( ( name ) => {
                            const newCondition = [];

                            // prepare name.
                            const imgControlName = `${ controlName }[${ idx }].${ name }`;

                            // prepare conditions for the current item.
                            if ( imageControls[ name ].condition.length ) {
                                imageControls[ name ].condition.forEach( ( data ) => {
                                    const newData = { ...data };

                                    if ( newData.control && /SELF/g.test( newData.control ) ) {
                                        newData.control = newData.control.replace( /SELF/g, `${ controlName }[${ idx }]` );
                                    }

                                    newCondition.push( newData );
                                } );
                            }

                            return (
                                applyFilters(
                                    'vpf.editor.gallery-controls-render',
                                    <ControlsRender.Control
                                        // eslint-disable-next-line react/no-array-index-key
                                        key={ `${ img.id || img.imgThumbnailUrl || img.imgUrl }-${ idx }-${ name }` }
                                        attributes={ attributes }
                                        onChange={ ( val ) => {
                                            const newImages = [ ...items ];

                                            if ( newImages[ idx ] ) {
                                                newImages[ idx ] = {
                                                    ...newImages[ idx ],
                                                    [ name ]: val,
                                                };

                                                onChange( newImages );
                                            }
                                        } }
                                        { ...imageControls[ name ] }
                                        name={ imgControlName }
                                        value={ img[ name ] }
                                        condition={ newCondition }
                                        clientId={ clientId }
                                        isSetupWizard={ isSetupWizard }
                                    />,
                                    imageControls[ name ],
                                    props
                                )
                            );
                        } ) }
                    </div>
                </Modal>
            ) : null }
        </Fragment>
    );
} );
const SortableList = SortableContainer( ( props ) => {
    const {
        items,
        onChange,
        imageControls,
        controlName,
        attributes,
        focalPoint,
        isSetupWizard,
        prepareImages,
    } = props;

    return (
        <div className="vpf-component-gallery-control-items">
            { items.map( ( img, idx ) => (
                <SortableItem
                    // eslint-disable-next-line react/no-array-index-key
                    key={ `lzb-constructor-controls-items-sortable-${ img.id }-${ idx }` }
                    index={ idx }
                    img={ img }
                    idx={ idx }
                    items={ items }
                    onChange={ onChange }
                    imageControls={ imageControls }
                    controlName={ controlName }
                    attributes={ attributes }
                    focalPoint={ focalPoint }
                    isSetupWizard={ isSetupWizard }
                />
            ) ) }

            <MediaUpload
                multiple
                onSelect={ ( images ) => {
                    onChange( [
                        ...items,
                        ...prepareImages( images ),
                    ] );
                } }
                allowedTypes={ ALLOWED_MEDIA_TYPES }
                value={ false }
                render={ ( { open } ) => (
                    <Button
                        className="vpf-component-gallery-control-item-add"
                        onClick={ ( event ) => {
                            event.stopPropagation();
                            open();
                        } }
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" role="img" aria-hidden="true" focusable="false">
                            <path d="M18 11.2h-5.2V6h-1.6v5.2H6v1.6h5.2V18h1.6v-5.2H18z" />
                        </svg>
                        <span>
                            { __( 'Add Images', '@@text_domain' ) }
                        </span>
                    </Button>
                ) }
            />
        </div>
    );
} );

/**
 * Component Class
 */
class GalleryControl extends Component {
    constructor( ...args ) {
        super( ...args );

        this.state = {
            hasError: false,
        };
        this.sortRef = createRef();

        this.onUploadError = this.onUploadError.bind( this );
    }

    onUploadError( message ) {
        const { noticeOperations } = this.props;
        noticeOperations.removeAllNotices();
        noticeOperations.createErrorNotice( message );
    }

    // eslint-disable-next-line class-methods-use-this
    prepareImages( images ) {
        const result = [];

        if ( images && images.length ) {
            images.forEach( ( img ) => {
                const imgData = {
                    id: img.id,
                    imgUrl: img.url,
                    imgThumbnailUrl: img.url,
                };

                // Prepare thumbnail for all images except GIF, since GIFs animated only in full size.
                if ( ! img.mime || 'image/gif' !== img.mime ) {
                    if ( img.sizes && img.sizes.thumbnail && img.sizes.thumbnail.url ) {
                        imgData.imgThumbnailUrl = img.sizes.thumbnail.url;
                    } else if ( img.sizes && img.sizes.medium && img.sizes.medium.url ) {
                        imgData.imgThumbnailUrl = img.sizes.medium.url;
                    } else if ( img.sizes && img.sizes.large && img.sizes.large.url ) {
                        imgData.imgThumbnailUrl = img.sizes.large.url;
                    }
                }

                if ( img.title ) {
                    imgData.title = img.title;
                }
                if ( img.description ) {
                    imgData.description = img.description;
                }

                result.push( imgData );
            } );
        }

        return result;
    }

    render() {
        const self = this;
        const {
            imageControls,
            attributes,
            name: controlName,
            value,
            onChange,
            focalPoint,
            isSetupWizard,
        } = this.props;

        const filteredValue = value.filter( ( img ) => img.id );

        return (
            <div className="vpf-component-gallery-control">
                <MediaUpload
                    onSelect={ ( images ) => {
                        this.setState( { hasError: false } );
                        onChange( this.prepareImages( images ) );
                    } }
                    allowedTypes={ ALLOWED_MEDIA_TYPES }
                    multiple
                    value={ filteredValue && Object.keys( filteredValue ).length ? filteredValue.map( ( img ) => img.id ) : [] }
                    render={ () => (
                        <Fragment>
                            <SortableList
                                ref={ self.sortRef }
                                items={ filteredValue }
                                onChange={ onChange }
                                imageControls={ imageControls }
                                controlName={ controlName }
                                attributes={ attributes }
                                focalPoint={ focalPoint }
                                isSetupWizard={ isSetupWizard }
                                prepareImages={ self.prepareImages }
                                axis="xy"
                                distance="3"
                                onSortEnd={ ( { oldIndex, newIndex } ) => {
                                    const newImages = arrayMove( [ ...filteredValue ], oldIndex, newIndex );
                                    onChange( newImages );
                                } }
                                helperClass="vpf-component-gallery-control-items-sortable"
                                helperContainer={ () => {
                                    if ( self.sortRef && self.sortRef.current && self.sortRef.current.container ) {
                                        return self.sortRef.current.container;
                                    }

                                    // sometimes container ref disappears, so we can find dom element manually.
                                    return document.body;
                                } }
                            />
                        </Fragment>
                    ) }
                />
            </div>
        );
    }
}

export default compose( [
    withInstanceId,
    withNotices,
] )( GalleryControl );

// add list of all categories to gallery images.
addFilter( 'vpf.editor.controls-render-data', 'vpf/editor/controls-render-data/images-categories-suggestions', ( data ) => {
    if ( 'images' === data.name ) {
        const categories = [];

        // find all used categories.
        if ( data.attributes.images && data.attributes.images.length ) {
            data.attributes.images.forEach( ( image ) => {
                if ( image.categories && image.categories.length ) {
                    image.categories.forEach( ( cat ) => {
                        if ( -1 === categories.indexOf( cat ) ) {
                            categories.push( cat );
                        }
                    } );
                }
            } );
        }

        if ( categories.length && data.image_controls && data.image_controls.categories && data.image_controls.categories.options ) {
            data.image_controls.categories.options = categories.map( ( val ) => ( {
                label: val,
                value: val,
            } ) );
        }
    }

    return data;
} );
