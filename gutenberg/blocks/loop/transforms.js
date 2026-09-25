import { isBlobURL } from '@wordpress/blob';
import { createBlock, getBlockType } from '@wordpress/blocks';
import { store as coreStore } from '@wordpress/core-data';
import { select } from '@wordpress/data';

import { URL_OR_POPUP } from '../../utils/click-actions';

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
 * @param {Array}  images - attributes of the gallery's images.
 * @return {string} click action.
 */
function getGalleryClickAction(linkTo, images) {
	// An image may link somewhere of its own whatever the gallery says, and
	// only this action keeps those links beside a lightbox for the rest.
	if (
		images.some((image) => 'custom' === image.linkDestination && image.href)
	) {
		return URL_OR_POPUP;
	}

	if (!linkTo || 'none' === linkTo) {
		return 'none';
	}

	return 'attachment' === linkTo ? 'url' : 'popup';
}

// Orders of core's post lists a loop names otherwise.
const CORE_ORDER_BY = { date: 'post_date' };

/**
 * Columns of an item template for the grid layout of a core block. A grid
 * without a column count fills its rows by a minimum column width, and any
 * other layout is a list.
 *
 * @param {Object} layout - layout attribute of the core block.
 * @return {Object} item template attributes.
 */
function getColumnsAttributes(layout) {
	if ('grid' === layout?.type && layout.columnCount) {
		return { layoutColumnCount: layout.columnCount };
	}

	if ('grid' === layout?.type) {
		return {
			layoutColumnsMode: 'auto',
			...(layout.minimumColumnWidth
				? { layoutMinimumColumnWidth: layout.minimumColumnWidth }
				: {}),
		};
	}

	return { layoutColumnCount: 1 };
}

/**
 * The attributes of a core block that a block of the family has as well.
 *
 * Names the two share mean the same there, such as the size and ratio of a
 * featured image, the level of a title and the styles of block supports.
 * Bindings and locks belong to the core block.
 *
 * @param {string} name       - name of the family block.
 * @param {Object} attributes - attributes of the core block, renamed already.
 * @return {Object} attributes of the family block.
 */
function getSharedAttributes(name, attributes) {
	const known = getBlockType(name)?.attributes || {};

	return Object.fromEntries(
		Object.entries(attributes).filter(
			([key, value]) =>
				undefined !== value &&
				!['metadata', 'lock'].includes(key) &&
				key in known
		)
	);
}

/**
 * Whether a core Post Date block shows the last modified date, in the binding
 * core stores it as since 6.9 or in the attribute before it.
 *
 * @param {Object} attributes - attributes of the core block.
 * @return {boolean} whether it does.
 */
function isModifiedDate(attributes) {
	return (
		'modified' === attributes.displayType ||
		'modified' === attributes.metadata?.bindings?.datetime?.args?.field
	);
}

/**
 * Blocks of the core Query Loop and what each becomes in a loop: the name of
 * the family block and the attributes to give it.
 */
const QUERY_COUNTERPARTS = {
	'core/post-template': ({ layout, style }) => [
		'item-template',
		{
			layoutType: 'grid',
			layoutColumnsMode: 'manual',
			...getColumnsAttributes(layout),
			...(style?.spacing?.blockGap
				? { style: { spacing: { blockGap: style.spacing.blockGap } } }
				: {}),
		},
	],
	'core/post-featured-image': ({ isLink, ...attributes }) => [
		'item-image',
		{ ...attributes, clickAction: isLink ? 'url' : 'none' },
	],
	'core/post-title': ({ isLink, ...attributes }) => [
		'item-title',
		{ ...attributes, clickAction: isLink ? 'url' : 'none' },
	],
	'core/post-excerpt': (attributes) => [
		'item-description',
		{ ...attributes, source: 'excerpt' },
	],
	'core/post-date': (attributes) => [
		'item-date',
		{
			...attributes,
			displayType: isModifiedDate(attributes) ? 'modified' : 'date',
		},
	],
	'core/post-terms': ({ term, ...attributes }) => [
		'item-categories',
		{ ...attributes, taxonomy: term || '' },
	],
	'core/post-author': ({ byline, ...attributes }) => [
		'item-author',
		{ ...attributes, prefix: byline },
	],
	'core/post-author-name': (attributes) => [
		'item-author',
		{ ...attributes, showAvatar: false },
	],
	'core/read-more': ({ content, ...attributes }) => [
		'item-read-more',
		{ ...attributes, text: content },
	],
	'core/post-comments-count': (attributes) => [
		'item-meta',
		{ ...attributes, metaType: 'comments' },
	],
	'core/post-time-to-read': (attributes) => [
		'item-meta',
		{ ...attributes, metaType: 'reading-time' },
	],
	'core/query-pagination': ({ paginationArrow, ...attributes }) => [
		'loop-pagination',
		{ ...attributes, showArrow: 'none' !== paginationArrow },
	],
	'core/query-pagination-previous': (attributes) => [
		'loop-pagination-previous',
		attributes,
	],
	'core/query-pagination-numbers': (attributes) => [
		'loop-pagination-numbers',
		attributes,
	],
	'core/query-pagination-next': (attributes) => [
		'loop-pagination-next',
		attributes,
	],
	'core/query-no-results': (attributes) => ['loop-no-results', attributes],
	'core/query-total': (attributes) => ['loop-query-total', attributes],
};

/**
 * Blocks inside a core Query Loop turned into their loop counterparts, at any
 * depth. A block that reads the post and has no counterpart is left out;
 * anything else, a group or a paragraph, is kept around what it holds.
 *
 * @param {Array} blocks - inner blocks of the core block.
 * @return {Array} blocks.
 */
function convertQueryBlocks(blocks) {
	return blocks.flatMap(({ name, attributes, innerBlocks }) => {
		const counterpart = QUERY_COUNTERPARTS[name];

		if (counterpart) {
			const [loopName, loopAttributes] = counterpart(attributes);
			const fullName = `visual-portfolio/${loopName}`;

			return [
				createBlock(
					fullName,
					getSharedAttributes(fullName, loopAttributes),
					convertQueryBlocks(innerBlocks)
				),
			];
		}

		if (/^core\/(post-|comment|avatar$)/.test(name)) {
			return [];
		}

		return [createBlock(name, attributes, convertQueryBlocks(innerBlocks))];
	});
}

/**
 * Whether a loop can list the post type a core Query Loop lists: a public
 * one other than attachments, which the images source covers.
 *
 * @param {string} postType - post type of the query.
 * @return {boolean} whether it can.
 */
function isLoopPostType(postType) {
	return (
		'attachment' !== postType &&
		!!select(coreStore)
			.getPostTypes({ per_page: -1 })
			?.some(({ slug, viewable }) => slug === postType && viewable)
	);
}

/**
 * Terms of a core Query Loop's taxonomy query, by taxonomy. Before 6.9 the
 * query held the included terms alone, keyed by taxonomy.
 *
 * @param {Object} taxQuery - `query.taxQuery` of the core block.
 * @return {{include: Object, exclude: Object}} term ids by taxonomy.
 */
function getTaxQuery(taxQuery) {
	if (!taxQuery || taxQuery.include || taxQuery.exclude) {
		return {
			include: taxQuery?.include || {},
			exclude: taxQuery?.exclude || {},
		};
	}

	return { include: taxQuery, exclude: {} };
}

/**
 * The posts query of a loop for the query of a core Query Loop.
 *
 * @param {Object} query - `query` of the core block.
 * @return {Object} `postsQuery` of the loop.
 */
function getPostsQuery(query) {
	const defaults = getBlockType('visual-portfolio/loop')?.attributes
		?.postsQuery?.default;

	if (query.inherit) {
		return { ...defaults, source: 'current_query' };
	}

	const { include, exclude } = getTaxQuery(query.taxQuery);
	const included = Object.values(include).filter((ids) => ids?.length);
	const authors = String(query.author || '')
		.split(',')
		.map((id) => parseInt(id, 10))
		.filter((id) => id > 0);
	const orderBy = query.orderBy || 'date';

	return {
		...defaults,
		source: query.postType || 'post',
		order: query.order || 'desc',
		orderBy: CORE_ORDER_BY[orderBy] ?? orderBy,
		offset: query.offset || 0,
		taxonomies: included.flat(),
		// Core joins the terms of one taxonomy by OR and the taxonomies by
		// AND, and a loop joins all its terms one way. AND holds that only
		// where every taxonomy names one term.
		taxonomiesRelation:
			1 < included.length && included.every((ids) => 1 === ids.length)
				? 'and'
				: 'or',
		excludeTaxonomies: Object.values(exclude).flat(),
		authors,
		sticky: query.sticky || '',
		formats: query.format || [],
		keyword: query.search || '',
		excludeIds: query.exclude || [],
		excludeCurrent: !!query.excludeCurrent,
	};
}

export default {
	from: [
		{
			type: 'block',
			blocks: ['core/gallery'],
			// An image from outside the library is kept by its address; one
			// still uploading has nothing yet a loop could keep.
			isMatch: (attributes, block) =>
				!!block?.innerBlocks?.length &&
				block.innerBlocks.every(
					({ attributes: image }) =>
						image.url && (image.id || !isBlobURL(image.url))
				),
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

				// The `width` and `height` of an image are the size it is shown
				// at, not the size of the picture, so they are left behind.
				const images = innerBlocks.map(({ attributes: image }) => {
					// A caption is rich text, whose string form is its HTML.
					const caption = String(image.caption ?? '');

					return {
						...(image.id ? { id: image.id } : {}),
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
							clickAction: getGalleryClickAction(
								linkTo,
								innerBlocks.map(
									({ attributes: image }) => image
								)
							),
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
			transform({
				postsToShow = 5,
				order = 'desc',
				orderBy = 'date',
				categories,
				selectedAuthor,
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
				// block's layout.
				const terms = (categories || []).map(({ id }) => id);

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
							orderBy: CORE_ORDER_BY[orderBy] ?? orderBy,
							taxonomies: terms,
							...(selectedAuthor
								? { authors: [selectedAuthor] }
								: {}),
							// Latest Posts lists by date alone.
							sticky: 'ignore',
						},
					},
					[
						createItemTemplate(
							{
								layoutType: 'grid',
								...getColumnsAttributes(layout),
							},
							items
						),
					]
				);
			},
		},
		{
			type: 'block',
			blocks: ['core/query'],
			// A current query lists whatever the page lists.
			isMatch: ({ query }) =>
				!!query?.inherit || isLoopPostType(query?.postType || 'post'),
			transform({ query = {}, align, className, anchor }, innerBlocks) {
				return createBlock(
					'visual-portfolio/loop',
					{
						...getAlign(align),
						...(className ? { className } : {}),
						...(anchor ? { anchor } : {}),
						queryType: 'posts',
						baseQuery: {
							...getBlockType('visual-portfolio/loop')?.attributes
								?.baseQuery?.default,
							// Without a count core lists as many as the Reading
							// settings say, which the loop has no way to
							// follow. A current query pages as the page does.
							...(!query.inherit && query.perPage
								? { perPage: query.perPage }
								: {}),
							maxPagesLimit: query.pages || 0,
						},
						postsQuery: getPostsQuery(query),
					},
					convertQueryBlocks(innerBlocks)
				);
			},
		},
	],
};
