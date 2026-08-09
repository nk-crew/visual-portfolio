const { VPSavedLayoutVariables } = window;

export function getBlockData(state) {
	return state.data || VPSavedLayoutVariables.data;
}
