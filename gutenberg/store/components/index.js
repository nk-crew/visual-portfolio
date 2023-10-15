import { createReduxStore, register } from '@wordpress/data';

import * as selectors from './selectors';

const store = createReduxStore('visual-portfolio/components', {
	selectors,
	reducer(state) {
		return state;
	},
});

register(store);
