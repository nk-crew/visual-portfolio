import { createBlock } from '@wordpress/blocks';

export default {
	from: [
		// Transform from default Gallery block.
		{
			type: 'block',
			blocks: ['core/gallery'],
			isMatch(attributes, blockData) {
				return (
					(blockData &&
						blockData.innerBlocks &&
						blockData.innerBlocks.length) ||
					(attributes &&
						attributes.images &&
						attributes.images.length)
				);
			},
			transform(attributes, innerBlocks) {
				const { className } = attributes;

				// New gallery since WordPress 5.9
				const isNewGallery = innerBlocks && innerBlocks.length;
				let images = [];

				if (isNewGallery) {
					images = innerBlocks.map((img) => ({
						id: parseInt(img.attributes.id, 10),
						imgUrl: img.attributes.url,
						imgThumbnailUrl: img.attributes.url,
						title: img.attributes.caption,
						url:
							(img.attributes.linkDestination === 'custom' ||
								img.attributes.linkDestination ===
									'attachment') &&
							img.attributes.href
								? img.attributes.href
								: '',
					}));
				} else {
					images = attributes.images.map((img) => ({
						id: parseInt(img.id, 10),
						imgUrl: img.fullUrl,
						imgThumbnailUrl: img.url,
						title: img.caption,
					}));
				}

				return createBlock('visual-portfolio/block', {
					setup_wizard: 'false',
					content_source: 'images',
					items_count: -1,
					layout: 'masonry',
					items_style_fly__align: 'bottom-center',
					masonry_columns: parseInt(attributes.columns, 10) || 3,
					items_click_action:
						attributes.linkTo === 'none' && !isNewGallery
							? 'false'
							: 'url',
					images,
					className,
				});
			},
		},

		// Transform from default Latest Posts block.
		{
			type: 'block',
			blocks: ['core/latest-posts'],
			transform(attributes) {
				const {
					className,
					postLayout,
					columns = 3,
					postsToShow = 6,
					displayPostContent,
					displayPostContentRadio,
					excerptLength,
					displayPostDate,
					orderBy = 'date',
					order = 'desc',
					categories,
				} = attributes;

				return createBlock('visual-portfolio/block', {
					content_source: 'post-based',
					posts_source: 'post',
					posts_order_by: orderBy,
					posts_order_direction: order,
					posts_taxonomies: categories ? [categories] : false,
					items_count: postsToShow,
					layout: 'grid',
					grid_columns: postLayout === 'grid' ? columns : 1,
					items_style: 'default',
					items_style_default__show_categories: false,
					items_style_default__show_date: displayPostDate
						? 'true'
						: 'false',
					items_style_default__show_excerpt: displayPostContent,
					items_style_default__excerpt_words_count:
						displayPostContentRadio === 'full_post'
							? 100
							: excerptLength,
					items_style_default__align: 'left',
					items_style_default__show_read_more: displayPostContent
						? 'true'
						: 'false',
					className,
				});
			},
		},
	],
};
