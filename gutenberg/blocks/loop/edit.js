import apiFetch from '@wordpress/api-fetch';
import {
	store as blockEditorStore,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { createBlocksFromInnerBlocksTemplate } from '@wordpress/blocks';
import {
	Button,
	__experimentalHStack as HStack,
	Notice,
	__experimentalNumberControl as NumberControl,
	PanelBody,
	Placeholder,
	RangeControl,
	SelectControl,
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __, _x, sprintf } from '@wordpress/i18n';
import GalleryManager from '../../loop-sources/gallery-manager';
import { useLoopSource } from '../../loop-sources/registry';
import SourcePicker from '../../loop-sources/source-picker';
import { useToolsPanelDropdownMenuProps } from '../../utils/tools-panel';
import { useIsPreview } from '../../utils/use-is-preview';
import PatternSetup from './pattern-setup';
import { applyChoices, PAGINATION_OPTIONS } from './starting-choices';

const {
	plugin_url: pluginUrl,
	items_count_notice_limit: itemsCountNoticeLimit,
} = window.VPGutenbergVariables;

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
		[
			[
				'visual-portfolio/loop-filter-item',
				{ text: __('All', 'visual-portfolio'), isAll: true },
			],
		],
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

	// A preview is a picture of a gallery, not a gallery: it never paginates,
	// and a request per preview is what kept the pattern chooser from ever
	// reaching an idle frame - which is when it draws them.
	const isPreview = useIsPreview();

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
		if (isPreview || !query.queryType || !query.baseQuery.perPage) {
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
	}, [isPreview, query, setAttributes]);
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
 * How many items a page carries, and how many pages there are.
 *
 * Its own panel, below the source, the way the core Query block keeps Display
 * below Settings: what the gallery holds is one question, how it is cut into
 * pages is another, and a reader looking for the second should not have to
 * pass the first.
 *
 * @param {Object}   props               - component props.
 * @param {Object}   props.attributes    - block attributes.
 * @param {Function} props.setAttributes - block attribute setter.
 * @return {Element} component.
 */
function DisplayPanel({ attributes, setAttributes }) {
	const { baseQuery, queryType, imagesQuery, postsQuery } = attributes;
	const perPage = baseQuery?.perPage;
	const isPosts = 'images' !== queryType;

	const setBase = (values) =>
		setAttributes({ baseQuery: { ...baseQuery, ...values } });
	const setPosts = (values) =>
		setAttributes({ postsQuery: { ...postsQuery, ...values } });

	return (
		<ToolsPanel
			label={__('Display', 'visual-portfolio')}
			dropdownMenuProps={useToolsPanelDropdownMenuProps()}
			resetAll={() => {
				setBase({ perPage: 6, maxPagesLimit: 0 });

				if (isPosts) {
					setPosts({ offset: 0 });
				}
			}}
		>
			<ToolsPanelItem
				isShownByDefault
				label={__('Items per page', 'visual-portfolio')}
				hasValue={() => 6 !== perPage}
				onDeselect={() => setBase({ perPage: 6 })}
			>
				<VStack spacing={4}>
					<ToggleControl
						label={__('Display all items', 'visual-portfolio')}
						help={__(
							'Render the whole gallery on a single page.',
							'visual-portfolio'
						)}
						checked={PER_PAGE_ALL === perPage}
						onChange={(checked) =>
							setBase({ perPage: checked ? PER_PAGE_ALL : 6 })
						}
					/>

					{PER_PAGE_ALL === perPage ? null : (
						<RangeControl
							label={__('Items per page', 'visual-portfolio')}
							help={__(
								'How many items one page of the gallery carries.',
								'visual-portfolio'
							)}
							min={1}
							max={100}
							value={perPage}
							onChange={(value) =>
								setBase({ perPage: parseInt(value, 10) || 1 })
							}
						/>
					)}

					<ItemsCountNotice
						perPage={perPage}
						queryType={queryType}
						imagesCount={imagesQuery?.images?.length || 0}
					/>

					<RandomOrderNotice attributes={attributes} />
				</VStack>
			</ToolsPanelItem>

			{isPosts ? (
				<ToolsPanelItem
					label={_x(
						'Offset',
						'Number of posts to skip in a query',
						'visual-portfolio'
					)}
					hasValue={() => !!postsQuery?.offset}
					onDeselect={() => setPosts({ offset: 0 })}
				>
					<NumberControl
						label={_x(
							'Offset',
							'Number of posts to skip in a query',
							'visual-portfolio'
						)}
						help={__(
							'Skip this many items before the gallery begins.',
							'visual-portfolio'
						)}
						min={0}
						value={postsQuery?.offset || 0}
						onChange={(value) =>
							setPosts({ offset: parseInt(value, 10) || 0 })
						}
					/>
				</ToolsPanelItem>
			) : null}

			<ToolsPanelItem
				label={__('Max pages to show', 'visual-portfolio')}
				hasValue={() => !!baseQuery?.maxPagesLimit}
				onDeselect={() => setBase({ maxPagesLimit: 0 })}
			>
				<NumberControl
					label={__('Max pages to show', 'visual-portfolio')}
					help={__(
						'Limit the pages you want to show, even if the query has more results. To show all pages use 0 (zero).',
						'visual-portfolio'
					)}
					min={0}
					value={baseQuery?.maxPagesLimit || 0}
					onChange={(value) =>
						setBase({ maxPagesLimit: parseInt(value, 10) || 0 })
					}
				/>
			</ToolsPanelItem>
		</ToolsPanel>
	);
}

/**
 * What narrows the query of the selected source, when it has anything to narrow.
 *
 * Below Display, the way the core Query block orders its own: the shape of the
 * query, then how it is paged, then what is left out of it.
 *
 * @param {Object} props - component props, forwarded to the source panel.
 * @return {Element|null} component.
 */
function SourceFiltersPanel(props) {
	const source = useLoopSource(props.attributes.queryType);

	if (!source?.FiltersPanel) {
		return null;
	}

	const { FiltersPanel } = source;

	return <FiltersPanel {...props} />;
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
 * What an empty loop shows: pick a source, fill it, then pick a shape.
 *
 * The order is the point. A pattern is previewed by rendering it, so a gallery
 * of images has to have its images before the previews can be of anything - and
 * a preview of somebody else's photographs is not a choice between layouts.
 *
 * @param {Object}   props               - component props.
 * @param {Object}   props.attributes    - block attributes.
 * @param {Function} props.setAttributes - block attribute setter.
 * @param {string}   props.clientId      - block client id.
 * @return {Element} component.
 */
function LoopPlaceholder({ attributes, setAttributes, clientId }) {
	const [step, setStep] = useState('source');
	const [choices, setChoices] = useState({
		filter: false,
		pagination: 'paged',
		lightbox: true,
	});
	const { replaceInnerBlocks } = useDispatch(blockEditorStore);

	const insert = (blocks) => replaceInnerBlocks(clientId, blocks);

	const startBlank = () =>
		insert(createBlocksFromInnerBlocksTemplate(TEMPLATE));

	if ('source' === step) {
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
						setStep('images' === name ? 'media' : 'pattern');
					}}
				/>
			</Placeholder>
		);
	}

	// The gallery manager, before anything is drawn from it.
	if ('media' === step) {
		const images = attributes.imagesQuery?.images || [];

		return (
			<Placeholder
				label={__('Gallery Loop', 'visual-portfolio')}
				instructions={__(
					'Add the images of the gallery.',
					'visual-portfolio'
				)}
			>
				<VStack spacing={4} className="vpf-loop-setup__media">
					<GalleryManager
						images={images}
						clientId={clientId}
						onChange={(value) =>
							setAttributes({
								imagesQuery: {
									...attributes.imagesQuery,
									images: value,
								},
							})
						}
					/>
					<HStack justify="flex-start" spacing={3}>
						<Button
							variant="primary"
							disabled={!images.length}
							accessibleWhenDisabled
							onClick={() => setStep('pattern')}
						>
							{__('Continue', 'visual-portfolio')}
						</Button>
						<Button variant="tertiary" onClick={startBlank}>
							{__('Start blank', 'visual-portfolio')}
						</Button>
					</HStack>
				</VStack>
			</Placeholder>
		);
	}

	// What the gallery is made of is asked here, beside the source, and applied
	// to whichever pattern is chosen. The chooser itself is a modal holding
	// nothing but patterns - a preview of a gallery needs the width of the
	// screen to be a preview of anything.
	return (
		<Placeholder
			label={__('Gallery Loop', 'visual-portfolio')}
			instructions={__(
				'Choose what the gallery carries, then pick a shape for it.',
				'visual-portfolio'
			)}
		>
			<VStack spacing={4} className="vpf-loop-wizard">
				<HStack
					className="vpf-loop-wizard__choices"
					spacing={4}
					justify="flex-start"
					alignment="flex-start"
					wrap
				>
					<ToggleControl
						label={__('Filter', 'visual-portfolio')}
						help={__(
							'Links above the gallery, one per category.',
							'visual-portfolio'
						)}
						checked={choices.filter}
						onChange={(filter) =>
							setChoices((current) => ({ ...current, filter }))
						}
					/>
					<ToggleControl
						label={__('Open in a lightbox', 'visual-portfolio')}
						help={__(
							'A click opens the picture over the page instead of following a link.',
							'visual-portfolio'
						)}
						checked={choices.lightbox}
						onChange={(lightbox) =>
							setChoices((current) => ({ ...current, lightbox }))
						}
					/>
					<SelectControl
						label={__('Pagination', 'visual-portfolio')}
						help={__(
							'How a visitor reaches the items past the first page.',
							'visual-portfolio'
						)}
						value={choices.pagination}
						options={PAGINATION_OPTIONS}
						onChange={(pagination) =>
							setChoices((current) => ({
								...current,
								pagination,
							}))
						}
					/>
				</HStack>

				<HStack justify="flex-start" spacing={3}>
					<Button
						variant="primary"
						onClick={() => setStep('pattern-modal')}
					>
						{__('Choose a gallery', 'visual-portfolio')}
					</Button>
					<Button variant="tertiary" onClick={startBlank}>
						{__('Start blank', 'visual-portfolio')}
					</Button>
				</HStack>
			</VStack>

			{'pattern-modal' === step ? (
				<PatternSetup
					attributes={attributes}
					clientId={clientId}
					onChoose={(blocks, metadata) => {
						// Named after the pattern and derived from by core, the
						// same as a block core inserted from a pattern itself.
						setAttributes({ metadata });
						insert(applyChoices(blocks, choices));
					}}
					onCancel={() => setStep('pattern')}
				/>
			) : null}
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
			{/* The order is the one the core Query block uses, and it is an
			    argument rather than a habit: what the gallery is made of,
			    then how it is cut into pages, then what narrows it. */}
			<InspectorControls>
				<PanelBody title={__('Content Source', 'visual-portfolio')}>
					<SourcePicker
						value={attributes.queryType}
						onChange={(name) => setAttributes({ queryType: name })}
					/>
				</PanelBody>

				<SourcePanel
					attributes={attributes}
					setAttributes={setAttributes}
					clientId={clientId}
				/>

				<SourceFiltersPanel
					attributes={attributes}
					setAttributes={setAttributes}
					clientId={clientId}
				/>

				<DisplayPanel
					attributes={attributes}
					setAttributes={setAttributes}
				/>
			</InspectorControls>
			<div {...innerBlocksProps} />
		</div>
	);
}
