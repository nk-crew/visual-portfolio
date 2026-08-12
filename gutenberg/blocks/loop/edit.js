import apiFetch from '@wordpress/api-fetch';
import {
	store as blockEditorStore,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	cloneBlock,
	createBlocksFromInnerBlocksTemplate,
} from '@wordpress/blocks';
import {
	Button,
	Notice,
	__experimentalNumberControl as NumberControl,
	PanelBody,
	Placeholder,
	ToggleControl,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useLoopSource } from '../../loop-sources/registry';
import SourcePicker from '../../loop-sources/source-picker';

const {
	plugin_url: pluginUrl,
	items_count_notice_limit: itemsCountNoticeLimit,
} = window.VPGutenbergVariables;

const BLOCK_NAME = 'visual-portfolio/loop';

// Large galleries are slow to render, and the number where that starts to show
// is the one the settings screen already talks about.
const NOTICE_LIMIT = parseInt(itemsCountNoticeLimit, 10);
const NOTICE_AFTER = NOTICE_LIMIT + 5;

const PER_PAGE_ALL = -1;

const TEMPLATE = [
	[
		'visual-portfolio/loop-filter',
		{},
		// A placeholder until the filter block has fetched its items. It carries
		// the default `filter` of `*`, so the fetched "All" item reuses it.
		[['visual-portfolio/loop-filter-item', { text: 'All', isAll: true }]],
	],
	[
		'visual-portfolio/item-template',
		{ layoutType: 'grid' },
		[
			[
				'visual-portfolio/item-image',
				{ aspectRatio: '1', clickAction: 'popup' },
			],
			['visual-portfolio/item-title', { textAlign: 'center' }],
		],
	],
	[
		'visual-portfolio/loop-pagination',
		{},
		// The `paged` variation, expressed by its inner blocks.
		[
			['visual-portfolio/loop-pagination-previous'],
			['visual-portfolio/loop-pagination-numbers'],
			['visual-portfolio/loop-pagination-next'],
		],
	],
];

/**
 * Keep `baseQuery.maxPages` in step with the query.
 *
 * It drives the editor preview of the pagination blocks. The front end
 * recalculates it per request, since saved content goes stale.
 *
 * @param {Object}   props               - block props.
 * @param {Object}   props.attributes    - block attributes.
 * @param {Function} props.setAttributes - block attribute setter.
 */
function useMaxPages({ attributes, setAttributes }) {
	const { queryType, baseQuery, postsQuery, imagesQuery, sourceQuery } =
		attributes;

	// Read when a request resolves, so the pending value is never stale.
	const baseQueryRef = useRef(baseQuery);

	useEffect(() => {
		baseQueryRef.current = baseQuery;
	}, [baseQuery]);

	// Everything the endpoint needs, and the only thing that should trigger it.
	// `maxPages` is deliberately left out - it is what the request writes back.
	// Memoised on the attribute identities, so a gallery with hundreds of images
	// is not rebuilt on every render.
	const query = useMemo(
		() => ({
			queryType,
			baseQuery: { perPage: baseQuery?.perPage },
			postsQuery,
			imagesQuery,
			sourceQuery,
		}),
		[queryType, baseQuery?.perPage, postsQuery, imagesQuery, sourceQuery]
	);

	useEffect(() => {
		if (!query.queryType || !query.baseQuery.perPage) {
			return undefined;
		}

		// `clearTimeout` only stops a request that has not gone out yet.
		let cancelled = false;

		// Settings are usually changed in bursts - only ask once they settle.
		const timeout = setTimeout(() => {
			apiFetch({
				path: '/visual-portfolio/v1/get_max_pages/',
				method: 'POST',
				data: query,
			})
				.then((response) => {
					const maxPages = parseInt(response?.max_pages, 10);

					if (
						cancelled ||
						!maxPages ||
						maxPages === baseQueryRef.current?.maxPages
					) {
						return;
					}

					setAttributes({
						baseQuery: {
							...baseQueryRef.current,
							maxPages,
						},
					});
				})
				.catch((error) => {
					// eslint-disable-next-line no-console
					console.error('Error fetching max pages:', error);
				});
		}, 500);

		return () => {
			cancelled = true;
			clearTimeout(timeout);
		};
	}, [query, setAttributes]);
}

/**
 * The gallery-size warning, and its "do not show this again" state.
 *
 * The state is a site option shared with the legacy inspector, so dismissing it
 * in one place dismisses it in both.
 *
 * @param {Object} props           - component props.
 * @param {number} props.perPage   - items per page.
 * @param {string} props.queryType - selected source.
 * @param {number} props.imagesCount - number of images of the images source.
 * @return {Element|null} component.
 */
function ItemsCountNotice({ perPage, queryType, imagesCount }) {
	const [isHidden, setIsHidden] = useState(
		'hide' === window.VPGutenbergVariables.items_count_notice
	);

	const postId = useSelect(
		(select) => select('core/editor')?.getCurrentPostId() || false,
		[]
	);

	const isLarge = perPage > NOTICE_AFTER || PER_PAGE_ALL === perPage;

	// A small gallery cannot render more than it holds, however high the count.
	if (
		isHidden ||
		!isLarge ||
		('images' === queryType && imagesCount <= NOTICE_AFTER)
	) {
		return null;
	}

	return (
		<Notice
			status="warning"
			isDismissible={false}
			actions={[
				{
					label: __('Ok, I understand', 'visual-portfolio'),
					variant: 'link',
					onClick: () => {
						window.VPGutenbergVariables.items_count_notice = 'hide';
						setIsHidden(true);

						apiFetch({
							path: '/visual-portfolio/v1/update_gallery_items_count_notice_state',
							method: 'POST',
							data: { notice_state: 'hide', post_id: postId },
						});
					},
				},
			]}
		>
			{sprintf(
				// translators: %d: number of items a page should stay under.
				__(
					'Large galleries slow the page down. Keep the items per page under %d and add Load More or Infinite Scroll pagination.',
					'visual-portfolio'
				),
				NOTICE_LIMIT
			)}
		</Notice>
	);
}

/**
 * Warn about a random order that is also paged.
 *
 * A random order is drawn again on every request, so the pages of one gallery
 * would overlap and skip items. The controls carry a seed in their links to
 * hold one order still - and that seed is part of the URL, which a page cache
 * stores as a page of its own. On a cached site the pages are therefore either
 * multiplied or, where the parameter is stripped, shuffled again.
 *
 * @param {Object} props           - component props.
 * @param {Object} props.attributes - block attributes.
 * @return {Element|null} component.
 */
function RandomOrderNotice({ attributes }) {
	const { queryType, baseQuery, postsQuery, imagesQuery } = attributes;

	const isRandom =
		('images' === queryType && 'rand' === imagesQuery?.orderBy) ||
		('images' !== queryType && 'rand' === postsQuery?.orderBy);

	if (!isRandom || PER_PAGE_ALL === baseQuery?.perPage) {
		return null;
	}

	return (
		<Notice status="warning" isDismissible={false}>
			{__(
				'A random order is held still by a seed in the page links, which page caches store as separate pages. Display all items, or order the gallery some other way, if the site is cached.',
				'visual-portfolio'
			)}
		</Notice>
	);
}

/**
 * Settings every source shares.
 *
 * @param {Object}   props               - component props.
 * @param {Object}   props.attributes    - block attributes.
 * @param {Function} props.setAttributes - block attribute setter.
 * @return {Element} component.
 */
function GeneralPanel({ attributes, setAttributes }) {
	const { baseQuery, queryType, imagesQuery } = attributes;
	const perPage = baseQuery?.perPage;

	const setPerPage = (value) =>
		setAttributes({ baseQuery: { ...baseQuery, perPage: value } });

	return (
		<PanelBody title={__('General', 'visual-portfolio')}>
			<ToggleControl
				label={__('Display all items', 'visual-portfolio')}
				help={__(
					'Render the whole gallery on a single page.',
					'visual-portfolio'
				)}
				checked={PER_PAGE_ALL === perPage}
				onChange={(checked) => setPerPage(checked ? PER_PAGE_ALL : 6)}
				__nextHasNoMarginBottom
			/>

			{PER_PAGE_ALL === perPage ? null : (
				<NumberControl
					label={__('Items per page', 'visual-portfolio')}
					min={1}
					value={perPage}
					onChange={(value) => setPerPage(parseInt(value, 10) || 1)}
					__next40pxDefaultSize
				/>
			)}

			<ItemsCountNotice
				perPage={perPage}
				queryType={queryType}
				imagesCount={imagesQuery?.images?.length || 0}
			/>

			<RandomOrderNotice attributes={attributes} />
		</PanelBody>
	);
}

/**
 * The settings panel of the selected source.
 *
 * A source with no panel is one this install cannot edit yet - a Pro source
 * before Phase 7, or a source registered by a plugin that is no longer active.
 * Its attributes are never touched, so the loop keeps rendering.
 *
 * @param {Object} props - component props, forwarded to the source panel.
 * @return {Element} component.
 */
function SourcePanel(props) {
	const source = useLoopSource(props.attributes.queryType);

	if (source?.SettingsPanel) {
		const { SettingsPanel } = source;

		return <SettingsPanel {...props} />;
	}

	return (
		<PanelBody
			title={source?.title || __('Source Settings', 'visual-portfolio')}
		>
			<p>
				{__(
					'This source is set up and working. Editing it here arrives in the next update.',
					'visual-portfolio'
				)}
			</p>
		</PanelBody>
	);
}

/**
 * What an empty loop shows: pick a source, then pick a starting point.
 *
 * The patterns are the ones registered with `Block Types: visual-portfolio/loop`,
 * the same mechanic the core Query block uses.
 *
 * @param {Object}   props               - component props.
 * @param {Object}   props.attributes    - block attributes.
 * @param {Function} props.setAttributes - block attribute setter.
 * @param {string}   props.clientId      - block client id.
 * @return {Element} component.
 */
function LoopPlaceholder({ attributes, setAttributes, clientId }) {
	const [hasPickedSource, setHasPickedSource] = useState(false);
	const { replaceInnerBlocks } = useDispatch(blockEditorStore);

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

	const startBlank = () =>
		replaceInnerBlocks(
			clientId,
			createBlocksFromInnerBlocksTemplate(TEMPLATE)
		);

	// The pattern brings the layout, the picked source stays on this block -
	// which also keeps the block's own id, alignment and styles.
	const startFromPattern = (pattern) => {
		const loop = pattern.blocks.find(({ name }) => BLOCK_NAME === name);
		const blocks = loop ? loop.innerBlocks : pattern.blocks;

		replaceInnerBlocks(
			clientId,
			blocks.map((block) => cloneBlock(block))
		);
	};

	if (!hasPickedSource) {
		return (
			<Placeholder
				label={__('Gallery Loop', 'visual-portfolio')}
				instructions={__(
					'Choose where the gallery takes its items from.',
					'visual-portfolio'
				)}
			>
				<SourcePicker
					value={attributes.queryType}
					onChange={(name) => {
						setAttributes({ queryType: name });
						setHasPickedSource(true);
					}}
				/>
			</Placeholder>
		);
	}

	return (
		<Placeholder
			label={__('Gallery Loop', 'visual-portfolio')}
			instructions={__(
				'Start from a pattern, or lay the gallery out yourself.',
				'visual-portfolio'
			)}
		>
			{/* No thumbnails: a pattern of an empty gallery previews as
				nothing, so the description is what tells them apart. */}
			<div className="vpf-loop-patterns">
				{patterns.map((pattern) => (
					<Button
						key={pattern.name}
						className="vpf-loop-patterns__item"
						onClick={() => startFromPattern(pattern)}
					>
						<span className="vpf-loop-patterns__title">
							{pattern.title}
						</span>
						{pattern.description ? (
							<span className="vpf-loop-patterns__description">
								{pattern.description}
							</span>
						) : null}
					</Button>
				))}
			</div>
			<Button variant="tertiary" onClick={startBlank}>
				{__('Start blank', 'visual-portfolio')}
			</Button>
		</Placeholder>
	);
}

/**
 * Block Edit Component
 * @param props
 */
export default function BlockEdit(props) {
	const { attributes, setAttributes, clientId } = props;
	const { layout, preview_image_example: previewExample } = attributes;

	useMaxPages({ attributes, setAttributes });

	const hasInnerBlocks = useSelect(
		(select) => !!select(blockEditorStore).getBlocks(clientId).length,
		[clientId]
	);

	const blockProps = useBlockProps({ className: 'vp-block-loop' });
	const innerBlocksProps = useInnerBlocksProps({});

	// Display block preview if needed.
	if ('true' === previewExample) {
		return (
			<div className="vpf-example-preview">
				<img
					src={`${pluginUrl}/assets/admin/images/example-${layout}.png`}
					alt={`Preview of ${layout} layout`}
				/>
			</div>
		);
	}

	if (!hasInnerBlocks) {
		return (
			<div {...blockProps}>
				<LoopPlaceholder
					attributes={attributes}
					setAttributes={setAttributes}
					clientId={clientId}
				/>
			</div>
		);
	}

	return (
		<div {...blockProps}>
			<InspectorControls>
				<PanelBody title={__('Content Source', 'visual-portfolio')}>
					<SourcePicker
						value={attributes.queryType}
						onChange={(name) => setAttributes({ queryType: name })}
					/>
				</PanelBody>

				<GeneralPanel
					attributes={attributes}
					setAttributes={setAttributes}
				/>

				<SourcePanel
					attributes={attributes}
					setAttributes={setAttributes}
					clientId={clientId}
				/>
			</InspectorControls>
			<div {...innerBlocksProps} />
		</div>
	);
}
