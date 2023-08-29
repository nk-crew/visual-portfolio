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
import * as resolvers from './resolvers';
import './components';
import './utils';

const store = createReduxStore('visual-portfolio', {
	selectors,
	actions,
	controls,
	resolvers,
	reducer,
});

register(store);
