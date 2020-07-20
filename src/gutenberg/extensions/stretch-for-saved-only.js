/**
 * WordPress dependencies
 */
const {
    addFilter,
} = wp.hooks;

// Allow Stretch control on Saved Layouts editor only.
addFilter( 'vpf.editor.controls-render-data', 'vpf/editor/controls-render-data/customize-controls', ( data ) => {
    if ( 'stretch' === data.name && ! window.VPSavedLayoutVariables ) {
        data = {
            ...data,
            skip: true,
        };
    }

    return data;
} );
