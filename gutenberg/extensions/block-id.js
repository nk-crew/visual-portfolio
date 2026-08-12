import { createHigherOrderComponent } from '@wordpress/compose';
import { withSelect } from '@wordpress/data';
import { Component } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import shorthash from 'shorthash';

// List of used IDs to prevent duplicates.
const usedIds = {};

// Same, for the numeric query ids of the loops.
const usedQueryIds = {};

// Blocks that resolve their own options server-side and so need a stable id:
// `Visual_Portfolio_Get::get_options()` refuses to resolve anything without one.
const BLOCKS_WITH_ID = ['visual-portfolio/block', 'visual-portfolio/loop'];

// Blocks that own a set of URL parameters and so need an id short enough to
// read in a query string: `?vp-1-page=2`.
const BLOCKS_WITH_QUERY_ID = ['visual-portfolio/loop'];

/**
 * The lowest query id no loop of this post has taken.
 *
 * Numbers rather than hashes because the id is public - it is part of every
 * link the loop prints, and of the URL a visitor may share.
 *
 * @return {number} free query id.
 */
function getFreeQueryId() {
	let queryId = 1;

	while (typeof usedQueryIds[queryId] !== 'undefined') {
		queryId += 1;
	}

	return queryId;
}

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

			const { attributes, blockName, clientId } = this.props;

			// fix duplicated classes after block clone.
			if (
				clientId &&
				attributes.block_id &&
				typeof usedIds[attributes.block_id] === 'undefined'
			) {
				usedIds[attributes.block_id] = clientId;
			}

			// Only our own loops, since core's Query block names its attribute
			// the same and would otherwise take numbers out of our count.
			if (
				clientId &&
				BLOCKS_WITH_QUERY_ID.includes(blockName) &&
				attributes.queryId &&
				typeof usedQueryIds[attributes.queryId] === 'undefined'
			) {
				usedQueryIds[attributes.queryId] = clientId;
			}

			this.maybeCreateBlockId = this.maybeCreateBlockId.bind(this);
			this.maybeCreateQueryId = this.maybeCreateQueryId.bind(this);
		}

		componentDidMount() {
			this.maybeCreateBlockId();
			this.maybeCreateQueryId();
		}

		componentDidUpdate() {
			this.maybeCreateBlockId();
			this.maybeCreateQueryId();
		}

		/**
		 * Give the loop the id its URL parameters are named after.
		 *
		 * A cloned loop arrives with the id of the block it was copied from, and
		 * two loops answering to one `?vp-1-page` is the bug the parameters are
		 * namespaced to avoid - so a taken id is reassigned, exactly the way the
		 * block id above is.
		 */
		maybeCreateQueryId() {
			if (!BLOCKS_WITH_QUERY_ID.includes(this.props.blockName)) {
				return;
			}

			const { setAttributes, attributes, clientId } = this.props;
			const { queryId } = attributes;

			if (queryId && usedQueryIds[queryId] === clientId) {
				return;
			}

			const newQueryId = getFreeQueryId();

			usedQueryIds[newQueryId] = clientId;

			setAttributes({ queryId: newQueryId });
		}

		maybeCreateBlockId() {
			if (!BLOCKS_WITH_ID.includes(this.props.blockName)) {
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
