/**
 * WordPress dependencies
 */
import { createReduxStore, register } from '@wordpress/data';

/**
 * Internal dependencies
 */
import reducer from './reducer';
import * as selectors from './selectors';
import * as actions from './actions';
import * as controls from './controls';

const store = createReduxStore('visual-portfolio/saved-layout-data', {
	reducer,
	selectors,
	actions,
	controls,
});

register(store);
