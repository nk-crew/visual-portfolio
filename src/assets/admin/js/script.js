/*!
 * Name    : Visual Portfolio
 * Version : @@plugin_version
 * Author  : nK https://nkdev.info
 */
import { debounce } from 'throttle-debounce';
import rafSchd from 'raf-schd';

const {
    jQuery: $,
    ajaxurl,
    VPAdminVariables,
} = window;

const $body = $( 'body' );

// select shortcode text in input
$body.on( 'focus', '[name="vp_list_shortcode"], [name="vp_filter_shortcode"], [name="vp_sort_shortcode"]', function() {
    this.select();
} );
$body.on( 'click', '.vp-onclick-selection', function() {
    window.getSelection().selectAllChildren( this );
} );
// fix the problem with Gutenberg shortcode transform (allowed only plain text pasted).
$body.on( 'copy cut', '.vp-onclick-selection', ( e ) => {
    const copyText = window.getSelection().toString().replace( /[\n\r]+/g, '' );

    e.originalEvent.clipboardData.setData( 'text/plain', copyText );
    e.originalEvent.preventDefault();
} );

// Post format metabox show/hide
const $videoMetabox = $( '#vp_format_video' );
const $videoFormatCheckbox = $( '#post-format-video' );
let isVideoFormat = null;

function toggleVideoMetabox( show ) {
    if ( null === isVideoFormat || isVideoFormat !== show ) {
        isVideoFormat = show;
        $videoMetabox[ show ? 'show' : 'hide' ]();
    }
}

if ( $videoMetabox.length ) {
    if ( $videoFormatCheckbox.length ) {
        toggleVideoMetabox( $videoFormatCheckbox.is( ':checked' ) );

        $body.on( 'change', '[name=post_format]', () => {
            toggleVideoMetabox( $videoFormatCheckbox.is( ':checked' ) );
        } );
    }
}

let oembedAjax = null;
let runAjaxVideoOembed = function( $this ) {
    oembedAjax = $.ajax( {
        url: ajaxurl,
        method: 'POST',
        dataType: 'json',
        data: {
            action: 'vp_find_oembed',
            q: $this.val(),
            nonce: VPAdminVariables.nonce,
        },
        complete( data ) {
            const json = data.responseJSON;
            if ( json && 'undefined' !== typeof json.html ) {
                $this.next( '.vp-oembed-preview' ).html( json.html );
            }
        },
    } );
};
runAjaxVideoOembed = debounce( 300, rafSchd( runAjaxVideoOembed ) );

$body.on( 'change input', '.vp-input[name="_vp_format_video_url"]', function() {
    if ( null !== oembedAjax ) {
        oembedAjax.abort();
    }

    const $this = $( this );
    $this.next( '.vp-oembed-preview' ).html( '' );

    runAjaxVideoOembed( $this );
} );
