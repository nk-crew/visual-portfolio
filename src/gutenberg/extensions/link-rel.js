/**
 * WordPress dependencies
 */
const {
    addFilter,
} = wp.hooks;

const NOOPENER_DEFAULT = 'noopener noreferrer';

addFilter( 'vpf.editor.controls-on-change', 'vpf/editor/controls-on-change/link-rel', ( newAttributes, control, val, attributes ) => {
    if ( 'items_click_action_url_target' === control.name ) {
        if ( '_blank' === val && ! attributes.items_click_action_url_rel ) {
            newAttributes.items_click_action_url_rel = NOOPENER_DEFAULT;
        }
        if ( '_blank' !== val && NOOPENER_DEFAULT === attributes.items_click_action_url_rel ) {
            newAttributes.items_click_action_url_rel = '';
        }
    }

    return newAttributes;
} );
