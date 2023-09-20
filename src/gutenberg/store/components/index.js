/**
 * WordPress dependencies
 */
import { createReduxStore, register } from '@wordpress/data';

/**
 * Internal dependencies
 */
import * as selectors from './selectors';

const store = createReduxStore('visual-portfolio/components', {
	selectors,
	reducer(state) {
		return state;
	},
});

register(store);
