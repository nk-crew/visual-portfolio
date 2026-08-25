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

		// Re-registering merges over the slot rather than taking it, so Pro can
		// turn a teaser card into the real source by naming only what it adds:
		// the card keeps its place in the picker and its icon, and the drawing
		// of a source lives in one plugin instead of two.
		const sources =
			-1 === index
				? [...state.sources, action.source]
				: state.sources.map((source, current) =>
						current === index
							? { ...source, ...action.source }
							: source
					);

		return { ...state, sources };
	}

	return state;
}
