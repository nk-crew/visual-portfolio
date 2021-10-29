const {
    jQuery: $,
    ajaxurl,
} = window;

// multiple select with AJAX search
$( 'select[name="vp_general[portfolio_archive_page]"]' ).select2( {
    ajax: {
        url: ajaxurl, // AJAX URL is predefined in WordPress admin
        dataType: 'json',
        delay: 250, // delay in ms while typing when to perform a AJAX search
        data( params ) {
            return {
                q: params.term, // search query
                action: 'vp_get_pages_list', // AJAX action for admin-ajax.php
            };
        },
        processResults( data ) {
            const options = [];
            if ( data ) {
                // data is the array of arrays, and each of them contains ID and the Label of the option
                $.each( data, ( index, text ) => { // do not forget that "index" is just auto incremented value
                    options.push( { id: text[ 0 ], text: text[ 1 ] } );
                } );
            }
            return {
                results: options,
            };
        },
        cache: true,
    },
    minimumInputLength: 1, // the minimum of symbols to input before perform a search
} );
