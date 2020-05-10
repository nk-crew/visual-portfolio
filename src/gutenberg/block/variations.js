/**
 * WordPress dependencies
 */
const { RawHTML } = wp.element;

/**
 * Internal dependencies
 */
const {
    controls: registeredControls,
} = window.VPGutenbergVariables;

export default Object.keys( registeredControls.layout.options ).map( ( name ) => {
    const data = registeredControls.layout.options[ name ];

    return {
        isDefault: registeredControls.layout.default === data.value,
        name: data.value,
        attributes: { layout: data.value },
        title: data.title,
        icon: data.icon ? {
            foreground: '#2540CC',
            src: <RawHTML>{ data.icon }</RawHTML>,
        } : null,
    };
} ) || [];
