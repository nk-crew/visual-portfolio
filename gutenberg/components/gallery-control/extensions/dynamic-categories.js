import { addFilter } from '@wordpress/hooks';

import getAllCategories from '../utils/get-all-categories';

/**
 * Add list of all categories to gallery images.
 */
addFilter(
	'vpf.editor.controls-render-data',
	'vpf/editor/controls-render-data/images-categories-suggestions',
	(data) => {
		if (data.name === 'images') {
			const categories = getAllCategories(data.attributes.images);

			if (
				categories.length &&
				data.image_controls &&
				data.image_controls.categories &&
				data.image_controls.categories.options
			) {
				data.image_controls.categories.options = categories.map(
					(val) => ({
						label: val,
						value: val,
					})
				);
			}
		}

		return data;
	}
);
