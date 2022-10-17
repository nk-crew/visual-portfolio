/**
 * WordPress dependencies
 */
/**
 * Internal dependencies
 */
import reducer from './reducer';
import * as selectors from './selectors';
import * as actions from './actions';
import * as controls from './controls';
import * as resolvers from './resolvers';
import './components';
import './hooks';
import './utils';

const { registerStore } = wp.data;

registerStore('visual-portfolio', {
  reducer,
  selectors,
  actions,
  controls,
  resolvers,
});
