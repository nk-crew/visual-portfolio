import ColorPicker from '../../components/color-picker';
import ClassesTree from '../../components/classes-tree';
import VPDatePicker from '../../components/date-picker';
import ElementsSelector from '../../components/elements-selector';
import IconsSelector from '../../components/icons-selector';
import VpfSelectControl from '../../components/select-control';
import SpinnerComponent from '../../components/spinner';
import ToggleModal from '../../components/toggle-modal';
import ControlsRender from '../../components/controls-render';

export function get() {
	return {
		ColorPicker,
		ClassesTree,
		ControlsRender,
		VPDatePicker,
		ElementsSelector,
		IconsSelector,
		VpfSelectControl,
		SpinnerComponent,
		ToggleModal,
	};
}
