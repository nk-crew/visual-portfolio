import {
	BaseControl,
	Button,
	Dropdown,
	ToolbarButton,
} from '@wordpress/components';
import { useInstanceId } from '@wordpress/compose';
import { useMemo } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { chevronDown } from '@wordpress/icons';
import classnames from 'classnames/dedupe';
import { parseTiles } from './tiles';

/**
 * The tiles presets: patterns to start from.
 *
 * Every preset is drawn from the notation it stands for, so the catalogue is
 * whatever `vpf_loop_tiles_presets` returns and nothing here has to be kept
 * in step with it. The catalogue is offered twice, the way the editor offers
 * a block's styles: as a select above the pattern editor, whose toggle shows
 * the pattern in hand, and as a button in the block toolbar.
 */

// How much of a pattern a swatch shows: enough rows to read as a mosaic, and
// a ceiling so that a pattern of a dozen small tiles does not draw a hundred
// of them.
const PREVIEW_ROWS = 3;
const PREVIEW_MAX_REPEATS = 6;

/**
 * A pattern, drawn small.
 *
 * A pattern repeats over the items, and a swatch that drew it once said
 * nothing about the shape: a pattern of a single square came out as one cell,
 * which is the one thing the gallery it stands for never looks like. Repeated
 * until the swatch is as tall as it is wide, it reads as a mosaic.
 *
 * @param {Object} props           - component props.
 * @param {string} props.value     - tiles notation.
 * @param {string} props.className - extra class of the swatch.
 * @return {Element} component.
 */
export function TilesSwatch({ value, className }) {
	const { columns, tiles } = useMemo(() => parseTiles(value), [value]);

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
		<span
			className={classnames('vp-tiles-preset__grid', className)}
			style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
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
	);
}

/**
 * The catalogue, as a grid of swatches.
 *
 * @param {Object}   props          - component props.
 * @param {Array}    props.presets  - tiles notations.
 * @param {string}   props.value    - the pattern in hand.
 * @param {Function} props.onSelect - picks a preset.
 * @return {Element} component.
 */
export function TilesPresetsGrid({ presets, value, onSelect }) {
	return (
		<div className="vp-tiles-presets">
			{presets.map((preset) => (
				<button
					key={preset}
					type="button"
					className={classnames('vp-tiles-preset', {
						'is-active': preset === value,
					})}
					aria-pressed={preset === value}
					aria-label={preset}
					onClick={() => onSelect(preset)}
				>
					<TilesSwatch value={preset} />
				</button>
			))}
		</div>
	);
}

/**
 * What the toggle of the select says about the pattern in hand.
 *
 * @param {Array}  presets - tiles notations.
 * @param {string} value   - the pattern in hand.
 * @return {string} label.
 */
function getPatternLabel(presets, value) {
	if (!presets.includes(value)) {
		return __('Custom pattern', 'visual-portfolio');
	}

	const { columns, tiles } = parseTiles(value);

	return sprintf(
		// translators: %1$s: "3 columns", %2$s: "5 tiles".
		__('%1$s, %2$s', 'visual-portfolio'),
		sprintf(
			// translators: %d: number of columns.
			_n('%d column', '%d columns', columns, 'visual-portfolio'),
			columns
		),
		sprintf(
			// translators: %d: number of tiles in the repeating pattern.
			_n('%d tile', '%d tiles', tiles.length, 'visual-portfolio'),
			tiles.length
		)
	);
}

/**
 * The presets as a select, for the settings sidebar.
 *
 * Labelled the way the editor labels its own selects: the toggle is named by
 * the label and by what it shows, so it is read as "Pattern, 3 columns, 5
 * tiles".
 *
 * @param {Object}   props          - component props.
 * @param {Array}    props.presets  - tiles notations.
 * @param {string}   props.value    - the pattern in hand.
 * @param {Function} props.onChange - picks a preset.
 * @return {Element} component.
 */
export function TilesPresetsSelect({ presets, value, onChange }) {
	const id = useInstanceId(TilesPresetsSelect, 'vp-tiles-presets-select');
	const labelId = `${id}__label`;
	const toggleId = `${id}__toggle`;

	return (
		<div className="vp-tiles-presets-select">
			<BaseControl.VisualLabel id={labelId}>
				{__('Pattern', 'visual-portfolio')}
			</BaseControl.VisualLabel>
			<Dropdown
				className="vp-tiles-presets-select__dropdown"
				contentClassName="vp-tiles-presets-popover"
				popoverProps={{ placement: 'left-start', offset: 36 }}
				renderToggle={({ isOpen, onToggle }) => (
					<Button
						id={toggleId}
						className="vp-tiles-presets-select__toggle"
						icon={chevronDown}
						iconPosition="right"
						aria-labelledby={`${labelId} ${toggleId}`}
						aria-haspopup="true"
						aria-expanded={isOpen}
						onClick={onToggle}
					>
						<TilesSwatch
							value={value}
							className="vp-tiles-presets-select__swatch"
						/>
						<span className="vp-tiles-presets-select__label">
							{getPatternLabel(presets, value)}
						</span>
					</Button>
				)}
				renderContent={({ onClose }) => (
					<TilesPresetsGrid
						presets={presets}
						value={value}
						onSelect={(preset) => {
							onChange(preset);
							onClose();
						}}
					/>
				)}
			/>
		</div>
	);
}

/**
 * The presets behind a button of the block toolbar.
 *
 * @param {Object}   props          - component props.
 * @param {Array}    props.presets  - tiles notations.
 * @param {string}   props.value    - the pattern in hand.
 * @param {Function} props.onChange - picks a preset.
 * @param {Element}  props.icon     - icon of the button.
 * @return {Element} component.
 */
export function TilesPresetsToolbarButton({ presets, value, onChange, icon }) {
	return (
		<Dropdown
			contentClassName="vp-tiles-presets-popover"
			popoverProps={{ placement: 'bottom-start' }}
			renderToggle={({ isOpen, onToggle }) => (
				<ToolbarButton
					icon={icon}
					label={__('Pattern presets', 'visual-portfolio')}
					aria-haspopup="true"
					aria-expanded={isOpen}
					onClick={onToggle}
				/>
			)}
			renderContent={({ onClose }) => (
				<TilesPresetsGrid
					presets={presets}
					value={value}
					onSelect={(preset) => {
						onChange(preset);
						onClose();
					}}
				/>
			)}
		/>
	);
}
