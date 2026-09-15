import {
	closestCenter,
	DndContext,
	DragOverlay,
	PointerSensor,
	pointerWithin,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import {
	BaseControl,
	Flex,
	FlexItem,
	__experimentalNumberControl as NumberControl,
	RangeControl,
	ResizableBox,
	Toolbar,
	ToolbarButton,
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { useResizeObserver } from '@wordpress/compose';
import { useMemo, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { plus, trash } from '@wordpress/icons';
import classnames from 'classnames/dedupe';
import {
	getTileStyles,
	MAX_COLUMNS,
	MAX_ROW_SPAN,
	MAX_TILES,
	parseTiles,
	serializeTiles,
} from './tiles';

/**
 * The tiles pattern editor.
 *
 * The pattern is edited as the tiles it is a list of: a tile is picked on a
 * canvas that lays the pattern out by the rules of the layout itself, and is
 * resized by its handles or by its numbers, dragged to another place in the
 * list, doubled or removed. The attribute stays the one source of truth -
 * every change is written back to the notation and the canvas is drawn from
 * what it reads.
 *
 * The editor measures a tile's height in column widths - `1` is as tall as a
 * column is wide, whatever the width of the tile - where the notation measures
 * it against the tile's own width. A tile drawn on a grid looks like it has
 * the first, and it is the one that stays put when the tile is widened; the
 * conversion is `toPattern()` and `toNotation()` below.
 *
 * Nothing the plugin has drags a size: `@blossom-carousel/core` drags a
 * scroll container on the front end. The editor itself ships `ResizableBox`
 * for exactly this, snapping included, so the handles are its and the only
 * code of our own is the arithmetic between a pixel and a column. Moving a
 * tile along the list is sorting, which is what `@dnd-kit` does everywhere
 * else in the plugin.
 */

// The gap between the tiles of the canvas. In pixels because the snapping
// below is; the stylesheet reads it from the custom property the canvas sets.
const GAP = 4;

// How close to a column a dragged edge snaps from, in pixels.
const SNAP_GAP = 10;

// What a tile's height can be, in column widths. The notation allows any
// positive number; these keep a slip of the pointer from writing a tile a
// screen tall or too thin to be picked again.
const MIN_HEIGHT = 0.1;
const MAX_HEIGHT = 12;

// The handles a selected tile is resized by. Its top and left edges are where
// the grid put them, so only the far edges move.
const RESIZE_SIDES = {
	top: false,
	right: true,
	bottom: true,
	left: false,
	topRight: false,
	bottomRight: true,
	bottomLeft: false,
	topLeft: false,
};

// `false` disables re-resizable, but an object of the same shape is what the
// prop is typed as in every version WordPress has shipped.
const NO_SIDES = Object.fromEntries(
	Object.keys(RESIZE_SIDES).map((side) => [side, false])
);

/**
 * Round to the two decimals the notation is written with.
 *
 * @param {number} value - number.
 * @return {number} rounded number.
 */
function round(value) {
	return Math.round(value * 100) / 100;
}

/**
 * Keep a number between two others.
 *
 * @param {number} value - number.
 * @param {number} min   - lower bound.
 * @param {number} max   - upper bound.
 * @return {number} clamped number.
 */
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

/**
 * Read the notation as the editor edits it.
 *
 * @param {string} notation - tiles notation.
 * @return {{columns: number, tiles: Array}} pattern with heights in column widths.
 */
function toPattern(notation) {
	const { columns, tiles } = parseTiles(notation);

	return {
		columns,
		tiles: tiles.map((tile) => ({
			width: tile.width,
			height: round(tile.height * tile.width),
		})),
	};
}

/**
 * Write the pattern the editor edits in the notation.
 *
 * @param {Object} pattern         - pattern with heights in column widths.
 * @param {number} pattern.columns - columns.
 * @param {Array}  pattern.tiles   - tiles.
 * @return {string} tiles notation.
 */
function toNotation({ columns, tiles }) {
	return serializeTiles({
		columns,
		tiles: tiles.map((tile) => {
			// Fewer columns than a tile is wide is what the parser clamps, and
			// clamping here too keeps the height with the width it is
			// measured against.
			const width = Math.min(columns, tile.width);

			return { width, height: tile.height / width };
		}),
	});
}

/**
 * The size of a resized box, in columns and column widths.
 *
 * The box was snapped to a pixel, and a pixel is a whole number where the
 * snapping point may not have been - read back as a fraction of a column it
 * comes out as `2.19` where `2.2` was meant. So the height is the snapping
 * point nearest to the box rather than the box itself.
 *
 * @param {HTMLElement} element  - the box.
 * @param {Object}      resizing - snapping of the canvas.
 * @return {{width: number, height: number}} size.
 */
function getResizedSize(element, resizing) {
	const { pitch, columns, heights } = resizing;
	const height = (element.offsetHeight + GAP) / pitch;

	return {
		width: clamp(
			Math.round((element.offsetWidth + GAP) / pitch),
			1,
			columns
		),
		height: heights.reduce((closest, candidate) =>
			Math.abs(candidate - height) < Math.abs(closest - height)
				? candidate
				: closest
		),
	};
}

/**
 * Where the pointer is, or failing that what it is nearest to.
 *
 * A tile is dropped on the tile under the pointer. Between two tiles is a gap
 * of a few pixels, and a drop there goes to the nearer one rather than
 * nowhere.
 *
 * @param {Object} args - collision detection arguments.
 * @return {Array} collisions.
 */
function collisionDetection(args) {
	const within = pointerWithin(args);

	return within.length ? within : closestCenter(args);
}

/**
 * No tile moves out of the way while another is dragged over it.
 *
 * The sorting strategies of `@dnd-kit` slide every item to the place of the
 * one it would replace, which for tiles of different sizes in a dense grid is
 * a pile-up. The tile in hand is drawn on the overlay, its target is lit, and
 * the grid is laid out again once it is dropped.
 *
 * @return {null} no transform.
 */
function stayPut() {
	return null;
}

/**
 * Spoken feedback of the drag and drop, in the user's language.
 *
 * `@dnd-kit` ships announcements of its own, but they are untranslated and talk
 * about "sortable items" rather than tiles.
 *
 * @param {Array} ids - sortable ids, in pattern order.
 * @return {Object} `accessibility` prop of the `DndContext`.
 */
function useAccessibility(ids) {
	// Read on announcement rather than on render - the order it describes is
	// the one the drag ended with.
	const idsRef = useRef(ids);
	idsRef.current = ids;

	return useMemo(() => {
		const positionOf = (id) => idsRef.current.indexOf(id) + 1;

		return {
			announcements: {
				onDragStart: ({ active }) =>
					sprintf(
						// translators: %d: position of the tile in the pattern.
						__('Picked up tile %d.', 'visual-portfolio'),
						positionOf(active.id)
					),
				onDragOver: ({ over }) =>
					over
						? sprintf(
								// translators: %d: position the tile would move to.
								__(
									'Tile moved to position %d.',
									'visual-portfolio'
								),
								positionOf(over.id)
							)
						: undefined,
				onDragEnd: ({ over }) =>
					over
						? sprintf(
								// translators: %d: final position of the tile.
								__(
									'Tile dropped at position %d.',
									'visual-portfolio'
								),
								positionOf(over.id)
							)
						: __('Tile dropped.', 'visual-portfolio'),
				onDragCancel: () =>
					__('Reordering cancelled.', 'visual-portfolio'),
			},
		};
	}, []);
}

/**
 * One tile of the canvas.
 *
 * @param {Object}   props            - component props.
 * @param {string}   props.id         - sortable id.
 * @param {number}   props.index      - position in the pattern.
 * @param {Object}   props.style      - grid placement, from `getTileStyles()`.
 * @param {boolean}  props.isSelected - whether this is the tile being edited.
 * @param {Object}   props.resizing   - snapping and limits for the handles.
 * @param {Function} props.onSelect   - picks the tile.
 * @param {Function} props.onResize   - commits a size dragged out.
 * @param {Object}   props.tools      - the toolbar of the selected tile: `onAdd`, `canAdd`, `onRemove`, `canRemove`.
 * @return {Element} component.
 */
function Tile({
	id,
	index,
	style,
	isSelected,
	resizing,
	onSelect,
	onResize,
	tools,
}) {
	// The size under the pointer while a handle is dragged, so the tile says
	// what it is about to become.
	const [draft, setDraft] = useState(null);

	// The face of the tile is what is dragged, so the handles beside it keep
	// resizing. Only the pointer drags: the keyboard picks a tile with Space
	// and Enter, which is what a pick-up key would have been.
	const { listeners, setNodeRef, setActivatorNodeRef, isDragging, isOver } =
		useSortable({ id });

	const number = index + 1;
	const canResize = isSelected && resizing.pitch > 0;

	return (
		<div
			ref={setNodeRef}
			className={classnames('vp-tiles-editor__tile', {
				'is-selected': isSelected,
				'is-dragging': isDragging,
				'is-drop-target': isOver && !isDragging,
			})}
			style={style}
		>
			{/*
			 * The tools of the tile in hand hang over it, the way the block
			 * toolbar hangs over the selected block. Outside the resizable
			 * box, so that a drag of the handles does not take them along.
			 */}
			{isSelected && (
				<Toolbar
					className="vp-tiles-editor__toolbar"
					label={__('Tile tools', 'visual-portfolio')}
				>
					<ToolbarButton
						icon={plus}
						label={__('Add tile', 'visual-portfolio')}
						accessibleWhenDisabled
						disabled={!tools.canAdd}
						onClick={tools.onAdd}
					/>
					<ToolbarButton
						icon={trash}
						label={__('Remove tile', 'visual-portfolio')}
						accessibleWhenDisabled
						disabled={!tools.canRemove}
						onClick={tools.onRemove}
					/>
				</Toolbar>
			)}
			<ResizableBox
				className="vp-tiles-editor__box"
				size={{ width: '100%', height: '100%' }}
				enable={canResize ? RESIZE_SIDES : NO_SIDES}
				showHandle={canResize}
				minWidth={resizing.minWidth}
				maxWidth={resizing.maxWidth}
				minHeight={resizing.minHeight}
				maxHeight={resizing.maxHeight}
				snap={resizing.snap}
				snapGap={SNAP_GAP}
				onResize={(event, direction, element) =>
					setDraft(getResizedSize(element, resizing))
				}
				onResizeStop={(event, direction, element) => {
					onResize(getResizedSize(element, resizing));
					setDraft(null);
				}}
			>
				<button
					ref={setActivatorNodeRef}
					type="button"
					className="vp-tiles-editor__face"
					aria-pressed={isSelected}
					aria-label={sprintf(
						// translators: %d: position of the tile in the pattern.
						__('Tile %d', 'visual-portfolio'),
						number
					)}
					onClick={() => onSelect(index)}
					{...listeners}
				>
					<span aria-hidden="true">
						{draft
							? sprintf(
									// translators: %1$s: width in columns, %2$s: height in column widths.
									__('%1$s × %2$s', 'visual-portfolio'),
									draft.width,
									draft.height
								)
							: number}
					</span>
				</button>
			</ResizableBox>
		</div>
	);
}

/**
 * The tiles pattern editor.
 *
 * @param {Object}   props          - component props.
 * @param {string}   props.value    - tiles notation.
 * @param {Function} props.onChange - writes the edited notation.
 * @return {Element} component.
 */
export default function TilesEditor({ value, onChange }) {
	const { columns, tiles } = useMemo(() => toPattern(value), [value]);
	const styles = useMemo(() => getTileStyles(value), [value]);

	// A tile is its place in the pattern, and so is its id.
	const ids = useMemo(
		() => tiles.map((item, index) => `tile-${index + 1}`),
		[tiles]
	);

	// The tile in hand, or none - the way no block is selected until one is
	// clicked, and a click beside the blocks lets go of it again.
	const [selectedIndex, setSelectedIndex] = useState(null);
	const selected =
		null === selectedIndex
			? null
			: Math.min(selectedIndex, tiles.length - 1);
	const tile = null === selected ? null : tiles[selected];

	const toggleTile = (index) =>
		setSelectedIndex((current) => (current === index ? null : index));

	// A click on the canvas itself - between the tiles, or on the dimmed
	// repeat, which lets clicks through - is a click on nothing.
	const onCanvasClick = (event) => {
		if (event.target === event.currentTarget) {
			setSelectedIndex(null);
		}
	};

	const onCanvasKeyDown = (event) => {
		if ('Escape' === event.key && null !== selected) {
			event.stopPropagation();
			setSelectedIndex(null);
		}
	};

	// The tile being dragged, drawn on the overlay.
	const [dragging, setDragging] = useState(null);

	const sensors = useSensors(
		// Without a threshold every click on a tile starts a drag.
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
	);
	const accessibility = useAccessibility(ids);

	// The handles snap to pixels, and a pixel is a column of the canvas as it
	// is wide right now.
	const [canvasWidth, setCanvasWidth] = useState(0);
	const canvasRef = useResizeObserver((entries) => {
		setCanvasWidth(entries[0].contentRect.width);
	});

	const resizing = useMemo(() => {
		const pitch = canvasWidth > 0 ? (canvasWidth + GAP) / columns : 0;

		// Across, a tile snaps to whole columns. Down, it snaps to the rows
		// of the pattern - the shortest tile is the row, as the parser has
		// it - and between them to tenths of a column width, so a height
		// dragged out is a round number and one typed can still be any.
		const unit = Math.min(...tiles.map((item) => item.height));
		const rows = Array.from({ length: MAX_ROW_SPAN }, (_, i) =>
			round((i + 1) * unit)
		);
		const tenths = Array.from(
			{ length: MAX_HEIGHT * 10 },
			(_, i) => (i + 1) / 10
		);
		const heights = [...new Set([...rows, ...tenths])]
			.filter((height) => height >= MIN_HEIGHT && height <= MAX_HEIGHT)
			.sort((a, b) => a - b);

		return {
			pitch,
			columns,
			heights,
			minWidth: Math.max(1, pitch - GAP),
			maxWidth: Math.max(1, columns * pitch - GAP),
			minHeight: Math.max(1, MIN_HEIGHT * pitch),
			maxHeight: Math.max(1, MAX_HEIGHT * pitch),
			snap: {
				x: Array.from(
					{ length: columns },
					(_, i) => (i + 1) * pitch - GAP
				),
				y: heights.map((height) => height * pitch - GAP),
			},
		};
	}, [canvasWidth, columns, tiles]);

	const commit = (pattern) => onChange(toNotation(pattern));

	const updateTile = (index, size) =>
		commit({
			columns,
			tiles: tiles.map((item, i) =>
				i === index ? { ...item, ...size } : item
			),
		});

	const moveTile = (from, to) => {
		const next = [...tiles];
		const [moved] = next.splice(from, 1);

		next.splice(to, 0, moved);
		commit({ columns, tiles: next });
		setSelectedIndex(to);
	};

	const addTile = () => {
		const next = [...tiles];

		// A copy of the tile in hand, after it: the next tile of a pattern
		// is most often another of the same, and a row of them is a few
		// clicks.
		next.splice(selected + 1, 0, { ...tile });
		commit({ columns, tiles: next });
		setSelectedIndex(selected + 1);
	};

	const removeTile = () => {
		commit({ columns, tiles: tiles.filter((_, i) => i !== selected) });
		setSelectedIndex(Math.max(0, selected - 1));
	};

	const onDragStart = ({ active }) => {
		const from = ids.indexOf(active.id);

		setDragging(from);
		setSelectedIndex(from);
	};

	const onDragEnd = ({ active, over }) => {
		setDragging(null);

		if (over && active.id !== over.id) {
			moveTile(ids.indexOf(active.id), ids.indexOf(over.id));
		}
	};

	const canvasStyle = {
		'--vp-tiles-editor-columns': columns,
		'--vp-tiles-editor-gap': `${GAP}px`,
	};

	return (
		<VStack spacing={3} className="vp-tiles-editor">
			<RangeControl
				label={__('Columns', 'visual-portfolio')}
				value={columns}
				onChange={(next) =>
					commit({
						columns: clamp(next ?? 1, 1, MAX_COLUMNS),
						tiles,
					})
				}
				min={1}
				max={MAX_COLUMNS}
			/>

			<DndContext
				sensors={sensors}
				collisionDetection={collisionDetection}
				accessibility={accessibility}
				onDragStart={onDragStart}
				onDragEnd={onDragEnd}
				onDragCancel={() => setDragging(null)}
			>
				<SortableContext items={ids} strategy={stayPut}>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: a click beside the tiles only lets go of the one picked with its own button; Escape does the same from the keyboard, and nothing here is reachable by the keyboard alone. */}
					<div
						ref={canvasRef}
						className="vp-tiles-editor__canvas"
						style={canvasStyle}
						onClick={onCanvasClick}
						onKeyDown={onCanvasKeyDown}
					>
						{tiles.map((item, index) => (
							<Tile
								// The pattern is a list of positions, and a
								// position is what identifies a tile in it.
								key={index}
								id={ids[index]}
								index={index}
								style={styles[index]}
								isSelected={index === selected}
								resizing={resizing}
								onSelect={toggleTile}
								onResize={(size) => updateTile(index, size)}
								tools={{
									onAdd: addTile,
									canAdd: tiles.length < MAX_TILES,
									onRemove: removeTile,
									canRemove: tiles.length > 1,
								}}
							/>
						))}
						{/*
						 * The pattern repeats over the items, and where the
						 * next turn of it lands - into the holes the first
						 * left - is part of what a pattern looks like. Drawn
						 * once more, dimmed.
						 */}
						{tiles.map((item, index) => (
							<div
								key={`repeat-${index}`}
								className="vp-tiles-editor__tile is-repeat"
								style={styles[index]}
								aria-hidden="true"
							>
								<span className="vp-tiles-editor__face">
									{index + 1}
								</span>
							</div>
						))}
					</div>
				</SortableContext>
				{/*
				 * The tile in hand follows the pointer as a copy of itself;
				 * the drop animation is switched off because it would fly to
				 * the place the id names, which after the move is another
				 * tile's.
				 */}
				<DragOverlay dropAnimation={null}>
					{null === dragging ? null : (
						<div className="vp-tiles-editor__face is-ghost">
							{dragging + 1}
						</div>
					)}
				</DragOverlay>
			</DndContext>

			{null !== selected && (
				<fieldset className="vp-tiles-editor__tile-settings">
					<BaseControl.VisualLabel as="legend">
						{sprintf(
							// translators: %1$d: position of the tile, %2$d: number of tiles.
							__('Tile %1$d of %2$d', 'visual-portfolio'),
							selected + 1,
							tiles.length
						)}
					</BaseControl.VisualLabel>
					<Flex gap={2} align="flex-start">
						<FlexItem isBlock>
							<NumberControl
								label={__('Width', 'visual-portfolio')}
								value={tile.width}
								onChange={(next) => {
									const width = parseInt(next, 10);

									// What is typed is applied as it is typed,
									// and half a number is left in the field
									// until it is a whole one.
									if (width >= 1 && width <= columns) {
										updateTile(selected, { width });
									}
								}}
								min={1}
								max={columns}
							/>
						</FlexItem>
						<FlexItem isBlock>
							<NumberControl
								label={__('Height', 'visual-portfolio')}
								value={tile.height}
								onChange={(next) => {
									const height = Number(next);

									if (
										Number.isFinite(height) &&
										height >= MIN_HEIGHT &&
										height <= MAX_HEIGHT
									) {
										updateTile(selected, {
											height: round(height),
										});
									}
								}}
								min={MIN_HEIGHT}
								max={MAX_HEIGHT}
								// Typed to the hundredth, the way `0.67` has to be;
								// stepped by the tenth, the way the handle goes.
								step={0.01}
								spinFactor={10}
							/>
						</FlexItem>
					</Flex>
				</fieldset>
			)}
			<p className="components-base-control__help">
				{__(
					'Pick a tile to change it: drag its handles to resize it, drag the tile to move it, or type a size. Height is in column widths - 1 is as tall as a column is wide.',
					'visual-portfolio'
				)}
			</p>
		</VStack>
	);
}
