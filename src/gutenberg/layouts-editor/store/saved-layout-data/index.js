import reducer from './reducer';
import * as selectors from './selectors';
import * as actions from './actions';
import * as controls from './controls';

const {
    registerStore,
} = wp.data;

registerStore( 'visual-portfolio/saved-layout-data', {
    reducer, selectors, actions, controls,
} );
