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
	};
}
