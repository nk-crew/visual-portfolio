import { getViewportBreakpoints } from '../../blocks/item-template/columns';
import { parseTiles } from '../../blocks/item-template/tiles';
import TilesEditor from '../../blocks/item-template/tiles-editor';
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

		// The tiles pattern of the item template, and what edits it. Pro
		// gives a tablet and a phone a pattern of their own, edited the way
		// the desktop's is, and reads the breakpoints the editor previews
		// those screens at the way the block does.
		TilesEditor,
		TilesPresetsSelect,
		parseTiles,
		getViewportBreakpoints,
	};
}
