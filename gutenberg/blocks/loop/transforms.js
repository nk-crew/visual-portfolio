import { createBlock } from '@wordpress/blocks';

const PER_PAGE_ALL = -1;

// The loop supports only these of the alignments core blocks carry.
const ALIGNMENTS = ['wide', 'full'];

/**
 * An item template holding the given item blocks.
 *
 * @param {Object} attributes - item template attributes.
 * @param {Array}  items      - `[ name, attributes ]` of every item block.
 * @return {Object} block.
 */
function createItemTemplate(attributes, items) {
	return createBlock(
		'visual-portfolio/item-template',
		{ layoutColumnsMode: 'manual', ...attributes },
		items.map(([name, itemAttributes]) =>
			createBlock(`visual-portfolio/${name}`, itemAttributes)
		)
	);
}

/**
 * Alignment of a core block the loop can keep.
 *
 * @param {string} align - alignment of the core block.
 * @return {Object} loop attributes.
 */
function getAlign(align) {
	return ALIGNMENTS.includes(align) ? { align } : {};
}

/**
 * Click action of the item image for a gallery's link setting.
 *
 * @param {string} linkTo - link setting of the gallery.
 * @return {string} click action.
 */
function getGalleryClickAction(linkTo) {
	if (!linkTo || 'none' === linkTo) {
		return 'none';
	}

	return 'attachment' === linkTo ? 'url' : 'popup';
}

// Orders of Latest Posts a loop names otherwise.
const LATEST_POSTS_ORDER_BY = { date: 'post_date' };

export default {
	from: [
		{
			type: 'block',
			blocks: ['core/gallery'],
			// A gallery image without an attachment has nothing a loop can
			// render, and leaving it out would lose it.
			isMatch: (attributes, block) =>
				!!block?.innerBlocks?.length &&
				block.innerBlocks.every((image) => image.attributes.id),
			transform(attributes, innerBlocks) {
				const {
					columns,
					imageCrop,
					aspectRatio,
					randomOrder,
					linkTo,
					align,
					caption: galleryCaption,
					className,
					anchor,
					style,
				} = attributes;
				const blockGap = style?.spacing?.blockGap;

				// A gallery that crops its images shows them in a grid, at the
				// ratio it sets or square. One that does not keeps each image's
				// own proportions, which is what masonry lays out.
				const isMasonry =
					false === imageCrop &&
					(!aspectRatio || 'auto' === aspectRatio);

				const images = innerBlocks
					.filter((image) => image.attributes.id)
					.map(({ attributes: image }) => {
						// A caption is rich text, whose string form is its HTML.
						const caption = String(image.caption ?? '');

						return {
							id: image.id,
							imgUrl: image.url,
							imgThumbnailUrl: image.url,
							...(caption.trim() ? { title: caption } : {}),
							...(image.alt ? { alt: image.alt } : {}),
							...(['custom', 'attachment'].includes(
								image.linkDestination
							) && image.href
								? { url: image.href }
								: {}),
						};
					});

				const items = [
					[
						'item-image',
						{
							...(isMasonry
								? {}
								: {
										aspectRatio:
											aspectRatio &&
											'auto' !== aspectRatio
												? aspectRatio
												: '1',
									}),
							// A link to the attachment page follows the image's
							// address, a link to the file opens the lightbox.
							clickAction: getGalleryClickAction(linkTo),
						},
					],
				];

				if (images.some((image) => image.title)) {
					items.push(['item-title', {}]);
				}

				const loop = createBlock(
					'visual-portfolio/loop',
					{
						...getAlign(align),
						...(className ? { className } : {}),
						...(anchor ? { anchor } : {}),
						queryType: 'images',
						// A gallery shows every image it holds.
						baseQuery: { perPage: PER_PAGE_ALL },
						imagesQuery: {
							images,
							...(randomOrder ? { orderBy: 'rand' } : {}),
						},
					},
					[
						createItemTemplate(
							{
								layoutType: isMasonry ? 'masonry' : 'grid',
								// Core's own default: up to three, never more
								// than there are images.
								layoutColumnCount:
									columns ?? Math.min(3, images.length),
								...(blockGap
									? { style: { spacing: { blockGap } } }
									: {}),
							},
							items
						),
					]
				);
				const caption = String(galleryCaption ?? '');

				// A loop has no caption of its own, so the gallery's follows it.
				return caption.trim()
					? [
							loop,
							createBlock('core/paragraph', {
								content: caption,
								align: 'center',
							}),
						]
					: loop;
			},
		},
		{
			type: 'block',
			blocks: ['core/latest-posts'],
			// A loop has no author filter, so it would show everyone's posts.
			isMatch: ({ selectedAuthor }) => !selectedAuthor,
			transform({
				postsToShow = 5,
				order = 'desc',
				orderBy = 'date',
				categories,
				layout,
				displayFeaturedImage,
				featuredImageSizeSlug = 'thumbnail',
				addLinkToFeaturedImage,
				displayAuthor,
				displayPostDate,
				displayPostContent,
				displayPostContentRadio,
				excerptLength = 55,
				align,
			}) {
				// Core's deprecations have already moved older blocks onto
				// these: categories as `{ id, value }` pairs, the grid as the
				// block's layout. A grid without a column count fills its rows
				// by a minimum column width.
				const terms = (categories || []).map(({ id }) => id);
				let columnsAttributes = { layoutColumnCount: 1 };

				if ('grid' === layout?.type && layout.columnCount) {
					columnsAttributes = {
						layoutColumnCount: layout.columnCount,
					};
				} else if ('grid' === layout?.type) {
					columnsAttributes = {
						layoutColumnsMode: 'auto',
						...(layout.minimumColumnWidth
							? {
									layoutMinimumColumnWidth:
										layout.minimumColumnWidth,
								}
							: {}),
					};
				}

				// In the order core prints them.
				const items = [
					displayFeaturedImage && [
						'item-image',
						{
							sizeSlug: featuredImageSizeSlug,
							clickAction: addLinkToFeaturedImage
								? 'url'
								: 'none',
						},
					],
					['item-title', { clickAction: 'url' }],
					displayAuthor && ['item-author', {}],
					displayPostDate && ['item-date', {}],
					displayPostContent &&
						('full_post' === displayPostContentRadio
							? ['item-description', { source: 'content' }]
							: [
									'item-description',
									{ source: 'excerpt', excerptLength },
								]),
				].filter(Boolean);

				return createBlock(
					'visual-portfolio/loop',
					{
						...getAlign(align),
						queryType: 'posts',
						baseQuery: { perPage: postsToShow },
						postsQuery: {
							source: 'post',
							order,
							orderBy: LATEST_POSTS_ORDER_BY[orderBy] ?? orderBy,
							taxonomies: terms,
						},
					},
					[
						createItemTemplate(
							{ layoutType: 'grid', ...columnsAttributes },
							items
						),
					]
				);
			},
		},
	],
};
