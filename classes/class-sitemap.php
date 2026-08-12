<?php
/**
 * Supported Images in Sitemap (SEO).
 *
 * @package visual-portfolio/sitemap
 */

/**
 * Visual_Portfolio_Sitemap class
 */
class Visual_Portfolio_Sitemap {
	/**
	 * Visual_Portfolio_Sitemap constructor.
	 */
	public function __construct() {
		add_filter( 'aioseo_sitemap_posts', array( $this, 'add_images_to_aioseo_sitemap' ), 10, 1 );
		add_filter( 'rank_math/sitemap/urlimages', array( $this, 'add_images_to_sitemap' ), 10, 2 );
		add_filter( 'wpseo_sitemap_urlimages', array( $this, 'add_images_to_sitemap' ), 10, 2 );
	}

	/**
	 * Add sitemap entries for All In One SEO.
	 *
	 * @param array $entries - Sitemap entries.
	 *
	 * @return array
	 */
	public function add_images_to_aioseo_sitemap( $entries ) {
		if ( is_array( $entries ) ) {
			foreach ( $entries as &$entry ) {
				$post_permalink = $entry['loc'];
				$post_id        = url_to_postid( $post_permalink );
				$images         = isset( $entry['images'] ) ? $entry['images'] : array();

				if ( 0 === $post_id ) {
					$archive_page = Visual_Portfolio_Settings::get_option( 'portfolio_archive_page', 'vp_general' );

					if ( get_permalink( $archive_page ) === $post_permalink ) {
						$post_id = $archive_page;
					}
				}

				$block_images = $this->parse_images_from_blocks( $post_id );

				if ( ! empty( $block_images ) ) {
					foreach ( $block_images as $image ) {
						$images[] = (object) array(
							'image:loc'     => $image['src'],
							'image:caption' => $image['alt'],
							'image:title'   => $image['title'],
						);
					}
				}

				$entry['images'] = $images;
			}
		}

		return $entries;
	}

	/**
	 * Add sitemap images for Rank Math and Yoast SEO.
	 *
	 * @param array $images - Sitemap Images for current Post.
	 * @param int   $post_id - Post ID.
	 * @return array
	 */
	public function add_images_to_sitemap( $images, $post_id ) {
		$block_images = $this->parse_images_from_blocks( $post_id );
		if ( ! empty( $block_images ) ) {
			$images = array_merge( $images, $block_images );
		}

		return $images;
	}

	/**
	 * Every block of a post, nested ones included.
	 *
	 * A gallery is as often inside a group, a column or a template part as it is
	 * at the top of a post, and a sitemap that only looked at the first level
	 * would silently skip those.
	 *
	 * @param array $blocks - parsed blocks.
	 *
	 * @return array
	 */
	private function flatten_blocks( $blocks ) {
		$flat = array();

		foreach ( $blocks as $block ) {
			if ( ! is_array( $block ) ) {
				continue;
			}

			$flat[] = $block;

			if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
				$flat = array_merge( $flat, $this->flatten_blocks( $block['innerBlocks'] ) );
			}
		}

		return $flat;
	}

	/**
	 * Sitemap entries for the images of an `images` source.
	 *
	 * @param array $images - images of the gallery, in the stored format.
	 *
	 * @return array
	 */
	private function get_source_images( $images ) {
		$block_images = array();

		if ( ! is_array( $images ) ) {
			return $block_images;
		}

		foreach ( $images as $image ) {
			if ( ! is_array( $image ) || ! isset( $image['id'] ) ) {
				continue;
			}

			$image_id = $image['id'];

			$image_alt = '';

			if ( isset( $image['alt'] ) && '' !== trim( (string) $image['alt'] ) ) {
				$image_alt = trim( (string) $image['alt'] );
			} elseif ( isset( $image['description'] ) && '' !== trim( (string) $image['description'] ) ) {
				$image_alt = trim( (string) $image['description'] );
			} else {
				$image_alt = get_post_meta( $image_id, '_wp_attachment_image_alt', true ) ?? '';
			}

			$image_title = $image['title'] ?? get_the_title( $image_id );

			$image_url = $image['imgUrl'] ?? wp_get_attachment_image_url( $image_id, 'full' );

			$block_images[] = array(
				'src'   => $image_url,
				'alt'   => $image_alt,
				'title' => $image_title,
			);
		}

		return $block_images;
	}

	/**
	 * Sitemap entries for the featured images of a `post-based` source.
	 *
	 * @param array $options - gallery options in the legacy format.
	 *
	 * @return array
	 */
	private function get_post_images( $options ) {
		$block_images = array();

		if ( ! isset( $options['posts_source'] ) ) {
			return $block_images;
		}

		$query_opts = Visual_Portfolio_Get::get_query_params( $options, false, $options['id'] );

		$portfolio_query = new WP_Query( $query_opts );

		while ( $portfolio_query->have_posts() ) {
			$portfolio_query->the_post();

			$image_id = apply_filters( 'vpf_parse_sitemap_image_id_from_blocks', 'attachment' === get_post_type() ? get_the_ID() : get_post_thumbnail_id( get_the_ID() ), get_the_ID() );

			$image_alt = get_post_meta( $image_id, '_wp_attachment_image_alt', true );

			$block_images[] = array(
				'src'   => wp_get_attachment_image_url( $image_id, 'full' ),
				'alt'   => $image_alt,
				'title' => get_the_title( $image_id ),
			);
		}
		$portfolio_query->reset_postdata();

		// Sometimes, when we use WPBakery Page Builder, without this reset output is wrong.
		wp_reset_postdata();

		return $block_images;
	}

	/**
	 * Whether a Gallery Loop puts pictures on the page at all.
	 *
	 * A loop composed of titles and categories shows no image, and its source
	 * has nothing to tell a sitemap about this page.
	 *
	 * @param array $block - parsed loop block.
	 *
	 * @return bool
	 */
	private function loop_renders_images( $block ) {
		$inner = empty( $block['innerBlocks'] ) || ! is_array( $block['innerBlocks'] ) ? array() : $block['innerBlocks'];

		foreach ( $this->flatten_blocks( $inner ) as $child ) {
			if ( in_array( $child['blockName'], array( 'visual-portfolio/item-image', 'visual-portfolio/item-cover' ), true ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Parse block images.
	 *
	 * @param  int $post_id - Post ID.
	 * @return array
	 */
	private function parse_images_from_blocks( $post_id ) {
		$block_images = array();

		if ( $post_id <= 0 ) {
			return apply_filters( 'vpf_parse_sitemap_images_from_blocks', $block_images, $post_id );
		}

		$post = get_post( $post_id );

		if ( ! $post ) {
			return apply_filters( 'vpf_parse_sitemap_images_from_blocks', $block_images, $post_id );
		}

		$blocks = $this->flatten_blocks( parse_blocks( $post->post_content ) );

		foreach ( $blocks as $block ) {
			$block_attrs = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();

			// The Gallery Loop family. Its attributes are the modern ones, and
			// only the images sources are worth listing: a posts source shows
			// pictures that belong to the posts themselves, and those posts are
			// in the sitemap already with the very same featured images.
			if ( 'visual-portfolio/loop' === $block['blockName'] ) {
				if ( ! $this->loop_renders_images( $block ) ) {
					continue;
				}

				$options = Visual_Portfolio_Convert_Attributes::modern_to_legacy( $block_attrs, true );

				if ( 'images' === ( $options['content_source'] ?? '' ) ) {
					$block_images = array_merge( $block_images, $this->get_source_images( $options['images'] ?? array() ) );
				}

				continue;
			}

			if (
				'visual-portfolio/block' !== $block['blockName'] &&
				'visual-portfolio/saved' !== $block['blockName'] &&
				'nk/visual-portfolio' !== $block['blockName']
			) {
				continue;
			}

			$options = Visual_Portfolio_Get::get_options( $block_attrs );

			if ( ! is_array( $options ) ) {
				$options = array();
			}

			$content_source = $options['content_source'] ?? ( $block_attrs['content_source'] ?? '' );

			switch ( $content_source ) {
				case 'post-based':
					$block_images = array_merge( $block_images, $this->get_post_images( $options ) );
					break;
				case 'images':
					$block_images = array_merge( $block_images, $this->get_source_images( $options['images'] ?? ( $block_attrs['images'] ?? array() ) ) );
					break;
			}
		}

		return apply_filters( 'vpf_parse_sitemap_images_from_blocks', $block_images, $post_id );
	}
}
new Visual_Portfolio_Sitemap();
