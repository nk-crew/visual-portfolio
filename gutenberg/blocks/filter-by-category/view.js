import $ from 'jquery';

import { getLoopGallery } from '../../utils/loop-gallery';

const $doc = $(document);

$doc.on('click', '.vp-block-filter-by-category a', (e) => {
	const vpf = getLoopGallery(e.currentTarget);

	if (!vpf) {
		return;
	}

	e.preventDefault();

	vpf.loadNewItems($(e.currentTarget).attr('href'), true);
});
