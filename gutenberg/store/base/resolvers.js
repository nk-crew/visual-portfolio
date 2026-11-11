import * as actions from './actions';

export function* getPortfolioLayouts() {
	const query = '/visual-portfolio/v1/get_layouts/';
	const layouts = yield actions.apiFetch({ path: query });
	return actions.setPortfolioLayouts(layouts);
}

export function* getLayoutOptions(id) {
	const options = yield actions.apiFetch({
		path: `/visual-portfolio/v1/get_layout/?id=${parseInt(id, 10)}`,
	});
	return actions.setLayoutOptions(id, options);
}
