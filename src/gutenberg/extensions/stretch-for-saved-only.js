/**
 * WordPress dependencies
 */
const {
    addFilter,
} = wp.hooks;

const {
    VPSavedLayoutVariables,
} = window;

// Allow Stretch control on Saved Layouts editor only.
addFilter( 'vpf.editor.controls-render-data', 'vpf/editor/controls-render-data/customize-controls', ( data ) => {
    if ( 'stretch' === data.name && ! VPSavedLayoutVariables ) {
        data = {
            ...data,
            skip: true,
        };
    }

    return data;
} );
