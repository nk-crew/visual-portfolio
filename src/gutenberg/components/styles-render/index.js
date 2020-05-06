/**
 * WordPress dependencies
 */
const { useEffect } = wp.element;

/**
 * Render dynamic styles for editor.
 *
 * @returns {Null} nothing.
 */
export default function StylesRender( { children } ) {
    useEffect( () => {
        const node = document.createElement( 'style' );
        node.innerHTML = children;
        document.body.appendChild( node );

        return () => document.body.removeChild( node );
    }, [ children ] );

    return null;
}
