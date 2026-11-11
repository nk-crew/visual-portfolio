<?php
/**
 * A Gallery Loop seen from outside the editor: found in a post, described in
 * plain words, built from a layout and changed without opening the editor.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual_Portfolio_Loop_Gallery
 */
class Visual_Portfolio_Loop_Gallery {
	const LOOP       = 'visual-portfolio/loop';
	const TEMPLATE   = 'visual-portfolio/item-template';
	const PAGINATION = 'visual-portfolio/loop-pagination';

	/**
	 * Blocks whose click action follows the source, as in
	 * `gutenberg/blocks/loop/layout-defaults.js`.
	 *
	 * @var array
	 */
	const CLICKABLE = array( 'visual-portfolio/item-image', 'visual-portfolio/item-cover' );

	/**
	 * Layouts whose columns come from somewhere else than a column count.
	 *
	 * @var array
	 */
	const NO_COLUMNS = array( 'tiles', 'justified' );

	/**
	 * Sources and settings the abilities accept.
	 *
	 * @return array
	 */
	public static function get_vocabulary() {
		$is_pro  = visual_portfolio()->is_pro();
		$sources = array(
			'images' => array(
				'label'        => __( 'Images', 'visual-portfolio' ),
				'description'  => __( 'Images from the Media Library, in the order given. Each item takes `id` (an image attachment id) and optional `title`, `description`, `alt` and `link`.', 'visual-portfolio' ),
				'available'    => true,
				'requires_pro' => false,
			),
			'posts'  => array(
				'label'        => __( 'Posts', 'visual-portfolio' ),
				'description'  => __( 'Posts of one post type, shown by their featured image. Takes `post_type`, `ids` for a manual selection, `terms` (term ids), `order_by` and `order`.', 'visual-portfolio' ),
				'available'    => true,
				'requires_pro' => false,
			),
		);

		// The sources `gutenberg/loop-sources/pro-sources.js` advertises without Pro.
		if ( ! $is_pro ) {
			$sources['taxonomies']    = array(
				'label'        => __( 'Taxonomies', 'visual-portfolio' ),
				'description'  => __( 'Display taxonomy archives such as categories, tags, and custom taxonomies.', 'visual-portfolio' ),
				'available'    => false,
				'requires_pro' => true,
			);
			$sources['social-stream'] = array(
				'label'        => __( 'Social', 'visual-portfolio' ),
				'description'  => __( 'Display social feeds such as Instagram, YouTube, Flickr, X, etc…', 'visual-portfolio' ),
				'available'    => false,
				'requires_pro' => true,
			);
		}

		$vocabulary = array(
			'sources'  => $sources,
			'settings' => array(
				'columns'  => array(
					'description' => __( 'Number of columns on grid, masonry and carousel layouts. Tiles and justified layouts ignore it.', 'visual-portfolio' ),
					'schema'      => array(
						'type'    => 'integer',
						'minimum' => 1,
						'maximum' => 12,
					),
				),
				'per_page' => array(
					'description' => __( 'Items per page, or -1 for all of them on one page.', 'visual-portfolio' ),
					'schema'      => array(
						'type'    => 'integer',
						'minimum' => -1,
						'maximum' => 100,
					),
				),
				'lightbox' => array(
					'description' => __( 'Whether a click on a picture opens it in the lightbox. Off, a picture of an images gallery opens nothing and a post opens its page.', 'visual-portfolio' ),
					'schema'      => array(
						'type' => 'boolean',
					),
				),
			),
		);

		/**
		 * Filter the sources and settings the gallery abilities accept.
		 *
		 * A source is `type => array( label, description, available,
		 * requires_pro, schema )`, `schema` being the JSON schema of the
		 * fields it takes besides `type`. A setting is `key => array(
		 * description, schema )`. Whatever is added here is applied through
		 * `vpf_gallery_ability_apply`.
		 *
		 * @param array $vocabulary `sources` and `settings`.
		 */
		return apply_filters( 'vpf_gallery_ability_vocabulary', $vocabulary );
	}

	/**
	 * Layouts: the block patterns registered for the loop.
	 *
	 * @return array slug => array( title, description, source, content ).
	 */
	public static function get_layouts() {
		$layouts = array();

		foreach ( WP_Block_Patterns_Registry::get_instance()->get_all_registered() as $pattern ) {
			if ( ! in_array( self::LOOP, $pattern['blockTypes'] ?? array(), true ) ) {
				continue;
			}

			$found = self::find_loops( parse_blocks( $pattern['content'] ?? '' ) );

			if ( empty( $found ) ) {
				continue;
			}

			$layouts[ $pattern['name'] ] = array(
				'title'       => $pattern['title'] ?? $pattern['name'],
				'description' => $pattern['description'] ?? '',
				'source'      => $found[0]['block']['attrs']['queryType'] ?? 'posts',
				'loop'        => $found[0]['block'],
			);
		}

		return $layouts;
	}

	/**
	 * Every loop in a block tree, with the path of indexes that leads to it.
	 *
	 * @param array $blocks - parsed blocks.
	 * @param array $path - path of the blocks given.
	 *
	 * @return array list of array( path, block ).
	 */
	public static function find_loops( $blocks, $path = array() ) {
		$found = array();

		foreach ( $blocks as $index => $block ) {
			$block_path = array_merge( $path, array( $index ) );

			if ( self::LOOP === $block['blockName'] ) {
				$found[] = array(
					'path'  => $block_path,
					'block' => $block,
				);
				continue;
			}

			if ( ! empty( $block['innerBlocks'] ) ) {
				$found = array_merge( $found, self::find_loops( $block['innerBlocks'], $block_path ) );
			}
		}

		return $found;
	}

	/**
	 * Id of the n-th loop of a post: its `block_id`, or its position when it
	 * was saved without one.
	 *
	 * @param array $loop - loop block.
	 * @param int   $index - 0-based position among the loops of the post.
	 *
	 * @return string
	 */
	public static function get_gallery_id( $loop, $index ) {
		$block_id = $loop['attrs']['block_id'] ?? '';

		return '' !== $block_id ? (string) $block_id : 'loop-' . ( $index + 1 );
	}

	/**
	 * The loop a gallery id names.
	 *
	 * @param array  $blocks - parsed blocks of the post.
	 * @param string $gallery_id - gallery id.
	 *
	 * @return array|null array( path, block ).
	 */
	public static function find_loop( $blocks, $gallery_id ) {
		foreach ( self::find_loops( $blocks ) as $index => $found ) {
			if ( self::get_gallery_id( $found['block'], $index ) === (string) $gallery_id ) {
				return $found;
			}
		}

		return null;
	}

	/**
	 * A loop in the words of the abilities.
	 *
	 * @param array $loop - loop block.
	 *
	 * @return array
	 */
	public static function describe( $loop ) {
		$attrs      = $loop['attrs'];
		$query_type = $attrs['queryType'] ?? 'posts';
		$template   = self::find_block( $loop['innerBlocks'], self::TEMPLATE );
		$t_attrs    = $template ? $template['attrs'] : array();
		$layout     = $t_attrs['layoutType'] ?? 'grid';
		$source     = array( 'type' => $query_type );

		if ( 'images' === $query_type ) {
			$source['images'] = array_map( array( __CLASS__, 'describe_image' ), $attrs['imagesQuery']['images'] ?? array() );
		} elseif ( 'posts' === $query_type ) {
			$posts_query = $attrs['postsQuery'] ?? array();
			$posts_type  = $posts_query['source'] ?? 'portfolio';

			$source['post_type'] = $posts_type;
			$source['ids']       = array_map( 'intval', $posts_query['ids'] ?? array() );
			$source['terms']     = array_map( 'intval', $posts_query['taxonomies'] ?? array() );
			$source['order_by']  = $posts_query['orderBy'] ?? 'post_date';
			$source['order']     = $posts_query['order'] ?? 'desc';
		} else {
			$source['settings'] = $attrs['sourceQuery'] ?? array();
		}

		$settings = array(
			'per_page' => (int) ( $attrs['baseQuery']['perPage'] ?? 6 ),
			'lightbox' => self::has_lightbox( $loop['innerBlocks'] ),
		);

		if ( ! in_array( $layout, self::NO_COLUMNS, true ) ) {
			$settings['columns'] = (int) ( $t_attrs['layoutColumnCount'] ?? 3 );
		}

		return array(
			'layout_type' => $layout,
			'source'      => $source,
			'settings'    => $settings,
		);
	}

	/**
	 * A gallery image in the words of the abilities.
	 *
	 * @param array $image - stored image.
	 *
	 * @return array
	 */
	private static function describe_image( $image ) {
		$described = array( 'id' => (int) ( $image['id'] ?? 0 ) );

		foreach ( array(
			'title'       => 'title',
			'description' => 'description',
			'alt'         => 'alt',
			'link'        => 'url',
		) as $key => $stored ) {
			if ( isset( $image[ $stored ] ) && '' !== $image[ $stored ] ) {
				$described[ $key ] = (string) $image[ $stored ];
			}
		}

		return $described;
	}

	/**
	 * A new loop: the loop of a layout, with a source and settings.
	 *
	 * @param string $layout - layout slug.
	 * @param array  $input - `source` and `settings`.
	 * @param array  $blocks - parsed blocks of the post it goes into.
	 *
	 * @return array|WP_Error loop block.
	 */
	public static function create( $layout, $input, $blocks ) {
		$layouts = self::get_layouts();

		if ( ! isset( $layouts[ $layout ] ) ) {
			return self::unknown_layout( $layout, $layouts );
		}

		$loop = $layouts[ $layout ]['loop'];

		$loop['attrs']['block_id'] = self::get_free_block_id( $blocks );
		$loop['attrs']['queryId']  = self::get_free_query_id( $blocks );

		return self::apply( $loop, $input, 'create' );
	}

	/**
	 * A changed loop.
	 *
	 * @param array $loop - loop block.
	 * @param array $input - `layout`, `source`, `settings` and the image operations.
	 * @param array $blocks - parsed blocks of the post it is in.
	 *
	 * @return array|WP_Error loop block.
	 */
	public static function update( $loop, $input, $blocks ) {
		if ( empty( $loop['attrs']['block_id'] ) ) {
			$loop['attrs']['block_id'] = self::get_free_block_id( $blocks );
		}

		if ( empty( $loop['attrs']['queryId'] ) ) {
			$loop['attrs']['queryId'] = self::get_free_query_id( $blocks );
		}

		if ( isset( $input['layout'] ) ) {
			$layouts = self::get_layouts();

			if ( ! isset( $layouts[ $input['layout'] ] ) ) {
				return self::unknown_layout( $input['layout'], $layouts );
			}

			$loop = self::set_inner_blocks( $loop, $layouts[ $input['layout'] ]['loop']['innerBlocks'] );
		}

		if ( isset( $input['add_images'] ) || isset( $input['remove_images'] ) || isset( $input['order'] ) ) {
			$type = $input['source']['type'] ?? ( $loop['attrs']['queryType'] ?? 'posts' );

			if ( 'images' !== $type ) {
				return new WP_Error(
					'vpf_not_images_gallery',
					__( 'Images can be added, removed or reordered only in a gallery whose source is `images`.', 'visual-portfolio' )
				);
			}
		}

		return self::apply( $loop, $input, 'update' );
	}

	/**
	 * Apply a source, the layout defaults, settings and image operations.
	 *
	 * @param array  $loop - loop block.
	 * @param array  $input - ability input.
	 * @param string $action - `create` or `update`.
	 *
	 * @return array|WP_Error loop block.
	 */
	private static function apply( $loop, $input, $action ) {
		$source = $input['source'] ?? null;

		if ( $source ) {
			$loop = self::apply_source( $loop, $source );

			if ( is_wp_error( $loop ) ) {
				return $loop;
			}
		}

		if ( 'create' === $action || $source || isset( $input['layout'] ) ) {
			$loop = self::apply_layout_defaults( $loop );
		}

		$loop = self::apply_images( $loop, $input );
		$loop = self::apply_settings( $loop, $input['settings'] ?? array() );

		/**
		 * Filter a loop an ability built or changed.
		 *
		 * Runs after the free plugin applied what it knows of the input, so a
		 * source type or a setting added through
		 * `vpf_gallery_ability_vocabulary` is applied here.
		 *
		 * @param array  $loop   Parsed loop block.
		 * @param array  $input  Ability input.
		 * @param string $action `create` or `update`.
		 */
		$loop = apply_filters( 'vpf_gallery_ability_apply', $loop, $input, $action );

		return $loop;
	}

	/**
	 * Point a loop at a source.
	 *
	 * The data of the other sources stays where it is, as it does when the
	 * source is switched in the editor.
	 *
	 * @param array $loop - loop block.
	 * @param array $source - source input.
	 *
	 * @return array|WP_Error
	 */
	private static function apply_source( $loop, $source ) {
		$type    = $source['type'];
		$sources = self::get_vocabulary()['sources'];

		if ( ! isset( $sources[ $type ] ) ) {
			return new WP_Error(
				'vpf_unknown_source',
				sprintf(
					// translators: %1$s - source type, %2$s - list of source types.
					__( 'Unknown source `%1$s`. Use one of: %2$s.', 'visual-portfolio' ),
					$type,
					implode( ', ', array_keys( $sources ) )
				)
			);
		}

		if ( empty( $sources[ $type ]['available'] ) ) {
			if ( ! empty( $sources[ $type ]['requires_pro'] ) ) {
				return new WP_Error(
					'vpf_requires_pro',
					sprintf(
						// translators: %1$s - source label, %2$s - URL.
						__( 'The %1$s source requires Visual Portfolio Pro: %2$s', 'visual-portfolio' ),
						$sources[ $type ]['label'],
						self::get_pro_url()
					)
				);
			}

			return new WP_Error(
				'vpf_unavailable_source',
				// translators: %s - source type.
				sprintf( __( 'The `%s` source is not available on this site.', 'visual-portfolio' ), $type )
			);
		}

		$attrs              = $loop['attrs'];
		$attrs['queryType'] = $type;

		if ( 'images' === $type ) {
			$attrs['imagesQuery']           = $attrs['imagesQuery'] ?? array();
			$attrs['imagesQuery']['images'] = array_map( array( __CLASS__, 'prepare_image' ), $source['images'] ?? array() );
		} elseif ( 'posts' === $type ) {
			$ids         = array_values( array_map( 'intval', $source['ids'] ?? array() ) );
			$posts_query = array_merge(
				$attrs['postsQuery'] ?? array(),
				array(
					'source'     => empty( $ids ) ? ( $source['post_type'] ?? 'post' ) : 'ids',
					'ids'        => $ids,
					'taxonomies' => array_values( array_map( 'intval', $source['terms'] ?? array() ) ),
					'orderBy'    => $source['order_by'] ?? ( empty( $ids ) ? 'post_date' : 'post__in' ),
					'order'      => $source['order'] ?? 'desc',
				)
			);

			$attrs['postsQuery'] = $posts_query;
		}

		$loop['attrs'] = $attrs;

		return $loop;
	}

	/**
	 * What a gallery starts with for its source, see
	 * `gutenberg/blocks/loop/layout-defaults.js`.
	 *
	 * @param array $loop - loop block.
	 *
	 * @return array
	 */
	private static function apply_layout_defaults( $loop ) {
		if ( 'images' === ( $loop['attrs']['queryType'] ?? 'posts' ) ) {
			$inner = array_values(
				array_filter(
					$loop['innerBlocks'],
					function ( $block ) {
						return self::PAGINATION !== $block['blockName'];
					}
				)
			);

			if ( count( $inner ) !== count( $loop['innerBlocks'] ) ) {
				$loop = self::set_inner_blocks( $loop, $inner );
			}

			$loop = self::set_click_action(
				$loop,
				function () {
					return 'popup';
				}
			);

			$loop['attrs']['baseQuery']            = $loop['attrs']['baseQuery'] ?? array();
			$loop['attrs']['baseQuery']['perPage'] = -1;

			return $loop;
		}

		return self::set_click_action(
			$loop,
			function ( $current ) {
				return 'popup' === $current ? 'url' : $current;
			}
		);
	}

	/**
	 * Apply the settings of the free plugin.
	 *
	 * @param array $loop - loop block.
	 * @param array $settings - settings input.
	 *
	 * @return array
	 */
	private static function apply_settings( $loop, $settings ) {
		if ( isset( $settings['per_page'] ) ) {
			$loop['attrs']['baseQuery']            = $loop['attrs']['baseQuery'] ?? array();
			$loop['attrs']['baseQuery']['perPage'] = (int) $settings['per_page'];
		}

		if ( isset( $settings['lightbox'] ) ) {
			$off = 'images' === ( $loop['attrs']['queryType'] ?? 'posts' ) ? 'none' : 'url';

			$loop = self::set_click_action(
				$loop,
				function () use ( $settings, $off ) {
					return $settings['lightbox'] ? 'popup' : $off;
				}
			);
		}

		if ( isset( $settings['columns'] ) ) {
			$loop['innerBlocks'] = self::map_blocks(
				$loop['innerBlocks'],
				function ( $block ) use ( $settings ) {
					if ( self::TEMPLATE !== $block['blockName'] || in_array( $block['attrs']['layoutType'] ?? 'grid', self::NO_COLUMNS, true ) ) {
						return $block;
					}

					$block['attrs']['layoutColumnsMode'] = 'manual';
					$block['attrs']['layoutColumnCount'] = (int) $settings['columns'];

					return $block;
				}
			);
		}

		return $loop;
	}

	/**
	 * Add, remove and reorder the images of an images loop.
	 *
	 * @param array $loop - loop block.
	 * @param array $input - `add_images`, `remove_images`, `order`.
	 *
	 * @return array
	 */
	private static function apply_images( $loop, $input ) {
		if ( ! isset( $input['add_images'] ) && ! isset( $input['remove_images'] ) && ! isset( $input['order'] ) ) {
			return $loop;
		}

		$images = $loop['attrs']['imagesQuery']['images'] ?? array();
		$ids    = array_map( 'intval', array_column( $images, 'id' ) );

		foreach ( $input['add_images'] ?? array() as $image ) {
			if ( in_array( (int) $image['id'], $ids, true ) ) {
				continue;
			}

			$images[] = self::prepare_image( $image );
			$ids[]    = (int) $image['id'];
		}

		if ( ! empty( $input['remove_images'] ) ) {
			$remove = array_map( 'intval', $input['remove_images'] );
			$images = array_values(
				array_filter(
					$images,
					function ( $image ) use ( $remove ) {
						return ! in_array( (int) ( $image['id'] ?? 0 ), $remove, true );
					}
				)
			);
		}

		if ( ! empty( $input['order'] ) ) {
			$rank = array_flip( array_values( array_unique( array_map( 'intval', $input['order'] ) ) ) );
			$tail = count( $rank );

			foreach ( $images as $position => $image ) {
				$images[ $position ]['__rank'] = $rank[ (int) ( $image['id'] ?? 0 ) ] ?? $tail + $position;
			}

			usort(
				$images,
				function ( $a, $b ) {
					return $a['__rank'] <=> $b['__rank'];
				}
			);

			foreach ( $images as $position => $image ) {
				unset( $images[ $position ]['__rank'] );
			}
		}

		$loop['attrs']['imagesQuery']           = $loop['attrs']['imagesQuery'] ?? array();
		$loop['attrs']['imagesQuery']['images'] = $images;

		return $loop;
	}

	/**
	 * An image input as the gallery stores it, see `prepareImage()` in
	 * `gutenberg/loop-sources/gallery-manager/prepare-images.js`.
	 *
	 * @param array $image - image input.
	 *
	 * @return array
	 */
	private static function prepare_image( $image ) {
		$id       = (int) $image['id'];
		$url      = (string) wp_get_attachment_url( $id );
		$preview  = 'image/gif' === get_post_mime_type( $id ) ? false : wp_get_attachment_image_src( $id, 'large' );
		$prepared = array(
			'id'              => $id,
			'imgUrl'          => $url,
			'imgThumbnailUrl' => $preview ? $preview[0] : $url,
		);

		foreach ( array(
			'title'       => 'title',
			'description' => 'description',
			'alt'         => 'alt',
			'link'        => 'url',
		) as $key => $stored ) {
			if ( isset( $image[ $key ] ) && '' !== $image[ $key ] ) {
				$prepared[ $stored ] = (string) $image[ $key ];
			}
		}

		return $prepared;
	}

	/**
	 * A loop holding other inner blocks.
	 *
	 * Only the wrapper of a loop is saved as markup, so its first and last
	 * chunks of content are kept and the blocks go between them.
	 *
	 * @param array $loop - loop block.
	 * @param array $inner - inner blocks.
	 *
	 * @return array
	 */
	private static function set_inner_blocks( $loop, $inner ) {
		$chunks = array_values( array_filter( $loop['innerContent'], 'is_string' ) );
		$open   = $chunks[0] ?? '';
		$close  = count( $chunks ) > 1 ? end( $chunks ) : '';

		// A loop saved empty is one chunk, the wrapper opened and closed.
		if ( 1 === count( $chunks ) ) {
			$split = (int) strrpos( $open, '</' );
			$close = substr( $open, $split );
			$open  = substr( $open, 0, $split );
		}

		$content = array( $open );

		foreach ( array_keys( $inner ) as $index ) {
			if ( $index > 0 ) {
				$content[] = "\n\n";
			}

			$content[] = null;
		}

		$content[] = $close;

		$loop['innerBlocks']  = array_values( $inner );
		$loop['innerContent'] = $content;
		$loop['innerHTML']    = $open . $close;

		return $loop;
	}

	/**
	 * Set the click action of every item picture of a loop.
	 *
	 * @param array    $loop - loop block.
	 * @param callable $get_action - takes the current action, returns the new one.
	 *
	 * @return array
	 */
	private static function set_click_action( $loop, $get_action ) {
		$loop['innerBlocks'] = self::map_blocks(
			$loop['innerBlocks'],
			function ( $block ) use ( $get_action ) {
				if ( in_array( $block['blockName'], self::CLICKABLE, true ) ) {
					$block['attrs']['clickAction'] = $get_action( $block['attrs']['clickAction'] ?? 'none' );
				}

				return $block;
			}
		);

		return $loop;
	}

	/**
	 * Whether the pictures of a loop open in the lightbox.
	 *
	 * @param array $blocks - inner blocks.
	 *
	 * @return bool
	 */
	private static function has_lightbox( $blocks ) {
		foreach ( $blocks as $block ) {
			if ( in_array( $block['blockName'], self::CLICKABLE, true ) && 'popup' === ( $block['attrs']['clickAction'] ?? 'none' ) ) {
				return true;
			}

			if ( ! empty( $block['innerBlocks'] ) && self::has_lightbox( $block['innerBlocks'] ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Map every block of a tree, depth first.
	 *
	 * @param array    $blocks - blocks.
	 * @param callable $callback - takes a block, returns it.
	 *
	 * @return array
	 */
	private static function map_blocks( $blocks, $callback ) {
		foreach ( $blocks as $index => $block ) {
			if ( ! empty( $block['innerBlocks'] ) ) {
				$block['innerBlocks'] = self::map_blocks( $block['innerBlocks'], $callback );
			}

			$blocks[ $index ] = $callback( $block );
		}

		return $blocks;
	}

	/**
	 * The first block of a name in a tree.
	 *
	 * @param array  $blocks - blocks.
	 * @param string $name - block name.
	 *
	 * @return array|null
	 */
	private static function find_block( $blocks, $name ) {
		foreach ( $blocks as $block ) {
			if ( $name === $block['blockName'] ) {
				return $block;
			}

			$found = empty( $block['innerBlocks'] ) ? null : self::find_block( $block['innerBlocks'], $name );

			if ( $found ) {
				return $found;
			}
		}

		return null;
	}

	/**
	 * Every value an attribute takes in a tree.
	 *
	 * @param array  $blocks - blocks.
	 * @param string $attribute - attribute name.
	 * @param string $block_name - only blocks of this name, or any.
	 *
	 * @return array
	 */
	private static function collect_attribute( $blocks, $attribute, $block_name = '' ) {
		$values = array();

		self::map_blocks(
			$blocks,
			function ( $block ) use ( $attribute, $block_name, &$values ) {
				if ( ( '' === $block_name || $block_name === $block['blockName'] ) && isset( $block['attrs'][ $attribute ] ) ) {
					$values[] = $block['attrs'][ $attribute ];
				}

				return $block;
			}
		);

		return $values;
	}

	/**
	 * A `block_id` no block of the post has, in the editor's alphabet.
	 *
	 * The editor keeps these unique across the legacy block and the loop
	 * alike, see `gutenberg/extensions/block-id.js`.
	 *
	 * @param array $blocks - parsed blocks of the post.
	 *
	 * @return string
	 */
	private static function get_free_block_id( $blocks ) {
		$used = array_map( 'strval', self::collect_attribute( $blocks, 'block_id' ) );

		do {
			$block_id = substr( md5( wp_generate_uuid4() ), 0, 8 );
		} while ( in_array( $block_id, $used, true ) );

		return $block_id;
	}

	/**
	 * The lowest `queryId` no loop of the post has.
	 *
	 * @param array $blocks - parsed blocks of the post.
	 *
	 * @return int
	 */
	private static function get_free_query_id( $blocks ) {
		$used     = array_map( 'intval', self::collect_attribute( $blocks, 'queryId', self::LOOP ) );
		$query_id = 1;

		while ( in_array( $query_id, $used, true ) ) {
			++$query_id;
		}

		return $query_id;
	}

	/**
	 * Replace the block at a path.
	 *
	 * @param array $blocks - blocks.
	 * @param array $path - indexes leading to the block.
	 * @param array $block - new block.
	 *
	 * @return array
	 */
	public static function replace_at( $blocks, $path, $block ) {
		$index = array_shift( $path );

		if ( empty( $path ) ) {
			$blocks[ $index ] = $block;
		} else {
			$blocks[ $index ]['innerBlocks'] = self::replace_at( $blocks[ $index ]['innerBlocks'], $path, $block );
		}

		return $blocks;
	}

	/**
	 * Post content with a block added at its start or its end.
	 *
	 * The content around it is kept as it was, so a post saved by the classic
	 * editor or with markup the parser would round-trip differently is not
	 * rewritten.
	 *
	 * @param string $content - post content.
	 * @param array  $block - block.
	 * @param string $position - `start` or `end`.
	 *
	 * @return string
	 */
	public static function insert_into_content( $content, $block, $position ) {
		$markup = serialize_block( $block );

		if ( '' === trim( $content ) ) {
			return $markup;
		}

		return 'start' === $position ? $markup . "\n\n" . $content : rtrim( $content ) . "\n\n" . $markup;
	}

	/**
	 * A link to Visual Portfolio Pro.
	 *
	 * @return string
	 */
	public static function get_pro_url() {
		return Visual_Portfolio_Admin::get_plugin_site_url(
			array(
				'utm_medium'   => 'abilities',
				'utm_campaign' => 'loop_source',
			)
		);
	}

	/**
	 * Error for a layout slug no pattern has.
	 *
	 * @param string $layout - layout slug.
	 * @param array  $layouts - registered layouts.
	 *
	 * @return WP_Error
	 */
	private static function unknown_layout( $layout, $layouts ) {
		return new WP_Error(
			'vpf_unknown_layout',
			sprintf(
				// translators: %1$s - layout slug, %2$s - list of layouts.
				__( 'Unknown layout `%1$s`. Use one of: %2$s.', 'visual-portfolio' ),
				$layout,
				implode( ', ', array_keys( $layouts ) )
			)
		);
	}
}
