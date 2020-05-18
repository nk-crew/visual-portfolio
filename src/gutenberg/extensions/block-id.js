/**
 * External dependencies
 */
import shorthash from 'shorthash';

/**
 * WordPress dependencies
 */
const {
    addFilter,
} = wp.hooks;

const {
    Component,
} = wp.element;

const {
    createHigherOrderComponent,
} = wp.compose;

const {
    withSelect,
} = wp.data;

/**
 * Internal dependencies
 */

// List of used IDs to prevent duplicates.
const usedIds = {};

/**
 * Override the default edit UI to include a new block inspector control for
 * assigning the custom styles if needed.
 *
 * @param {function|Component} BlockEdit Original component.
 *
 * @return {string} Wrapped component.
 */
const withUniqueBlockId = createHigherOrderComponent( ( BlockEdit ) => {
    class newEdit extends Component {
        constructor( ...args ) {
            super( ...args );

            const {
                attributes,
                clientId,
            } = this.props;

            // fix duplicated classes after block clone.
            if ( clientId && attributes.blockId && 'undefined' === typeof usedIds[ attributes.blockId ] ) {
                usedIds[ attributes.blockId ] = clientId;
            }

            this.maybeCreateBlockId = this.maybeCreateBlockId.bind( this );
        }

        componentDidMount() {
            this.maybeCreateBlockId();
        }

        componentDidUpdate() {
            this.maybeCreateBlockId();
        }

        maybeCreateBlockId() {
            if ( 'visual-portfolio/block' !== this.props.blockName ) {
                return;
            }

            const {
                setAttributes,
                attributes,
                clientId,
            } = this.props;

            const {
                block_id: blockId,
            } = attributes;

            if ( ! blockId || usedIds[ blockId ] !== clientId ) {
                let newBlockId = '';

                // check if ID already exist.
                let tryCount = 10;
                while ( ! newBlockId || ( 'undefined' !== typeof usedIds[ newBlockId ] && usedIds[ newBlockId ] !== clientId && 0 < tryCount ) ) {
                    newBlockId = shorthash.unique( clientId );
                    tryCount -= 1;
                }

                if ( newBlockId && 'undefined' === typeof usedIds[ newBlockId ] ) {
                    usedIds[ newBlockId ] = clientId;
                }

                if ( newBlockId !== blockId ) {
                    setAttributes( {
                        block_id: newBlockId,
                    } );
                }
            }
        }

        render() {
            return <BlockEdit { ...this.props } />;
        }
    }

    return withSelect( ( select, ownProps ) => ( {
        blockName: ownProps.name,
    } ) )( newEdit );
}, 'withUniqueBlockId' );

addFilter( 'editor.BlockEdit', 'lazyblocks/uniqueBlockId', withUniqueBlockId );
