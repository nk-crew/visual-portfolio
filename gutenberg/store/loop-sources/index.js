import { createReduxStore, register } from '@wordpress/data';

import * as actions from './actions';
import reducer from './reducer';
import * as selectors from './selectors';

export const LOOP_SOURCES_STORE = 'visual-portfolio/loop-sources';

const store = createReduxStore(LOOP_SOURCES_STORE, {
	reducer,
	actions,
	selectors,
});

register(store);
