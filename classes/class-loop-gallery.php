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
	 * Values of `postsQuery.source` that are not a post type.
	 *
	 * @var array
	 */
	const POSTS_SELECTORS = array( 'ids', 'current_query', 'custom_query', 'post_types_set' );

	/**
	 * Attributes that describe a block rather than set it up, which a synced
	 * loop never overrides, as in `gutenberg/extensions/saved-layout-sync/utils.js`.
	 *
	 * @var array
	 */
	const NOT_SETTINGS = array( 'lock', 'metadata' );

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

		// The sources `gutenberg/loop-sources/pro-sources.js` advertises. Pro
		// makes them available through the vocabulary filter.
		$sources['taxonomies']    = array(
			'label'        => __( 'Taxonomies', 'visual-portfolio' ),
			'description'  => __( 'Display taxonomy archives such as categories, tags, and custom taxonomies.', 'visual-portfolio' ),
			'available'    => false,
			'requires_pro' => ! $is_pro,
		);
		$sources['social-stream'] = array(
			'label'        => __( 'Social', 'visual-portfolio' ),
			'description'  => __( 'Display social feeds such as Instagram, YouTube, Flickr, X, etc…', 'visual-portfolio' ),
			'available'    => false,
			'requires_pro' => ! $is_pro,
		);

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
					'description' => __( 'Items per page, or -1 for all of them on one page. An images gallery made by these abilities has no pagination, so there it is how many images show.', 'visual-portfolio' ),
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
		 * requires_pro, schema, keys )`, `schema` being the JSON schema of the
		 * fields it takes besides `type`, and `keys` the `sourceQuery` keys
		 * get-gallery reports as its `settings`. A setting is `key => array(
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
	 * Every loop of a post in document order, with the path of indexes that
	 * leads to it and the id the abilities name it by.
	 *
	 * The id is the loop's `block_id`. A loop without one, or holding one an
	 * earlier block already holds (another loop or the legacy gallery block,
	 * as the editor counts them), is `loop-<n>`, its 1-based position; a
	 * gallery created at the start of the post moves those numbers.
	 *
	 * @param array $blocks - parsed blocks of the post.
	 *
	 * @return array list of array( path, block, gallery_id ).
	 */
	public static function find_loops( $blocks ) {
		$found = array();
		$seen  = array();

		self::collect_loops( $blocks, array(), $found, $seen );

		return $found;
	}

	/**
	 * The loops of a block tree, depth first.
	 *
	 * @param array $blocks - parsed blocks.
	 * @param array $path - path of the blocks given.
	 * @param array $found - loops found so far.
	 * @param array $seen - `block_id`s of the blocks walked so far.
	 */
	private static function collect_loops( $blocks, $path, &$found, &$seen ) {
		foreach ( $blocks as $index => $block ) {
			$block_path = array_merge( $path, array( $index ) );
			$block_id   = (string) ( $block['attrs']['block_id'] ?? '' );

			if ( self::LOOP === $block['blockName'] ) {
				$found[] = array(
					'path'       => $block_path,
					'block'      => $block,
					'gallery_id' => self::is_own_id( $block_id ) && ! isset( $seen[ $block_id ] ) ? $block_id : 'loop-' . ( count( $found ) + 1 ),
				);
			}

			if ( '' !== $block_id ) {
				$seen[ $block_id ] = true;
			}

			if ( ! empty( $block['innerBlocks'] ) ) {
				self::collect_loops( $block['innerBlocks'], $block_path, $found, $seen );
			}
		}
	}

	/**
	 * Whether a `block_id` can name a gallery: not empty, and not one of the
	 * positional ids the abilities give loops without one.
	 *
	 * @param string $block_id - block id.
	 *
	 * @return bool
	 */
	private static function is_own_id( $block_id ) {
		return '' !== $block_id && ! preg_match( '/^loop-\d+$/', $block_id );
	}

	/**
	 * The loop a gallery id names.
	 *
	 * @param array  $blocks - parsed blocks of the post.
	 * @param string $gallery_id - gallery id.
	 *
	 * @return array|null array( path, block, gallery_id, index ).
	 */
	public static function find_loop( $blocks, $gallery_id ) {
		foreach ( self::find_loops( $blocks ) as $index => $found ) {
			if ( $found['gallery_id'] === (string) $gallery_id ) {
				return $found + array( 'index' => $index );
			}
		}

		return null;
	}

	/**
	 * A loop in the words of the abilities, as the page renders it.
	 *
	 * @param array $loop - loop block.
	 *
	 * @return array
	 */
	public static function describe( $loop ) {
		if ( self::get_saved_layout_id( $loop ) ) {
			$loop = Visual_Portfolio_Saved_Layouts::apply_layout( $loop );
		}

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
			$selector    = $posts_query['source'] ?? 'portfolio';

			$source[ in_array( $selector, self::POSTS_SELECTORS, true ) ? 'query' : 'post_type' ] = $selector;

			// Ids left from a manual selection do nothing once a post type is picked.
			$source['ids']      = 'ids' === $selector ? array_map( 'intval', $posts_query['ids'] ?? array() ) : array();
			$source['terms']    = array_map( 'intval', $posts_query['taxonomies'] ?? array() );
			$source['order_by'] = $posts_query['orderBy'] ?? 'post_date';
			$source['order']    = $posts_query['order'] ?? 'desc';
		} else {
			$keys               = self::get_vocabulary()['sources'][ $query_type ]['keys'] ?? null;
			$source['settings'] = $attrs['sourceQuery'] ?? array();

			// Fields other sources and features keep there are not this source's settings.
			if ( is_array( $keys ) ) {
				$source['settings'] = array_intersect_key( $source['settings'], array_flip( $keys ) );
			}
		}

		$settings = array(
			'per_page' => (int) ( $attrs['baseQuery']['perPage'] ?? 6 ),
			'lightbox' => self::has_lightbox( $loop['innerBlocks'] ),
		);

		// Automatic columns follow a minimum width, not a count.
		if ( ! in_array( $layout, self::NO_COLUMNS, true ) && 'manual' === ( $t_attrs['layoutColumnsMode'] ?? 'auto' ) ) {
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

		// An image inserted from a URL has no attachment.
		if ( ! $described['id'] && ! empty( $image['imgUrl'] ) ) {
			$described['url'] = (string) $image['imgUrl'];
		}

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
	 * @param array  $input - `source`, `settings` and `saved_layout`.
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

		$before = $loop;

		if ( ! empty( $input['saved_layout'] ) ) {
			$loop = self::set_saved_layout( $loop, $input['saved_layout'] );

			if ( is_wp_error( $loop ) ) {
				return $loop;
			}
		}

		return self::apply( $loop, $input, 'create', null, $before );
	}

	/**
	 * A changed loop.
	 *
	 * @param array $loop - loop block.
	 * @param array $input - `saved_layout`, `layout`, `source`, `settings` and the image operations.
	 * @param array $blocks - parsed blocks of the post it is in.
	 * @param int   $index - 0-based position of the loop among the loops of the post.
	 *
	 * @return array|WP_Error loop block.
	 */
	public static function update( $loop, $input, $blocks, $index = 0 ) {
		$before = $loop;

		// Content written outside the editor can hold two blocks with one id.
		// As in the editor, the first holder keeps it and a later one gets
		// its own, so the id keeps naming the same gallery on a retry. The
		// editor counts the legacy gallery block in, see `gutenberg/extensions/block-id.js`.
		$earlier_block_ids = array_map( 'strval', array_column( self::get_attributes_before( $blocks, $index ), 'block_id' ) );
		$earlier_query_ids = array_map( 'intval', array_column( array_column( array_column( array_slice( self::find_loops( $blocks ), 0, $index ), 'block' ), 'attrs' ), 'queryId' ) );

		if ( ! self::is_own_id( (string) ( $loop['attrs']['block_id'] ?? '' ) ) || in_array( (string) $loop['attrs']['block_id'], $earlier_block_ids, true ) ) {
			$loop['attrs']['block_id'] = self::get_free_block_id( $blocks );
		}

		if ( empty( $loop['attrs']['queryId'] ) || in_array( (int) $loop['attrs']['queryId'], $earlier_query_ids, true ) ) {
			$loop['attrs']['queryId'] = self::get_free_query_id( $blocks );
		}

		// The rest of the call changes the loop as it is once synced or detached.
		if ( array_key_exists( 'saved_layout', $input ) ) {
			$loop = self::set_saved_layout( $loop, $input['saved_layout'] );

			if ( is_wp_error( $loop ) ) {
				return $loop;
			}
		}

		$click_action = null;

		if ( isset( $input['layout'] ) ) {
			$saved_layout = self::get_saved_layout_id( $loop );

			if ( $saved_layout ) {
				return new WP_Error(
					'vpf_synced_layout',
					sprintf(
						// translators: %s - Saved Layout title and id, or its id.
						__( 'This gallery is synced with the Saved Layout %s, which provides its layout. To change the layout, pass `saved_layout: null` in the same call: the gallery then detaches, keeping its current look, and takes the new layout.', 'visual-portfolio' ),
						self::get_saved_layout_name( $saved_layout )
					)
				);
			}

			$layouts = self::get_layouts();

			if ( ! isset( $layouts[ $input['layout'] ] ) ) {
				return self::unknown_layout( $input['layout'], $layouts );
			}

			// The columns and the click action live in the blocks the layout
			// replaces, so they are carried over unless the call sets them.
			if ( ! isset( $input['source']['type'] ) || ( $loop['attrs']['queryType'] ?? 'posts' ) === $input['source']['type'] ) {
				$carried = self::describe( $loop )['settings'];

				unset( $carried['lightbox'] );

				$input['settings'] = array_merge( $carried, $input['settings'] ?? array() );
				$click_action      = self::has_lightbox( $loop['innerBlocks'] ) ? 'popup' : self::get_click_action( $loop['innerBlocks'] );
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

		return self::apply( $loop, $input, 'update', $click_action, $before );
	}

	/**
	 * Apply a source, the layout defaults, settings and image operations.
	 *
	 * @param array       $loop - loop block.
	 * @param array       $input - ability input.
	 * @param string      $action - `create` or `update`.
	 * @param string|null $click_action - click action to keep over the layout's.
	 * @param array       $before - the loop before the change; on create, the layout's loop.
	 *
	 * @return array|WP_Error loop block.
	 */
	private static function apply( $loop, $input, $action, $click_action, $before ) {
		$id = self::get_saved_layout_id( $loop );

		if ( ! $id ) {
			return self::apply_input( $loop, $input, $action, $click_action, $before );
		}

		// A synced loop changes the way the editor changes it: on what the
		// page shows, each setting the layout provides that the call changed
		// becoming an override.
		$locked  = Visual_Portfolio_Saved_Layouts::is_locked( $id );
		$merged  = Visual_Portfolio_Saved_Layouts::apply_layout( $loop, null, $locked );
		$changed = self::apply_input( $merged, $input, $action, $click_action, $before );

		if ( is_wp_error( $changed ) ) {
			return $changed;
		}

		$names = self::get_changed_synced_names( $merged, $changed );

		// A locked layout hides the overrides on the page; their stored
		// values stay for when it is unlocked.
		if ( empty( $names ) ) {
			return $locked ? self::with_synced_blocks( $changed, Visual_Portfolio_Saved_Layouts::apply_layout( $loop, null, false ) ) : $changed;
		}

		if ( $locked ) {
			return new WP_Error(
				'vpf_saved_layout_locked',
				sprintf(
					// translators: %s - Saved Layout title and id, or its id.
					__( 'The Saved Layout %s is locked: a gallery synced with it cannot change the settings the layout provides, such as the columns, the lightbox and the item blocks. Edit the Saved Layout, or pass `saved_layout: null` in the same call to detach the gallery first.', 'visual-portfolio' ),
					self::get_saved_layout_name( $id )
				)
			);
		}

		$overrides = Visual_Portfolio_Saved_Layouts::sanitize_overrides( $changed['attrs']['savedLayout']['overrides'] ?? array() );

		foreach ( $names as $key => $list ) {
			$overrides[ $key ] = array_values( array_unique( array_merge( $overrides[ $key ] ?? array(), $list ) ) );
		}

		$changed['attrs']['savedLayout']['overrides'] = $overrides;

		return $changed;
	}

	/**
	 * Apply a source, the layout defaults, settings and image operations to
	 * the blocks of a loop as they are.
	 *
	 * @param array       $loop - loop block.
	 * @param array       $input - ability input.
	 * @param string      $action - `create` or `update`.
	 * @param string|null $click_action - click action to keep over the layout's.
	 * @param array       $before - the loop before the change; on create, the layout's loop.
	 *
	 * @return array|WP_Error loop block.
	 */
	private static function apply_input( $loop, $input, $action, $click_action, $before ) {
		$source   = $input['source'] ?? null;
		$previous = $loop['attrs']['queryType'] ?? 'posts';

		if ( $source ) {
			$loop = self::apply_source( $loop, $source, 'update' === $action && 'posts' === $previous ? 'portfolio' : 'post' );

			if ( is_wp_error( $loop ) ) {
				return $loop;
			}
		}

		if ( 'create' === $action || isset( $input['layout'] ) || ( $loop['attrs']['queryType'] ?? 'posts' ) !== $previous ) {
			$loop = self::apply_layout_defaults( $loop );
		}

		if ( $click_action ) {
			$loop = self::set_click_action(
				$loop,
				function () use ( $click_action ) {
					return $click_action;
				}
			);
		}

		$leaves_images = 'images' === $previous && 'images' !== $loop['attrs']['queryType'];

		// "Every item on one page" is an images default; on another source it
		// would put every post of the type on one page.
		if ( $leaves_images && -1 === (int) ( $loop['attrs']['baseQuery']['perPage'] ?? 0 ) ) {
			$loop['attrs']['baseQuery']['perPage'] = 6;
		}

		$loop = self::apply_images( $loop, $input );
		$loop = self::apply_settings( $loop, $input['settings'] ?? array() );

		// An images gallery has no pagination; the pages a gallery of
		// another source now has get one, unless the call picked a layout,
		// which brings its own.
		if ( $leaves_images && ! isset( $input['layout'] ) && -1 !== (int) ( $loop['attrs']['baseQuery']['perPage'] ?? 0 ) && ! self::find_block( $loop['innerBlocks'], self::PAGINATION ) ) {
			$pagination = self::get_layout_pagination();

			if ( $pagination ) {
				$loop = self::set_inner_blocks( $loop, array_merge( $loop['innerBlocks'], array( $pagination ) ) );
			}
		}

		/**
		 * Filter a loop an ability built or changed.
		 *
		 * Runs after the free plugin applied what it knows of the input, so a
		 * source type or a setting added through
		 * `vpf_gallery_ability_vocabulary` is applied here. `sourceQuery`
		 * keeps the keys of the source a loop leaves, as the editor's source
		 * picker does; a source drops what it cannot read from `$before`.
		 *
		 * @param array  $loop   Parsed loop block.
		 * @param array  $input  Ability input.
		 * @param string $action `create` or `update`.
		 * @param array  $before The loop before the change; on create, the layout's loop.
		 */
		$loop = apply_filters( 'vpf_gallery_ability_apply', $loop, $input, $action, $before );

		return $loop;
	}

	/**
	 * Point a loop at a source.
	 *
	 * The data of the other sources stays where it is, as it does when the
	 * source is switched in the editor.
	 *
	 * @param array  $loop - loop block.
	 * @param array  $source - source input.
	 * @param string $default_type - post type of a posts source that names none.
	 *
	 * @return array|WP_Error
	 */
	private static function apply_source( $loop, $source, $default_type ) {
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

		if ( 'images' === $type && isset( $source['images'] ) ) {
			$attrs['imagesQuery']           = $attrs['imagesQuery'] ?? array();
			$attrs['imagesQuery']['images'] = array_map( array( __CLASS__, 'prepare_image' ), $source['images'] );
		} elseif ( 'posts' === $type ) {
			// A loop that already shows posts without a stored post type shows
			// the block's default, which a partial update keeps.
			$attrs['postsQuery'] = self::merge_posts_query( $attrs['postsQuery'] ?? array(), $source, $default_type );
		} elseif ( isset( $source['settings'] ) ) {
			$attrs['sourceQuery'] = array_merge( $attrs['sourceQuery'] ?? array(), $source['settings'] );
		}

		$loop['attrs'] = $attrs;

		return $loop;
	}

	/**
	 * A posts query with the fields a source input gives; the rest stay.
	 *
	 * @param array  $posts_query - stored `postsQuery`.
	 * @param array  $source - source input.
	 * @param string $default_type - post type when none is stored or given.
	 *
	 * @return array
	 */
	private static function merge_posts_query( $posts_query, $source, $default_type ) {
		// A post type given alone leaves a manual selection.
		if ( isset( $source['post_type'] ) && empty( $source['ids'] ) && 'ids' === ( $posts_query['source'] ?? '' ) ) {
			$posts_query['ids'] = array();

			if ( 'post__in' === ( $posts_query['orderBy'] ?? '' ) ) {
				$posts_query['orderBy'] = 'post_date';
			}
		}

		if ( isset( $source['post_type'] ) ) {
			$posts_query['source'] = $source['post_type'];
		}

		if ( isset( $source['ids'] ) ) {
			$posts_query['ids'] = array_values( array_map( 'intval', $source['ids'] ) );

			if ( ! empty( $posts_query['ids'] ) ) {
				$posts_query['source']  = 'ids';
				$posts_query['orderBy'] = 'post__in';
			} elseif ( 'ids' === ( $posts_query['source'] ?? '' ) ) {
				$posts_query['source'] = $source['post_type'] ?? $default_type;
			}
		}

		if ( empty( $posts_query['source'] ) ) {
			$posts_query['source'] = $default_type;
		}

		if ( isset( $source['terms'] ) ) {
			$posts_query['taxonomies'] = array_values( array_map( 'intval', $source['terms'] ) );
		}

		if ( isset( $source['order_by'] ) ) {
			$posts_query['orderBy'] = $source['order_by'];
		}

		if ( isset( $source['order'] ) ) {
			$posts_query['order'] = $source['order'];
		}

		return $posts_query;
	}

	/**
	 * What a gallery starts with for its source, see
	 * `gutenberg/blocks/loop/layout-defaults.js`.
	 *
	 * The item blocks of a synced loop come from its layout, so their click
	 * action stays the layout's, as it does when the source changes in the
	 * editor.
	 *
	 * @param array $loop - loop block.
	 *
	 * @return array
	 */
	private static function apply_layout_defaults( $loop ) {
		$synced = (bool) self::get_saved_layout_id( $loop );

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

			if ( ! $synced ) {
				$loop = self::set_click_action(
					$loop,
					function () {
						return 'popup';
					}
				);
			}

			$loop['attrs']['baseQuery']            = $loop['attrs']['baseQuery'] ?? array();
			$loop['attrs']['baseQuery']['perPage'] = -1;

			return $loop;
		}

		if ( $synced ) {
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
	 * The pagination of the first layout that pages its items.
	 *
	 * @return array|null
	 */
	private static function get_layout_pagination() {
		$layouts = self::get_layouts();

		// The plugin's own paged grid first, so a theme's pattern registered
		// earlier does not decide the pagination.
		if ( isset( $layouts['visual-portfolio/gallery-posts-paged'] ) ) {
			$layouts = array( $layouts['visual-portfolio/gallery-posts-paged'] ) + $layouts;
		}

		foreach ( $layouts as $layout ) {
			foreach ( $layout['loop']['innerBlocks'] as $block ) {
				if ( self::PAGINATION === $block['blockName'] ) {
					return $block;
				}
			}
		}

		return null;
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

			// A sort set on the gallery would reorder the images again on the page.
			$loop['attrs']['imagesQuery']            = $loop['attrs']['imagesQuery'] ?? array();
			$loop['attrs']['imagesQuery']['orderBy'] = 'default';
			$loop['attrs']['imagesQuery']['order']   = 'asc';
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

		// What the media frame hands the editor's gallery manager.
		$image += array(
			'title'       => get_post_field( 'post_title', $id, 'raw' ),
			'description' => get_post_field( 'post_content', $id, 'raw' ),
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
	 * The click action of the first item picture of a tree.
	 *
	 * @param array $blocks - blocks.
	 *
	 * @return string|null
	 */
	private static function get_click_action( $blocks ) {
		foreach ( $blocks as $block ) {
			if ( in_array( $block['blockName'], self::CLICKABLE, true ) ) {
				return $block['attrs']['clickAction'] ?? 'none';
			}

			$found = empty( $block['innerBlocks'] ) ? null : self::get_click_action( $block['innerBlocks'] );

			if ( $found ) {
				return $found;
			}
		}

		return null;
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
	 * Id of the Saved Layout a loop is synced with.
	 *
	 * @param array $loop - loop block.
	 *
	 * @return int 0 when it is not synced.
	 */
	public static function get_saved_layout_id( $loop ) {
		return (int) ( $loop['attrs']['savedLayout']['id'] ?? 0 );
	}

	/**
	 * Title of a block-based Saved Layout, when the current user may read it
	 * to sync with.
	 *
	 * @param int $id - layout id.
	 *
	 * @return string empty when the user may not read it.
	 */
	public static function get_saved_layout_title( $id ) {
		$post = get_post( (int) $id );

		if ( ! $post || ! Visual_Portfolio_Saved_Layouts::is_block_layout( $post ) || ! Visual_Portfolio_Saved_Layouts_REST::can_read_for_sync( $post ) ) {
			return '';
		}

		return html_entity_decode( get_the_title( $post ), ENT_QUOTES, 'UTF-8' );
	}

	/**
	 * A Saved Layout named in a message: its title and id, or its id alone
	 * for a user who may not read it, as the editor's panel names it.
	 *
	 * @param int $id - layout id.
	 *
	 * @return string
	 */
	private static function get_saved_layout_name( $id ) {
		$title = self::get_saved_layout_title( $id );

		if ( '' === $title ) {
			// translators: %d - Saved Layout id.
			return sprintf( __( '#%d', 'visual-portfolio' ), $id );
		}

		// translators: %1$s - Saved Layout title, %2$d - Saved Layout id.
		return sprintf( __( '“%1$s” (%2$d)', 'visual-portfolio' ), $title, $id );
	}

	/**
	 * A loop synced with a block-based Saved Layout, or detached from its own.
	 *
	 * Syncing takes the layout's item template and lightbox with no
	 * overrides; the layout the loop already follows keeps its overrides.
	 * Detaching keeps what the page shows.
	 *
	 * @param array    $loop - loop block.
	 * @param int|null $id - layout id; null or 0 detaches.
	 *
	 * @return array|WP_Error
	 */
	private static function set_saved_layout( $loop, $id ) {
		$id      = (int) $id;
		$current = self::get_saved_layout_id( $loop );

		if ( $id === $current ) {
			return $loop;
		}

		if ( ! $id ) {
			return Visual_Portfolio_Saved_Layout_Usage::detach_loop( $loop, Visual_Portfolio_Saved_Layouts::get_layout_loop( $current ), Visual_Portfolio_Saved_Layouts::is_locked( $current ) );
		}

		$layout = Visual_Portfolio_Saved_Layouts::get_layout_loop( $id );

		if ( ! $layout ) {
			return self::unknown_saved_layout( $id );
		}

		if ( ! in_array( self::TEMPLATE, array_column( $loop['innerBlocks'], 'blockName' ), true ) ) {
			// The layout replaces only an item template placed right in the loop.
			if ( self::find_block( $loop['innerBlocks'], self::TEMPLATE ) ) {
				return new WP_Error(
					'vpf_saved_layout_nested_template',
					__( 'This gallery keeps its item template inside another block, where a Saved Layout cannot provide it. Move the item template out of that block in the editor, then sync the gallery.', 'visual-portfolio' )
				);
			}

			if ( self::find_block( $layout['innerBlocks'], self::TEMPLATE ) && ! in_array( self::TEMPLATE, array_column( $layout['innerBlocks'], 'blockName' ), true ) ) {
				return new WP_Error(
					'vpf_saved_layout_nested_template',
					sprintf(
						// translators: %s - Saved Layout title and id, or its id.
						__( 'The Saved Layout %s keeps its item template inside another block, so it cannot fill this empty gallery. Give the gallery a layout first, then sync it.', 'visual-portfolio' ),
						self::get_saved_layout_name( $id )
					)
				);
			}

			// A loop saved empty takes the layout's blocks, as a layout change does.
			$loop = self::set_inner_blocks( $loop, $layout['innerBlocks'] );
		}

		$loop['attrs']['savedLayout'] = array(
			'id'        => $id,
			'overrides' => (object) array(),
		);

		return Visual_Portfolio_Saved_Layouts::apply_layout( $loop, $layout, false );
	}

	/**
	 * A loop with the lightbox of another state of it, and its item template
	 * when the layout provides one.
	 *
	 * @param array $loop - loop block.
	 * @param array $from - the loop to take them from.
	 *
	 * @return array
	 */
	private static function with_synced_blocks( $loop, $from ) {
		foreach ( Visual_Portfolio_Saved_Layouts::LOOP_SYNCED_ATTRIBUTES as $name ) {
			if ( array_key_exists( $name, $from['attrs'] ) ) {
				$loop['attrs'][ $name ] = $from['attrs'][ $name ];
			} else {
				unset( $loop['attrs'][ $name ] );
			}
		}

		$layout    = Visual_Portfolio_Saved_Layouts::get_layout_loop( self::get_saved_layout_id( $loop ) );
		$templates = $layout && self::find_block( $layout['innerBlocks'], self::TEMPLATE ) ? wp_list_filter( $from['innerBlocks'], array( 'blockName' => self::TEMPLATE ) ) : array();

		foreach ( $loop['innerBlocks'] as $index => $inner ) {
			if ( self::TEMPLATE === $inner['blockName'] && $templates ) {
				$loop['innerBlocks'][ $index ] = reset( $templates );
				break;
			}
		}

		return $loop;
	}

	/**
	 * Settings the layout provides that differ between two states of a synced
	 * loop, by sync key: what the editor's `getPatch()` in
	 * `gutenberg/extensions/saved-layout-sync/controller.js` compares.
	 *
	 * @param array $before - the loop before the change.
	 * @param array $after - the loop after it.
	 *
	 * @return array attribute names, keyed by sync key.
	 */
	private static function get_changed_synced_names( $before, $after ) {
		$names = array();

		foreach ( Visual_Portfolio_Saved_Layouts::LOOP_SYNCED_ATTRIBUTES as $name ) {
			if ( wp_json_encode( self::get_attribute( $before, $name ) ) !== wp_json_encode( self::get_attribute( $after, $name ) ) ) {
				$names[ Visual_Portfolio_Saved_Layouts::LOOP_KEY ][] = $name;
			}
		}

		$old = self::index_synced_blocks( $before );

		foreach ( self::index_synced_blocks( $after ) as $key => $block ) {
			if ( ! isset( $old[ $key ] ) ) {
				continue;
			}

			foreach ( array_keys( $old[ $key ]['attrs'] + $block['attrs'] ) as $name ) {
				if ( in_array( $name, self::NOT_SETTINGS, true ) ) {
					continue;
				}

				if ( wp_json_encode( self::get_attribute( $old[ $key ], $name ) ) !== wp_json_encode( self::get_attribute( $block, $name ) ) ) {
					$names[ $key ][] = $name;
				}
			}
		}

		return $names;
	}

	/**
	 * An attribute of a block, its block type's default when the block
	 * leaves it out, as the editor holds it.
	 *
	 * @param array  $block - block.
	 * @param string $name - attribute name.
	 *
	 * @return mixed
	 */
	private static function get_attribute( $block, $name ) {
		if ( array_key_exists( $name, $block['attrs'] ) ) {
			return $block['attrs'][ $name ];
		}

		$type = WP_Block_Type_Registry::get_instance()->get_registered( (string) $block['blockName'] );

		return $type ? ( $type->attributes[ $name ]['default'] ?? null ) : null;
	}

	/**
	 * The item template of a loop and the blocks inside it, by sync key.
	 *
	 * @param array $loop - loop block.
	 *
	 * @return array
	 */
	private static function index_synced_blocks( $loop ) {
		$index    = array();
		$template = self::find_block( $loop['innerBlocks'], self::TEMPLATE );
		$walk     = function ( $blocks ) use ( &$walk, &$index ) {
			foreach ( $blocks as $block ) {
				$key = $block['attrs']['metadata']['vpSyncKey'] ?? '';

				if ( $key && ! isset( $index[ $key ] ) ) {
					$index[ $key ] = $block;
				}

				$walk( $block['innerBlocks'] );
			}
		};

		$walk( $template ? array( $template ) : array() );

		return $index;
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
	 * Attributes of every block before the n-th loop, in document order.
	 *
	 * @param array $blocks - parsed blocks of the post.
	 * @param int   $index - 0-based position of the loop among the loops of the post.
	 *
	 * @return array
	 */
	private static function get_attributes_before( $blocks, $index ) {
		$before = array();
		$loops  = 0;
		$walk   = function ( $blocks ) use ( &$walk, &$before, &$loops, $index ) {
			foreach ( $blocks as $block ) {
				if ( self::LOOP === $block['blockName'] && $loops++ === $index ) {
					return true;
				}

				$before[] = $block['attrs'];

				if ( ! empty( $block['innerBlocks'] ) && $walk( $block['innerBlocks'] ) ) {
					return true;
				}
			}

			return false;
		};

		$walk( $blocks );

		return $before;
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
	 * Post content with the n-th loop's markup replaced, and every other byte
	 * kept.
	 *
	 * Serializing the whole post again would rewrite blocks the call never
	 * named: the block parser decodes `{}` as an empty array and `1.0` as `1`.
	 *
	 * @param string $content - post content.
	 * @param int    $index - 0-based position of the loop among the loops of the post.
	 * @param array  $old - the loop as `parse_blocks()` found it.
	 * @param array  $loop - new loop block.
	 *
	 * @return string|null null when the loop is not where the parser found it.
	 */
	public static function replace_in_content( $content, $index, $old, $loop ) {
		$processor = new WP_Block_Processor( $content );
		$openers   = 0;
		$depth     = 0;
		$start     = null;

		// The delimiters of loops in document order, the order `find_loops()`
		// counts them in, with the nesting `parse_blocks()` gives them.
		while ( $processor->next_delimiter( self::LOOP ) ) {
			$type = $processor->get_delimiter_type();
			$span = $processor->get_span();

			if ( null === $start ) {
				if ( WP_Block_Processor::CLOSER === $type ) {
					continue;
				}

				if ( $openers++ !== $index ) {
					continue;
				}

				$start = $span->start;

				if ( WP_Block_Processor::VOID === $type ) {
					return self::splice( $content, $start, $span->length, $old, $loop );
				}

				$depth = 1;
				continue;
			}

			if ( WP_Block_Processor::OPENER === $type ) {
				++$depth;
			} elseif ( WP_Block_Processor::CLOSER === $type && 0 === --$depth ) {
				return self::splice( $content, $start, $span->start + $span->length - $start, $old, $loop );
			}
		}

		return null;
	}

	/**
	 * Content with a span replaced by a loop, if the span holds the loop the
	 * block parser found.
	 *
	 * The delimiter scanner and the block parser read hand-written markup
	 * differently, such as `-->` inside a loop's attributes, and then count
	 * the loops differently.
	 *
	 * @param string $content - post content.
	 * @param int    $start - span start.
	 * @param int    $length - span length.
	 * @param array  $old - the loop as `parse_blocks()` found it.
	 * @param array  $loop - new loop block.
	 *
	 * @return string|null
	 */
	private static function splice( $content, $start, $length, $old, $loop ) {
		$parsed = parse_blocks( substr( $content, $start, $length ) );

		if ( 1 !== count( $parsed ) || $parsed[0]['attrs'] !== $old['attrs'] || $parsed[0]['innerBlocks'] !== $old['innerBlocks'] ) {
			return null;
		}

		return substr_replace( $content, serialize_block( $loop ), $start, $length );
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
	 * Error for a Saved Layout id a gallery cannot sync with.
	 *
	 * @param int $id - layout id.
	 *
	 * @return WP_Error
	 */
	public static function unknown_saved_layout( $id ) {
		return new WP_Error(
			'vpf_unknown_saved_layout',
			sprintf(
				// translators: %d - Saved Layout id.
				__( 'Saved Layout %d cannot be synced with: it does not exist, is not built from blocks, or is not published. get-gallery-options lists the Saved Layouts a gallery can sync with.', 'visual-portfolio' ),
				(int) $id
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
