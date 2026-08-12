const DEFAULT_STATE = {
	sources: [],
};

/**
 * Sources are kept as a list, so the inspector renders them in registration
 * order: the built-in ones first, then whatever Pro and third parties add.
 *
 * @param {Object} state  - store state.
 * @param {Object} action - dispatched action.
 * @return {Object} next state.
 */
export default function reducer(state = DEFAULT_STATE, action = {}) {
	if ('REGISTER_LOOP_SOURCE' === action.type) {
		const index = state.sources.findIndex(
			({ name }) => name === action.source.name
		);

		// Re-registering keeps the slot, so Pro can replace a teaser card with
		// the real source without moving it in the picker.
		const sources =
			-1 === index
				? [...state.sources, action.source]
				: state.sources.map((source, current) =>
						current === index ? action.source : source
					);

		return { ...state, sources };
	}

	return state;
}
