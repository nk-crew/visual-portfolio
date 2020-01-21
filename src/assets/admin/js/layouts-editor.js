/*!
 * Name    : Visual Portfolio
 * Version : @@plugin_version
 * Author  : nK https://nkdev.info
 */
import { debounce } from 'throttle-debounce';

const $ = jQuery;
const {
    ajaxurl,
    VPAdminVariables,
    CodeMirror,
    emmetCodeMirror,
} = window;

const $body = $( 'body' );
const $window = $( window );
const $editForm = $( 'form[name="post"]' );
const postID = $( '#postID, #post_ID' ).eq( 0 ).val();

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
        $( this ).data( 'change', debounce( 300, ( e ) => {
            $( e.target ).change();
        } ) ).wpColorPicker();
    } );
}

// image picker
if ( $.fn.imagepicker ) {
    $( '.vp-image-picker' ).imagepicker();
}

// frame load
const $frame = $( '.vp_list_preview iframe' );
const $framePreloader = $( '.vp_list_preview_preloader' );
let frameWindow = false;
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

// add preloader animation.
function togglePreloader( add = true ) {
    if ( add ) {
        $framePreloader.addClass( 'vp_list_preview_preloader_active' );
    } else {
        $framePreloader.removeClass( 'vp_list_preview_preloader_active' );
    }
}

// generate controls styles.
function generateControlsStyles() {
    let styles = '';
    const $styles = $( '[name="vp_controls_styles"]' );
    const parentSelector = `.vp-id-${ postID }`;
    const currentStyles = $styles.val();

    $( '.vp-control-style [type="hidden"]' ).each( function() {
        const $this = $( this );
        const $control = $this.closest( '.vp-control' );

        if ( 'none' !== $control.css( 'display' ) ) {
            const mask = $this.attr( 'data-style-mask' ) || '$';
            let $controlInput = $control.find( $this.attr( 'data-style-from' ) );
            let controlVal = $controlInput.val();
            let skip = false;

            // Toggle control support.
            if ( $control.hasClass( 'vp-control-toggle' ) && $controlInput.length > 1 ) {
                $controlInput = $controlInput.filter( '[type="checkbox"]' );
            }

            // Checkbox and Toggle support.
            if ( $controlInput.is( '[type="checkbox"]' ) ) {
                controlVal = $controlInput.is( ':checked' );

                skip = ! controlVal;
            }

            if ( ! skip ) {
                const val = mask.replace( '$', controlVal );
                const selector = parentSelector + ' ' + $this.attr( 'data-style-element' );
                const property = $this.attr( 'data-style-property' );

                if ( styles ) {
                    styles += ' ';
                }

                styles += `${ selector } { ${ property }: ${ val }; }`;
            }
        }
    } );

    if ( currentStyles !== styles ) {
        $styles.val( styles ).trigger( 'vp-fake-change' );
    }
}

// generate dom tree.
function getNodeTree( node ) {
    if ( node && node.hasChildNodes() ) {
        const children = [];

        for ( let j = 0; j < node.childNodes.length; j++ ) {
            children.push( getNodeTree( node.childNodes[ j ] ) );
        }

        return {
            classList: node.classList,
            nodeName: node.nodeName,
            children: children,
        };
    }

    return false;
}

function printTree( node, attrs ) {
    if ( ! node ) {
        return '';
    }

    let txt = '';

    if ( node.children.length ) {
        let newTxt = '';
        let classNameString = '';
        let skip = false;
        let collapse = false;

        // Classes.
        if ( node.classList && node.classList.length ) {
            classNameString = ' class="';
            node.classList.forEach( ( className ) => {
                if ( ! attrs.skipClass || ! attrs.skipClass.test( className ) ) {
                    classNameString += `<span class="vp-dom-tree-node-class">${ className }</span>`;
                }

                // Skip?
                if ( attrs.skipNodeByClass && attrs.skipNodeByClass.test( className ) ) {
                    skip = true;
                }

                // Collapse?
                if ( attrs.collapseByClass && attrs.collapseByClass.test( className ) ) {
                    collapse = true;
                }
            } );
            classNameString += '"';
        }

        if ( ! skip ) {
            newTxt += '<ul>';
            newTxt += `<li class="vp-dom-tree-node ${ collapse ? 'is-collapsed' : '' }"><div><span class="vp-dom-tree-node-collapse"></span>&lt;${ node.nodeName.toLowerCase() }${ classNameString }`;

            newTxt += '&gt;</div></li>';

            node.children.forEach( ( childNode ) => {
                if ( childNode ) {
                    newTxt += `<li class="vp-dom-tree-child">${ printTree( childNode, attrs ) }</li>`;
                }
            } );

            newTxt += '</ul>';

            txt += newTxt;
        }
    }

    return txt;
}

function addDomTree() {
    if ( $framePortfolio ) {
        const nodeTree = getNodeTree( $framePortfolio[ 0 ] );
        $( '.vp-dom-tree' ).html( printTree( nodeTree, {
            skipNodeByClass: /vp-portfolio__item-popup/,
            collapseByClass: /^(vp-portfolio__preloader-wrap|vp-portfolio__filter-wrap|vp-portfolio__sort-wrap|vp-portfolio__items-wrap|vp-portfolio__pagination-wrap)$/,
            skipClass: /vp-uid-/,
        } ) );
    }
}

if ( typeof window.ClipboardJS !== 'undefined' ) {
    new window.ClipboardJS( '.vp-dom-tree-node-class, .vp-dom-tree-help code', {
        target( trigger ) {
            return trigger;
        },
        text( trigger ) {
            return `.${ trigger.innerText.replace( /^\./, '' ) }`;
        },
    } ).on( 'success', ( e ) => {
        if ( typeof window.Tooltip !== 'undefined' ) {
            if ( ! e.trigger.tooltipClipboard ) {
                e.trigger.tooltipClipboard = new window.Tooltip( e.trigger, {
                    placement: 'top',
                    title: 'Copied to Clipboard!',
                    trigger: 'manual',
                    container: $body[ 0 ],
                } );
            }

            e.trigger.tooltipClipboard.show();

            $( e.trigger ).one( 'mouseleave', () => {
                e.trigger.tooltipClipboard.hide();
            } );
        }
    } );
}

$body.on( 'click', '.vp-dom-tree-node-collapse', function() {
    $( this ).closest( 'li' ).toggleClass( 'is-collapsed' );
} );

// portfolio options changed
function reloadFrame() {
    frameWindow = false;
    frameJQuery = false;
    $framePortfolio = false;

    // show preloader.
    togglePreloader();

    // submit form with new data.
    $previewForm.submit();
}
reloadFrame = debounce( 400, reloadFrame );
$editForm.on( 'change input vp-fake-change vp-fake-input', '[name*="vp_"]', function( e ) {
    const $this = $( this );

    // prevent reload.
    if ( $this.closest( '.vp-no-reload' ).length ) {
        return;
    }

    // find style of this control and generate it.
    const $controlStyle = $( `[name="${ $this.attr( 'name' ) }__style[]"]` );
    if ( $controlStyle.length ) {
        // generate custom styles.
        generateControlsStyles();
        return;
    }

    const data = {
        name: $this.attr( 'name' ),
        value: $this.is( '[type=checkbox], [type=radio]' ) ? $this.is( ':checked' ) : $this.val(),
        reload: e.type === 'change' || e.type === 'vp-fake-change',
        window: frameWindow,
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

    if ( ! data.reload ) {
        // generate custom styles.
        generateControlsStyles();

        // update ajax dynamic data.
        if ( frameWindow && frameWindow.vp_preview_post_data ) {
            frameWindow.vp_preview_post_data[ data.name ] = data.value;
        }
    }

    // reload frame
    if ( data.reload || ! $framePortfolio ) {
        reloadFrame();
    }
} );

$frame.on( 'load', function() {
    frameWindow = this.contentWindow;
    frameJQuery = this.contentWindow.jQuery;
    $framePortfolio = frameJQuery( '.vp-portfolio' );

    // generate custom styles.
    generateControlsStyles();

    // add dom tree.
    addDomTree();

    // hide preloader.
    togglePreloader( false );
} );

// live reload
$window.on( 'vp-preview-change', ( e, data ) => {
    if ( ! data.$portfolio ) {
        return;
    }
    switch ( data.name ) {
    case 'vp_tiles_type':
    case 'vp_masonry_columns':
    case 'vp_grid_columns':
    case 'vp_justified_row_height':
    case 'vp_justified_row_height_tolerance':
    case 'vp_slider_effect':
    case 'vp_slider_speed':
    case 'vp_slider_autoplay':
    case 'vp_slider_autoplay_hover_pause':
    case 'vp_slider_centered_slides':
    case 'vp_slider_loop':
    case 'vp_slider_free_mode':
    case 'vp_slider_free_mode_sticky':
    case 'vp_slider_arrows':
    case 'vp_slider_arrows_icon_prev':
    case 'vp_slider_arrows_icon_next':
    case 'vp_slider_bullets':
    case 'vp_slider_bullets_dynamic':
    case 'vp_items_gap': {
        let name = data.name;

        // remove vp_
        name = name.substring( 3 );

        // replace _ to -
        name = name.replace( /_/g, '-' );

        data.$portfolio.attr( `data-vp-${ name }`, data.value );
        data.$portfolio.vpf( 'init' );
        data.reload = false;

        break;
    }
    case 'vp_filter_align':
        data.$portfolio.find( '.vp-filter' ).removeClass( 'vp-filter__align-center vp-filter__align-left vp-filter__align-right' ).addClass( `vp-filter__align-${ data.value }` );
        data.reload = false;

        break;
    case 'vp_sort_align':
        data.$portfolio.find( '.vp-sort' ).removeClass( 'vp-sort__align-center vp-sort__align-left vp-sort__align-right' ).addClass( `vp-sort__align-${ data.value }` );
        data.reload = false;

        break;
    case 'vp_pagination_align':
        data.$portfolio.find( '.vp-pagination' ).removeClass( 'vp-pagination__align-center vp-pagination__align-left vp-pagination__align-right' ).addClass( `vp-pagination__align-${ data.value }` );
        data.reload = false;

        break;
    case 'vp_controls_styles': {
        const $html = data.$portfolio.closest( 'html' );
        const controlsCssID = `vp-controls-styles-${ postID }-inline-css`;
        let $style = $html.find( `#${ controlsCssID }` );
        if ( ! $style.length ) {
            $style = data.jQuery( `<style id="${ controlsCssID }">` );
            $html.find( 'body' ).prepend( $style );
        }
        $style.html( data.value );
        data.reload = false;

        break;
    }
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

// Sticky gallery image additional data
function maybeStickGalleryData() {
    $galleries.find( '.vp-control-gallery-additional-data.active' ).each( function() {
        const $this = $( this );
        const $child = $this.children();

        const height = $this.height();
        const innerHeight = $child.height();

        if ( innerHeight >= height ) {
            $child.css( { marginTop: '' } );
            return;
        }

        const maxOffset = height - innerHeight;

        // 32 - admin top bar height
        const blockOffset = $this.offset().top - 32;

        if ( blockOffset >= 0 ) {
            $child.css( { marginTop: '' } );
            return;
        }

        $child.css( { marginTop: Math.min( maxOffset, Math.abs( blockOffset ) ) } );
    } );
}

if ( $galleries.length ) {
    $( '.postbox-container' ).on( 'scroll', debounce( 150, maybeStickGalleryData ) );
    $window.on( 'scroll resize', debounce( 150, maybeStickGalleryData ) );
}

// show additional data block.
function showAdditionalDataBlock( $gallery, id ) {
    const galleryName = $gallery.children( 'textarea' ).attr( 'name' );
    const $dataBlock = $gallery.children( '.vp-control-gallery-additional-data' );
    const $previewBlock = $dataBlock.find( '.vp-control-gallery-additional-data-preview' );
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

    debounce( 150, maybeStickGalleryData )();
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
                    text: 'Add images',
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
                        let url = item.attributes.url;

                        if ( item.attributes.sizes && item.attributes.sizes.thumbnail ) {
                            url = item.attributes.sizes.thumbnail.url;
                        }

                        const $newItem = $defaultItem.children().clone();
                        $newItem.attr( 'data-image-id', item.id );
                        $newItem.children( 'img' ).attr( 'src', url );

                        $newItem.find( '[data-meta="width"]' ).html( item.attributes.width );
                        $newItem.find( '[data-meta="height"]' ).html( item.attributes.height );
                        $newItem.find( '[data-meta="filename"]' ).html( item.attributes.filename );
                        $newItem.find( '[data-meta="editLink"]' ).html( item.attributes.editLink );
                        $newItem.find( '[data-meta="filesizeHumanReadable"]' ).html( item.attributes.filesizeHumanReadable );

                        // put title and description from image meta.
                        if ( item.attributes.title ) {
                            $newItem.find( '[data-additional="title"]' ).html( item.attributes.title );
                        }
                        if ( item.attributes.description ) {
                            $newItem.find( '[data-additional="description"]' ).html( item.attributes.description );
                        }

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
        $gallery.on( 'change input', '.vp-control-gallery-additional-data [name]', debounce( 200, function() {
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
        } ) );
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

    // resize handler
    const $editorResizer = $( '.CodeMirror-resizer' ).after( $customCss );
    const $editorContainer = $editorResizer.prev( '.CodeMirror' );
    let editorResizeY;
    let editorResizeH;

    function onEditorResize( e ) {
        $editorContainer.css( 'height', Math.max( 200, ( editorResizeH + e.originalEvent.y - editorResizeY ) ) );
        editor.setSize( null, Math.max( 200, ( editorResizeH + e.y - editorResizeY ) ) + 'px' );
    }

    function enEditorResizeEnd() {
        $body.off( 'mousemove', onEditorResize );
        $body.off( 'mouseup', enEditorResizeEnd );
    }

    $editorResizer.on( 'mousedown', ( e ) => {
        editorResizeY = e.originalEvent.y;
        editorResizeH = $editorContainer.height();

        $body.on( 'mousemove', onEditorResize );
        $body.on( 'mouseup', enEditorResizeEnd );
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

    if ( defaultForm !== $editForm.serialize() ) {
        return true;
    }
} );

// save also if CSS have errors
$body.on( 'change', '#vp_custom_css_notice_prevent', function() {
    saveEditorWithErrors = true;
    $( this ).closest( '.notice' ).slideUp();
} );
