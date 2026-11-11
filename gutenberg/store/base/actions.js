export function apiFetch(request) {
	return {
		type: 'API_FETCH',
		request,
	};
}

export function setPortfolioLayouts(layouts) {
	return {
		type: 'SET_PORTFOLIO_LAYOUTS',
		layouts,
	};
}

export function setLayoutOptions(id, options) {
	return {
		type: 'SET_LAYOUT_OPTIONS',
		id,
		options,
	};
}
