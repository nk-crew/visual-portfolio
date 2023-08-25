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
		// no default
	}

	return state;
}

export default reducer;
