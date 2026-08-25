/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import {
	BlockContextProvider,
	BlockControls,
	store as blockEditorStore,
	__experimentalGetGapCSSValue as getGapCSSValue,
	InspectorControls,
	__experimentalUseBlockPreview as useBlockPreview,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	Notice,
	RangeControl,
	SelectControl,
	Spinner,
	ToggleControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	ToolbarDropdownMenu,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalUnitControl as UnitControl,
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { memo, useEffect, useMemo, useState } from '@wordpress/element';
import { applyFilters } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import {
	gallery,
	grid,
	image,
	postFeaturedImage,
	stretchWide,
} from '@wordpress/icons';
/**
 * Internal dependencies
 */
import { useLoopOrphanWarning } from '../../utils/loop-orphan-warning';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';
import { useIsPreview } from '../../utils/use-is-preview';
import { getColumnsProps } from './columns';
import { getTileStyles, getTilesColumns, parseTiles } from './tiles';
import useEditorLayout from './use-editor-layout';

const ITEM_CLASS_NAME = 'wp-block-visual-portfolio-item-template__item';

// The two boxes a carousel effect is drawn on. Rendered inside the item and
// only for an effect, the same way the render callback renders them.
const SLIDE_CLASS_NAME = 'wp-block-visual-portfolio-item-template__slide';
const CARD_CLASS_NAME = 'wp-block-visual-portfolio-item-template__card';

const LAYOUT_OPTIONS = [
	{ label: __('Grid', 'visual-portfolio'), value: 'grid' },
	{ label: __('Masonry', 'visual-portfolio'), value: 'masonry' },
	{ label: __('Tiles', 'visual-portfolio'), value: 'tiles' },
	{ label: __('Justified', 'visual-portfolio'), value: 'justified' },
	{ label: __('Carousel', 'visual-portfolio'), value: 'carousel' },
];

// One line each, in the editor's own voice: what the layout does to the items.
const LAYOUT_DESCRIPTIONS = {
	grid: __('Equal cells in a fixed grid.', 'visual-portfolio'),
	masonry: __(
		'Columns of equal width, items keep their own height.',
		'visual-portfolio'
	),
	tiles: __(
		'A repeating pattern of differently sized cells.',
		'visual-portfolio'
	),
	justified: __(
		'Rows of equal height, items keep their own aspect ratio.',
		'visual-portfolio'
	),
	carousel: __(
		'A single row the visitor scrolls through.',
		'visual-portfolio'
	),
};

// Layouts whose column count is chosen rather than derived.
const COLUMN_LAYOUTS = ['grid', 'masonry', 'carousel'];

// How much of a tiles pattern a swatch shows: enough rows to read as a mosaic,
// and a ceiling so that a pattern of a dozen small tiles does not draw a
// hundred of them.
const PREVIEW_ROWS = 3;
const PREVIEW_MAX_REPEATS = 6;

const LAYOUT_ICONS = {
	grid,
	masonry: gallery,
	tiles: postFeaturedImage,
	justified: stretchWide,
	carousel: image,
};

const LAST_ROW_OPTIONS = [
	{ label: __('Left', 'visual-portfolio'), value: 'left' },
	{ label: __('Center', 'visual-portfolio'), value: 'center' },
	{ label: __('Right', 'visual-portfolio'), value: 'right' },
	{ label: __('Hide', 'visual-portfolio'), value: 'hide' },
];

const SNAP_OPTIONS = [
	{ label: __('Start', 'visual-portfolio'), value: 'start' },
	{ label: __('Center', 'visual-portfolio'), value: 'center' },
];

const INDICATOR_OPTIONS = [
	{ label: __('None', 'visual-portfolio'), value: 'none' },
	{ label: __('Dots', 'visual-portfolio'), value: 'dots' },
	{ label: __('Progress bar', 'visual-portfolio'), value: 'progress' },
];

// `columns: false` says the effect spreads one slide over the width of the
// gallery and owns that width, so the columns control is not offered beside it.
const EFFECT_OPTIONS = [
	{ label: __('None', 'visual-portfolio'), value: 'none' },
	{ label: __('Coverflow', 'visual-portfolio'), value: 'coverflow' },
	{
		label: __('Slideshow', 'visual-portfolio'),
		value: 'slideshow',
		columns: false,
	},
];

/**
 * The effects this install offers.
 *
 * An effect is a stylesheet over two boxes the item template already renders,
 * so Pro and a theme add one through this filter and `vpf_carousel_effects` on
 * the server, and write no markup at all.
 *
 * @return {Array} select options.
 */
function getEffectOptions() {
	return applyFilters('vpf.carouselEffects', EFFECT_OPTIONS);
}

/**
 * Whether an effect leaves the column count to the gallery.
 *
 * @param {string} effect - selected effect.
 *
 * @return {boolean} True when the columns control is worth offering.
 */
function effectTakesColumns(effect) {
	const option = getEffectOptions().find((item) => item.value === effect);

	return !option || false !== option.columns;
}

// The same question the view module asks: where the browser packs masonry
// itself, the stylesheet does the layout and no script should run over it.
const HAS_NATIVE_MASONRY = !!window.CSS?.supports?.('display', 'grid-lanes');

// The units a column width is typed in, the same set the core grid offers.
const CSS_UNITS = [
	{ value: 'px', label: 'px', default: 320 },
	{ value: 'rem', label: 'rem', default: 20 },
	{ value: 'em', label: 'em', default: 20 },
	{ value: 'vw', label: 'vw', default: 20 },
];

const TEMPLATE = [
	['visual-portfolio/item-image', { aspectRatio: '1', clickAction: 'popup' }],
	[
		'visual-portfolio/item-title',
		{ style: { typography: { textAlign: 'center' } } },
	],
];

/**
 * Turn a REST item into the block context of a single gallery item.
 *
 * The endpoint answers with the same map the render callback injects, minus the
 * `vp/` namespace. `imageSizes` is the one addition: the front end resolves the
 * size on the server, the editor has to pick a URL on its own.
 *
 * @param {Object} item - item from the REST response.
 * @return {Object} block context.
 */
function getItemContext(item) {
	const { imageSizes, ...values } = item;
	const context = { 'vp/itemImageSizes': imageSizes || {} };

	Object.keys(values).forEach((key) => {
		context[`vp/${key}`] = values[key];
	});

	return context;
}

/**
 * The one item whose inner blocks are editable.
 *
 * @param {Object}  props        - component props.
 * @param {Object}  props.style  - placement of the item, when the layout gives it one.
 * @param {boolean} props.effect - whether a carousel effect is playing.
 * @param {number}  props.index  - place of the item in the list.
 * @return {Element} component.
 */
function ItemTemplateInnerBlocks({ style, effect, index }) {
	const innerBlocksProps = useInnerBlocksProps(
		effect
			? { className: CARD_CLASS_NAME }
			: { className: ITEM_CLASS_NAME, style },
		{ template: TEMPLATE, __unstableDisableLayoutClassNames: true }
	);

	if (!effect) {
		return <li {...innerBlocksProps} />;
	}

	return (
		<li
			className={ITEM_CLASS_NAME}
			style={{ ...style, '--vp-slide-index': index }}
		>
			<div className={SLIDE_CLASS_NAME}>
				<div {...innerBlocksProps} />
			</div>
		</li>
	);
}

/**
 * The controls of a carousel, drawn for the preview.
 *
 * The same markup the render callback prints, minus everything that would need
 * a scroll position to answer: the arrows are switched off and the indicator
 * says the carousel is at its first slide, which is where a preview always is.
 * What they are here for is the shape of the gallery - a carousel with dots
 * under it is taller than one without, and the editor used to keep that hidden
 * until the post was published.
 *
 * @param {Object}  props           - component props.
 * @param {boolean} props.arrows    - whether the gallery renders arrows.
 * @param {string}  props.indicator - the indicator the gallery renders.
 * @param {number}  props.count     - number of slides.
 * @param {Element} props.children  - the list itself.
 * @return {Element} component.
 */
function CarouselChrome({ arrows, indicator, count, children }) {
	const name = 'wp-block-visual-portfolio-item-template__carousel';

	return (
		<div className={`${name} vp-carousel-has-controls`}>
			<div className={`${name}-frame`}>
				{children}
				{arrows
					? ['prev', 'next'].map((direction) => (
							<button
								key={direction}
								type="button"
								className={`${name}-arrow ${name}-arrow--${direction}`}
								// Drawn, not offered: a preview has no scroll
								// position for them to move.
								disabled={'prev' === direction}
								tabIndex={-1}
								aria-hidden="true"
							>
								<span />
							</button>
						))
					: null}
			</div>
			{'none' !== indicator ? (
				<div className={`${name}-nav`}>
					{'dots' === indicator ? (
						<div className={`${name}-dots`}>
							{Array.from({ length: count }, (dot, index) => (
								<button
									// Dots differ in nothing but their place.
									key={index}
									type="button"
									className={`${name}-dot`}
									aria-current={
										0 === index ? 'true' : 'false'
									}
									tabIndex={-1}
									aria-hidden="true"
								>
									<span className={`${name}-dot-progress`} />
								</button>
							))}
						</div>
					) : (
						<div className={`${name}-progress`}>
							<span className={`${name}-progress-value`} />
						</div>
					)}
				</div>
			) : null}
		</div>
	);
}

/**
 * One preset of the tiles picker, drawn from the notation it stands for.
 *
 * @param {Object}   props           - component props.
 * @param {string}   props.value     - tiles notation.
 * @param {boolean}  props.isActive  - whether the gallery uses this pattern.
 * @param {Function} props.onSelect  - picks the pattern.
 * @return {Element} component.
 */
function TilesPreset({ value, isActive, onSelect }) {
	const { columns, tiles } = useMemo(() => parseTiles(value), [value]);

	// A pattern repeats over the items, and a swatch that drew it once said
	// nothing about the shape: a pattern of a single square came out as one
	// cell, which is the one thing the gallery it stands for never looks like.
	// Repeated until the swatch is as tall as it is wide, it reads as a mosaic.
	const preview = useMemo(() => {
		const area = tiles.reduce(
			(total, tile) => total + tile.width * tile.rowSpan,
			0
		);
		const repeats = Math.max(
			1,
			Math.min(
				PREVIEW_MAX_REPEATS,
				Math.ceil((columns * PREVIEW_ROWS) / area)
			)
		);

		return Array.from({ length: repeats }, () => tiles).flat();
	}, [columns, tiles]);

	return (
		<button
			type="button"
			className={`vp-tiles-preset${isActive ? ' is-active' : ''}`}
			aria-pressed={isActive}
			aria-label={value}
			onClick={() => onSelect(value)}
		>
			<span
				className="vp-tiles-preset__grid"
				style={{
					gridTemplateColumns: `repeat(${columns}, 1fr)`,
				}}
			>
				{preview.map((tile, index) => (
					<span
						// The pattern is a list of positions, and a position is
						// what identifies a tile in it.
						key={index}
						style={{
							gridColumn: `span ${tile.width}`,
							gridRow: `span ${tile.rowSpan}`,
						}}
					/>
				))}
			</span>
		</button>
	);
}

/**
 * A read-only copy of the inner blocks, rendered with the context of its item.
 *
 * @param {Object}   props                         - component props.
 * @param {Array}    props.blocks                  - inner blocks of the template.
 * @param {string}   props.blockContextId          - id of the item this copy shows.
 * @param {Function} props.setActiveBlockContextId - makes this item the editable one.
 * @param {boolean}  props.isHidden                - whether the editable item took its place.
 * @param {Object}   props.style                   - placement of the item, when the layout gives it one.
 * @return {Element} component.
 */
function ItemTemplateBlockPreview({
	blocks,
	blockContextId,
	setActiveBlockContextId,
	isHidden,
	style,
	effect,
	index,
}) {
	const blockPreviewProps = useBlockPreview({
		blocks,
		props: {
			className: effect
				? `wp-block-visual-portfolio-item-template__preview ${CARD_CLASS_NAME}`
				: 'wp-block-visual-portfolio-item-template__preview',
		},
	});

	const handleOnClick = () => {
		setActiveBlockContextId(blockContextId);
	};

	const preview = (
		<>
			{/* biome-ignore lint/a11y/useSemanticElements: a button cannot hold the block markup it previews, and the preview is what has to be pressed. */}
			<div
				{...blockPreviewProps}
				tabIndex={0}
				role="button"
				onClick={handleOnClick}
				onKeyPress={handleOnClick}
			/>
		</>
	);

	return (
		<li
			className={ITEM_CLASS_NAME}
			style={{
				...style,
				display: isHidden ? 'none' : undefined,
				...(effect ? { '--vp-slide-index': index } : null),
			}}
		>
			{effect ? (
				<div className={SLIDE_CLASS_NAME}>{preview}</div>
			) : (
				preview
			)}
		</li>
	);
}

const MemoizedItemTemplateBlockPreview = memo(ItemTemplateBlockPreview);

export default function BlockEdit({
	attributes,
	setAttributes,
	context,
	clientId,
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();
	const {
		layoutType,
		layoutColumnsMode,
		layoutColumnCount,
		layoutMinimumColumnWidth,
		layoutAutoFit,
		layoutTiles,
		justifiedRowHeight,
		justifiedRowHeightTolerance,
		justifiedMaxRowsCount,
		justifiedLastRow,
		carouselAutoWidth,
		carouselSnapAlign,
		carouselFreeScroll,
		carouselEffect,
		carouselRepeat,
		carouselAutoplay,
		carouselAutoplayDelay,
		carouselPeek,
		carouselEdgeFade,
		carouselShowArrows,
		carouselIndicator,
	} = attributes;
	const {
		'vp/queryType': queryType,
		'vp/baseQuery': baseQuery,
		'vp/postsQuery': postsQuery,
		'vp/imagesQuery': imagesQuery,
		'vp/sourceQuery': sourceQuery,
		'vp/previewQuery': previewQuery,
	} = context;

	useLoopOrphanWarning('visual-portfolio/item-template', context);

	const isPreview = useIsPreview();

	const [items, setItems] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [activeBlockContextId, setActiveBlockContextId] = useState();

	// Everything the endpoint needs, and the only thing that should trigger it.
	// Memoised on the attribute identities, so a gallery with hundreds of images
	// is not rebuilt on every render.
	//
	// A pattern chooser hands its own source down through `vp/previewQuery`, so
	// every pattern is previewed with the gallery the user has already picked
	// rather than with whatever the pattern was written against. It is the
	// mechanic the core Query block uses for `previewPostType`: plain block
	// context, injected around the list and never declared by any parent.
	const query = useMemo(
		() =>
			previewQuery || {
				queryType,
				baseQuery: { perPage: baseQuery?.perPage },
				postsQuery,
				imagesQuery,
				// Where a third-party source keeps its settings. Without it the
				// preview asks for a source it gives no options to.
				sourceQuery,
			},
		[
			previewQuery,
			queryType,
			baseQuery?.perPage,
			postsQuery,
			imagesQuery,
			sourceQuery,
		]
	);

	// Items are resolved on the server for every source alike - titles, category
	// links, ordering and the Pro sources are all query logic, and duplicating
	// any of it here is what broke the first take on this block.
	useEffect(() => {
		let cancelled = false;

		setIsLoading(true);

		// Settings are usually changed in bursts - only ask once they settle.
		const timeout = setTimeout(() => {
			apiFetch({
				path: '/visual-portfolio/v1/get_loop_items/',
				method: 'POST',
				data: query,
			})
				.then((response) => {
					if (cancelled) {
						return;
					}

					setItems(
						response?.success ? response.response?.items || [] : []
					);
					setIsLoading(false);
				})
				.catch((error) => {
					if (!cancelled) {
						setIsLoading(false);
					}

					// eslint-disable-next-line no-console
					console.error('Error fetching gallery items:', error);
				});
		}, 500);

		return () => {
			cancelled = true;
			clearTimeout(timeout);
		};
	}, [query]);

	const blocks = useSelect(
		(select) => select(blockEditorStore).getBlocks(clientId),
		[clientId]
	);

	const blockContexts = useMemo(() => items.map(getItemContext), [items]);

	// The selected item can disappear when the query changes, and an id nothing
	// matches would leave the template without an editable item.
	const activeContextId = blockContexts.some(
		(blockContext) => blockContext['vp/itemId'] === activeBlockContextId
	)
		? activeBlockContextId
		: blockContexts[0]?.['vp/itemId'];

	const isEmpty = !isLoading && !blockContexts.length;

	// As many shapes as the gallery is about to hold, within reason.
	const skeletonCount = Math.max(
		1,
		Math.min(12, parseInt(baseQuery?.perPage, 10) || 6)
	);

	// Tiles carry their columns in the notation, so that is where the layout
	// reads them.
	const tileStyles = useMemo(
		() => ('tiles' === layoutType ? getTileStyles(layoutTiles) : []),
		[layoutType, layoutTiles]
	);
	const tilesColumns = useMemo(
		() => ('tiles' === layoutType ? getTilesColumns(layoutTiles) : 0),
		[layoutType, layoutTiles]
	);
	// An effect that spreads one slide over the width of the gallery owns that
	// width, so the preview draws it the way the page will and the control that
	// would fight it is not offered.
	const singleSlide =
		'carousel' === layoutType && !effectTakesColumns(carouselEffect);

	// Tiles carry their columns in the notation, so that is where the layout
	// reads them, whatever the columns controls say.
	const columnsProps = useMemo(
		() =>
			getColumnsProps(
				{
					layoutType,
					layoutColumnsMode: singleSlide
						? 'manual'
						: layoutColumnsMode,
					layoutColumnCount: singleSlide
						? 1
						: tilesColumns || layoutColumnCount,
					layoutMinimumColumnWidth,
					layoutAutoFit,
				},
				getGapCSSValue(attributes.style?.spacing?.blockGap) || ''
			),
		[
			layoutType,
			layoutColumnsMode,
			layoutColumnCount,
			layoutMinimumColumnWidth,
			layoutAutoFit,
			tilesColumns,
			singleSlide,
			attributes.style?.spacing?.blockGap,
		]
	);

	// The catalogue of the tiles picker, which Pro and themes extend through
	// `vpf_loop_tiles_presets`. It travels alongside the editor bundle: the
	// editor hands the block editor a fixed list of settings and drops
	// everything else, so this cannot be one of them.
	const tilesPresets = window.VPGalleryTilesPresets || [];

	// Every class the render callback puts on the list, so the preview is the
	// same layout the page will be - free scrolling and the effects included,
	// which used to be front end only and made the carousel preview a lie.
	const layoutClasses = useMemo(() => {
		if (isEmpty) {
			return '';
		}

		const classes = [
			'masonry' === layoutType && HAS_NATIVE_MASONRY
				? 'vp-layout-masonry-native'
				: `vp-layout-${layoutType}`,
		];

		if ('carousel' === layoutType) {
			if (carouselAutoWidth) {
				classes.push('vp-carousel-auto-width');
			}

			if (carouselFreeScroll) {
				classes.push('vp-carousel-free-scroll');
			}

			if (carouselEdgeFade) {
				classes.push('vp-carousel-edge-fade');
			}

			if ('none' !== carouselEffect) {
				classes.push('vp-carousel-effect');
				classes.push(`vp-carousel-${carouselEffect}`);
			}
		}

		return classes.join(' ');
	}, [
		isEmpty,
		layoutType,
		carouselAutoWidth,
		carouselFreeScroll,
		carouselEdgeFade,
		carouselEffect,
	]);

	// A carousel effect is drawn on two boxes inside the item, and only a
	// carousel has them.
	const slideEffect = 'carousel' === layoutType && 'none' !== carouselEffect;

	// Justified and masonry are measured by a library on both sides.
	const listRef = useEditorLayout({
		layoutType,
		justified: {
			rowHeight: justifiedRowHeight,
			rowHeightTolerance: justifiedRowHeightTolerance,
			maxRowsCount: justifiedMaxRowsCount,
			lastRow: justifiedLastRow,
		},
		itemsCount: blockContexts.length,
		signature: `${columnsProps.className}|${JSON.stringify(columnsProps.style)}|${justifiedRowHeight}|${justifiedRowHeightTolerance}|${justifiedMaxRowsCount}|${justifiedLastRow}`,
	});

	// The layout describes a list of items; the empty state is a single notice
	// and would be laid out into the first column of a grid.
	const blockProps = useBlockProps(
		isEmpty
			? {}
			: {
					ref: listRef,
					className:
						`${layoutClasses} ${columnsProps.className}`.trim(),
					style: {
						...columnsProps.style,
						'--vp-layout-row-height': `${justifiedRowHeight}px`,
						'--vp-carousel-snap-align': carouselSnapAlign,
						'--vp-carousel-peek': `${Math.max(0, Math.min(200, carouselPeek))}px`,
						// A preview rests where the carousel starts, and the
						// end that has been reached carries no fade.
						'--vp-carousel-fade-left': carouselEdgeFade
							? '0px'
							: undefined,
					},
				}
	);

	const isAuto = 'auto' === layoutColumnsMode;

	// The two shapes the core grid layout offers, in its own words: a count, or
	// a minimum width the container fits as many of as it can.
	const hasColumns = COLUMN_LAYOUTS.includes(layoutType) && !singleSlide;
	const columnsControls = hasColumns ? (
		<>
			<ToggleGroupControl
				isBlock
				label={__('Columns', 'visual-portfolio')}
				help={__(
					'Auto fits as many columns as the width allows. Manual keeps the count you set.',
					'visual-portfolio'
				)}
				value={layoutColumnsMode}
				onChange={(value) =>
					setAttributes({ layoutColumnsMode: value })
				}
			>
				<ToggleGroupControlOption
					value="auto"
					label={__('Auto', 'visual-portfolio')}
				/>
				<ToggleGroupControlOption
					value="manual"
					label={__('Manual', 'visual-portfolio')}
				/>
			</ToggleGroupControl>

			{isAuto ? (
				<>
					<UnitControl
						label={__('Minimum column width', 'visual-portfolio')}
						help={__(
							'The narrowest a column may get before the row drops one.',
							'visual-portfolio'
						)}
						value={layoutMinimumColumnWidth}
						onChange={(value) =>
							setAttributes({
								layoutMinimumColumnWidth: value || '16rem',
							})
						}
						units={CSS_UNITS}
						min={0}
					/>
					<RangeControl
						label={__('Maximum columns', 'visual-portfolio')}
						help={__(
							'Zero lets the gallery use every column that fits.',
							'visual-portfolio'
						)}
						value={layoutColumnCount}
						onChange={(value) =>
							setAttributes({ layoutColumnCount: value })
						}
						min={0}
						max={6}
					/>
					<ToggleControl
						label={__('Fill available space', 'visual-portfolio')}
						help={__(
							'A row that cannot be filled drops its empty columns instead of keeping them.',
							'visual-portfolio'
						)}
						checked={layoutAutoFit}
						onChange={(value) =>
							setAttributes({ layoutAutoFit: value })
						}
					/>
				</>
			) : (
				<RangeControl
					label={
						'carousel' === layoutType
							? __('Slides per view', 'visual-portfolio')
							: __('Columns', 'visual-portfolio')
					}
					value={layoutColumnCount}
					onChange={(value) =>
						setAttributes({ layoutColumnCount: value })
					}
					min={1}
					max={6}
				/>
			)}
		</>
	) : null;

	const layoutControls = (
		<ToolsPanel
			label={__('Settings', 'visual-portfolio')}
			dropdownMenuProps={dropdownMenuProps}
			resetAll={(filters) =>
				setAttributes(
					getResetAllValues(filters, {
						layoutType: 'grid',
						layoutTiles: '3|1,1|',
						layoutColumnsMode: 'auto',
						layoutColumnCount: 3,
						layoutMinimumColumnWidth: '16rem',
						layoutAutoFit: false,
					})
				)
			}
		>
			<ToolsPanelItem
				isShownByDefault
				hasValue={() =>
					'grid' !== layoutType || '3|1,1|' !== layoutTiles
				}
				label={__('Type', 'visual-portfolio')}
				onDeselect={() =>
					setAttributes({ layoutType: 'grid', layoutTiles: '3|1,1|' })
				}
			>
				<VStack spacing={4}>
					<SelectControl
						label={__('Type', 'visual-portfolio')}
						help={LAYOUT_DESCRIPTIONS[layoutType]}
						value={layoutType}
						options={LAYOUT_OPTIONS}
						onChange={(value) =>
							setAttributes({ layoutType: value })
						}
					/>

					{'tiles' === layoutType && (
						<div className="vp-tiles-presets">
							{tilesPresets.map((preset) => (
								<TilesPreset
									key={preset}
									value={preset}
									isActive={preset === layoutTiles}
									onSelect={(value) =>
										setAttributes({ layoutTiles: value })
									}
								/>
							))}
						</div>
					)}
				</VStack>
			</ToolsPanelItem>

			{columnsControls && (
				<ToolsPanelItem
					isShownByDefault
					hasValue={() =>
						'auto' !== layoutColumnsMode ||
						3 !== layoutColumnCount ||
						'16rem' !== layoutMinimumColumnWidth ||
						layoutAutoFit
					}
					label={__('Columns', 'visual-portfolio')}
					onDeselect={() =>
						setAttributes({
							layoutColumnsMode: 'auto',
							layoutColumnCount: 3,
							layoutMinimumColumnWidth: '16rem',
							layoutAutoFit: false,
						})
					}
				>
					<VStack spacing={4}>{columnsControls}</VStack>
				</ToolsPanelItem>
			)}
		</ToolsPanel>
	);

	const justifiedControls = 'justified' === layoutType && (
		<ToolsPanel
			label={__('Justified', 'visual-portfolio')}
			dropdownMenuProps={dropdownMenuProps}
			resetAll={(filters) =>
				setAttributes(
					getResetAllValues(filters, {
						justifiedRowHeight: 320,
						justifiedRowHeightTolerance: 0.25,
						justifiedMaxRowsCount: 0,
						justifiedLastRow: 'left',
					})
				)
			}
		>
			<ToolsPanelItem
				isShownByDefault
				hasValue={() => 320 !== justifiedRowHeight}
				label={__('Row height', 'visual-portfolio')}
				onDeselect={() => setAttributes({ justifiedRowHeight: 320 })}
			>
				<RangeControl
					label={__('Row height', 'visual-portfolio')}
					help={__(
						'The height every row aims for.',
						'visual-portfolio'
					)}
					value={justifiedRowHeight}
					onChange={(value) =>
						setAttributes({ justifiedRowHeight: value })
					}
					min={40}
					max={800}
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={() => 0.25 !== justifiedRowHeightTolerance}
				label={__('Row height tolerance', 'visual-portfolio')}
				onDeselect={() =>
					setAttributes({ justifiedRowHeightTolerance: 0.25 })
				}
			>
				<RangeControl
					label={__('Row height tolerance', 'visual-portfolio')}
					help={__(
						'How far a row may drift from that height to keep items uncropped.',
						'visual-portfolio'
					)}
					value={justifiedRowHeightTolerance}
					onChange={(value) =>
						setAttributes({ justifiedRowHeightTolerance: value })
					}
					min={0}
					max={1}
					step={0.05}
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={() => 0 !== justifiedMaxRowsCount}
				label={__('Maximum rows', 'visual-portfolio')}
				onDeselect={() => setAttributes({ justifiedMaxRowsCount: 0 })}
			>
				<RangeControl
					label={__('Maximum rows', 'visual-portfolio')}
					help={__(
						'Zero shows every row the items make.',
						'visual-portfolio'
					)}
					value={justifiedMaxRowsCount}
					onChange={(value) =>
						setAttributes({ justifiedMaxRowsCount: value })
					}
					min={0}
					max={20}
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={() => 'left' !== justifiedLastRow}
				label={__('Last row', 'visual-portfolio')}
				onDeselect={() => setAttributes({ justifiedLastRow: 'left' })}
			>
				<SelectControl
					label={__('Last row', 'visual-portfolio')}
					help={__(
						'What happens to a row that has too few items to fill it.',
						'visual-portfolio'
					)}
					value={justifiedLastRow}
					options={LAST_ROW_OPTIONS}
					onChange={(value) =>
						setAttributes({ justifiedLastRow: value })
					}
				/>
			</ToolsPanelItem>
		</ToolsPanel>
	);

	const carouselControls = 'carousel' === layoutType && (
		<ToolsPanel
			label={__('Carousel', 'visual-portfolio')}
			dropdownMenuProps={dropdownMenuProps}
			resetAll={(filters) =>
				setAttributes(
					getResetAllValues(filters, {
						carouselAutoWidth: false,
						carouselSnapAlign: 'start',
						carouselFreeScroll: false,
						carouselEffect: 'none',
						carouselRepeat: false,
						carouselAutoplay: false,
						carouselAutoplayDelay: 5,
						carouselPeek: 0,
						carouselEdgeFade: false,
						carouselShowArrows: true,
						carouselIndicator: 'none',
					})
				)
			}
		>
			<ToolsPanelItem
				isShownByDefault
				hasValue={() => !carouselShowArrows}
				label={__('Arrows', 'visual-portfolio')}
				onDeselect={() => setAttributes({ carouselShowArrows: true })}
			>
				<ToggleControl
					label={__('Arrows', 'visual-portfolio')}
					checked={carouselShowArrows}
					onChange={(value) =>
						setAttributes({ carouselShowArrows: value })
					}
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				isShownByDefault
				hasValue={() => 'none' !== carouselIndicator}
				label={__('Indicator', 'visual-portfolio')}
				onDeselect={() => setAttributes({ carouselIndicator: 'none' })}
			>
				<SelectControl
					label={__('Indicator', 'visual-portfolio')}
					help={__(
						"What marks the visitor's place in the carousel.",
						'visual-portfolio'
					)}
					value={carouselIndicator}
					options={INDICATOR_OPTIONS}
					onChange={(value) =>
						setAttributes({ carouselIndicator: value })
					}
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={() => 'none' !== carouselEffect}
				label={__('Effect', 'visual-portfolio')}
				onDeselect={() => setAttributes({ carouselEffect: 'none' })}
			>
				<VStack spacing={2}>
					<SelectControl
						label={__('Effect', 'visual-portfolio')}
						help={__(
							'How one slide gives way to the next.',
							'visual-portfolio'
						)}
						value={carouselEffect}
						options={getEffectOptions()}
						onChange={(value) =>
							setAttributes({ carouselEffect: value })
						}
					/>
					{'none' !== carouselEffect && (
						<Notice status="info" isDismissible={false}>
							{__(
								'Effects are drawn by the browser as the carousel scrolls. Browsers without scroll-driven animations simply show the carousel without them.',
								'visual-portfolio'
							)}
						</Notice>
					)}
				</VStack>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={() => carouselAutoplay || 5 !== carouselAutoplayDelay}
				label={__('Autoplay', 'visual-portfolio')}
				onDeselect={() =>
					setAttributes({
						carouselAutoplay: false,
						carouselAutoplayDelay: 5,
					})
				}
			>
				<VStack spacing={4}>
					<ToggleControl
						label={__('Autoplay', 'visual-portfolio')}
						help={__(
							'Pauses while the visitor is on the carousel, and never runs for a visitor who asked for less motion.',
							'visual-portfolio'
						)}
						checked={carouselAutoplay}
						onChange={(value) =>
							setAttributes({ carouselAutoplay: value })
						}
					/>
					{carouselAutoplay && (
						<RangeControl
							label={__('Delay, seconds', 'visual-portfolio')}
							help={__(
								'How long a slide is held before the carousel moves on.',
								'visual-portfolio'
							)}
							value={carouselAutoplayDelay}
							onChange={(value) =>
								setAttributes({ carouselAutoplayDelay: value })
							}
							min={2}
							max={10}
							step={0.5}
						/>
					)}
				</VStack>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={() => carouselRepeat}
				label={__('Repeat', 'visual-portfolio')}
				onDeselect={() => setAttributes({ carouselRepeat: false })}
			>
				<ToggleControl
					label={__('Repeat', 'visual-portfolio')}
					help={__(
						'The carousel runs on without an end, in both directions.',
						'visual-portfolio'
					)}
					checked={carouselRepeat}
					onChange={(value) =>
						setAttributes({ carouselRepeat: value })
					}
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={() => 0 !== carouselPeek}
				label={__('Peek', 'visual-portfolio')}
				onDeselect={() => setAttributes({ carouselPeek: 0 })}
			>
				<RangeControl
					label={__('Peek', 'visual-portfolio')}
					help={__(
						'How much of the next slide shows at the edge, as an invitation to scroll.',
						'visual-portfolio'
					)}
					value={carouselPeek}
					onChange={(value) => setAttributes({ carouselPeek: value })}
					min={0}
					max={200}
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={() => carouselEdgeFade}
				label={__('Fade the edges', 'visual-portfolio')}
				onDeselect={() => setAttributes({ carouselEdgeFade: false })}
			>
				<ToggleControl
					label={__('Fade the edges', 'visual-portfolio')}
					help={__(
						'Slides dissolve at the edges of the carousel instead of being cut off.',
						'visual-portfolio'
					)}
					checked={carouselEdgeFade}
					onChange={(value) =>
						setAttributes({ carouselEdgeFade: value })
					}
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={() => carouselAutoWidth}
				label={__('Slide width from content', 'visual-portfolio')}
				onDeselect={() => setAttributes({ carouselAutoWidth: false })}
			>
				<ToggleControl
					label={__('Slide width from content', 'visual-portfolio')}
					help={__(
						'Each slide is as wide as its own image instead of a share of the row.',
						'visual-portfolio'
					)}
					checked={carouselAutoWidth}
					onChange={(value) =>
						setAttributes({ carouselAutoWidth: value })
					}
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={() => 'start' !== carouselSnapAlign}
				label={__('Snap slides to', 'visual-portfolio')}
				onDeselect={() => setAttributes({ carouselSnapAlign: 'start' })}
			>
				<SelectControl
					label={__('Snap slides to', 'visual-portfolio')}
					help={__(
						'Where a slide comes to rest when scrolling stops.',
						'visual-portfolio'
					)}
					value={carouselSnapAlign}
					options={SNAP_OPTIONS}
					onChange={(value) =>
						setAttributes({ carouselSnapAlign: value })
					}
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={() => carouselFreeScroll}
				label={__('Free scrolling', 'visual-portfolio')}
				onDeselect={() => setAttributes({ carouselFreeScroll: false })}
			>
				<ToggleControl
					label={__('Free scrolling', 'visual-portfolio')}
					help={__(
						'Scroll stops wherever it is let go, instead of settling on a slide.',
						'visual-portfolio'
					)}
					checked={carouselFreeScroll}
					onChange={(value) =>
						setAttributes({ carouselFreeScroll: value })
					}
				/>
			</ToolsPanelItem>
		</ToolsPanel>
	);

	const inspectorControls = (
		<InspectorControls>
			{layoutControls}
			{justifiedControls}
			{carouselControls}
		</InspectorControls>
	);

	// The layout a gallery is, switched where the other view switchers of the
	// editor are rather than only in the sidebar.
	const blockControls = (
		<BlockControls group="block">
			<ToolbarDropdownMenu
				icon={LAYOUT_ICONS[layoutType]}
				label={__('Layout', 'visual-portfolio')}
				controls={LAYOUT_OPTIONS.map((option) => ({
					title: option.label,
					icon: LAYOUT_ICONS[option.value],
					isActive: option.value === layoutType,
					onClick: () => setAttributes({ layoutType: option.value }),
				}))}
			/>
		</BlockControls>
	);

	// The controls of a carousel go around the list, and only a carousel has
	// them.
	const withChrome = (list, count) =>
		'carousel' === layoutType ? (
			<CarouselChrome
				arrows={carouselShowArrows}
				indicator={carouselIndicator}
				count={count}
			>
				{list}
			</CarouselChrome>
		) : (
			list
		);

	// A gallery that resolves to nothing is a content source problem, and the
	// source lives on the parent block.
	if (isEmpty) {
		return (
			<>
				{blockControls}
				{inspectorControls}
				<p {...blockProps}>
					{__('No results found.', 'visual-portfolio')}
				</p>
			</>
		);
	}

	// A gallery that has not fetched its items yet is a list of nothing, and an
	// empty list is what the editor would flash on every settings change. The
	// shapes stand in until the items land.
	if (isLoading && !blockContexts.length) {
		return (
			<>
				{blockControls}
				{inspectorControls}
				{withChrome(
					<ul {...blockProps} aria-busy="true">
						{Array.from(
							{ length: skeletonCount },
							(item, index) => (
								<li
									// Placeholders differ in nothing but their place.
									key={index}
									className={`${ITEM_CLASS_NAME} wp-block-visual-portfolio-item-template__skeleton`}
									style={
										tileStyles.length
											? tileStyles[
													index % tileStyles.length
												]
											: undefined
									}
								/>
							)
						)}
					</ul>,
					skeletonCount
				)}
			</>
		);
	}

	return (
		<>
			{blockControls}
			{inspectorControls}
			{withChrome(
				<ul {...blockProps} aria-busy={isLoading || undefined}>
					{/* Out of the flow, so a settings change never moves the
				    gallery under the pointer that is still changing it. A
				    list item rather than a sibling: the list is the block
				    element, and neither layout library looks at a node
				    without the item class. */}
					{isLoading ? (
						<li
							className="wp-block-visual-portfolio-item-template__editor-spinner"
							aria-hidden="true"
						>
							<Spinner />
						</li>
					) : null}

					{blockContexts.map((blockContext, index) => {
						// Nothing is edited inside a block preview, so no item
						// there is the editable one.
						const isActive =
							!isPreview &&
							blockContext['vp/itemId'] === activeContextId;

						// The tiles pattern repeats over the items, so an item is
						// placed by where it falls inside one repetition.
						const style = tileStyles.length
							? tileStyles[index % tileStyles.length]
							: undefined;

						return (
							<BlockContextProvider
								key={blockContext['vp/itemId']}
								value={blockContext}
							>
								{isActive ? (
									<ItemTemplateInnerBlocks
										style={style}
										effect={slideEffect}
										index={index}
									/>
								) : null}

								{/* Kept mounted under the active item as well: it is
							    what the next item reuses when the selection moves. */}
								<MemoizedItemTemplateBlockPreview
									blocks={blocks}
									blockContextId={blockContext['vp/itemId']}
									setActiveBlockContextId={
										setActiveBlockContextId
									}
									isHidden={isActive}
									style={style}
									effect={slideEffect}
									index={index}
								/>
							</BlockContextProvider>
						);
					})}
				</ul>,
				blockContexts.length
			)}
		</>
	);
}
