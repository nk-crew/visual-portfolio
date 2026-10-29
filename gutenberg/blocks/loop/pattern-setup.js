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

// The layouts a gallery is shown first, by source; the rest follow in the
// order they were registered.
const LEAD_LAYOUTS = {
	images: [
		'gallery-masonry-classic',
		'gallery-grid-classic',
		'gallery-justified-wall',
		'gallery-tiles-mosaic',
		'gallery-carousel-showcase',
		'gallery-grid-rounded',
	],
	posts: [
		'gallery-posts-classic',
		'gallery-blog-roll',
		'gallery-grid-overlay',
		'gallery-masonry-reveal',
		'gallery-grid-filtered',
		'gallery-carousel-showcase',
	],
};

// Layouts written around what only a post has: a date, an author, an excerpt,
// categories to filter by.
const POSTS_ONLY = [
	'gallery-posts-classic',
	'gallery-blog-roll',
	'gallery-posts-paged',
	'gallery-grid-filtered',
];

const getSlug = ({ name }) => name.replace('visual-portfolio/', '');

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
 * The layouts of a gallery, and the context that previews them with its own
 * content.
 *
 * The layouts are the patterns registered with
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
 * @param {string} clientId   - loop client id.
 * @param {Object} attributes - loop attributes.
 * @return {Object} `{ layouts, context }`.
 */
export function useLayouts(clientId, attributes) {
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

	const context = useMemo(
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
	// the source they picked. Its `metadata` is carried over separately: core
	// wrote it onto the root block when it parsed the pattern, and derives the
	// whole content-only behaviour of an inserted pattern from it.
	const layouts = useMemo(() => {
		const isPosts = 'posts' === queryType;
		const lead = LEAD_LAYOUTS[isPosts ? 'posts' : 'images'];
		const rank = (pattern) => {
			const index = lead.indexOf(getSlug(pattern));

			return -1 === index ? lead.length : index;
		};

		return patterns
			.map((pattern) => {
				const loop = findLoop(pattern.blocks);

				return loop
					? {
							...pattern,
							blocks: [loop],
							innerBlocks: loop.innerBlocks,
						}
					: null;
			})
			.filter(
				(pattern) =>
					pattern &&
					(isPosts || !POSTS_ONLY.includes(getSlug(pattern)))
			)
			.sort((a, b) => rank(a) - rank(b));
	}, [patterns, queryType]);

	return { layouts, context };
}

/**
 * Layouts previewed with the gallery's own content.
 *
 * @param {Object}   props          - component props.
 * @param {Array}    props.layouts  - layouts to show.
 * @param {Object}   props.context  - preview context from `useLayouts`.
 * @param {Function} props.onChoose - called with the chosen layout.
 * @return {Element} component.
 */
export function LayoutList({ layouts, context, onChoose }) {
	return (
		<BlockContextProvider value={context}>
			<BlockPatternsList
				blockPatterns={layouts}
				label={__('Gallery layouts', 'visual-portfolio')}
				onClickPattern={onChoose}
			/>
		</BlockContextProvider>
	);
}

/**
 * Every layout of a gallery, in a modal, with a way to search them.
 *
 * @param {Object}   props            - component props.
 * @param {Object}   props.attributes - loop attributes.
 * @param {string}   props.clientId   - loop client id.
 * @param {Function} props.onChoose   - called with the chosen layout.
 * @param {Function} props.onCancel   - closes the chooser without choosing.
 * @return {Element} component.
 */
export default function PatternSetup({
	attributes,
	clientId,
	onChoose,
	onCancel,
}) {
	const [search, setSearch] = useState('');
	const { layouts, context } = useLayouts(clientId, attributes);

	const found = useMemo(() => {
		const term = search.trim().toLowerCase();

		return layouts.filter(
			(pattern) =>
				!term ||
				pattern.title.toLowerCase().includes(term) ||
				(pattern.description || '').toLowerCase().includes(term)
		);
	}, [layouts, search]);

	return (
		<Modal
			title={__('Choose a layout', 'visual-portfolio')}
			className="vpf-loop-setup"
			overlayClassName="vpf-loop-setup__overlay"
			isFullScreen
			onRequestClose={onCancel}
		>
			<div className="vpf-loop-setup__search">
				<SearchControl
					label={__('Search for a layout', 'visual-portfolio')}
					value={search}
					onChange={setSearch}
				/>
			</div>

			<LayoutList layouts={found} context={context} onChoose={onChoose} />
		</Modal>
	);
}
