import domReady from '@wordpress/dom-ready';
import { createRoot } from '@wordpress/element';

import SavedLayoutsLibrary from './library';

domReady(() => {
	const root = document.getElementById('vpf-saved-layouts');

	if (root) {
		createRoot(root).render(<SavedLayoutsLibrary />);
	}
});
