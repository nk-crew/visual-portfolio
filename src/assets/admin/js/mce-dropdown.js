/*!
 * Name    : Visual Portfolio
 * Version : @@plugin_version
 * Author  : nK https://nkdev.info
 */
const {
    tinymce,
    VPTinyMCEOptions,
} = window;
if ( typeof VPTinyMCEOptions !== 'undefined' && VPTinyMCEOptions.length ) {
    const options = [ {
        text: '',
        value: '',
    } ];

    Object.keys( VPTinyMCEOptions ).forEach( ( k ) => {
        options.push( {
            text: VPTinyMCEOptions[ k ].title,
            value: VPTinyMCEOptions[ k ].id,
        } );
    } );

    tinymce.create( 'tinymce.plugins.visual_portfolio', {
        init( editor ) {
            editor.addButton( 'visual_portfolio', {
                type: 'listbox',
                title: 'Visual Portfolio',
                icon: 'visual-portfolio',
                classes: 'visual-portfolio-btn',
                onclick() {
                    if ( this.menu ) {
                        this.menu.$el.find( '.mce-first' ).hide();
                    }
                },
                onselect() {
                    if ( this.value() ) {
                        editor.insertContent( `[visual_portfolio id="${ this.value() }"]` );
                    }
                    this.value( '' );
                },
                values: options,
                value: '',
            } );
        },
    } );

    tinymce.PluginManager.add( 'visual_portfolio', tinymce.plugins.visual_portfolio );
}
