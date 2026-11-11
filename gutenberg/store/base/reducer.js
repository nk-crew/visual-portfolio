function reducer(state = { layouts: [] }, action = {}) {
	switch (action.type) {
		case 'SET_PORTFOLIO_LAYOUTS':
			if (
				!state.layouts.length &&
				action.layouts &&
				action.layouts.length
			) {
				state.layouts = action.layouts;
			}
			return state;
		case 'SET_LAYOUT_OPTIONS':
			return {
				...state,
				layoutOptions: {
					...state.layoutOptions,
					[action.id]: action.options,
				},
			};
		// no default
	}

	return state;
}

export default reducer;
