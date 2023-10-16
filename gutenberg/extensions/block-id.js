import shorthash from 'shorthash';

import { createHigherOrderComponent } from '@wordpress/compose';
import { withSelect } from '@wordpress/data';
import { Component } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';

// List of used IDs to prevent duplicates.
const usedIds = {};

/**
 * Override the default edit UI to include a new block inspector control for
 * assigning the custom styles if needed.
 *
 * @param {Function | Component} BlockEdit Original component.
 *
 * @return {string} Wrapped component.
 */
const withUniqueBlockId = createHigherOrderComponent((BlockEdit) => {
	class newEdit extends Component {
		constructor(...args) {
			super(...args);

			const { attributes, clientId } = this.props;

			// fix duplicated classes after block clone.
			if (
				clientId &&
				attributes.block_id &&
				typeof usedIds[attributes.block_id] === 'undefined'
			) {
				usedIds[attributes.block_id] = clientId;
			}

			this.maybeCreateBlockId = this.maybeCreateBlockId.bind(this);
		}

		componentDidMount() {
			this.maybeCreateBlockId();
		}

		componentDidUpdate() {
			this.maybeCreateBlockId();
		}

		maybeCreateBlockId() {
			if (this.props.blockName !== 'visual-portfolio/block') {
				return;
			}

			const { setAttributes, attributes, clientId } = this.props;

			const { block_id: blockId } = attributes;

			if (!blockId || usedIds[blockId] !== clientId) {
				let newBlockId = '';

				// check if ID already exist.
				let tryCount = 10;
				while (
					!newBlockId ||
					(typeof usedIds[newBlockId] !== 'undefined' &&
						usedIds[newBlockId] !== clientId &&
						tryCount > 0)
				) {
					newBlockId = shorthash.unique(clientId);
					tryCount -= 1;
				}

				if (newBlockId && typeof usedIds[newBlockId] === 'undefined') {
					usedIds[newBlockId] = clientId;
				}

				if (newBlockId !== blockId) {
					setAttributes({
						block_id: newBlockId,
					});
				}
			}
		}

		render() {
			return <BlockEdit {...this.props} />;
		}
	}

	return withSelect((select, ownProps) => ({
		blockName: ownProps.name,
	}))(newEdit);
}, 'withUniqueBlockId');

addFilter('editor.BlockEdit', 'vpf/editor/unique-block-id', withUniqueBlockId);
