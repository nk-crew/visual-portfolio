/**
 * WordPress dependencies
 */
import {
	BlockContextProvider,
	__experimentalBlockPatternsList as BlockPatternsList,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { Modal, SearchControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const BLOCK_NAME = 'visual-portfolio/loop';
/**
 * The loop of a pattern, whichever depth it sits at.
 *
 * A pattern is written as a whole loop block, so what is inserted is its inner
 * blocks - the block the user already has keeps its id, its alignment and the
 * source they picked.
 *
 * @param {Array} blocks - blocks of the pattern.
 * @return {Object|null} the loop block.
 */
function findLoop(blocks) {
	for (const block of blocks) {
		if (BLOCK_NAME === block.name) {
			return block;
		}

		const nested = block.innerBlocks?.length
			? findLoop(block.innerBlocks)
			: null;

		if (nested) {
			return nested;
		}
	}

	return null;
}

/**
 * Choose a starting point for a gallery.
 *
 * The patterns are the ones registered with
 * `Block Types: visual-portfolio/loop`, the same mechanic the core Query block
 * uses - and every one of them is previewed with the source the user has
 * already picked, so the list shows this gallery in each of its shapes rather
 * than a stranger's photographs.
 *
 * How that works is worth stating, because it is not obvious: the source is
 * pushed down as plain block context, which no parent declares and which the
 * item template reads as `vp/previewQuery`. Core does the same with
 * `previewPostType` for the Query block. Nothing else about a pattern is
 * touched - the layout and the item blocks are its own.
 *
 * The chooser holds nothing but the patterns and a way to search them. What the
 * gallery is made of is asked before this, in the wizard.
 *
 * @param {Object}   props              - component props.
 * @param {Object}   props.attributes   - loop attributes.
 * @param {string}   props.clientId     - loop client id.
 * @param {Function} props.onChoose     - called with the blocks to insert.
 * @param {Function} props.onCancel     - closes the chooser without choosing.
 * @return {Element} component.
 */
export default function PatternSetup({
	attributes,
	clientId,
	onChoose,
	onCancel,
}) {
	const [search, setSearch] = useState('');

	const patterns = useSelect(
		(select) => {
			const { getBlockRootClientId, getPatternsByBlockTypes } =
				select(blockEditorStore);

			return getPatternsByBlockTypes(
				BLOCK_NAME,
				getBlockRootClientId(clientId)
			);
		},
		[clientId]
	);

	const { queryType, baseQuery, postsQuery, imagesQuery, sourceQuery } =
		attributes;

	const previewContext = useMemo(
		() => ({
			'vp/previewQuery': {
				queryType,
				baseQuery: { perPage: baseQuery?.perPage },
				postsQuery,
				imagesQuery,
				sourceQuery,
			},
		}),
		[queryType, baseQuery?.perPage, postsQuery, imagesQuery, sourceQuery]
	);

	// A pattern is written as a whole loop block; what is inserted is its inner
	// blocks, so the block the user already has keeps its id, its alignment and
	// the source they picked.
	const previews = useMemo(() => {
		const term = search.trim().toLowerCase();

		return patterns
			.map((pattern) => {
				const loop = findLoop(pattern.blocks);

				if (!loop) {
					return null;
				}

				return {
					...pattern,
					blocks: [loop],
					innerBlocks: loop.innerBlocks,
				};
			})
			.filter(Boolean)
			.filter(
				(pattern) =>
					!term ||
					pattern.title.toLowerCase().includes(term) ||
					(pattern.description || '').toLowerCase().includes(term)
			);
	}, [patterns, search]);

	return (
		<Modal
			title={__('Choose a gallery', 'visual-portfolio')}
			className="vpf-loop-setup"
			overlayClassName="vpf-loop-setup__overlay"
			isFullScreen
			onRequestClose={onCancel}
		>
			<div className="vpf-loop-setup__search">
				<SearchControl
					label={__('Search for a gallery', 'visual-portfolio')}
					value={search}
					onChange={setSearch}
				/>
			</div>

			<BlockContextProvider value={previewContext}>
				<BlockPatternsList
					blockPatterns={previews}
					label={__('Gallery patterns', 'visual-portfolio')}
					onClickPattern={(pattern) => onChoose(pattern.innerBlocks)}
				/>
			</BlockContextProvider>
		</Modal>
	);
}
