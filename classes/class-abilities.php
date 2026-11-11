<?php
/**
 * Abilities API: Gallery Loop galleries for AI agents.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual_Portfolio_Abilities
 */
class Visual_Portfolio_Abilities {
	const CATEGORY = 'visual-portfolio';

	/**
	 * Most galleries one `list-galleries` page returns.
	 *
	 * @var int
	 */
	const MAX_PER_PAGE = 50;

	/**
	 * Visual_Portfolio_Abilities constructor.
	 */
	public function __construct() {
		add_action( 'wp_abilities_api_categories_init', array( $this, 'register_category' ) );
		add_action( 'wp_abilities_api_init', array( $this, 'register_abilities' ) );
	}

	/**
	 * Register the ability category.
	 */
	public function register_category() {
		wp_register_ability_category(
			self::CATEGORY,
			array(
				'label'       => __( 'Visual Portfolio', 'visual-portfolio' ),
				'description' => __( 'Create, read and change Visual Portfolio galleries built with the Gallery Loop block.', 'visual-portfolio' ),
			)
		);
	}

	/**
	 * Register the abilities.
	 */
	public function register_abilities() {
		$gallery = $this->get_gallery_schema();

		$this->register(
			'get-gallery-options',
			array(
				'label'               => __( 'Get gallery options', 'visual-portfolio' ),
				'description'         => __( 'Lists what a Visual Portfolio gallery can be made of: layouts (block patterns), content sources and settings. Call it before creating or changing a gallery.', 'visual-portfolio' ),
				'output_schema'       => $this->get_options_schema(),
				'execute_callback'    => array( $this, 'get_options' ),
				'permission_callback' => array( $this, 'can_edit_posts' ),
			),
			true
		);

		$this->register(
			'list-galleries',
			array(
				'label'               => __( 'List galleries', 'visual-portfolio' ),
				'description'         => __( 'Lists the Visual Portfolio galleries (Gallery Loop blocks) in posts, pages and templates the current user can edit.', 'visual-portfolio' ),
				'input_schema'        => array(
					'type'                 => 'object',
					'properties'           => array(
						'post_id'  => array(
							'type'        => 'integer',
							'description' => __( 'Only the galleries of this post.', 'visual-portfolio' ),
							'minimum'     => 1,
						),
						'search'   => array(
							'type'        => 'string',
							'description' => __( 'Only posts whose title contains this text.', 'visual-portfolio' ),
						),
						'page'     => array(
							'type'    => 'integer',
							'minimum' => 1,
							'default' => 1,
						),
						'per_page' => array(
							'type'    => 'integer',
							'minimum' => 1,
							'maximum' => self::MAX_PER_PAGE,
							'default' => 20,
						),
					),
					'additionalProperties' => false,
					'default'              => array(),
				),
				'output_schema'       => array(
					'type'       => 'object',
					'properties' => array(
						'galleries' => array(
							'type'  => 'array',
							'items' => $this->get_summary_schema(),
						),
						'total'     => array( 'type' => 'integer' ),
						'pages'     => array( 'type' => 'integer' ),
					),
				),
				'execute_callback'    => array( $this, 'list_galleries' ),
				'permission_callback' => array( $this, 'can_edit_posts' ),
			),
			true
		);

		$this->register(
			'get-gallery',
			array(
				'label'               => __( 'Get gallery', 'visual-portfolio' ),
				'description'         => __( 'Returns one gallery: its layout type, its source with the images or the post query, and its settings.', 'visual-portfolio' ),
				'input_schema'        => array(
					'type'                 => 'object',
					'properties'           => array(
						'post_id'    => $this->get_post_id_schema(),
						'gallery_id' => $this->get_gallery_id_schema(),
					),
					'required'             => array( 'post_id', 'gallery_id' ),
					'additionalProperties' => false,
				),
				'output_schema'       => $gallery,
				'execute_callback'    => array( $this, 'get_gallery' ),
				'permission_callback' => array( $this, 'can_edit_target_post' ),
			),
			true
		);

		$this->register(
			'create-gallery',
			array(
				'label'               => __( 'Create gallery', 'visual-portfolio' ),
				'description'         => __( 'Adds a gallery to a post, or creates a draft page holding it. The gallery starts from a layout (see get-gallery-options), takes a source and optional settings. A published post is updated at once.', 'visual-portfolio' ),
				'input_schema'        => array(
					'type'                 => 'object',
					'properties'           => array(
						'post_id'  => array(
							'type'        => 'integer',
							'description' => __( 'Post to add the gallery to. Leave out to create a draft page.', 'visual-portfolio' ),
							'minimum'     => 1,
						),
						'title'    => array(
							'type'        => 'string',
							'description' => __( 'Title of the draft page created when `post_id` is left out.', 'visual-portfolio' ),
						),
						'position' => array(
							'type'        => 'string',
							'description' => __( 'Where in the post the gallery goes.', 'visual-portfolio' ),
							'enum'        => array( 'end', 'start' ),
							'default'     => 'end',
						),
						'layout'   => array(
							'type'        => 'string',
							'description' => __( 'Layout slug from get-gallery-options.', 'visual-portfolio' ),
							'enum'        => array_keys( Visual_Portfolio_Loop_Gallery::get_layouts() ),
						),
						'source'   => $this->get_source_schema(),
						'settings' => $this->get_settings_schema(),
					),
					'required'             => array( 'layout', 'source' ),
					'additionalProperties' => false,
				),
				'output_schema'       => $gallery,
				'execute_callback'    => array( $this, 'create_gallery' ),
				'permission_callback' => array( $this, 'can_create_gallery' ),
				'meta'                => array(
					'annotations' => array(
						'readonly'    => false,
						'destructive' => false,
						'idempotent'  => false,
					),
				),
			)
		);

		$this->register(
			'update-gallery',
			array(
				'label'               => __( 'Update gallery', 'visual-portfolio' ),
				'description'         => __( 'Changes a gallery: its layout, its source, its settings, and the images of an images gallery. Fields left out stay as they are. A published post is updated at once.', 'visual-portfolio' ),
				'input_schema'        => array(
					'type'                 => 'object',
					'properties'           => array(
						'post_id'       => $this->get_post_id_schema(),
						'gallery_id'    => $this->get_gallery_id_schema(),
						'layout'        => array(
							'type'        => 'string',
							'description' => __( 'New layout slug. The gallery keeps its source and settings.', 'visual-portfolio' ),
							'enum'        => array_keys( Visual_Portfolio_Loop_Gallery::get_layouts() ),
						),
						'source'        => $this->get_source_schema(),
						'settings'      => $this->get_settings_schema(),
						'add_images'    => array(
							'type'        => 'array',
							'description' => __( 'Images to add at the end. An image the gallery already has is skipped.', 'visual-portfolio' ),
							'items'       => $this->get_image_schema(),
						),
						'remove_images' => array(
							'type'        => 'array',
							'description' => __( 'Attachment ids of the images to remove.', 'visual-portfolio' ),
							'items'       => array( 'type' => 'integer' ),
						),
						'order'         => array(
							'type'        => 'array',
							'description' => __( 'Attachment ids in the new order. Images left out follow, in their current order.', 'visual-portfolio' ),
							'items'       => array( 'type' => 'integer' ),
						),
					),
					'required'             => array( 'post_id', 'gallery_id' ),
					'additionalProperties' => false,
				),
				'output_schema'       => $gallery,
				'execute_callback'    => array( $this, 'update_gallery' ),
				'permission_callback' => array( $this, 'can_edit_target_post' ),
				'meta'                => array(
					'annotations' => array(
						'readonly'    => false,
						'destructive' => true,
						'idempotent'  => true,
					),
				),
			)
		);
	}

	/**
	 * Register one ability of the plugin.
	 *
	 * @param string $name - name without the namespace.
	 * @param array  $args - ability arguments.
	 * @param bool   $read_only - whether it only reads.
	 */
	private function register( $name, $args, $read_only = false ) {
		$args['category']       = self::CATEGORY;
		$args['meta']           = $args['meta'] ?? array();
		$args['meta']['public'] = true;

		// Releases of the MCP Adapter before WordPress 7.1's `public` read only
		// their own flag.
		$args['meta']['mcp'] = array( 'public' => true );

		if ( $read_only ) {
			$args['meta']['annotations'] = array(
				'readonly'    => true,
				'destructive' => false,
				'idempotent'  => true,
			);
		}

		wp_register_ability( 'visual-portfolio/' . $name, $args );
	}

	/**
	 * Permission: may edit posts at all.
	 *
	 * @return bool
	 */
	public function can_edit_posts() {
		return current_user_can( 'edit_posts' );
	}

	/**
	 * Permission: may edit the post the input names.
	 *
	 * @param array $input - ability input.
	 *
	 * @return bool
	 */
	public function can_edit_target_post( $input ) {
		return current_user_can( 'edit_post', (int) ( $input['post_id'] ?? 0 ) );
	}

	/**
	 * Permission: may edit the post the input names, or create a page.
	 *
	 * @param array $input - ability input.
	 *
	 * @return bool
	 */
	public function can_create_gallery( $input ) {
		if ( ! empty( $input['post_id'] ) ) {
			return $this->can_edit_target_post( $input );
		}

		$page = get_post_type_object( 'page' );

		return $page && current_user_can( $page->cap->create_posts );
	}

	/**
	 * Execute `get-gallery-options`.
	 *
	 * @return array
	 */
	public function get_options() {
		$vocabulary = Visual_Portfolio_Loop_Gallery::get_vocabulary();
		$layouts    = array();
		$sources    = array();
		$settings   = array();

		foreach ( Visual_Portfolio_Loop_Gallery::get_layouts() as $slug => $layout ) {
			$layouts[] = array(
				'slug'        => $slug,
				'title'       => $layout['title'],
				'description' => $layout['description'],
				'source'      => $layout['source'],
				'layout_type' => Visual_Portfolio_Loop_Gallery::describe( $layout['loop'] )['layout_type'],
			);
		}

		foreach ( $vocabulary['sources'] as $type => $source ) {
			$item = array(
				'type'         => $type,
				'label'        => $source['label'],
				'description'  => $source['description'],
				'available'    => (bool) $source['available'],
				'requires_pro' => (bool) $source['requires_pro'],
			);

			if ( $item['requires_pro'] ) {
				$item['pro_url'] = Visual_Portfolio_Loop_Gallery::get_pro_url();
			}

			$sources[] = $item;
		}

		foreach ( $vocabulary['settings'] as $key => $setting ) {
			$settings[] = array(
				'key'         => $key,
				'description' => $setting['description'],
				'schema'      => $setting['schema'],
			);
		}

		return array(
			'layouts'  => $layouts,
			'sources'  => $sources,
			'settings' => $settings,
		);
	}

	/**
	 * Execute `list-galleries`.
	 *
	 * @param array $input - ability input.
	 *
	 * @return array
	 */
	public function list_galleries( $input ) {
		global $wpdb;

		$input      = (array) $input;
		$page       = max( 1, (int) ( $input['page'] ?? 1 ) );
		$per_page   = min( self::MAX_PER_PAGE, max( 1, (int) ( $input['per_page'] ?? 20 ) ) );
		$post_types = $this->get_editable_post_types();
		$post_id    = (int) ( $input['post_id'] ?? 0 );

		// The marker of a loop sits in the content of the post; no query var
		// of `WP_Query` matches on it.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$post_ids = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT ID FROM {$wpdb->posts} WHERE post_type IN (" . implode( ', ', array_fill( 0, count( $post_types ), '%s' ) ) . ") AND post_status NOT IN ('trash', 'auto-draft', 'inherit') AND post_content LIKE %s AND post_title LIKE %s AND ( 0 = %d OR ID = %d ) ORDER BY post_modified_gmt DESC, ID DESC",
				array_merge(
					$post_types,
					array(
						'%' . $wpdb->esc_like( '<!-- wp:' . Visual_Portfolio_Loop_Gallery::LOOP . ' ' ) . '%',
						'%' . $wpdb->esc_like( (string) ( $input['search'] ?? '' ) ) . '%',
						$post_id,
						$post_id,
					)
				)
			)
		);

		$galleries = array();

		foreach ( $post_ids as $post_id ) {
			if ( ! current_user_can( 'edit_post', (int) $post_id ) ) {
				continue;
			}

			$post = get_post( (int) $post_id );

			foreach ( Visual_Portfolio_Loop_Gallery::find_loops( parse_blocks( $post->post_content ) ) as $index => $found ) {
				$described = Visual_Portfolio_Loop_Gallery::describe( $found['block'] );
				$images    = $described['source']['images'] ?? null;

				$galleries[] = array_merge(
					$this->get_post_fields( $post ),
					array(
						'gallery_id'  => Visual_Portfolio_Loop_Gallery::get_gallery_id( $found['block'], $index ),
						'source_type' => $described['source']['type'],
						'layout_type' => $described['layout_type'],
						'image_count' => null === $images ? null : count( $images ),
					)
				);
			}
		}

		return array(
			'galleries' => array_slice( $galleries, ( $page - 1 ) * $per_page, $per_page ),
			'total'     => count( $galleries ),
			'pages'     => (int) ceil( count( $galleries ) / $per_page ),
		);
	}

	/**
	 * Execute `get-gallery`.
	 *
	 * @param array $input - ability input.
	 *
	 * @return array|WP_Error
	 */
	public function get_gallery( $input ) {
		$post = $this->get_target_post( $input['post_id'] );

		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$found = Visual_Portfolio_Loop_Gallery::find_loop( parse_blocks( $post->post_content ), $input['gallery_id'] );

		if ( ! $found ) {
			return $this->gallery_not_found( $post, $input['gallery_id'] );
		}

		return $this->get_gallery_output( $post, $found['block'] );
	}

	/**
	 * Execute `create-gallery`.
	 *
	 * @param array $input - ability input.
	 *
	 * @return array|WP_Error
	 */
	public function create_gallery( $input ) {
		$checked = $this->check_input( $input );

		if ( is_wp_error( $checked ) ) {
			return $checked;
		}

		$post = null;

		if ( ! empty( $input['post_id'] ) ) {
			$post = $this->get_target_post( $input['post_id'] );

			if ( is_wp_error( $post ) ) {
				return $post;
			}
		}

		$content = $post ? $post->post_content : '';
		$loop    = Visual_Portfolio_Loop_Gallery::create( $input['layout'], $input, parse_blocks( $content ) );

		if ( is_wp_error( $loop ) ) {
			return $loop;
		}

		$content = Visual_Portfolio_Loop_Gallery::insert_into_content( $content, $loop, $input['position'] ?? 'end' );

		if ( $post ) {
			$saved = wp_update_post(
				wp_slash(
					array(
						'ID'           => $post->ID,
						'post_content' => $content,
					)
				),
				true
			);
		} else {
			$saved = wp_insert_post(
				wp_slash(
					array(
						'post_type'    => 'page',
						'post_status'  => 'draft',
						'post_title'   => $input['title'] ?? __( 'Gallery', 'visual-portfolio' ),
						'post_content' => $content,
					)
				),
				true
			);
		}

		if ( is_wp_error( $saved ) ) {
			return $saved;
		}

		return $this->get_saved_gallery( $saved, $loop['attrs']['block_id'] );
	}

	/**
	 * Execute `update-gallery`.
	 *
	 * @param array $input - ability input.
	 *
	 * @return array|WP_Error
	 */
	public function update_gallery( $input ) {
		$checked = $this->check_input( $input );

		if ( is_wp_error( $checked ) ) {
			return $checked;
		}

		$post = $this->get_target_post( $input['post_id'] );

		if ( is_wp_error( $post ) ) {
			return $post;
		}

		$blocks = parse_blocks( $post->post_content );
		$found  = Visual_Portfolio_Loop_Gallery::find_loop( $blocks, $input['gallery_id'] );

		if ( ! $found ) {
			return $this->gallery_not_found( $post, $input['gallery_id'] );
		}

		$loop = Visual_Portfolio_Loop_Gallery::update( $found['block'], $input, $blocks );

		if ( is_wp_error( $loop ) ) {
			return $loop;
		}

		$content = serialize_blocks( Visual_Portfolio_Loop_Gallery::replace_at( $blocks, $found['path'], $loop ) );

		if ( $content !== $post->post_content ) {
			$saved = wp_update_post(
				wp_slash(
					array(
						'ID'           => $post->ID,
						'post_content' => $content,
					)
				),
				true
			);

			if ( is_wp_error( $saved ) ) {
				return $saved;
			}
		}

		return $this->get_saved_gallery( $post->ID, $loop['attrs']['block_id'] );
	}

	/**
	 * Check what the input schema cannot: that images are images the user may
	 * read, and that a post type is one a gallery can show.
	 *
	 * @param array $input - ability input.
	 *
	 * @return true|WP_Error
	 */
	private function check_input( $input ) {
		$images = array_merge( $input['source']['images'] ?? array(), $input['add_images'] ?? array() );

		foreach ( $images as $image ) {
			$id = (int) $image['id'];

			if ( 'attachment' !== get_post_type( $id ) || ! wp_attachment_is_image( $id ) || ! current_user_can( 'read_post', $id ) ) {
				return new WP_Error(
					'vpf_invalid_image',
					// translators: %d - attachment id.
					sprintf( __( 'Image %d is not an image attachment the current user can read.', 'visual-portfolio' ), $id )
				);
			}
		}

		if ( 'posts' === ( $input['source']['type'] ?? '' ) && isset( $input['source']['post_type'] ) ) {
			$post_type = $input['source']['post_type'];

			if ( ! post_type_exists( $post_type ) || ! is_post_type_viewable( $post_type ) ) {
				return new WP_Error(
					'vpf_invalid_post_type',
					// translators: %s - post type.
					sprintf( __( 'Post type `%s` does not exist or has no public pages.', 'visual-portfolio' ), $post_type )
				);
			}
		}

		return true;
	}

	/**
	 * The post an input names, if galleries can live in it.
	 *
	 * @param int $post_id - post id.
	 *
	 * @return WP_Post|WP_Error
	 */
	private function get_target_post( $post_id ) {
		$post = get_post( (int) $post_id );

		if ( ! $post || ! in_array( $post->post_type, $this->get_editable_post_types(), true ) || in_array( $post->post_status, array( 'trash', 'auto-draft', 'inherit' ), true ) ) {
			return new WP_Error(
				'vpf_invalid_post',
				// translators: %d - post id.
				sprintf( __( 'Post %d does not exist, is in the trash, or cannot hold blocks.', 'visual-portfolio' ), (int) $post_id ),
				array( 'status' => 404 )
			);
		}

		return $post;
	}

	/**
	 * Post types whose content is edited as blocks.
	 *
	 * @return array
	 */
	private function get_editable_post_types() {
		return array_values(
			array_filter(
				get_post_types( array( 'show_in_rest' => true ) ),
				function ( $post_type ) {
					return 'attachment' !== $post_type && post_type_supports( $post_type, 'editor' );
				}
			)
		);
	}

	/**
	 * A gallery read back from the post it was saved in.
	 *
	 * @param int    $post_id - post id.
	 * @param string $block_id - loop block id.
	 *
	 * @return array|WP_Error
	 */
	private function get_saved_gallery( $post_id, $block_id ) {
		$post  = get_post( $post_id );
		$found = Visual_Portfolio_Loop_Gallery::find_loop( parse_blocks( $post->post_content ), $block_id );

		// A save hook may drop what was written.
		if ( ! $found ) {
			return $this->gallery_not_found( $post, $block_id );
		}

		return $this->get_gallery_output( $post, $found['block'] );
	}

	/**
	 * Output of a gallery.
	 *
	 * @param WP_Post $post - post.
	 * @param array   $loop - loop block.
	 *
	 * @return array
	 */
	private function get_gallery_output( $post, $loop ) {
		$index = 0;

		foreach ( Visual_Portfolio_Loop_Gallery::find_loops( parse_blocks( $post->post_content ) ) as $position => $found ) {
			if ( $found['block']['attrs'] === $loop['attrs'] ) {
				$index = $position;
				break;
			}
		}

		return array_merge(
			$this->get_post_fields( $post ),
			array( 'gallery_id' => Visual_Portfolio_Loop_Gallery::get_gallery_id( $loop, $index ) ),
			Visual_Portfolio_Loop_Gallery::describe( $loop )
		);
	}

	/**
	 * Fields of the post a gallery is in.
	 *
	 * @param WP_Post $post - post.
	 *
	 * @return array
	 */
	private function get_post_fields( $post ) {
		$view_url = 'publish' === $post->post_status ? get_permalink( $post ) : get_preview_post_link( $post );

		return array(
			'post_id'     => $post->ID,
			'post_title'  => get_the_title( $post ),
			'post_type'   => $post->post_type,
			'post_status' => $post->post_status,
			'edit_url'    => (string) get_edit_post_link( $post->ID, 'raw' ),
			'view_url'    => (string) $view_url,
		);
	}

	/**
	 * Error for a gallery id the post has no loop for.
	 *
	 * @param WP_Post $post - post.
	 * @param string  $gallery_id - gallery id.
	 *
	 * @return WP_Error
	 */
	private function gallery_not_found( $post, $gallery_id ) {
		$ids = array();

		foreach ( Visual_Portfolio_Loop_Gallery::find_loops( parse_blocks( $post->post_content ) ) as $index => $found ) {
			$ids[] = Visual_Portfolio_Loop_Gallery::get_gallery_id( $found['block'], $index );
		}

		return new WP_Error(
			'vpf_gallery_not_found',
			sprintf(
				// translators: %1$s - gallery id, %2$d - post id, %3$s - list of gallery ids.
				__( 'No gallery `%1$s` in post %2$d. Its galleries: %3$s.', 'visual-portfolio' ),
				$gallery_id,
				$post->ID,
				empty( $ids ) ? __( 'none', 'visual-portfolio' ) : implode( ', ', $ids )
			),
			array( 'status' => 404 )
		);
	}

	/**
	 * Schema of a post id input.
	 *
	 * @return array
	 */
	private function get_post_id_schema() {
		return array(
			'type'        => 'integer',
			'description' => __( 'Id of the post, page or template the gallery is in.', 'visual-portfolio' ),
			'minimum'     => 1,
		);
	}

	/**
	 * Schema of a gallery id input.
	 *
	 * @return array
	 */
	private function get_gallery_id_schema() {
		return array(
			'type'        => 'string',
			'description' => __( 'Gallery id from list-galleries.', 'visual-portfolio' ),
			'minLength'   => 1,
		);
	}

	/**
	 * Schema of an image input.
	 *
	 * @return array
	 */
	private function get_image_schema() {
		return array(
			'type'                 => 'object',
			'properties'           => array(
				'id'          => array(
					'type'        => 'integer',
					'description' => __( 'Image attachment id.', 'visual-portfolio' ),
					'minimum'     => 1,
				),
				'title'       => array( 'type' => 'string' ),
				'description' => array( 'type' => 'string' ),
				'alt'         => array( 'type' => 'string' ),
				'link'        => array(
					'type'        => 'string',
					'description' => __( 'URL the item links to.', 'visual-portfolio' ),
					'format'      => 'uri',
				),
			),
			'required'             => array( 'id' ),
			'additionalProperties' => false,
		);
	}

	/**
	 * Schema of a source input, from the vocabulary.
	 *
	 * @return array
	 */
	private function get_source_schema() {
		$vocabulary = Visual_Portfolio_Loop_Gallery::get_vocabulary();
		$properties = array(
			'type'      => array(
				'type'        => 'string',
				'description' => __( 'Source type from get-gallery-options.', 'visual-portfolio' ),
				'enum'        => array_keys( $vocabulary['sources'] ),
			),
			'images'    => array(
				'type'        => 'array',
				'description' => __( 'Images of an `images` source.', 'visual-portfolio' ),
				'items'       => $this->get_image_schema(),
			),
			'post_type' => array(
				'type'        => 'string',
				'description' => __( 'Post type of a `posts` source.', 'visual-portfolio' ),
			),
			'ids'       => array(
				'type'        => 'array',
				'description' => __( 'Post ids of a `posts` source, shown in this order instead of a query.', 'visual-portfolio' ),
				'items'       => array( 'type' => 'integer' ),
			),
			'terms'     => array(
				'type'        => 'array',
				'description' => __( 'Term ids a `posts` source is limited to.', 'visual-portfolio' ),
				'items'       => array( 'type' => 'integer' ),
			),
			'order_by'  => array(
				'type' => 'string',
				'enum' => array( 'post_date', 'title', 'id', 'comment_count', 'modified', 'menu_order', 'post__in', 'rand' ),
			),
			'order'     => array(
				'type' => 'string',
				'enum' => array( 'asc', 'desc' ),
			),
		);

		foreach ( $vocabulary['sources'] as $source ) {
			if ( ! empty( $source['schema']['properties'] ) ) {
				$properties = array_merge( $properties, $source['schema']['properties'] );
			}
		}

		return array(
			'type'        => 'object',
			'description' => __( 'What the gallery shows. See the sources of get-gallery-options for what each type takes.', 'visual-portfolio' ),
			'properties'  => $properties,
			'required'    => array( 'type' ),
		);
	}

	/**
	 * Schema of a settings input, from the vocabulary.
	 *
	 * @return array
	 */
	private function get_settings_schema() {
		$properties = array();

		foreach ( Visual_Portfolio_Loop_Gallery::get_vocabulary()['settings'] as $key => $setting ) {
			$properties[ $key ] = array_merge( array( 'description' => $setting['description'] ), $setting['schema'] );
		}

		return array(
			'type'                 => 'object',
			'properties'           => $properties,
			'additionalProperties' => false,
		);
	}

	/**
	 * Schema of the post fields of a gallery.
	 *
	 * @return array
	 */
	private function get_post_fields_schema() {
		return array(
			'post_id'     => array( 'type' => 'integer' ),
			'post_title'  => array( 'type' => 'string' ),
			'post_type'   => array( 'type' => 'string' ),
			'post_status' => array( 'type' => 'string' ),
			'edit_url'    => array( 'type' => 'string' ),
			'view_url'    => array( 'type' => 'string' ),
			'gallery_id'  => array( 'type' => 'string' ),
		);
	}

	/**
	 * Schema of a gallery in a list.
	 *
	 * @return array
	 */
	private function get_summary_schema() {
		return array(
			'type'       => 'object',
			'properties' => array_merge(
				$this->get_post_fields_schema(),
				array(
					'source_type' => array( 'type' => 'string' ),
					'layout_type' => array( 'type' => 'string' ),
					'image_count' => array( 'type' => array( 'integer', 'null' ) ),
				)
			),
		);
	}

	/**
	 * Schema of a gallery.
	 *
	 * @return array
	 */
	private function get_gallery_schema() {
		return array(
			'type'       => 'object',
			'properties' => array_merge(
				$this->get_post_fields_schema(),
				array(
					'layout_type' => array( 'type' => 'string' ),
					'source'      => array( 'type' => 'object' ),
					'settings'    => array( 'type' => 'object' ),
				)
			),
		);
	}

	/**
	 * Schema of the gallery options.
	 *
	 * @return array
	 */
	private function get_options_schema() {
		return array(
			'type'       => 'object',
			'properties' => array(
				'layouts'  => array(
					'type'  => 'array',
					'items' => array(
						'type'       => 'object',
						'properties' => array(
							'slug'        => array( 'type' => 'string' ),
							'title'       => array( 'type' => 'string' ),
							'description' => array( 'type' => 'string' ),
							'source'      => array( 'type' => 'string' ),
							'layout_type' => array( 'type' => 'string' ),
						),
					),
				),
				'sources'  => array(
					'type'  => 'array',
					'items' => array(
						'type'       => 'object',
						'properties' => array(
							'type'         => array( 'type' => 'string' ),
							'label'        => array( 'type' => 'string' ),
							'description'  => array( 'type' => 'string' ),
							'available'    => array( 'type' => 'boolean' ),
							'requires_pro' => array( 'type' => 'boolean' ),
							'pro_url'      => array( 'type' => 'string' ),
						),
					),
				),
				'settings' => array(
					'type'  => 'array',
					'items' => array(
						'type'       => 'object',
						'properties' => array(
							'key'         => array( 'type' => 'string' ),
							'description' => array( 'type' => 'string' ),
							'schema'      => array( 'type' => 'object' ),
						),
					),
				),
			),
		);
	}
}
new Visual_Portfolio_Abilities();
