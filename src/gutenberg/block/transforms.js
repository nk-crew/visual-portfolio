/**
 * WordPress dependencies
 */
const {
    createBlock,
} = wp.blocks;

export default {
    from: [
        // Transform from default Gallery block.
        {
            type: 'block',
            blocks: [ 'core/gallery' ],
            isMatch( attributes ) {
                return attributes && attributes.images && attributes.images.length;
            },
            transform( attributes ) {
                const {
                    className,
                } = attributes;

                const images = attributes.images.map( ( img ) => ( {
                    id: parseInt( img.id, 10 ),
                    imgUrl: img.fullUrl,
                    imgThumbnailUrl: img.url,
                    title: img.caption,
                } ) );

                return createBlock( 'visual-portfolio/block', {
                    content_source: 'images',
                    items_count: -1,
                    layout: 'masonry',
                    items_style_fly__align: 'bottom-center',
                    masonry_columns: parseInt( attributes.columns, 10 ) || 3,
                    items_click_action: 'none' === attributes.linkTo ? 'false' : 'url',
                    images,
                    className,
                } );
            },
        },

        // Transform from default Latest Posts block.
        {
            type: 'block',
            blocks: [ 'core/latest-posts' ],
            transform( attributes ) {
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

                return createBlock( 'visual-portfolio/block', {
                    content_source: 'post-based',
                    posts_source: 'post',
                    posts_order_by: orderBy,
                    posts_order_direction: order,
                    posts_taxonomies: categories ? [ categories ] : false,
                    items_count: postsToShow,
                    layout: 'grid',
                    grid_columns: 'grid' === postLayout ? columns : 1,
                    items_style: 'default',
                    items_style_default__show_categories: false,
                    items_style_default__show_date: displayPostDate ? 'true' : 'false',
                    items_style_default__show_excerpt: displayPostContent,
                    items_style_default__excerpt_words_count: 'full_post' === displayPostContentRadio ? 100 : excerptLength,
                    items_style_default__align: 'left',
                    items_style_default__show_read_more: displayPostContent ? 'true' : 'false',
                    className,
                } );
            },
        },
    ],
};
