/**
 * Internal dependencies
 */
import * as selectors from './selectors';

const { registerStore } = wp.data;

registerStore('visual-portfolio/hooks', {
  selectors,
  reducer(state) {
    return state;
  },
});
