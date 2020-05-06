/* eslint-disable react/no-unused-state */

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
    addFilter,
} = wp.hooks;

const {
    Fragment,
    Component,
} = wp.element;

const {
    Button,
    Dropdown,
    DropZone,
    withNotices,
} = wp.components;

const {
    compose,
    withInstanceId,
} = wp.compose;

const {
    MediaPlaceholder,
    MediaUpload,
} = wp.blockEditor;

const {
    mediaUpload,
} = wp.editor;

const ALLOWED_MEDIA_TYPES = [ 'image' ];

/**
 * Component Class
 */
class GalleryControl extends Component {
    constructor( ...args ) {
        super( ...args );

        this.state = {
            hasError: false,
        };

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
                let imgThumbnailUrl = img.url;

                if ( img.sizes && img.sizes.thumbnail && img.sizes.thumbnail.url ) {
                    imgThumbnailUrl = img.sizes.thumbnail.url;
                } else if ( img.sizes && img.sizes.medium && img.sizes.medium.url ) {
                    imgThumbnailUrl = img.sizes.medium.url;
                } else if ( img.sizes && img.sizes.large && img.sizes.large.url ) {
                    imgThumbnailUrl = img.sizes.large.url;
                }

                result.push( {
                    id: img.id,
                    imgUrl: img.url,
                    imgThumbnailUrl,
                } );
            } );
        }

        return result;
    }

    render() {
        const {
            imageControls,
            attributes,
            name: controlName,
            value,
            onChange,
            noticeOperations,
            noticeUI,
        } = this.props;

        const filteredValue = value.filter( ( img ) => img.id );

        return (
            <div className="vpf-component-gallery-control">
                { ! filteredValue || ! Object.keys( filteredValue ).length ? (
                    <MediaPlaceholder
                        icon="format-gallery"
                        labels={ {
                            title: __( 'Images', '@@text_domain' ),
                            name: __( 'images', '@@text_domain' ),
                        } }
                        onSelect={ ( images ) => {
                            this.setState( { hasError: false } );
                            onChange( this.prepareImages( images ) );
                        } }
                        notices={ noticeUI }
                        accept="image/*"
                        allowedTypes={ ALLOWED_MEDIA_TYPES }
                        disableMaxUploadErrorMessages
                        multiple
                        onError={ this.onUploadError }
                    />
                ) : '' }
                { filteredValue && Object.keys( filteredValue ).length ? (
                    <MediaUpload
                        onSelect={ ( images ) => {
                            this.setState( { hasError: false } );
                            onChange( this.prepareImages( images ) );
                        } }
                        allowedTypes={ ALLOWED_MEDIA_TYPES }
                        multiple
                        gallery
                        value={ filteredValue.map( ( img ) => img.id ) }
                        render={ ( { open } ) => (
                            <Fragment>
                                <div className="vpf-component-gallery-control-items" role="presentation">
                                    <DropZone
                                        onFilesDrop={ ( files ) => {
                                            const currentImages = filteredValue || [];
                                            mediaUpload( {
                                                allowedTypes: ALLOWED_MEDIA_TYPES,
                                                filesList: files,
                                                onFileChange: ( images ) => {
                                                    this.setState( { hasError: false } );
                                                    onChange( this.prepareImages( currentImages.concat( images ) ) );
                                                },
                                                onError: ( message ) => {
                                                    this.setState( { hasError: true } );
                                                    noticeOperations.createErrorNotice( message );
                                                },
                                            } );
                                        } }
                                    />
                                    { filteredValue.map( ( img, i ) => (
                                        <Dropdown
                                            // eslint-disable-next-line react/no-array-index-key
                                            key={ `${ img.id || img.imgThumbnailUrl || img.imgUrl }-${ i }` }
                                            position="bottom center"
                                            className="vpf-component-gallery-control-item"
                                            renderToggle={ ( { isOpen, onToggle } ) => (
                                                <Button
                                                    onClick={ onToggle }
                                                    aria-expanded={ isOpen }
                                                >
                                                    <img src={ img.imgThumbnailUrl || img.imgUrl } alt={ img.alt || img.imgThumbnailUrl || img.imgUrl } />
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="12" cy="12" r="3" />
                                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                                    </svg>
                                                </Button>
                                            ) }
                                            renderContent={ () => (
                                                <div className="vpf-component-gallery-control-item-dropdown">
                                                    { Object.keys( imageControls ).map( ( name ) => {
                                                        const newCondition = [];

                                                        // prepare name.
                                                        const imgControlName = `${ controlName }[${ i }].${ name }`;

                                                        // prepare conditions for the current item.
                                                        if ( imageControls[ name ].condition.length ) {
                                                            imageControls[ name ].condition.forEach( ( data ) => {
                                                                const newData = { ...data };

                                                                if ( newData.control && /SELF/g.test( newData.control ) ) {
                                                                    newData.control = newData.control.replace( /SELF/g, `${ controlName }[${ i }]` );
                                                                }

                                                                newCondition.push( newData );
                                                            } );
                                                        }

                                                        return (
                                                            <ControlsRender.Control
                                                                // eslint-disable-next-line react/no-array-index-key
                                                                key={ `${ img.id || img.imgThumbnailUrl || img.imgUrl }-${ i }-${ name }` }
                                                                attributes={ attributes }
                                                                onChange={ ( val ) => {
                                                                    const newImages = [ ...filteredValue ];

                                                                    if ( newImages[ i ] ) {
                                                                        newImages[ i ] = {
                                                                            ...newImages[ i ],
                                                                            [ name ]: val,
                                                                        };

                                                                        onChange( newImages );
                                                                    }
                                                                } }
                                                                { ...imageControls[ name ] }
                                                                name={ imgControlName }
                                                                value={ img[ name ] }
                                                                condition={ newCondition }
                                                            />
                                                        );
                                                    } ) }
                                                </div>
                                            ) }
                                        />
                                    ) ) }
                                </div>
                                <div className="vpf-component-gallery-control-items-button">
                                    <Button
                                        isSecondary
                                        isSmall
                                        onClick={ open }
                                    >
                                        { __( 'Edit Images', '@@text_domain' ) }
                                    </Button>
                                </div>
                            </Fragment>
                        ) }
                    />
                ) : '' }
            </div>
        );
    }
}

export default compose( [
    withInstanceId,
    withNotices,
] )( GalleryControl );


// add list of all categories to gallery images.
addFilter( 'vpf.editor.controls-render', 'vpf/editor/controls-render/images-categories-suggestions', ( data ) => {
    if ( 'images' === data.name ) {
        const categories = [];

        // find all use categories.
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
