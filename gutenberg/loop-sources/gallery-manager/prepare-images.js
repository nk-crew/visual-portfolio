/**
 * A media library item, as the gallery stores it.
 *
 * The stored shape is what PHP reads back (`imagesQuery.images` is handed to the
 * query as-is), so only `id` really matters for rendering - the URLs exist for
 * the editor previews and for the sitemap.
 *
 * @param {Object} media - media library item.
 * @return {Object} gallery image.
 */
export function prepareImage(media) {
	const image = {
		id: media.id,
		imgUrl: media.url,
		imgThumbnailUrl: media.url,
	};

	// GIFs only animate at full size, so they keep the original URL.
	if ('image/gif' !== media.mime) {
		const sizes = media.sizes || {};
		const preview = sizes.large || sizes.medium || sizes.thumbnail;

		if (preview?.url) {
			image.imgThumbnailUrl = preview.url;
		}
	}

	if (media.title) {
		image.title = media.title;
	}

	if (media.description) {
		image.description = media.description;
	}

	return image;
}

/**
 * Merge a media library selection into the gallery.
 *
 * The order of the gallery is the user's, set by dragging - so the selection
 * only decides which images are in it. Images already there keep everything
 * that was typed into them, new ones are appended, deselected ones are dropped.
 *
 * An item with no URL is an attachment that no longer exists; letting it fall
 * out here is what keeps a deleted image from lingering in the block.
 *
 * @param {Array} selection - what the media frame returned.
 * @param {Array} images    - current gallery images.
 * @return {Array} gallery images.
 */
export function mergeSelection(selection, images) {
	const selected = (selection || []).filter((media) => media?.url);
	const selectedIds = selected.map((media) => media.id);

	const kept = images.filter((image) => selectedIds.includes(image.id));
	const added = selected
		.filter((media) => !images.some((image) => image.id === media.id))
		.map(prepareImage);

	return [...kept, ...added];
}
