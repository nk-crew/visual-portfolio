/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import {
	BlockContextProvider,
	BlockControls,
	store as blockEditorStore,
	InspectorControls,
	__experimentalUseBlockPreview as useBlockPreview,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	Notice,
	PanelBody,
	Placeholder,
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
import { useIsPreview } from '../../utils/use-is-preview';
import { getBlockGapValue, getColumnsProps } from './columns';
import { getTileStyles, getTilesColumns, parseTiles } from './tiles';
import useEditorLayout from './use-editor-layout';

const ITEM_CLASS_NAME = 'wp-block-visual-portfolio-item-template__item';

const LAYOUT_OPTIONS = [
	{ label: __('Grid', 'visual-portfolio'), value: 'grid' },
	{ label: __('Masonry', 'visual-portfolio'), value: 'masonry' },
	{ label: __('Tiles', 'visual-portfolio'), value: 'tiles' },
	{ label: __('Justified', 'visual-portfolio'), value: 'justified' },
	{ label: __('Carousel', 'visual-portfolio'), value: 'carousel' },
];

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

const EFFECT_OPTIONS = [
	{ label: __('None', 'visual-portfolio'), value: 'none' },
	{ label: __('Coverflow', 'visual-portfolio'), value: 'coverflow' },
	{ label: __('Slideshow', 'visual-portfolio'), value: 'slideshow' },
	{ label: __('Cards', 'visual-portfolio'), value: 'cards' },
];

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
	['visual-portfolio/item-title', { textAlign: 'center' }],
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
 * @param {Object} props       - component props.
 * @param {Object} props.style - placement of the item, when the layout gives it one.
 * @return {Element} component.
 */
function ItemTemplateInnerBlocks({ style }) {
	const innerBlocksProps = useInnerBlocksProps(
		{ className: ITEM_CLASS_NAME, style },
		{ template: TEMPLATE, __unstableDisableLayoutClassNames: true }
	);

	return <li {...innerBlocksProps} />;
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
}) {
	const blockPreviewProps = useBlockPreview({
		blocks,
		props: {
			className: 'wp-block-visual-portfolio-item-template__preview',
		},
	});

	const handleOnClick = () => {
		setActiveBlockContextId(blockContextId);
	};

	return (
		<li
			className={ITEM_CLASS_NAME}
			style={{ ...style, display: isHidden ? 'none' : undefined }}
		>
			{/* biome-ignore lint/a11y/useSemanticElements: a button cannot hold the block markup it previews, and the preview is what has to be pressed. */}
			<div
				{...blockPreviewProps}
				tabIndex={0}
				role="button"
				onClick={handleOnClick}
				onKeyPress={handleOnClick}
			/>
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
	} = context;

	useLoopOrphanWarning('visual-portfolio/item-template', context);

	// Inside a block preview the items are never fetched: a preview is a
	// picture of the layout, and a request per preview is what kept the pattern
	// chooser from ever reaching the idle frame it draws them on.
	const isPreview = useIsPreview();

	const [items, setItems] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [activeBlockContextId, setActiveBlockContextId] = useState();

	// Everything the endpoint needs, and the only thing that should trigger it.
	// Memoised on the attribute identities, so a gallery with hundreds of images
	// is not rebuilt on every render.
	const query = useMemo(
		() => ({
			queryType,
			baseQuery: { perPage: baseQuery?.perPage },
			postsQuery,
			imagesQuery,
			// Where a third-party source keeps its settings. Without it the
			// preview asks for a source it gives no options to.
			sourceQuery,
		}),
		[queryType, baseQuery?.perPage, postsQuery, imagesQuery, sourceQuery]
	);

	// Items are resolved on the server for every source alike - titles, category
	// links, ordering and the Pro sources are all query logic, and duplicating
	// any of it here is what broke the first take on this block.
	useEffect(() => {
		if (isPreview) {
			return undefined;
		}

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
	}, [isPreview, query]);

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
		() =>
			'tiles' === layoutType
				? getTilesColumns(layoutTiles)
				: { columns: 0, widest: 1 },
		[layoutType, layoutTiles]
	);
	// Tiles carry their columns in the notation, so that is where the layout
	// reads them, whatever the columns controls say.
	const columnsProps = useMemo(
		() =>
			getColumnsProps(
				{
					layoutType,
					layoutColumnsMode,
					layoutColumnCount:
						tilesColumns.columns || layoutColumnCount,
					layoutMinimumColumnWidth,
					layoutAutoFit,
				},
				attributes.style?.spacing?.blockGap
					? getBlockGapValue(attributes.style.spacing.blockGap)
					: ''
			),
		[
			layoutType,
			layoutColumnsMode,
			layoutColumnCount,
			layoutMinimumColumnWidth,
			layoutAutoFit,
			tilesColumns.columns,
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

			if ('none' !== carouselEffect) {
				classes.push(`vp-carousel-${carouselEffect}`);
			}
		}

		return classes.join(' ');
	}, [
		isEmpty,
		layoutType,
		carouselAutoWidth,
		carouselFreeScroll,
		carouselEffect,
	]);

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
					},
				}
	);

	const isAuto = 'auto' === layoutColumnsMode;

	// The two shapes the core grid layout offers, in its own words: a count, or
	// a minimum width the container fits as many of as it can.
	const columnsControls = COLUMN_LAYOUTS.includes(layoutType) ? (
		<>
			<ToggleGroupControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				isBlock
				label={__('Columns', 'visual-portfolio')}
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
						__next40pxDefaultSize
						label={__('Minimum column width', 'visual-portfolio')}
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
						__next40pxDefaultSize
						__nextHasNoMarginBottom
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
						__nextHasNoMarginBottom
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
					__next40pxDefaultSize
					__nextHasNoMarginBottom
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
		<PanelBody title={__('Layout', 'visual-portfolio')}>
			<VStack spacing={4}>
				<SelectControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={__('Type', 'visual-portfolio')}
					value={layoutType}
					options={LAYOUT_OPTIONS}
					onChange={(value) => setAttributes({ layoutType: value })}
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

				{columnsControls}
			</VStack>
		</PanelBody>
	);

	const justifiedControls = 'justified' === layoutType && (
		<ToolsPanel
			label={__('Justified', 'visual-portfolio')}
			resetAll={() =>
				setAttributes({
					justifiedRowHeight: 320,
					justifiedRowHeightTolerance: 0.25,
					justifiedMaxRowsCount: 0,
					justifiedLastRow: 'left',
				})
			}
		>
			<ToolsPanelItem
				isShownByDefault
				hasValue={() => 320 !== justifiedRowHeight}
				label={__('Row height', 'visual-portfolio')}
				onDeselect={() => setAttributes({ justifiedRowHeight: 320 })}
			>
				<RangeControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={__('Row height', 'visual-portfolio')}
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
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={__('Row height tolerance', 'visual-portfolio')}
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
					__next40pxDefaultSize
					__nextHasNoMarginBottom
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
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={__('Last row', 'visual-portfolio')}
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
			resetAll={() =>
				setAttributes({
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
			}
		>
			<ToolsPanelItem
				isShownByDefault
				hasValue={() => !carouselShowArrows}
				label={__('Arrows', 'visual-portfolio')}
				onDeselect={() => setAttributes({ carouselShowArrows: true })}
			>
				<ToggleControl
					__nextHasNoMarginBottom
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
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={__('Indicator', 'visual-portfolio')}
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
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={__('Effect', 'visual-portfolio')}
						value={carouselEffect}
						options={EFFECT_OPTIONS}
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
				hasValue={() => carouselAutoplay}
				label={__('Autoplay', 'visual-portfolio')}
				onDeselect={() => setAttributes({ carouselAutoplay: false })}
			>
				<VStack spacing={4}>
					<ToggleControl
						__nextHasNoMarginBottom
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
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={__('Delay, seconds', 'visual-portfolio')}
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
					__nextHasNoMarginBottom
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
					__next40pxDefaultSize
					__nextHasNoMarginBottom
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
					__nextHasNoMarginBottom
					label={__('Fade the edges', 'visual-portfolio')}
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
					__nextHasNoMarginBottom
					label={__('Slide width from content', 'visual-portfolio')}
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
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={__('Snap slides to', 'visual-portfolio')}
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
					__nextHasNoMarginBottom
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

	// A gallery that resolves to nothing is a content source problem, and the
	// source lives on the parent block.
	if (isEmpty) {
		return (
			<>
				{blockControls}
				{inspectorControls}
				<div {...blockProps}>
					<Placeholder
						label={__('Gallery Item Template', 'visual-portfolio')}
						instructions={__(
							'No items found. Check the Content Source settings of the Gallery Loop block.',
							'visual-portfolio'
						)}
					/>
				</div>
			</>
		);
	}

	// Items are fetched, and a gallery that has not fetched them yet is a list
	// of nothing - which is what a block preview measures when it sizes a
	// pattern, and why a pattern of a gallery used to preview as a title with
	// no picture under it. The shapes stand in until the items land.
	if ((isLoading || isPreview) && !blockContexts.length) {
		return (
			<>
				{blockControls}
				{inspectorControls}
				<ul {...blockProps} aria-busy="true">
					{Array.from({ length: skeletonCount }, (item, index) => (
						<li
							// Placeholders differ in nothing but their place.
							key={index}
							className={`${ITEM_CLASS_NAME} wp-block-visual-portfolio-item-template__skeleton`}
							style={
								tileStyles.length
									? tileStyles[index % tileStyles.length]
									: undefined
							}
						/>
					))}
				</ul>
			</>
		);
	}

	return (
		<>
			{blockControls}
			{inspectorControls}
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
					const isActive =
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
								<ItemTemplateInnerBlocks style={style} />
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
							/>
						</BlockContextProvider>
					);
				})}
			</ul>
		</>
	);
}
