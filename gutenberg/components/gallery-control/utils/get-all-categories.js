export default function getAllCategories(images) {
	const categories = [];

	// find all used categories.
	if (images?.length) {
		images.forEach((image) => {
			if (image.categories && image.categories.length) {
				image.categories.forEach((cat) => {
					if (categories.indexOf(cat) === -1) {
						categories.push(cat);
					}
				});
			}
		});
	}

	return categories;
}
