/*!
 * Name    : Visual Portfolio
 * Version : @@plugin_version
 * Author  : nK https://nkdev.info
 */
const $ = jQuery;
const {
    ajaxurl,
    VPAdminVariables,
    Tooltip,
    CodeMirror,
    emmetCodeMirror,
} = window;

const $body = $( 'body' );
const $window = $( window );
const $editForm = $( 'form[name="post"]' );
const $postType = $( '[name="post_type"]' );
const postID = $( '#postID' ).val();

// select shortcode text in input
$body.on( 'focus', '[name="vp_list_shortcode"], [name="vp_filter_shortcode"]', function() {
    this.select();
} );
$body.on( 'click', '.vp-onclick-selection', function() {
    window.getSelection().selectAllChildren( this );
} );

// Post format metabox show/hide
const $videoMetabox = $( '#vp_format_video' );
const $videoFormatCheckbox = $( '#post-format-video' );
function toggleVideoMetabox() {
    $videoMetabox[ $videoFormatCheckbox.is( ':checked' ) ? 'show' : 'hide' ]();
}
if ( $videoMetabox.length && $videoFormatCheckbox.length ) {
    toggleVideoMetabox();
    $body.on( 'change', '[name=post_format]', () => {
        toggleVideoMetabox();
    } );
}
let oembedAjax = null;
let oembedAjaxTimeout;
$body.on( 'change input', '.vp-input[name="video_url"]', function() {
    if ( oembedAjax !== null ) {
        oembedAjax.abort();
    }

    const $this = $( this );
    $this.next( '.vp-oembed-preview' ).html( '' );

    clearTimeout( oembedAjaxTimeout );
    oembedAjaxTimeout = setTimeout( () => {
        oembedAjax = $.ajax( {
            url: ajaxurl,
            method: 'GET',
            dataType: 'json',
            data: {
                action: 'vp_find_oembed',
                q: $this.val(),
                nonce: VPAdminVariables.nonce,
            },
            complete( data ) {
                const json = data.responseJSON;
                if ( json && typeof json.html !== 'undefined' ) {
                    $this.next( '.vp-oembed-preview' ).html( json.html );
                }
            },
        } );
    }, 250 );
} );

// Popper.js
if ( typeof Tooltip !== 'undefined' ) {
    $( '[data-hint]:not([data-hint=""]):not([data-hint="false"])' ).each( function() {
        const $this = $( this );
        // eslint-disable-next-line no-new
        new Tooltip( this, {
            placement: $this.attr( 'data-hint-place' ) || 'top',
            title: $this.attr( 'data-hint' ),
            container: $( 'body' )[ 0 ],
            boundariesElement: 'viewport',
        } );
    } );
}

( function() {
    // Activate code only in vp_lists page
    if ( $postType.val() !== 'vp_lists' || ! $editForm.length ) {
        return;
    }

    /**
     * Portfolio list creation
     */
    // content source
    const $contentSource = $( '.vp-content-source' );
    const $contentSourceInput = $contentSource.find( '[name="vp_content_source"]' );

    // activate content source
    $contentSource.on( 'click', '.vp-content-source__item', function() {
        const contentName = $( this ).attr( 'data-content' );
        $contentSource.find( `[data-content="${ contentName }"]` ).addClass( 'active' ).siblings().removeClass( 'active' );
        $contentSourceInput.val( contentName ).change();
    } );
    $contentSource.children( `[data-content="${ $contentSourceInput.val() }"]` ).click();

    // enable conditionize
    if ( $.fn.conditionize ) {
        $editForm.conditionize();
    }

    // range slider
    $( '.vp-control-range' ).each( function() {
        const $inputs = $( this ).find( 'input' );
        const $hidden = $inputs.filter( '[type="hidden"]' );

        $inputs.on( 'change input', function( e ) {
            $inputs.val( $( this ).val() );
            $hidden.trigger( `vp-fake-${ e.type }` );
        } );
    } );

    // color picker
    if ( $.fn.wpColorPicker ) {
        $( '.vp-color-picker' ).each( function() {
            let colorPickerTimeout;
            let initialCall = true;
            function onChange( e ) {
                if ( initialCall ) {
                    initialCall = false;
                    return;
                }
                clearTimeout( colorPickerTimeout );
                colorPickerTimeout = setTimeout( () => {
                    $( e.target ).change();
                }, 300 );
            }
            $( this ).data( 'change', onChange ).wpColorPicker();
        } );
    }

    // image picker
    if ( $.fn.imagepicker ) {
        $( '.vp-image-picker' ).imagepicker();
    }

    // frame load
    const $frame = $( '.vp_list_preview iframe' );
    let $framePortfolio = false;
    let frameJQuery = false;
    const $previewForm = $( '<form target="vp_list_preview_iframe" method="post" style="display: none">' )
        .attr( 'action', $frame.attr( 'src' ) )
        .insertAfter( $editForm );

    // resize iframe
    if ( $.fn.iFrameResize ) {
        $frame.iFrameResize( {
            interval: 10,
        } );
    }

    // portfolio options changed
    let reloadTimeout;
    $editForm.on( 'change input vp-fake-change vp-fake-input', '[name*="vp_"]', function( e ) {
        const $this = $( this );

        // prevent reload.
        if ( $this.closest( '.vp-no-reload' ).length ) {
            return;
        }

        const data = {
            name: $this.attr( 'name' ),
            value: $this.is( '[type=checkbox], [type=radio]' ) ? $this.is( ':checked' ) : $this.val(),
            reload: e.type === 'change' || e.type === 'vp-fake-change',
            jQuery: frameJQuery,
            $portfolio: $framePortfolio,
        };

        // create form input to store current changed data.
        let $input = $previewForm.find( `[name="${ data.name }"]` );
        if ( ! $input.length ) {
            $input = $( `<input type="hidden" name="${ data.name }" />` )
                .appendTo( $previewForm );
        }
        $input.attr( 'value', data.value );

        $window.trigger( 'vp-preview-change', data );

        // reload frame
        if ( data.reload || ! $framePortfolio ) {
            clearTimeout( reloadTimeout );
            reloadTimeout = setTimeout( () => {
                frameJQuery = false;
                $framePortfolio = false;
                $previewForm.submit();
            }, 400 );
        }
    } );

    $frame.on( 'load', function() {
        frameJQuery = this.contentWindow.jQuery;
        $framePortfolio = frameJQuery( '.vp-portfolio' );
    } );

    // live reload
    $window.on( 'vp-preview-change', ( e, data ) => {
        if ( ! data.$portfolio ) {
            return;
        }
        switch ( data.name ) {
        case 'vp_layout':
        case 'vp_tiles_type':
        case 'vp_masonry_columns':
        case 'vp_items_gap': {
            let name = data.name;

            // remove vp_
            name = name.substring( 3 );

            // replace _ to -
            name = name.replace( '_', '-' );

            data.$portfolio.attr( `data-vp-${ name }`, data.value );
            data.$portfolio.vp( 'init' );
            data.reload = false;

            break;
        }
        case 'vp_filter_align':
            data.$portfolio.find( '.vp-filter' ).removeClass( 'vp-filter__align-center vp-filter__align-left vp-filter__align-right' ).addClass( `vp-filter__align-${ data.value }` );
            data.reload = false;

            break;
        case 'vp_pagination_align':
            data.$portfolio.find( '.vp-pagination' ).removeClass( 'vp-pagination__align-center vp-pagination__align-left vp-pagination__align-right' ).addClass( `vp-pagination__align-${ data.value }` );
            data.reload = false;

            break;
        case 'vp_custom_css': {
            const $html = data.$portfolio.closest( 'html' );
            const customCssID = `vp-custom-css-${ postID }-inline-css`;
            let $style = $html.find( `#${ customCssID }` );
            if ( ! $style.length ) {
                $style = data.jQuery( `<style id="${ customCssID }">` );
                $html.find( 'body' ).prepend( $style );
            }
            $style.html( data.value );
            data.reload = false;

            break;
        }
        // prevent some options reload
        case 'vp_list_name':
        case 'vp_stretch':
            data.reload = false;
            break;
        // no default
        }
    } );

    // vp_layout -> data-vp-layout
    // vp_tiles_type -> data-vp-tiles-type
    // vp_items_gap -> data-vp-items-gap

    // image dropdown
    $body.on( 'click', '.vp-control-image-dropdown', function( e ) {
        if ( ! $( e.target ).closest( '.vp-control-image-dropdown__content' ).length ) {
            $( this ).toggleClass( 'active' );
        }
    } );
    $body.on( 'mousedown', ( e ) => {
        const $select = $( e.target ).closest( '.vp-control-image-dropdown' );
        const $all = $( '.vp-control-image-dropdown.active' );

        $all.each( function() {
            if ( this === $select[ 0 ] ) {
                return;
            }

            $( this ).removeClass( 'active' );
        } );
    } );
    $body.on( 'change', '.vp-control-image-dropdown .vp-image-picker', function() {
        const $this = $( this );
        const pickerData = $this.data( 'picker' );

        if ( pickerData ) {
            const $selected = pickerData.select.find( `option[value="${ pickerData.select.val() }"]` );
            const $optgroup = $selected.parent( 'optgroup' );
            const $dropdown = $this.closest( '.vp-control-image-dropdown' );
            const src = $selected.attr( 'data-img-src' );

            if ( $dropdown.length ) {
                $dropdown.children( '.vp-control-image-dropdown__preview' ).html( `<img src="${ src }" alt="">` );

                if ( $optgroup.length ) {
                    $dropdown.children( '.vp-control-image-dropdown__title' ).html( $optgroup.attr( 'label' ) );
                }
            }
        }
    } );

    // change shortcode name.
    const $listName = $( '[name="vp_list_name"]' );
    const $postTitle = $( '[name="post_title"]' );

    if ( $listName.length && $postTitle.length ) {
        $listName.on( 'input', () => {
            if ( $postTitle.val() !== $listName.val() ) {
                $postTitle.val( $listName.val() ).change();
            }
        } );
        $postTitle.on( 'input', () => {
            $listName.val( $postTitle.val() );
        } );
    }

    // enable select2
    if ( $.fn.select2 ) {
        $( '.vp-select2' ).each( function() {
            const $this = $( this );
            let opts = {
                width: '100%',
                minimumResultsForSearch: $this.hasClass( 'vp-select2-nosearch' ) ? -1 : 1,
                tags: $this.hasClass( 'vp-select2-tags' ),
            };
            const $postTypeAjax = $this.attr( 'data-post-type' ) ? $( $this.attr( 'data-post-type' ) ) : false;

            // ajax posts
            if ( $this.closest( '.vp-select2-posts-ajax' ).length ) {
                opts = $.extend( {
                    minimumInputLength: 1,
                    ajax: {
                        url: ajaxurl,
                        dataType: 'json',
                        delay: 250,
                        data( params ) {
                            return {
                                action: 'vp_find_posts',
                                q: params.term,
                                post_type: $postTypeAjax ? $postTypeAjax.val() : false,
                                nonce: VPAdminVariables.nonce,
                            };
                        },
                        processResults( data ) {
                            return {
                                results: data && data.length ? data : false,
                            };
                        },
                        cache: true,
                    },
                    escapeMarkup( markup ) {
                        return markup;
                    },
                    templateResult( data ) {
                        if ( data.loading ) {
                            return data.text;
                        }

                        let title = '';
                        if ( data.title ) {
                            title = data.title;
                        }

                        let postType = '';
                        if ( data.post_type ) {
                            postType = data.post_type;
                        }

                        let img = '';
                        if ( data.img ) {
                            img = `style="background-image: url('${ data.img }');"`;
                        }

                        return `${ '<div class="vp-select2-ajax__result">' +
                                   '<div class="vp-select2-ajax__result-img" ' }${ img }></div>` +
                                   '<div class="vp-select2-ajax__result-data">' +
                                       `<div class="vp-select2-ajax__result-title">${ title }</div>` +
                                       `<div class="vp-select2-ajax__result-post-type">${ postType }</div>` +
                                   '</div>' +
                               '</div>';
                    },
                    templateSelection( repo ) {
                        return repo.title || repo.text;
                    },
                }, opts );
            }

            // ajax taxonomies
            if ( $this.closest( '.vp-select2-taxonomies-ajax' ).length ) {
                opts = $.extend( {
                    minimumInputLength: 1,
                    ajax: {
                        url: ajaxurl,
                        dataType: 'json',
                        delay: 250,
                        data( params ) {
                            return {
                                action: 'vp_find_taxonomies',
                                q: params.term,
                                post_type: $postTypeAjax ? $postTypeAjax.val() : false,
                                nonce: VPAdminVariables.nonce,
                            };
                        },
                        processResults( data ) {
                            const result = [];

                            if ( data ) {
                                Object.keys( data ).forEach( ( k ) => {
                                    result.push( {
                                        text: k,
                                        children: data[ k ],
                                    } );
                                } );
                            }

                            return {
                                results: result,
                            };
                        },
                        cache: true,
                    },
                }, opts );
            }

            // init
            $this.select2( opts ).data( 'select2' ).$dropdown.addClass( 'select2-vp-container' );
        } );
    }

    const $galleries = $( '.vp-control-gallery' );
    let showedGalleries = 0;

    // get gallery item data by id.
    function getGalleryItemData( $gallery, id ) {
        const $item = $gallery.find( '[data-image-id="' + id + '"]' );
        const data = {
            id: id,
        };

        $item.find( '[data-additional]' ).each( function() {
            const $this = $( this );
            const name = $this.attr( 'data-additional' );
            data[ name ] = $this.html();

            if ( $this.attr( 'data-to-json' ) === 'true' ) {
                try {
                    data[ name ] = JSON.parse( data[ name ] );
                } catch ( e ) {
                    data[ name ] = '';
                }
            }
        } );

        return data;
    }

    // get gallery item meta by id.
    function getGalleryItemMeta( $gallery, id ) {
        const $item = $gallery.find( '[data-image-id="' + id + '"]' );
        const data = {};

        $item.find( '[data-meta]' ).each( function() {
            data[ $( this ).attr( 'data-meta' ) ] = $( this ).html();
        } );

        return data;
    }

    // update gallery data and add it to the input.
    function updateGalleryData( $gallery ) {
        const items = [];
        $gallery.children( '.vp-control-gallery-items' ).find( '.vp-control-gallery-items-img' ).each( function() {
            items.push( getGalleryItemData( $gallery, $( this ).attr( 'data-image-id' ) ) );
        } );
        const data = JSON.stringify( items );
        const $input = $gallery.children( 'textarea' );

        if ( data !== $input.val() ) {
            $input.val( data ).change();
        }
    }

    // show additional data block.
    function showAdditionalDataBlock( $gallery, id ) {
        const galleryName = $gallery.children( 'textarea' ).attr( 'name' );
        const $dataBlock = $gallery.children( '.vp-control-gallery-additional-data' );
        const $previewBlock = $dataBlock.children( '.vp-control-gallery-additional-data-preview' );
        const $currentImg = $gallery.children( '.vp-control-gallery-items' ).find( '.vp-control-gallery-items-img[data-image-id="' + id + '"]' );
        const itemData = getGalleryItemData( $gallery, id );
        const itemMeta = getGalleryItemMeta( $gallery, id );

        if ( itemData ) {
            Object.keys( itemData ).forEach( function( key ) {
                const $input = $dataBlock.find( '[name="' + galleryName + '_additional_' + key + '"], [name="' + galleryName + '_additional_' + key + '[]"]' ).val( itemData[ key ] || '' );

                if ( $input.hasClass( 'vp-select2' ) ) {
                    if ( $input.hasClass( 'vp-select2-tags' ) ) {
                        // get all available categories and add it to the tags list.
                        let items = [];
                        const options = [];
                        $gallery.children( '.vp-control-gallery-items' ).find( '.vp-control-gallery-items-img' ).each( function() {
                            const data = getGalleryItemData( $gallery, $( this ).attr( 'data-image-id' ) );

                            // merge 2 arrays without duplicates.
                            if ( data && typeof data[ key ] !== 'undefined' && data[ key ] ) {
                                items = [ ...new Set( [ ...items, ...data[ key ] ] ) ];
                            }
                        } );

                        items.forEach( ( val ) => {
                            options.push( new window.Option( val, val, false, false ) );
                        } );

                        $input.html( options.length ? options : '' );

                        $input.val( typeof itemData[ key ] !== 'undefined' && itemData[ key ] ? itemData[ key ] : '' );
                    }

                    $input.trigger( 'change' );
                }
            } );
        }

        $previewBlock.find( '.vp-control-gallery-additional-data-preview-image img' ).attr( 'src', $currentImg.children( 'img' ).attr( 'src' ) || '' );
        $previewBlock.find( '.vp-control-gallery-additional-data-preview-name' ).html( itemMeta.filename );
        $previewBlock.find( '.vp-control-gallery-additional-data-preview-size' ).html( itemMeta.width + 'x' + itemMeta.height + ' (' + itemMeta.filesizeHumanReadable + ')' );
        $previewBlock.find( '.vp-control-gallery-additional-data-preview-edit a' ).attr( 'href', itemMeta.editLink.replace( '&amp;', '&' ) );

        // add active classes
        $currentImg.siblings().removeClass( 'active' );
        $currentImg.addClass( 'active' );
        $dataBlock.addClass( 'active' );

        showedGalleries = $galleries.find( '.vp-control-gallery-additional-data.active' ).length;
    }

    // Sortable + gallery
    if ( $.fn.sortable ) {
        $galleries.each( function() {
            const $gallery = $( this );
            const $defaultItem = $gallery.children( '.vp-control-gallery-items-default' );
            $gallery.children( '.vp-control-gallery-items' ).sortable( {
                animation: 150,
                draggable: '.vp-control-gallery-items-img',
                onUpdate() {
                    updateGalleryData( $gallery );
                },
            } );

            // remove item
            $gallery.on( 'click', '.vp-control-gallery-items-remove', function( e ) {
                e.preventDefault();
                $( this ).parent().remove();
                updateGalleryData( $gallery );
            } );

            // add item
            $gallery.on( 'click', '.vp-control-gallery-items-add', function( e ) {
                e.preventDefault();
                let frame = $gallery.data( 'wp-frame' );

                // If the media frame already exists, reopen it.
                if ( frame ) {
                    frame.open();
                    return;
                }

                if ( ! wp.media ) {
                    // eslint-disable-next-line
                    console.error('Can\'t access wp.media object.');
                    return;
                }

                // Create a new media frame
                frame = wp.media( {
                    title: 'Select or Upload Images',
                    button: {
                        text: 'Use this images',
                    },
                    multiple: true,
                    library: {
                        type: 'image',
                    },
                } );
                $gallery.data( 'wp-frame', frame );

                // When an image is selected in the media frame...
                frame.on( 'select', () => {
                    // Get media images details from the frame state
                    const images = frame.state().get( 'selection' ).models;
                    if ( images && images.length ) {
                        images.forEach( ( item ) => {
                            let url = item.changed.url;

                            if ( item.changed.sizes && item.changed.sizes.thumbnail ) {
                                url = item.changed.sizes.thumbnail.url;
                            }

                            const $newItem = $defaultItem.children().clone();
                            $newItem.attr( 'data-image-id', item.id );
                            $newItem.children( 'img' ).attr( 'src', url );

                            $newItem.find( '[data-meta="width"]' ).html( item.changed.width );
                            $newItem.find( '[data-meta="height"]' ).html( item.changed.height );
                            $newItem.find( '[data-meta="filename"]' ).html( item.changed.filename );
                            $newItem.find( '[data-meta="editLink"]' ).html( item.changed.editLink );
                            $newItem.find( '[data-meta="filesizeHumanReadable"]' ).html( item.changed.filesizeHumanReadable );

                            $gallery.find( '.vp-control-gallery-items-add' ).before( $newItem );
                        } );
                        updateGalleryData( $gallery );
                    }
                } );

                // Finally, open the modal on click
                frame.open();
            } );

            // edit item
            $gallery.on( 'click', '.vp-control-gallery-items-img', function( e ) {
                e.preventDefault();
                showAdditionalDataBlock( $gallery, $( this ).attr( 'data-image-id' ) );
            } );

            // edit item
            let updateTimer;
            $gallery.on( 'change input', '.vp-control-gallery-additional-data [name]', function() {
                clearTimeout( updateTimer );
                updateTimer = setTimeout( () => {
                    const $dataBlock = $gallery.children( '.vp-control-gallery-additional-data' );
                    const galleryName = $gallery.children( 'textarea' ).attr( 'name' );
                    const id = $gallery.children( '.vp-control-gallery-items' ).find( '.vp-control-gallery-items-img.active' ).attr( 'data-image-id' );

                    if ( id ) {
                        const $currentItem = $gallery.children( '.vp-control-gallery-items' ).find( '[data-image-id="' + id + '"]' );

                        $dataBlock.find( '[name*="' + galleryName + '_additional_"]' ).each( function() {
                            const name = $( this ).attr( 'name' ).replace( galleryName + '_additional_', '' ).replace( '[]', '' );
                            let val = $( this ).val() || '';

                            if ( typeof val === 'object' ) {
                                val = JSON.stringify( val );
                            }

                            $currentItem.find( '[data-additional="' + name + '"]' ).html( val || '' );
                        } );

                        updateGalleryData( $gallery );
                    }
                }, 200 );
            } );
        } );

        // remove active classes.
        if ( $galleries.length ) {
            const $galleryDatas = $galleries.children( '.vp-control-gallery-additional-data' );
            $( document ).on( 'mousedown', function( e ) {
                if ( showedGalleries ) {
                    const target = e.target;

                    if ( ! $( target ).closest( '.vp-control-gallery-additional-data, .vp-control-gallery-items-img, .select2-vp-container' ).length ) {
                        $galleryDatas.removeClass( 'active' );
                        $galleries.children( '.vp-control-gallery-items' ).find( '.vp-control-gallery-items-img.active' ).removeClass( 'active' );
                        showedGalleries = $galleries.find( '.vp-control-gallery-additional-data.active' ).length;
                    }
                }
            } );
        }
    }

    // codemirror
    const $customCss = $( '[name="vp_custom_css"]' );
    let saveEditorWithErrors = false;

    // update editor error message
    let firstTimeEditorUpdate = true;
    function updateEditorError( errorAnnotations, editorChange ) {
        if ( firstTimeEditorUpdate ) {
            editorChange = false;
            firstTimeEditorUpdate = false;
        }
        if ( VPAdminVariables && VPAdminVariables.css_editor_error_notice ) {
            let message = false;

            if ( errorAnnotations.length === 1 ) {
                message = VPAdminVariables.css_editor_error_notice.singular.replace( '%d', '1' );
            } else if ( errorAnnotations.length > 1 ) {
                message = VPAdminVariables.css_editor_error_notice.plural.replace( '%d', String( errorAnnotations.length ) );
            }

            if ( message ) {
                let $notice = $customCss.prev( '#vp_custom_css_notice' );
                if ( ! $notice.length && ! editorChange ) {
                    $notice = $( '<div class="notice notice-error inline" id="vp_custom_css_notice"></div>' );
                    $customCss.before( $notice );
                }

                if ( ! $notice.length ) {
                    return;
                }

                // add error notice
                const noticeText = `<p class="notification-message">${ message }</p>` +
                    '<p>' +
                    '<input id="vp_custom_css_notice_prevent" type="checkbox">' +
                    `<label for="vp_custom_css_notice_prevent">${ VPAdminVariables.css_editor_error_checkbox }</label>` +
                    '</p>';

                $notice.html( noticeText );
            } else {
                // remove notice block if no errors
                $customCss.prev( '#vp_custom_css_notice' ).remove();
            }
        }
    }

    if ( typeof CodeMirror !== 'undefined' && $customCss.length ) {
        // Hint with all available visual composer clasnames
        if ( VPAdminVariables && VPAdminVariables.classnames ) {
            const defaultCSShint = CodeMirror.hint.css;
            CodeMirror.hint.css = function( cm ) {
                const cur = cm.getCursor();
                let inner = defaultCSShint( cm ) || { from: cur, to: cm.getCursor(), list: [] };

                const token = cm.getTokenAt( cur );
                if ( token.state.state === 'top' && token.string.indexOf( '.' ) === 0 ) {
                    inner = {
                        from: CodeMirror.Pos( cur.line, token.start ),
                        to: CodeMirror.Pos( cur.line, token.end ),
                        list: [],
                    };
                    VPAdminVariables.classnames.forEach( ( val ) => {
                        if ( val.indexOf( token.string ) !== -1 ) {
                            inner.list.push( val );
                        }
                    } );
                }
                return inner;
            };
        }

        const editor = CodeMirror.fromTextArea( $customCss[ 0 ], {
            mode: 'css',
            theme: 'eclipse',
            indentUnit: 4,
            autoCloseTags: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            foldGutter: true,
            lint: {
                options: {
                    errors: true,
                    'box-model': true,
                    'display-property-grouping': true,
                    'duplicate-properties': true,
                    'known-properties': true,
                    'outline-none': true,
                },

                // save errors in vcLintErrors object to prevent page save
                onUpdateLinting( annotations, annotationsSorted, cm ) {
                    const errors = [];
                    annotations.forEach( ( annotation ) => {
                        if ( annotation.severity === 'error' ) {
                            errors.push( annotation );
                        }
                    } );
                    cm.vcLintErrors = errors;

                    if ( ! saveEditorWithErrors ) {
                        updateEditorError( cm.vcLintErrors, true );
                    }
                },
            },
            lineNumbers: true,
            lineWrapping: true,
            scrollPastEnd: true,
            emmet_active: true,
            emmet: true,
            styleActiveLine: true,
            continueComments: true,
            scrollbarStyle: 'simple',
            extraKeys: {
                'Ctrl-Space': 'autocomplete',
                'Ctrl-/': 'toggleComment',
                'Cmd-/': 'toggleComment',
                'Alt-F': 'findPersistent',
            },
            gutters: [ 'CodeMirror-lint-markers', 'CodeMirror-linenumbers', 'CodeMirror-foldgutter' ],
        } );
        emmetCodeMirror( editor );

        // save instance in data
        $customCss.data( 'CodeMirrorInstance', editor );

        editor.on( 'change', () => {
            editor.save();
            $customCss.change();
        } );

        // Autocomplete
        editor.on( 'keyup', ( cm, event ) => {
            const isAlphaKey = /^[a-zA-Z]$/.test( event.key );

            if ( cm.state.completionActive && isAlphaKey ) {
                return;
            }

            // Prevent autocompletion in string literals or comments.
            const token = cm.getTokenAt( cm.getCursor() );
            if ( token.type === 'string' || token.type === 'comment' ) {
                return;
            }

            const lineBeforeCursor = cm.doc.getLine( cm.doc.getCursor().line ).substr( 0, cm.doc.getCursor().ch );
            const shouldAutocomplete =
                isAlphaKey ||
                event.key === ':' ||
                ( event.key === ' ' && /:\s+$/.test( lineBeforeCursor ) );

            if ( shouldAutocomplete ) {
                cm.showHint( { completeSingle: false } );
            }
        } );
    }

    // prevent page save if there is errors in CSS editor
    let publishClicked = false;
    $body.on( 'click', '#publish:not(.disabled)', function( e ) {
        publishClicked = true;

        if ( saveEditorWithErrors ) {
            return;
        }

        const $publishBtn = $( this );

        const editor = $customCss.length && $customCss.data( 'CodeMirrorInstance' );
        if ( editor && editor.vcLintErrors && editor.vcLintErrors.length ) {
            e.preventDefault();

            // disable publish button for 1.5 seconds
            $publishBtn.addClass( 'disabled button-disabled button-primary-disabled' );
            setTimeout( () => {
                $publishBtn.removeClass( 'disabled button-disabled button-primary-disabled' );
            }, 1500 );

            updateEditorError( editor.vcLintErrors, false );

            // scroll to editor
            $( 'html,body' ).animate( {
                scrollTop: $( '#vp_custom_css' ).offset().top - 100,
            }, 300 );

            // scroll to editor with error
            editor.focus();
            editor.setCursor( editor.vcLintErrors[ 0 ].from.line );
        }
    } );

    // prevent page closing
    const defaultForm = $editForm.serialize();
    $( window ).on( 'beforeunload', () => {
        if ( publishClicked ) {
            publishClicked = false;
            return;
        }

        return defaultForm !== $editForm.serialize();
    } );

    // save also if CSS have errors
    $body.on( 'change', '#vp_custom_css_notice_prevent', function() {
        saveEditorWithErrors = true;
        $( this ).closest( '.notice' ).slideUp();
    } );
}() );
