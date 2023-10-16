import { addFilter } from '@wordpress/hooks';

/**
 * Add list of all categories to gallery images.
 */
addFilter(
	'vpf.editor.controls-render-data',
	'vpf/editor/controls-render-data/images-categories-suggestions',
	(data) => {
		if (data.name === 'images') {
			const categories = [];

			// find all used categories.
			if (data.attributes.images && data.attributes.images.length) {
				data.attributes.images.forEach((image) => {
					if (image.categories && image.categories.length) {
						image.categories.forEach((cat) => {
							if (categories.indexOf(cat) === -1) {
								categories.push(cat);
							}
						});
					}
				});
			}

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
