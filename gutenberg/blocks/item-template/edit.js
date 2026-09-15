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
	useSettings,
} from '@wordpress/block-editor';
import {
	BaseControl,
	Flex,
	FlexItem,
	MenuGroup,
	MenuItem,
	Notice,
	__experimentalNumberControl as NumberControl,
	__experimentalParseQuantityAndUnitFromRawValue as parseQuantityAndUnitFromRawValue,
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
import { __, _x, sprintf } from '@wordpress/i18n';
import {
	alignNone,
	justifyCenter,
	justifyLeft,
	settings,
	stretchFullWidth,
	stretchWide,
} from '@wordpress/icons';
/**
 * Internal dependencies
 */
import getBlockGapValue from '../../utils/block-gap';
import { CONTROL_BLOCKS } from '../../utils/carousel-controls';
import { useLoopOrphanWarning } from '../../utils/loop-orphan-warning';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';
import { useIsPreview } from '../../utils/use-is-preview';
import { getColumnsProps, getViewportBreakpoints } from './columns';
import { getTileStyles, getTilesColumns } from './tiles';
import TilesEditor from './tiles-editor';
import { TilesPresetsSelect, TilesPresetsToolbarButton } from './tiles-presets';
import useEditorLayout from './use-editor-layout';
import variations from './variations';

const ITEM_CLASS_NAME = 'wp-block-visual-portfolio-item-template__item';

// The two boxes a carousel effect is drawn on. Rendered inside the item and
// only for an effect, the same way the render callback renders them.
const SLIDE_CLASS_NAME = 'wp-block-visual-portfolio-item-template__slide';
const CARD_CLASS_NAME = 'wp-block-visual-portfolio-item-template__card';

// The layout a gallery is, is a block variation - see `variations.js`. The
// editor draws the switcher for it, above the settings and in the block
// switcher, the same way it does for the Group block.

// Layouts whose column count is chosen rather than derived.
const COLUMN_LAYOUTS = ['grid', 'masonry', 'carousel'];

// The presets button of the block toolbar wears the icon of the layout whose
// presets they are.
const TILES_ICON = variations.find(({ name }) => 'tiles' === name).icon;

const LAST_ROW_OPTIONS = [
	{ label: __('Left', 'visual-portfolio'), value: 'left' },
	{ label: __('Center', 'visual-portfolio'), value: 'center' },
	{ label: __('Right', 'visual-portfolio'), value: 'right' },
	{ label: __('Hide', 'visual-portfolio'), value: 'hide' },
];

// Where a slide comes to rest. Switched in the toolbar beside the layout,
// with the icons the editor draws horizontal alignment with everywhere else.
const SNAP_OPTIONS = [
	{
		label: __('Start', 'visual-portfolio'),
		value: 'start',
		icon: justifyLeft,
	},
	{
		label: __('Center', 'visual-portfolio'),
		value: 'center',
		icon: justifyCenter,
	},
];

const SNAP_ICONS = {
	start: justifyLeft,
	center: justifyCenter,
};

// The widths a carousel can rest its slides inside, named and drawn the way the
// editor names and draws the width of a block: the two the theme declares are
// its content and wide sizes, and no container at all is the full width of the
// gallery. Lives in the toolbar, where every other width switcher of the editor
// lives, and the typed width of a custom one is asked for there as well.
const CONTAINER_OPTIONS = [
	{
		value: 'content',
		label: _x('None', 'Alignment option', 'visual-portfolio'),
		icon: alignNone,
	},
	{
		value: 'wide',
		label: __('Wide width', 'visual-portfolio'),
		icon: stretchWide,
	},
	{
		value: 'none',
		label: __('Full width', 'visual-portfolio'),
		icon: stretchFullWidth,
	},
	{
		value: 'custom',
		label: __('Custom', 'visual-portfolio'),
		icon: settings,
	},
];

const CONTAINER_ICONS = Object.fromEntries(
	CONTAINER_OPTIONS.map(({ value, icon }) => [value, icon])
);

// A length the editor is willing to put a number on, the same shapes core's own
// alignment menu writes `Max 640px wide` under.
const SIZE_PATTERN =
	/^(?!0)\d+(\.\d+)?(px|em|rem|vw|vh|svw|lvw|dvw|svh|lvh|dvh|vmin|vmax|%)?$/i;

/**
 * What a width says under its name in the menu.
 *
 * @param {string} size - CSS length.
 *
 * @return {string|undefined} The line, or nothing for a width there is no number for.
 */
function getSizeInfo(size) {
	return SIZE_PATTERN.test(String(size ?? '').trim())
		? sprintf(
				// translators: %s: a CSS length, such as 640px.
				__('Max %s wide', 'visual-portfolio'),
				size
			)
		: undefined;
}

/**
 * Why a carousel has no container to hold its slides to.
 *
 * A container is the edge a slide starts from, and two carousels have no such
 * edge. The control stays where it was, switched off and saying why, rather
 * than disappearing: a setting that vanishes reads as a setting that was never
 * there. The same shape the image block locks its alternative text in - the
 * control disabled, and the reason where its help would be.
 *
 * @param {Object} attributes - block attributes.
 *
 * @return {string|undefined} The reason, or nothing when there is a container.
 */
function getCarouselContainerReason(attributes) {
	if (attributes.carouselRepeat && effectRepeats(attributes.carouselEffect)) {
		return __(
			'A carousel that repeats has no edge for its slides to start from.',
			'visual-portfolio'
		);
	}

	if ('center' === attributes.carouselSnapAlign) {
		return __(
			'Slides that rest in the middle have no edge to start from.',
			'visual-portfolio'
		);
	}

	return undefined;
}

/**
 * Whether a carousel has a container to hold its slides to.
 *
 * @param {Object} attributes - block attributes.
 *
 * @return {boolean} True where the container is worth having.
 */
function hasCarouselContainer(attributes) {
	return !getCarouselContainerReason(attributes);
}

/**
 * The room a carousel keeps beside its slides.
 *
 * A mirror of `Visual_Portfolio_Block_Item_Template::get_carousel_inset()`,
 * which stays the source of truth for what a page renders.
 *
 * @param {Object} attributes - block attributes.
 *
 * @return {string|undefined} CSS length, or nothing when there is no container.
 */
function getCarouselInset(attributes) {
	const { carouselContainer, carouselContainerWidth } = attributes;

	let size;

	if (!hasCarouselContainer(attributes)) {
		return undefined;
	}

	if ('content' === carouselContainer) {
		size = 'var(--wp--style--global--content-size, 100cqw)';
	} else if ('wide' === carouselContainer) {
		size = 'var(--wp--style--global--wide-size, 100cqw)';
	} else if ('custom' === carouselContainer) {
		size = String(carouselContainerWidth ?? '').replace(
			/[^0-9a-z.%-]/gi,
			''
		);
	}

	return size ? `max(0px, (100cqw - ${size}) / 2)` : undefined;
}

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

/**
 * Whether an effect can be run round in a loop.
 *
 * The loop moves the slides one end has run out of to the other, and an
 * effect that pins its slides in place - a deck - has nothing to move, so the
 * server leaves the loop out of it. `repeat: false` on the option says so.
 *
 * @param {string} effect - selected effect.
 *
 * @return {boolean} True when the repeat control does something.
 */
function effectRepeats(effect) {
	const option = getEffectOptions().find((item) => item.value === effect);

	return !option || false !== option.repeat;
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

// How far the slider beside a typed column width reaches, per unit. The core
// grid layout draws the same pair, and stops its slider at the same numbers.
const WIDTH_SLIDER_MAX = { px: 1000, em: 50, rem: 50, vw: 100 };

// Where a column count stops. Six columns of a gallery is already a thumbnail
// strip, and the legacy control never offered more.
const MAX_COLUMN_COUNT = 6;

/**
 * The narrowest a column may get, typed and dragged.
 *
 * A number the eye picks better than it types and the keyboard types better
 * than it drags, so the core grid layout offers both at once. The same pair,
 * under the same name.
 *
 * @param {Object}   props          - component props.
 * @param {string}   props.value    - CSS length.
 * @param {Function} props.onChange - value setter.
 *
 * @return {Element} component.
 */
function MinimumColumnWidthControl({ value, onChange }) {
	const label = __('Min. column width', 'visual-portfolio');
	const [quantity, unit = 'rem'] = parseQuantityAndUnitFromRawValue(value);

	return (
		<fieldset className="vpf-columns-control">
			<BaseControl.VisualLabel as="legend">
				{label}
			</BaseControl.VisualLabel>
			<Flex gap={4}>
				<FlexItem isBlock>
					<UnitControl
						label={label}
						hideLabelFromVision
						value={value}
						onChange={(next) => onChange(next || '16rem')}
						units={CSS_UNITS}
						min={0}
					/>
				</FlexItem>
				<FlexItem isBlock>
					<RangeControl
						label={label}
						hideLabelFromVision
						withInputField={false}
						value={quantity || 0}
						onChange={(next) => onChange([next, unit].join(''))}
						min={0}
						max={WIDTH_SLIDER_MAX[unit] || 600}
					/>
				</FlexItem>
			</Flex>
			<p className="components-base-control__help">
				{__(
					'Columns wrap to fewer per row when they can no longer keep the minimum width.',
					'visual-portfolio'
				)}
			</p>
		</fieldset>
	);
}

/**
 * How many columns a row may reach.
 *
 * @param {Object}   props          - component props.
 * @param {number}   props.value    - column count.
 * @param {Function} props.onChange - value setter.
 *
 * @return {Element} component.
 */
function MaximumColumnsControl({ value, onChange }) {
	const label = __('Max. columns', 'visual-portfolio');

	return (
		<fieldset className="vpf-columns-control">
			<BaseControl.VisualLabel as="legend">
				{label}
			</BaseControl.VisualLabel>
			<Flex gap={4}>
				<FlexItem isBlock>
					<NumberControl
						label={label}
						hideLabelFromVision
						value={value}
						onChange={(next) =>
							onChange(
								Math.min(
									MAX_COLUMN_COUNT,
									Math.max(0, parseInt(next, 10) || 0)
								)
							)
						}
						min={0}
						max={MAX_COLUMN_COUNT}
					/>
				</FlexItem>
				<FlexItem isBlock>
					<RangeControl
						label={label}
						hideLabelFromVision
						withInputField={false}
						value={value}
						onChange={(next) => onChange(next ?? 0)}
						min={0}
						max={MAX_COLUMN_COUNT}
					/>
				</FlexItem>
			</Flex>
			<p className="components-base-control__help">
				{__(
					'Zero lets the gallery use every column that fits.',
					'visual-portfolio'
				)}
			</p>
		</fieldset>
	);
}

// A count of its own for a narrower screen is set the way the editor styles
// a block for one: switch the View to Tablet or Mobile with Responsive styles
// on, and the inspector shows the panels a viewport can be styled in, the
// Layout panel among them - which is where the count for that screen lives.
// Keyed by the names the editor calls its devices, and by the screen each
// one is written for.
const SCREEN_ATTRIBUTES = {
	Tablet: { screen: 'tablet', attribute: 'layoutColumnCountTablet' },
	Mobile: { screen: 'mobile', attribute: 'layoutColumnCountMobile' },
};

/**
 * What a count for a screen answers for, breakpoint included - the editor
 * says what a size comes to wherever it offers one.
 *
 * @param {string} screen     - `tablet` or `mobile`.
 * @param {string} breakpoint - the width the screen is previewed at.
 * @return {string} help text.
 */
function getScreenHelp(screen, breakpoint) {
	return 'tablet' === screen
		? sprintf(
				/* translators: %s: breakpoint, e.g. 782px. */
				__(
					'The count on a tablet, %s and narrower, down to a phone. Zero steps the desktop count down on its own, the way it always has.',
					'visual-portfolio'
				),
				breakpoint
			)
		: sprintf(
				/* translators: %s: breakpoint, e.g. 480px. */
				__(
					'The count on a phone, %s and narrower. Zero steps the desktop count down on its own, the way it always has.',
					'visual-portfolio'
				),
				breakpoint
			);
}

// A slide height is typed in the same units, and in `vh` besides: a share of
// the screen is what the legacy slider offered as a percentage height.
const SLIDE_HEIGHT_UNITS = [
	{ value: 'px', label: 'px', default: 320 },
	{ value: 'rem', label: 'rem', default: 20 },
	{ value: 'em', label: 'em', default: 20 },
	{ value: 'vh', label: 'vh', default: 60 },
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
 * The frame a carousel is drawn inside.
 *
 * The list itself scrolls, so it is the one box of a carousel that stays
 * put, and the same box the render callback prints. A control dropped into
 * the template is laid over the slides against this box: on the page it is
 * printed inside the frame, and in the editor it is drawn inside the item
 * being edited - the one place the block editor can put it - with nothing
 * positioned between the two.
 *
 * The room a container keeps is carried here rather than on the list, the
 * same way the render callback prints it: the list inherits it, and so do the
 * controls pinned to the frame.
 *
 * @param {Object}  props          - component props.
 * @param {Element} props.children - the list itself.
 * @param {string}  props.inset    - room kept beside the slides.
 * @return {Element} component.
 */
function CarouselFrame({ children, inset }) {
	return (
		<div
			className="wp-block-visual-portfolio-item-template__carousel-frame"
			style={{ '--vp-carousel-inset': inset }}
		>
			{children}
		</div>
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
		layoutColumnCountTablet,
		layoutColumnCountMobile,
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
		carouselContainer,
		carouselContainerWidth,
		carouselSlideHeight,
		carouselStretchSlides,
		carouselSlidesPerGroup,
	} = attributes;
	// Which screen a count of its own is being set for: whichever one the
	// editor is previewing. A view of the editor rather than anything saved
	// with the post - and only a screen the theme has a breakpoint for, since
	// the editor previews no other.
	const deviceType = useSelect(
		(select) =>
			select('core/editor')?.getDeviceType?.() ??
			select('core/edit-post')?.__experimentalGetPreviewDeviceType?.() ??
			select('core/edit-site')?.__experimentalGetPreviewDeviceType?.() ??
			'Desktop',
		[]
	);
	const [viewport] = useSettings('viewport');
	const breakpoints = useMemo(
		() => getViewportBreakpoints(viewport),
		[viewport]
	);
	const screen = SCREEN_ATTRIBUTES[deviceType];
	const screenAttribute =
		screen && breakpoints[screen.screen] ? screen.attribute : undefined;
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

	// The read-only copies show the item and nothing else: a carousel control
	// dropped in the template is drawn once, by the item being edited.
	const blocks = useSelect(
		(select) =>
			select(blockEditorStore)
				.getBlocks(clientId)
				.filter((block) => !CONTROL_BLOCKS.includes(block.name)),
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

	// The pattern the preview is drawn with. A screen may have a pattern of
	// its own - Pro gives a tablet and a phone one - and the preview of that
	// screen draws it, the way it draws that screen's column count. The
	// settings keep editing the desktop's.
	const previewTiles = useMemo(
		() =>
			applyFilters('vpf.itemTemplateTiles', layoutTiles, {
				attributes,
				deviceType,
			}),
		[layoutTiles, attributes, deviceType]
	);

	// Tiles carry their columns in the notation, so that is where the layout
	// reads them.
	const tileStyles = useMemo(
		() => ('tiles' === layoutType ? getTileStyles(previewTiles) : []),
		[layoutType, previewTiles]
	);
	const tilesColumns = useMemo(
		() => ('tiles' === layoutType ? getTilesColumns(previewTiles) : 0),
		[layoutType, previewTiles]
	);
	// An effect that spreads one slide over the width of the gallery owns that
	// width, so the preview draws it the way the page will and the control that
	// would fight it is not offered.
	const singleSlide =
		'carousel' === layoutType && !effectTakesColumns(carouselEffect);
	// And an effect that pins its slides cannot run round, so the repeat
	// control is left in place but greyed, the way the container control is.
	const repeatable = effectRepeats(carouselEffect);

	// Tiles carry their columns in the notation, so that is where the layout
	// reads them, whatever the columns controls say. The counts for the
	// narrower screens go along, so a Tablet or Mobile preview draws the
	// gallery the way that screen will see it.
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
					layoutColumnCountTablet: singleSlide
						? 0
						: layoutColumnCountTablet,
					layoutColumnCountMobile: singleSlide
						? 0
						: layoutColumnCountMobile,
					layoutMinimumColumnWidth,
					layoutAutoFit,
				},
				getBlockGapValue(attributes.style?.spacing?.blockGap)
			),
		[
			layoutType,
			layoutColumnsMode,
			layoutColumnCount,
			layoutColumnCountTablet,
			layoutColumnCountMobile,
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

			if ('center' === carouselSnapAlign) {
				classes.push('vp-carousel-snap-center');
			}

			if (carouselStretchSlides) {
				classes.push('vp-carousel-stretch-slides');
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
		carouselSnapAlign,
		carouselStretchSlides,
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
		signature: `${columnsProps.className}|${JSON.stringify(columnsProps.style)}|${justifiedRowHeight}|${justifiedRowHeightTolerance}|${justifiedMaxRowsCount}|${justifiedLastRow}|${carouselEffect}`,
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
						'--vp-carousel-slide-height':
							carouselSlideHeight || undefined,
						// A preview rests where the carousel starts, and the
						// end that has been reached carries no fade.
						'--vp-carousel-fade-left': carouselEdgeFade
							? '0px'
							: undefined,
					},
				}
	);

	const isAuto = 'auto' === layoutColumnsMode;

	// Layouts whose column count is chosen rather than derived, and an effect
	// that spreads one slide over the gallery is not one of them.
	const hasColumns = COLUMN_LAYOUTS.includes(layoutType) && !singleSlide;

	// What a count is called: a carousel counts the slides in its frame.
	const countLabel =
		'carousel' === layoutType
			? __('Slides per view', 'visual-portfolio')
			: __('Columns', 'visual-portfolio');

	// The count for the screen being previewed, in the Layout panel: the one
	// panel the editor keeps for the layout of a viewport, and one of the few
	// it shows at all while Responsive styles has the inspector styling that
	// viewport alone. Nothing here on a desktop - the desktop count is the
	// count, and lives with the rest of the settings.
	const screenControls = hasColumns && !isAuto && screenAttribute && (
		<InspectorControls
			group="layout"
			resetAllFilter={() => ({
				layoutColumnCountTablet: 0,
				layoutColumnCountMobile: 0,
			})}
		>
			<ToolsPanelItem
				isShownByDefault
				panelId={clientId}
				hasValue={() => !!attributes[screenAttribute]}
				label={countLabel}
				onDeselect={() => setAttributes({ [screenAttribute]: 0 })}
			>
				<RangeControl
					label={countLabel}
					help={getScreenHelp(
						screen.screen,
						breakpoints[screen.screen]
					)}
					value={attributes[screenAttribute] || 0}
					onChange={(value) =>
						setAttributes({ [screenAttribute]: value ?? 0 })
					}
					min={0}
					max={MAX_COLUMN_COUNT}
				/>
			</ToolsPanelItem>
		</InspectorControls>
	);

	const layoutControls = (
		<ToolsPanel
			label={__('Settings', 'visual-portfolio')}
			dropdownMenuProps={dropdownMenuProps}
			resetAll={(filters) =>
				setAttributes(
					getResetAllValues(filters, {
						layoutTiles: '3|1,1|',
						layoutColumnsMode: 'auto',
						layoutColumnCount: 3,
						layoutMinimumColumnWidth: '16rem',
						layoutAutoFit: false,
					})
				)
			}
		>
			{'tiles' === layoutType && (
				<ToolsPanelItem
					isShownByDefault
					hasValue={() => '3|1,1|' !== layoutTiles}
					label={__('Pattern', 'visual-portfolio')}
					onDeselect={() => setAttributes({ layoutTiles: '3|1,1|' })}
				>
					<VStack spacing={3}>
						{/* A preset is a pattern to start from: picked here, it
						    is what the editor below then shows and edits. */}
						<TilesPresetsSelect
							presets={tilesPresets}
							value={layoutTiles}
							onChange={(value) =>
								setAttributes({ layoutTiles: value })
							}
						/>
						<TilesEditor
							value={layoutTiles}
							onChange={(value) =>
								setAttributes({ layoutTiles: value })
							}
						/>
					</VStack>
				</ToolsPanelItem>
			)}

			{hasColumns && (
				<ToolsPanelItem
					isShownByDefault
					hasValue={() => 'auto' !== layoutColumnsMode}
					label={__('Columns', 'visual-portfolio')}
					onDeselect={() =>
						setAttributes({ layoutColumnsMode: 'auto' })
					}
				>
					{/* The two shapes the core grid layout offers, in its own
					    words: a count, or a minimum width the container fits as
					    many of as it can. */}
					<VStack spacing={4}>
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

						{isAuto ? null : (
							<RangeControl
								label={countLabel}
								value={layoutColumnCount}
								onChange={(value) =>
									setAttributes({
										layoutColumnCount: value ?? 1,
									})
								}
								min={1}
								max={MAX_COLUMN_COUNT}
							/>
						)}
					</VStack>
				</ToolsPanelItem>
			)}

			{hasColumns && isAuto && (
				<ToolsPanelItem
					isShownByDefault
					hasValue={() => 3 !== layoutColumnCount}
					label={__('Max. columns', 'visual-portfolio')}
					onDeselect={() => setAttributes({ layoutColumnCount: 3 })}
				>
					<MaximumColumnsControl
						value={layoutColumnCount}
						onChange={(value) =>
							setAttributes({ layoutColumnCount: value })
						}
					/>
				</ToolsPanelItem>
			)}

			{hasColumns && isAuto && (
				<ToolsPanelItem
					isShownByDefault
					hasValue={() => '16rem' !== layoutMinimumColumnWidth}
					label={__('Min. column width', 'visual-portfolio')}
					onDeselect={() =>
						setAttributes({ layoutMinimumColumnWidth: '16rem' })
					}
				>
					<MinimumColumnWidthControl
						value={layoutMinimumColumnWidth}
						onChange={(value) =>
							setAttributes({ layoutMinimumColumnWidth: value })
						}
					/>
				</ToolsPanelItem>
			)}

			{hasColumns && isAuto && (
				<ToolsPanelItem
					hasValue={() => layoutAutoFit}
					label={__('Fill available space', 'visual-portfolio')}
					onDeselect={() => setAttributes({ layoutAutoFit: false })}
				>
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

	// A carousel with no edge for its slides to start from says why, and the
	// container control is left in place, greyed.
	const containerReason = getCarouselContainerReason(attributes);

	// Two of the widths are the theme's own - what `theme.json` declares as its
	// content and wide sizes, read the way the editor reads every setting, so a
	// block-level override counts too. The menu says what each one comes to,
	// the line core's alignment menu carries under every name, and the page
	// holds the slides to the same numbers through the custom properties the
	// theme prints them under.
	const [contentSize, wideSize] = useSettings(
		'layout.contentSize',
		'layout.wideSize'
	);

	const containerInfo = {
		content: getSizeInfo(contentSize),
		wide: getSizeInfo(wideSize),
		custom: getSizeInfo(carouselContainerWidth),
	};

	// A width the theme never declared is not offered, the way core's
	// alignment menu drops Wide width on a theme with no wide size: there
	// would be nothing to hold the slides to. The theme prints the content
	// size from the wide one when only that is set, so None follows either.
	const containerOptions = CONTAINER_OPTIONS.filter(
		({ value }) =>
			('content' !== value || !!(contentSize || wideSize)) &&
			('wide' !== value || !!wideSize)
	);

	const carouselControls = 'carousel' === layoutType && (
		<ToolsPanel
			label={__('Carousel', 'visual-portfolio')}
			dropdownMenuProps={dropdownMenuProps}
			resetAll={(filters) =>
				setAttributes(
					getResetAllValues(filters, {
						carouselAutoWidth: false,
						carouselFreeScroll: false,
						carouselEffect: 'none',
						carouselRepeat: false,
						carouselAutoplay: false,
						carouselAutoplayDelay: 5,
						carouselPeek: 0,
						carouselEdgeFade: false,
						carouselSlideHeight: '',
						carouselStretchSlides: false,
						carouselSlidesPerGroup: 1,
					})
				)
			}
		>
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
				hasValue={() => carouselRepeat && repeatable}
				label={__('Repeat', 'visual-portfolio')}
				onDeselect={() => setAttributes({ carouselRepeat: false })}
			>
				{/* Under an effect that pins its slides the control says why
				    it does nothing and stays in place, greyed and off - the
				    page leaves the loop out, and a switch shown on would
				    promise one. The setting itself is kept for the next
				    effect. */}
				<ToggleControl
					label={__('Repeat', 'visual-portfolio')}
					help={
						repeatable
							? __(
									'The carousel runs on without an end, in both directions.',
									'visual-portfolio'
								)
							: __(
									'This effect pins its slides in place, so the carousel cannot run round.',
									'visual-portfolio'
								)
					}
					checked={carouselRepeat && repeatable}
					disabled={!repeatable}
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
				hasValue={() => 1 !== carouselSlidesPerGroup}
				label={__('Slides per step', 'visual-portfolio')}
				onDeselect={() => setAttributes({ carouselSlidesPerGroup: 1 })}
			>
				<RangeControl
					label={__('Slides per step', 'visual-portfolio')}
					help={__(
						'How many slides an arrow moves at a press. Zero moves a whole screen at a time, however many slides that is.',
						'visual-portfolio'
					)}
					value={carouselSlidesPerGroup}
					onChange={(value) =>
						setAttributes({ carouselSlidesPerGroup: value ?? 1 })
					}
					min={0}
					max={6}
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={() => '' !== carouselSlideHeight}
				label={__('Slide height', 'visual-portfolio')}
				onDeselect={() => setAttributes({ carouselSlideHeight: '' })}
			>
				<UnitControl
					label={__('Slide height', 'visual-portfolio')}
					help={__(
						'The height of the box a slide is drawn in. Left empty, a slide is as tall as the tallest one beside it.',
						'visual-portfolio'
					)}
					value={carouselSlideHeight}
					onChange={(value) =>
						setAttributes({ carouselSlideHeight: value || '' })
					}
					units={SLIDE_HEIGHT_UNITS}
					min={0}
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={() => carouselStretchSlides}
				label={__('Blocks fill the slide', 'visual-portfolio')}
				onDeselect={() =>
					setAttributes({ carouselStretchSlides: false })
				}
			>
				<ToggleControl
					label={__('Blocks fill the slide', 'visual-portfolio')}
					help={__(
						'The image grows to take whatever the title and the text leave, so every slide ends at the same line. The shape of the picture itself is the image block’s own aspect ratio.',
						'visual-portfolio'
					)}
					checked={carouselStretchSlides}
					onChange={(value) =>
						setAttributes({ carouselStretchSlides: value })
					}
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
		<>
			<InspectorControls>
				{layoutControls}
				{justifiedControls}
				{carouselControls}
			</InspectorControls>
			{screenControls}
		</>
	);

	// Where the slides of a carousel come to rest, and the width they rest
	// inside, switched where the editor keeps its other view and width
	// switchers. The layout itself is a block variation and needs nothing here.
	const blockControls = (
		<BlockControls group="block">
			{'tiles' === layoutType && (
				<TilesPresetsToolbarButton
					icon={TILES_ICON}
					presets={tilesPresets}
					value={layoutTiles}
					onChange={(value) => setAttributes({ layoutTiles: value })}
				/>
			)}
			{'carousel' === layoutType && (
				<ToolbarDropdownMenu
					icon={SNAP_ICONS[carouselSnapAlign]}
					label={__('Snap slides to', 'visual-portfolio')}
					controls={SNAP_OPTIONS.map((option) => ({
						title: option.label,
						icon: option.icon,
						isActive: option.value === carouselSnapAlign,
						onClick: () =>
							setAttributes({ carouselSnapAlign: option.value }),
					}))}
				/>
			)}
			{'carousel' === layoutType && (
				<ToolbarDropdownMenu
					icon={CONTAINER_ICONS[carouselContainer]}
					label={__('Container width', 'visual-portfolio')}
					toggleProps={{
						description: __(
							'Hold the slides to a width while the carousel keeps the full one, so a full-width gallery starts where the text above it does.',
							'visual-portfolio'
						),
					}}
				>
					{({ onClose }) => (
						<>
							{/* A carousel with no edge for its slides to start
							    from says why, and the menu is left in place,
							    greyed: a setting that vanishes reads as a
							    setting that was never there. */}
							{containerReason ? (
								<p className="vpf-container-width__help">
									{containerReason}
								</p>
							) : null}
							<MenuGroup className="block-editor-block-alignment-control__menu-group">
								{containerOptions.map(
									({ value, label, icon }) => {
										const isSelected =
											value === carouselContainer;

										return (
											<MenuItem
												key={value}
												icon={icon}
												iconPosition="left"
												className={
													isSelected
														? 'components-dropdown-menu__menu-item is-active'
														: 'components-dropdown-menu__menu-item'
												}
												isSelected={isSelected}
												disabled={!!containerReason}
												role="menuitemradio"
												info={containerInfo[value]}
												onClick={() => {
													setAttributes({
														carouselContainer:
															value,
													});

													if ('custom' !== value) {
														onClose();
													}
												}}
											>
												{label}
											</MenuItem>
										);
									}
								)}
							</MenuGroup>
							{'custom' === carouselContainer &&
							!containerReason ? (
								<div className="vpf-container-width__custom">
									<UnitControl
										label={__('Width', 'visual-portfolio')}
										value={carouselContainerWidth}
										onChange={(value) =>
											setAttributes({
												carouselContainerWidth:
													value || '1200px',
											})
										}
										units={CSS_UNITS}
										min={0}
									/>
								</div>
							) : null}
						</>
					)}
				</ToolbarDropdownMenu>
			)}
		</BlockControls>
	);

	// A carousel is drawn inside a frame, and only a carousel has one.
	const withChrome = (list) =>
		'carousel' === layoutType ? (
			<CarouselFrame inset={getCarouselInset(attributes)}>
				{list}
			</CarouselFrame>
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
					</ul>
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
				</ul>
			)}
		</>
	);
}
