/**
 * WordPress dependencies
 */
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { getImageKey } from '../loop-sources/gallery-manager/prepare-images';

// The most items the REST API returns per page.
const PER_PAGE_MAX = 100;

/**
 * Thumbnail URL of every gallery image, by image key.
 *
 * Images added in the editor carry their URLs, but a gallery can also arrive
 * from a pattern, from PHP or from another editor, holding nothing but
 * attachment ids. One request per hundred missing ones beats a request per
 * thumbnail.
 *
 * @param {Array} images - gallery images.
 * @return {Object} image key to thumbnail URL.
 */
export function usePreviewUrls(images) {
	const missingIds = useMemo(
		() =>
			images
				.filter(
					(image) =>
						image.id && !image.imgThumbnailUrl && !image.imgUrl
				)
				.map((image) => image.id),
		[images]
	);

	const attachmentPages = useSelect(
		(select) => {
			const pages = [];

			for (let i = 0; i < missingIds.length; i += PER_PAGE_MAX) {
				const include = missingIds.slice(i, i + PER_PAGE_MAX);

				pages.push(
					select(coreStore).getEntityRecords(
						'postType',
						'attachment',
						{
							include,
							per_page: include.length,
						}
					)
				);
			}

			return pages;
		},
		[missingIds]
	);

	return useMemo(() => {
		const urls = {};

		images.forEach((image) => {
			const url = image.imgThumbnailUrl || image.imgUrl;

			if (url) {
				urls[getImageKey(image)] = url;
			}
		});

		attachmentPages.forEach((attachments) => {
			(attachments || []).forEach((attachment) => {
				const sizes = attachment.media_details?.sizes || {};
				const size =
					sizes.large ||
					sizes.medium ||
					sizes.thumbnail ||
					sizes.full;

				urls[attachment.id] = size?.source_url || attachment.source_url;
			});
		});

		return urls;
	}, [images, attachmentPages]);
}
