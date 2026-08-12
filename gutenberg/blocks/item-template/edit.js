/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import {
	BlockContextProvider,
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
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { memo, useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { useLoopOrphanWarning } from '../../utils/loop-orphan-warning';
import { getTileStyles, getTilesColumns, parseTiles } from './tiles';

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
				{tiles.map((tile, index) => (
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
		layoutColumns,
		layoutColumnsTablet,
		layoutColumnsMobile,
		layoutGap,
		layoutTiles,
		justifiedRowHeight,
		justifiedRowHeightTolerance,
		justifiedMaxRowsCount,
		justifiedLastRow,
		carouselAutoWidth,
		carouselSnapAlign,
		carouselFreeScroll,
		carouselEffect,
		carouselShowArrows,
		carouselShowDots,
	} = attributes;
	const {
		'vp/queryType': queryType,
		'vp/baseQuery': baseQuery,
		'vp/postsQuery': postsQuery,
		'vp/imagesQuery': imagesQuery,
	} = context;

	useLoopOrphanWarning('visual-portfolio/item-template', context);

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
		}),
		[queryType, baseQuery?.perPage, postsQuery, imagesQuery]
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

	// Tiles carry their columns in the notation, so that is where the layout
	// reads them, and the narrower viewports can only go below that number.
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
	const columns = tilesColumns.columns || layoutColumns;
	const narrower = (value) =>
		Math.max(tilesColumns.widest, Math.min(value, columns));

	// The catalogue of the tiles picker, which Pro and themes extend through
	// `vpf_loop_tiles_presets`. It travels alongside the editor bundle: the
	// editor hands the block editor a fixed list of settings and drops
	// everything else, so this cannot be one of them.
	const tilesPresets = window.VPGalleryTilesPresets || [];

	// The layout describes a list of items; the empty state is a single notice
	// and would be laid out into the first column of a grid.
	const blockProps = useBlockProps(
		isEmpty
			? {}
			: {
					className: `vp-layout-${layoutType}${'carousel' === layoutType && carouselAutoWidth ? ' vp-carousel-auto-width' : ''}`,
					style: {
						'--vp-layout-columns': columns,
						'--vp-layout-columns-md': narrower(layoutColumnsTablet),
						'--vp-layout-columns-sm': narrower(layoutColumnsMobile),
						'--vp-layout-gap': layoutGap,
						'--vp-layout-row-height': `${justifiedRowHeight}px`,
						'--vp-carousel-snap-align': carouselSnapAlign,
					},
				}
	);

	const columnsControls = (
		<>
			{COLUMN_LAYOUTS.includes(layoutType) && (
				<RangeControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={
						'carousel' === layoutType
							? __('Slides per view', 'visual-portfolio')
							: __('Columns', 'visual-portfolio')
					}
					value={layoutColumns}
					onChange={(value) =>
						setAttributes({ layoutColumns: value })
					}
					min={1}
					max={6}
				/>
			)}
			<RangeControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={__('Columns on tablet', 'visual-portfolio')}
				value={layoutColumnsTablet}
				onChange={(value) =>
					setAttributes({ layoutColumnsTablet: value })
				}
				min={1}
				max={6}
			/>
			<RangeControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={__('Columns on mobile', 'visual-portfolio')}
				value={layoutColumnsMobile}
				onChange={(value) =>
					setAttributes({ layoutColumnsMobile: value })
				}
				min={1}
				max={6}
			/>
		</>
	);

	const inspectorControls = (
		<InspectorControls>
			<PanelBody title={__('Layout', 'visual-portfolio')}>
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

				{'justified' !== layoutType && columnsControls}

				<UnitControl
					__next40pxDefaultSize
					label={__('Gap', 'visual-portfolio')}
					value={layoutGap}
					onChange={(value) => setAttributes({ layoutGap: value })}
				/>

				{'justified' === layoutType && (
					<>
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
						<RangeControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={__(
								'Row height tolerance',
								'visual-portfolio'
							)}
							value={justifiedRowHeightTolerance}
							onChange={(value) =>
								setAttributes({
									justifiedRowHeightTolerance: value,
								})
							}
							min={0}
							max={1}
							step={0.05}
						/>
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
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={__('Last row', 'visual-portfolio')}
							value={justifiedLastRow}
							options={[
								{
									label: __('Left', 'visual-portfolio'),
									value: 'left',
								},
								{
									label: __('Center', 'visual-portfolio'),
									value: 'center',
								},
								{
									label: __('Right', 'visual-portfolio'),
									value: 'right',
								},
								{
									label: __('Hide', 'visual-portfolio'),
									value: 'hide',
								},
							]}
							onChange={(value) =>
								setAttributes({ justifiedLastRow: value })
							}
						/>
					</>
				)}

				{'carousel' === layoutType && (
					<>
						<ToggleControl
							__nextHasNoMarginBottom
							label={__(
								'Slide width from content',
								'visual-portfolio'
							)}
							checked={carouselAutoWidth}
							onChange={(value) =>
								setAttributes({ carouselAutoWidth: value })
							}
						/>
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={__('Snap slides to', 'visual-portfolio')}
							value={carouselSnapAlign}
							options={[
								{
									label: __('Start', 'visual-portfolio'),
									value: 'start',
								},
								{
									label: __('Center', 'visual-portfolio'),
									value: 'center',
								},
							]}
							onChange={(value) =>
								setAttributes({ carouselSnapAlign: value })
							}
						/>
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
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={__('Effect', 'visual-portfolio')}
							value={carouselEffect}
							options={[
								{
									label: __('None', 'visual-portfolio'),
									value: 'none',
								},
								{
									label: __('Coverflow', 'visual-portfolio'),
									value: 'coverflow',
								},
							]}
							onChange={(value) =>
								setAttributes({ carouselEffect: value })
							}
						/>
						{'coverflow' === carouselEffect && (
							<Notice status="info" isDismissible={false}>
								{__(
									'Coverflow is drawn by the browser as the carousel scrolls. Browsers without scroll-driven animations simply show the carousel without it.',
									'visual-portfolio'
								)}
							</Notice>
						)}
						<ToggleControl
							__nextHasNoMarginBottom
							label={__('Arrows', 'visual-portfolio')}
							checked={carouselShowArrows}
							onChange={(value) =>
								setAttributes({ carouselShowArrows: value })
							}
						/>
						<ToggleControl
							__nextHasNoMarginBottom
							label={__('Dots', 'visual-portfolio')}
							checked={carouselShowDots}
							onChange={(value) =>
								setAttributes({ carouselShowDots: value })
							}
						/>
					</>
				)}
			</PanelBody>
		</InspectorControls>
	);

	// A gallery that resolves to nothing is a content source problem, and the
	// source lives on the parent block.
	if (isEmpty) {
		return (
			<>
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

	return (
		<>
			{inspectorControls}
			{isLoading && <Spinner />}
			<ul {...blockProps} aria-busy={isLoading || undefined}>
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
