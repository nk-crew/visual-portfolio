import { createReduxStore, register } from '@wordpress/data';

import * as actions from './actions';
import * as controls from './controls';
import reducer from './reducer';
import * as selectors from './selectors';

const store = createReduxStore('visual-portfolio/saved-layout-data', {
	reducer,
	selectors,
	actions,
	controls,
});

register(store);
