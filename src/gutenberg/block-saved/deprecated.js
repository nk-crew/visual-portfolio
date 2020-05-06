/**
 * WordPress dependencies
 */
const {
    RawHTML,
} = wp.element;

export default [
    // v1.16.1
    {
        attributes: {
            id: {
                type: 'string',
            },
        },
        ghostkit: {
            supports: {
                spacings: true,
                display: true,
                scrollReveal: true,
            },
        },
        supports: {
            anchor: true,
            className: true,
            html: false,
            align: [ 'wide', 'full' ],
        },
        save( { attributes } ) {
            const {
                id,
                className,
            } = attributes;

            let result = '[visual_portfolio';

            if ( id ) {
                result += ` id="${ id }"`;
            }

            if ( className ) {
                result += ` class="${ className }"`;
            }

            result += ']';

            return <RawHTML>{ result }</RawHTML>;
        },
    },
];
