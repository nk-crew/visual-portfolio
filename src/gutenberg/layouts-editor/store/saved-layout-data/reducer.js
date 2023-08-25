const { VPSavedLayoutVariables } = window;

function reducer(state = { data: VPSavedLayoutVariables.data }, action = {}) {
	switch (action.type) {
		case 'SET_BLOCK_DATA':
			if (action.data) {
				if (state) {
					return {
						...state,
						data: action.data,
					};
				}
				return action;
			}

			break;
		case 'UPDATE_BLOCK_DATA':
			if (action.data && state) {
				return {
					...state,
					data: {
						...state.data,
						...action.data,
					},
				};
			}

			break;
		// no default
	}

	return state;
}

export default reducer;
