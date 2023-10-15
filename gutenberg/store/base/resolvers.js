import * as actions from './actions';

export function* getPortfolioLayouts() {
	const query = '/visual-portfolio/v1/get_layouts/';
	const layouts = yield actions.apiFetch({ path: query });
	return actions.setPortfolioLayouts(layouts);
}
