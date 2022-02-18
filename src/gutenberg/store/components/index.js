/**
 * Internal dependencies
 */
import * as selectors from './selectors';

const { registerStore } = wp.data;

registerStore('visual-portfolio/components', {
  selectors,
  reducer(state) {
    return state;
  },
});
