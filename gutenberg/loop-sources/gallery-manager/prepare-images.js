const { pro: isProPlugin } = window.VPGutenbergVariables;

// Videos are only useful with the Pro formats behind them.
export const ALLOWED_MEDIA_TYPES = isProPlugin ? ['image', 'video'] : ['image'];

/**
 * A text field of a media item, whichever shape the item came in.
 *
 * The media frame answers with plain strings; an upload answers with the REST
 * record, where the description is a `{ raw, rendered }` pair.
 *
 * @param {string|Object} value - field value.
 * @return {string} text.
 */
function getText(value) {
	return 'string' === typeof value ? value : value?.raw || '';
}

/**
 * A media library item, as the gallery stores it.
 *
 * The stored shape is what PHP reads back (`imagesQuery.images` is handed to the
 * query as-is), so only `id` really matters for rendering - the URLs exist for
 * the editor previews and for the sitemap.
 *
 * The item arrives in one of two shapes: the media frame's, or the REST record
 * an upload answers with - `mime_type` for `mime`, `media_details.sizes` for
 * `sizes`, and a `{ raw, rendered }` pair for the description.
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
	if ('image/gif' !== (media.mime || media.mime_type)) {
		const sizes = media.sizes || media.media_details?.sizes || {};
		const preview = sizes.large || sizes.medium || sizes.thumbnail;
		const previewUrl = preview?.url || preview?.source_url;

		if (previewUrl) {
			image.imgThumbnailUrl = previewUrl;
		}
	}

	const title = getText(media.title);
	const description = getText(media.description);

	if (title) {
		image.title = title;
	}

	if (description) {
		image.description = description;
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
