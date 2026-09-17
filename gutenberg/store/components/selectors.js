import { getViewportBreakpoints } from '../../blocks/item-template/columns';
import {
	effectRepeats,
	effectTakesColumns,
} from '../../blocks/item-template/effects';
import {
	formatTilesNumber,
	getTileStyles,
	MAX_COLUMNS,
	MAX_ROW_SPAN,
	MAX_TILES,
	parseTiles,
	serializeTiles,
} from '../../blocks/item-template/tiles';
import { TilesPresetsSelect } from '../../blocks/item-template/tiles-presets';
import ClassesTree from '../../components/classes-tree';
import ColorPicker from '../../components/color-picker';
import ControlsRender from '../../components/controls-render';
import VPDatePicker from '../../components/date-picker';
import ElementsSelector from '../../components/elements-selector';
import FocalPointControl from '../../components/focal-point-control';
import IconsSelector from '../../components/icons-selector';
import MediaPreviewCard from '../../components/media-preview-card';
import SelectControl from '../../components/select-control';
import SpinnerComponent from '../../components/spinner';
import ToggleGroupCategoryControl, {
	ToggleGroupButtonsControl,
} from '../../components/toggle-group-control';
import ToggleModal from '../../components/toggle-modal';

export function get() {
	return {
		ClassesTree,
		ColorPicker,
		ControlsRender,
		VPDatePicker,
		ElementsSelector,
		FocalPointControl,
		IconsSelector,
		MediaPreviewCard,
		SelectControl,
		SpinnerComponent,
		ToggleModal,
		ToggleGroupCategoryControl,
		ToggleGroupButtonsControl,

		// The tiles notation of the item template, and the presets it is
		// picked from. Pro's editor of a pattern is built on these - a tile
		// resized, moved or doubled on a canvas is written back as the same
		// notation - and Pro reads the breakpoints the editor previews a
		// screen at the way the block does.
		TilesPresetsSelect,
		parseTiles,
		serializeTiles,
		getTileStyles,
		formatTilesNumber,
		tilesLimits: {
			MAX_COLUMNS,
			MAX_ROW_SPAN,
			MAX_TILES,
		},
		getViewportBreakpoints,

		// What an effect of the carousel leaves to the gallery, the free
		// effects and the ones an install added alike.
		effectTakesColumns,
		effectRepeats,
	};
}
