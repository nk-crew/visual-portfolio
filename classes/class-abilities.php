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
	 * Most items one page of a list or a search returns.
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
				'description'         => __( 'Lists what a Visual Portfolio gallery can be made of: layouts (block patterns), content sources, settings, and the Saved Layouts a gallery can sync with. Call it before creating or changing a gallery.', 'visual-portfolio' ),
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
			'find-images',
			array(
				'label'               => __( 'Find images', 'visual-portfolio' ),
				'description'         => __( 'Finds images in the Media Library, newest first, to use as the images of a gallery. A page can hold fewer than `per_page` images the current user may see; ask for the next page while `has_more` is true.', 'visual-portfolio' ),
				'input_schema'        => array(
					'type'                 => 'object',
					'properties'           => array(
						'search'          => array(
							'type'        => 'string',
							'description' => __( 'Words in the title, caption, description or file name.', 'visual-portfolio' ),
						),
						'uploaded_after'  => array(
							'type'        => 'string',
							'description' => __( 'Only images uploaded on or after this date, YYYY-MM-DD, in the site\'s timezone.', 'visual-portfolio' ),
							'pattern'     => '^\\d{4}-\\d{2}-\\d{2}$',
						),
						'uploaded_before' => array(
							'type'        => 'string',
							'description' => __( 'Only images uploaded on or before this date, YYYY-MM-DD, in the site\'s timezone.', 'visual-portfolio' ),
							'pattern'     => '^\\d{4}-\\d{2}-\\d{2}$',
						),
						'mine'            => array(
							'type'        => 'boolean',
							'description' => __( 'Only images the current user uploaded.', 'visual-portfolio' ),
						),
						'order'           => array(
							'type'    => 'string',
							'enum'    => array( 'newest', 'oldest' ),
							'default' => 'newest',
						),
						'page'            => $this->get_page_schema(),
						'per_page'        => $this->get_per_page_schema(),
					),
					'additionalProperties' => false,
					'default'              => array(),
				),
				'output_schema'       => $this->get_found_schema(
					'images',
					array(
						'id'       => array( 'type' => 'integer' ),
						'title'    => array( 'type' => 'string' ),
						'alt'      => array( 'type' => 'string' ),
						'caption'  => array( 'type' => 'string' ),
						'filename' => array( 'type' => 'string' ),
						'url'      => array( 'type' => 'string' ),
						'width'    => array( 'type' => 'integer' ),
						'height'   => array( 'type' => 'integer' ),
						'uploaded' => array( 'type' => 'string' ),
					)
				),
				'execute_callback'    => array( $this, 'find_images' ),
				'permission_callback' => array( $this, 'can_upload_files' ),
			),
			true
		);

		$this->register(
			'find-posts',
			array(
				'label'               => __( 'Find posts', 'visual-portfolio' ),
				'description'         => __( 'Finds published posts, pages or projects, newest first, to show in a gallery by their ids. A page can hold fewer than `per_page` posts; ask for the next page while `has_more` is true.', 'visual-portfolio' ),
				'input_schema'        => array(
					'type'                 => 'object',
					'properties'           => array(
						'post_type' => array(
							'type'        => 'string',
							'description' => __( 'Post type, such as post, page or portfolio.', 'visual-portfolio' ),
							'default'     => 'post',
						),
						'search'    => array(
							'type'        => 'string',
							'description' => __( 'Words in the title or content.', 'visual-portfolio' ),
						),
						'terms'     => array(
							'type'        => 'array',
							'description' => __( 'Only posts in any of these term ids, from find-terms.', 'visual-portfolio' ),
							'items'       => array( 'type' => 'integer' ),
						),
						'page'      => $this->get_page_schema(),
						'per_page'  => $this->get_per_page_schema(),
					),
					'additionalProperties' => false,
					'default'              => array(),
				),
				'output_schema'       => $this->get_found_schema(
					'posts',
					array(
						'id'             => array( 'type' => 'integer' ),
						'title'          => array( 'type' => 'string' ),
						'post_type'      => array( 'type' => 'string' ),
						'date'           => array( 'type' => 'string' ),
						'url'            => array( 'type' => 'string' ),
						'featured_image' => array( 'type' => array( 'integer', 'null' ) ),
					)
				),
				'execute_callback'    => array( $this, 'find_posts' ),
				'permission_callback' => array( $this, 'can_edit_posts' ),
			),
			true
		);

		$this->register(
			'find-terms',
			array(
				'label'               => __( 'Find terms', 'visual-portfolio' ),
				'description'         => __( 'Finds categories, tags and other public terms, to limit a posts gallery to them.', 'visual-portfolio' ),
				'input_schema'        => array(
					'type'                 => 'object',
					'properties'           => array(
						'taxonomy'  => array(
							'type'        => 'string',
							'description' => __( 'Only terms of this taxonomy, such as category, post_tag or portfolio_category.', 'visual-portfolio' ),
						),
						'post_type' => array(
							'type'        => 'string',
							'description' => __( 'Only terms of the taxonomies of this post type, the ones a posts gallery of that type can be limited to.', 'visual-portfolio' ),
						),
						'search'    => array(
							'type'        => 'string',
							'description' => __( 'Words in the term name.', 'visual-portfolio' ),
						),
						'page'      => $this->get_page_schema(),
						'per_page'  => $this->get_per_page_schema(),
					),
					'additionalProperties' => false,
					'default'              => array(),
				),
				'output_schema'       => $this->get_found_schema(
					'terms',
					array(
						'id'       => array( 'type' => 'integer' ),
						'name'     => array( 'type' => 'string' ),
						'slug'     => array( 'type' => 'string' ),
						'taxonomy' => array( 'type' => 'string' ),
						'count'    => array( 'type' => 'integer' ),
					)
				),
				'execute_callback'    => array( $this, 'find_terms' ),
				'permission_callback' => array( $this, 'can_edit_posts' ),
			),
			true
		);

		$this->register(
			'get-gallery',
			array(
				'label'               => __( 'Get gallery', 'visual-portfolio' ),
				'description'         => __( 'Returns one gallery as the page shows it: its layout type, its source with the images or the post query, its settings, and the Saved Layout it is synced with.', 'visual-portfolio' ),
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
				'description'         => __( 'Adds a gallery to a post, or creates a draft holding it: a page, or a post for a user who cannot create pages. The gallery starts from a layout (see get-gallery-options), takes a source and optional settings. A published post is updated at once.', 'visual-portfolio' ),
				'input_schema'        => array(
					'type'                 => 'object',
					'properties'           => array(
						'post_id'      => array(
							'type'        => 'integer',
							'description' => __( 'Post to add the gallery to. Leave out to create a draft.', 'visual-portfolio' ),
							'minimum'     => 1,
						),
						'title'        => array(
							'type'        => 'string',
							'description' => __( 'Title of the draft created when `post_id` is left out.', 'visual-portfolio' ),
						),
						'position'     => array(
							'type'        => 'string',
							'description' => __( 'Where in the post the gallery goes.', 'visual-portfolio' ),
							'enum'        => array( 'end', 'start' ),
							'default'     => 'end',
						),
						'layout'       => array(
							'type'        => 'string',
							'description' => __( 'Layout slug from get-gallery-options.', 'visual-portfolio' ),
							'enum'        => array_keys( Visual_Portfolio_Loop_Gallery::get_layouts() ),
						),
						'source'       => $this->get_source_schema(),
						'settings'     => $this->get_settings_schema(),
						'saved_layout' => array(
							'type'        => 'integer',
							'description' => __( 'Id of a Saved Layout from get-gallery-options to sync the gallery with. The Saved Layout then provides the item blocks, the columns and the lightbox; `layout` still provides the blocks around them, and `settings` that differ from the Saved Layout\'s become changes of this gallery.', 'visual-portfolio' ),
							'minimum'     => 1,
						),
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
				'description'         => __( 'Changes a gallery: the Saved Layout it is synced with, its layout, its source, its settings, and the images of an images gallery. Fields left out stay as they are. On a gallery synced with a Saved Layout, a setting the Saved Layout provides becomes a change of this gallery, as in the editor. A published post is updated at once.', 'visual-portfolio' ),
				'input_schema'        => array(
					'type'                 => 'object',
					'properties'           => array(
						'post_id'       => $this->get_post_id_schema(),
						'gallery_id'    => $this->get_gallery_id_schema(),
						'saved_layout'  => array(
							'type'        => array( 'integer', 'null' ),
							'description' => __( 'Id of a Saved Layout from get-gallery-options to sync the gallery with: the gallery takes its item blocks, columns and lightbox, and keeps its source. `null` (or 0) detaches the gallery, which keeps its current look. Applied before the other fields.', 'visual-portfolio' ),
							'minimum'     => 0,
						),
						'layout'        => array(
							'type'        => 'string',
							'description' => __( 'New layout slug. The gallery keeps its source, columns, lightbox and items per page unless `settings` changes them; the blocks inside the gallery come from the new layout. Refused on a gallery synced with a Saved Layout unless the same call detaches it.', 'visual-portfolio' ),
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
	 * Permission: may edit the post the input names, or create the draft a
	 * gallery without a post goes into.
	 *
	 * @param array $input - ability input.
	 *
	 * @return bool
	 */
	public function can_create_gallery( $input ) {
		if ( ! empty( $input['post_id'] ) ) {
			return $this->can_edit_target_post( $input );
		}

		return null !== $this->get_new_post_type();
	}

	/**
	 * Post type of the draft a gallery without a post goes into: a page, or
	 * a post for a user who may write posts but not pages.
	 *
	 * @return string|null
	 */
	private function get_new_post_type() {
		foreach ( array( 'page', 'post' ) as $post_type ) {
			$object = get_post_type_object( $post_type );

			if ( $object && current_user_can( $object->cap->create_posts ) ) {
				return $post_type;
			}
		}

		return null;
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
			'layouts'       => $layouts,
			'sources'       => $sources,
			'settings'      => $settings,
			'saved_layouts' => $this->get_saved_layout_choices(),
		);
	}

	/**
	 * Saved Layouts the current user can sync a gallery with, the ones the
	 * editor's Saved Layout panel offers.
	 *
	 * @return array list of array( id, title ).
	 */
	private function get_saved_layout_choices() {
		$response = rest_do_request( new WP_REST_Request( 'GET', '/visual-portfolio/v1/saved-layouts/choices' ) );
		$choices  = array();

		if ( $response->is_error() ) {
			return $choices;
		}

		foreach ( (array) $response->get_data() as $choice ) {
			$choices[] = array(
				'id'    => (int) $choice['id'],
				'title' => (string) $choice['title'],
			);
		}

		return $choices;
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

		_prime_post_caches( array_map( 'intval', $post_ids ), false, false );

		$galleries = array();

		foreach ( $post_ids as $post_id ) {
			if ( ! current_user_can( 'edit_post', (int) $post_id ) ) {
				continue;
			}

			$post = get_post( (int) $post_id );

			foreach ( Visual_Portfolio_Loop_Gallery::find_loops( parse_blocks( $post->post_content ) ) as $found ) {
				$described = Visual_Portfolio_Loop_Gallery::describe( $found['block'] );
				$images    = $described['source']['images'] ?? null;

				$galleries[] = array_merge(
					$this->get_post_fields( $post ),
					array(
						'gallery_id'  => $found['gallery_id'],
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
	 * Permission: may browse the Media Library.
	 *
	 * @return bool
	 */
	public function can_upload_files() {
		return current_user_can( 'upload_files' );
	}

	/**
	 * Execute `find-images`.
	 *
	 * @param array $input - ability input.
	 *
	 * @return array
	 */
	public function find_images( $input ) {
		$input = (array) $input;
		$date  = array();

		if ( ! empty( $input['uploaded_after'] ) ) {
			$date['after'] = $input['uploaded_after'];
		}

		if ( ! empty( $input['uploaded_before'] ) ) {
			$date['before'] = $input['uploaded_before'];
		}

		// The Media Library's search reaches file names the same way; core
		// removes the filter once the query has run.
		if ( ! empty( $input['search'] ) ) {
			add_filter( 'wp_allow_query_attachment_by_filename', '__return_true' );
		}

		$query = $this->find(
			$input,
			array(
				'post_type'      => 'attachment',
				'post_status'    => 'inherit',
				'post_mime_type' => 'image',
				's'              => $input['search'] ?? '',
				'author'         => empty( $input['mine'] ) ? '' : get_current_user_id(),
				'date_query'     => empty( $date ) ? array() : array( array_merge( $date, array( 'inclusive' => true ) ) ),
			)
		);

		$images = array();

		foreach ( $query['posts'] as $image ) {
			$meta     = wp_get_attachment_metadata( $image->ID );
			$images[] = array(
				'id'       => $image->ID,
				'title'    => $image->post_title,
				'alt'      => (string) get_post_meta( $image->ID, '_wp_attachment_image_alt', true ),
				'caption'  => $image->post_excerpt,
				'filename' => wp_basename( (string) get_attached_file( $image->ID ) ),
				'url'      => (string) wp_get_attachment_url( $image->ID ),
				'width'    => (int) ( $meta['width'] ?? 0 ),
				'height'   => (int) ( $meta['height'] ?? 0 ),
				'uploaded' => get_post_time( 'Y-m-d', false, $image ),
			);
		}

		return array(
			'images'   => $images,
			'has_more' => $query['has_more'],
		);
	}

	/**
	 * Execute `find-posts`.
	 *
	 * @param array $input - ability input.
	 *
	 * @return array|WP_Error
	 */
	public function find_posts( $input ) {
		$input     = (array) $input;
		$post_type = $input['post_type'] ?? 'post';

		if ( ! post_type_exists( $post_type ) || ! is_post_type_viewable( $post_type ) ) {
			return new WP_Error(
				'vpf_invalid_post_type',
				// translators: %s - post type.
				sprintf( __( 'Post type `%s` does not exist or has no public pages.', 'visual-portfolio' ), $post_type )
			);
		}

		$args = array(
			'post_type'   => $post_type,
			'post_status' => 'publish',
			's'           => $input['search'] ?? '',
		);

		if ( ! empty( $input['terms'] ) ) {
			$by_taxonomy = array();

			foreach ( array_map( 'intval', $input['terms'] ) as $term_id ) {
				$term = get_term( $term_id );

				if ( $term instanceof WP_Term && is_object_in_taxonomy( $post_type, $term->taxonomy ) ) {
					$by_taxonomy[ $term->taxonomy ][] = $term_id;
				}
			}

			// No term the post type can carry matches no post, as the editor's preview shows.
			if ( empty( $by_taxonomy ) ) {
				return array(
					'posts'    => array(),
					'has_more' => false,
				);
			}

			$tax_query = array( 'relation' => 'OR' );

			foreach ( $by_taxonomy as $taxonomy => $term_ids ) {
				$tax_query[] = array(
					'taxonomy' => $taxonomy,
					'field'    => 'term_id',
					'terms'    => $term_ids,
				);
			}

			$args['tax_query'] = $tax_query; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
		}

		$query = $this->find( $input, $args );
		$posts = array();

		foreach ( $query['posts'] as $post ) {
			$posts[] = array(
				'id'             => $post->ID,
				'title'          => get_post_field( 'post_title', $post, 'raw' ),
				'post_type'      => $post->post_type,
				'date'           => get_post_time( 'Y-m-d', false, $post ),
				'url'            => (string) get_permalink( $post ),
				'featured_image' => get_post_thumbnail_id( $post ) ? (int) get_post_thumbnail_id( $post ) : null,
			);
		}

		return array(
			'posts'    => $posts,
			'has_more' => $query['has_more'],
		);
	}

	/**
	 * Execute `find-terms`.
	 *
	 * @param array $input - ability input.
	 *
	 * @return array|WP_Error
	 */
	public function find_terms( $input ) {
		$input      = (array) $input;
		$taxonomies = get_taxonomies( array( 'public' => true ) );

		// The editor offers every taxonomy of the post type a gallery shows.
		if ( ! empty( $input['post_type'] ) ) {
			$taxonomies = array_combine( get_object_taxonomies( $input['post_type'] ), get_object_taxonomies( $input['post_type'] ) );
		}

		if ( ! empty( $input['taxonomy'] ) ) {
			if ( ! isset( $taxonomies[ $input['taxonomy'] ] ) ) {
				return new WP_Error(
					'vpf_invalid_taxonomy',
					sprintf(
						// translators: %1$s - taxonomy, %2$s - list of taxonomies.
						__( 'Unknown taxonomy `%1$s`. Taxonomies of this site: %2$s.', 'visual-portfolio' ),
						$input['taxonomy'],
						implode( ', ', array_keys( $taxonomies ) )
					)
				);
			}

			$taxonomies = array( $input['taxonomy'] );
		}

		$page     = max( 1, (int) ( $input['page'] ?? 1 ) );
		$per_page = min( self::MAX_PER_PAGE, max( 1, (int) ( $input['per_page'] ?? 20 ) ) );
		$found    = get_terms(
			array(
				'taxonomy'   => array_values( $taxonomies ),
				'hide_empty' => false,
				'search'     => $input['search'] ?? '',
				'number'     => $per_page + 1,
				'offset'     => ( $page - 1 ) * $per_page,
				'orderby'    => 'name',
			)
		);
		$found    = is_wp_error( $found ) ? array() : $found;
		$terms    = array();

		foreach ( array_slice( $found, 0, $per_page ) as $term ) {
			$terms[] = array(
				'id'       => $term->term_id,
				'name'     => $term->name,
				'slug'     => $term->slug,
				'taxonomy' => $term->taxonomy,
				'count'    => (int) $term->count,
			);
		}

		return array(
			'terms'    => $terms,
			'has_more' => count( $found ) > $per_page,
		);
	}

	/**
	 * One page of a query, of the items the user can read.
	 *
	 * @param array $input - ability input with `page` and `per_page`.
	 * @param array $args - `WP_Query` arguments.
	 *
	 * @return array `posts` and `has_more`.
	 */
	private function find( $input, $args ) {
		$page     = max( 1, (int) ( $input['page'] ?? 1 ) );
		$per_page = min( self::MAX_PER_PAGE, max( 1, (int) ( $input['per_page'] ?? 20 ) ) );
		$query    = new WP_Query(
			array_merge(
				array(
					'posts_per_page'      => $per_page,
					'paged'               => $page,
					'orderby'             => array(
						'date' => 'oldest' === ( $input['order'] ?? 'newest' ) ? 'ASC' : 'DESC',
						'ID'   => 'oldest' === ( $input['order'] ?? 'newest' ) ? 'ASC' : 'DESC',
					),
					'ignore_sticky_posts' => true,
				),
				array_filter(
					$args,
					static function ( $value ) {
						return '' !== $value && array() !== $value;
					}
				)
			)
		);

		return array(
			'posts'    => array_values(
				array_filter(
					$query->posts,
					function ( $post ) {
						return current_user_can( 'read_post', $post->ID );
					}
				)
			),
			'has_more' => $page < (int) $query->max_num_pages,
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

		return $this->get_gallery_output( $post, $found['block'], $found['gallery_id'] );
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
			$post = $this->check_saved_layout_target( $this->get_target_post( $input['post_id'] ), $input );

			if ( is_wp_error( $post ) ) {
				return $post;
			}
		}

		$build = function ( $content ) use ( $input ) {
			$loop = Visual_Portfolio_Loop_Gallery::create( $input['layout'], $input, parse_blocks( $content ) );

			if ( is_wp_error( $loop ) ) {
				return $loop;
			}

			return array(
				'content'  => Visual_Portfolio_Loop_Gallery::insert_into_content( $content, $loop, $input['position'] ?? 'end' ),
				'block_id' => $loop['attrs']['block_id'],
			);
		};

		if ( $post ) {
			return $this->write_gallery( $post, $build );
		}

		$built = $build( '' );

		if ( is_wp_error( $built ) ) {
			return $built;
		}

		$saved = wp_insert_post(
			wp_slash(
				array(
					'post_type'    => $this->get_new_post_type(),
					'post_status'  => 'draft',
					'post_title'   => $input['title'] ?? __( 'Gallery', 'visual-portfolio' ),
					'post_content' => $built['content'],
				)
			),
			true
		);

		if ( is_wp_error( $saved ) ) {
			return $saved;
		}

		return $this->get_saved_gallery( $saved, $built['block_id'] );
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

		$post = $this->check_saved_layout_target( $this->get_target_post( $input['post_id'] ), $input );

		if ( is_wp_error( $post ) ) {
			return $post;
		}

		return $this->write_gallery(
			$post,
			function ( $content ) use ( $post, $input ) {
				$blocks = parse_blocks( $content );
				$found  = Visual_Portfolio_Loop_Gallery::find_loop( $blocks, $input['gallery_id'] );

				if ( ! $found ) {
					return $this->gallery_not_found( $post, $input['gallery_id'] );
				}

				$loop = Visual_Portfolio_Loop_Gallery::update( $found['block'], $input, $blocks, $found['index'] );

				if ( is_wp_error( $loop ) ) {
					return $loop;
				}

				$content = Visual_Portfolio_Loop_Gallery::replace_in_content( $content, $found['index'], $found['block'], $loop );

				if ( null === $content ) {
					return $this->gallery_not_found( $post, $input['gallery_id'] );
				}

				return array(
					'content'  => $content,
					'block_id' => $loop['attrs']['block_id'],
				);
			}
		);
	}

	/**
	 * Save a change to the galleries of a post.
	 *
	 * Refused while another user has the post open, as the editor would
	 * refuse them both. A change that landed while this one was built is
	 * kept: the gallery is built again on top of it.
	 *
	 * @param WP_Post  $post - post.
	 * @param callable $build - takes the content, returns `array( content, block_id )` or a `WP_Error`.
	 *
	 * @return array|WP_Error gallery.
	 */
	private function write_gallery( $post, $build ) {
		if ( ! function_exists( 'wp_check_post_lock' ) ) {
			require_once ABSPATH . 'wp-admin/includes/post.php';
		}

		$editor = wp_check_post_lock( $post->ID );

		if ( $editor ) {
			return new WP_Error(
				'vpf_post_locked',
				sprintf(
					// translators: %1$d - post id, %2$s - user name.
					__( 'Post %1$d is open in the editor of %2$s. Try again once they close it.', 'visual-portfolio' ),
					$post->ID,
					get_the_author_meta( 'display_name', $editor )
				),
				array( 'status' => 409 )
			);
		}

		$built = $build( $post->post_content );

		if ( is_wp_error( $built ) ) {
			return $built;
		}

		global $wpdb;

		// Read past the object cache, which another request's write does not reach.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$fresh = (string) $wpdb->get_var( $wpdb->prepare( "SELECT post_content FROM {$wpdb->posts} WHERE ID = %d", $post->ID ) );

		if ( $fresh !== $post->post_content ) {
			// `wp_update_post()` writes back every field of the cached post.
			clean_post_cache( $post->ID );

			$post  = get_post( $post->ID );
			$built = $build( $post->post_content );

			if ( is_wp_error( $built ) ) {
				return $built;
			}
		}

		// A call that asks for what the post already holds saves nothing and
		// leaves no revision behind.
		if ( $built['content'] !== $post->post_content ) {
			$saved = wp_update_post(
				wp_slash(
					array(
						'ID'           => $post->ID,
						'post_content' => $built['content'],
					)
				),
				true
			);

			if ( is_wp_error( $saved ) ) {
				return $saved;
			}
		}

		$gallery = $this->get_saved_gallery( $post->ID, $built['block_id'] );

		if ( is_array( $gallery ) && $this->is_open_by_current_user( $post->ID ) ) {
			$gallery['warnings'] = array(
				__( 'The post is open in your editor. Reload it there before saving, or the editor will save its own copy over this change.', 'visual-portfolio' ),
			);
		}

		return $gallery;
	}

	/**
	 * Whether the current user has the post open in the editor right now.
	 *
	 * `wp_check_post_lock()` answers only about other users.
	 *
	 * @param int $post_id - post id.
	 *
	 * @return bool
	 */
	private function is_open_by_current_user( $post_id ) {
		$lock = explode( ':', (string) get_post_meta( $post_id, '_edit_lock', true ) );

		/** This filter is documented in wp-admin/includes/ajax-actions.php */
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound
		$window = apply_filters( 'wp_check_post_lock_window', 150 );

		return 2 === count( $lock ) && get_current_user_id() === (int) $lock[1] && (int) $lock[0] > time() - $window;
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

		// Zero items per page divides by zero when the gallery is drawn.
		if ( isset( $input['settings']['per_page'] ) && 0 === (int) $input['settings']['per_page'] ) {
			return new WP_Error(
				'vpf_invalid_per_page',
				__( '`per_page` must be -1 for all items, or 1 to 100.', 'visual-portfolio' )
			);
		}

		if ( ! empty( $input['saved_layout'] ) && ! in_array( (int) $input['saved_layout'], array_column( $this->get_saved_layout_choices(), 'id' ), true ) ) {
			return Visual_Portfolio_Loop_Gallery::unknown_saved_layout( $input['saved_layout'] );
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
	 * A post a gallery can be synced in: a Saved Layout's own gallery syncs
	 * with none, as its editor offers no Saved Layout panel.
	 *
	 * @param WP_Post|WP_Error $post - target post.
	 * @param array            $input - ability input.
	 *
	 * @return WP_Post|WP_Error
	 */
	private function check_saved_layout_target( $post, $input ) {
		if ( $post instanceof WP_Post && Visual_Portfolio_Saved_Layouts::POST_TYPE === $post->post_type && ! empty( $input['saved_layout'] ) ) {
			return new WP_Error(
				'vpf_saved_layout_in_layout',
				__( 'A gallery inside a Saved Layout cannot sync with a Saved Layout.', 'visual-portfolio' )
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

		return $this->get_gallery_output( $post, $found['block'], $found['gallery_id'] );
	}

	/**
	 * Output of a gallery.
	 *
	 * @param WP_Post $post - post.
	 * @param array   $loop - loop block.
	 * @param string  $gallery_id - gallery id.
	 *
	 * @return array
	 */
	private function get_gallery_output( $post, $loop, $gallery_id ) {
		return array_merge(
			$this->get_post_fields( $post ),
			array( 'gallery_id' => $gallery_id ),
			Visual_Portfolio_Loop_Gallery::describe( $loop ),
			array( 'saved_layout' => $this->get_saved_layout( $loop ) )
		);
	}

	/**
	 * The Saved Layout a loop is synced with.
	 *
	 * @param array $loop - loop block.
	 *
	 * @return array|null array( id, title ), null when the loop is not synced.
	 */
	private function get_saved_layout( $loop ) {
		$id = Visual_Portfolio_Loop_Gallery::get_saved_layout_id( $loop );

		if ( ! $id ) {
			return null;
		}

		return array(
			'id'    => $id,
			'title' => Visual_Portfolio_Loop_Gallery::get_saved_layout_title( $id ),
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

		foreach ( Visual_Portfolio_Loop_Gallery::find_loops( parse_blocks( $post->post_content ) ) as $found ) {
			$ids[] = $found['gallery_id'];
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
	 * Schema of a page number input.
	 *
	 * @return array
	 */
	private function get_page_schema() {
		return array(
			'type'    => 'integer',
			'minimum' => 1,
			'default' => 1,
		);
	}

	/**
	 * Schema of a page size input.
	 *
	 * @return array
	 */
	private function get_per_page_schema() {
		return array(
			'type'    => 'integer',
			'minimum' => 1,
			'maximum' => self::MAX_PER_PAGE,
			'default' => 20,
		);
	}

	/**
	 * Schema of a page of found items.
	 *
	 * @param string $key - key of the list.
	 * @param array  $properties - properties of an item.
	 *
	 * @return array
	 */
	private function get_found_schema( $key, $properties ) {
		return array(
			'type'       => 'object',
			'properties' => array(
				$key       => array(
					'type'  => 'array',
					'items' => array(
						'type'       => 'object',
						'properties' => $properties,
					),
				),
				'has_more' => array( 'type' => 'boolean' ),
			),
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
			'description' => __( 'Gallery id from list-galleries. An id of the form `loop-<n>` is a position in the post, and a gallery created at its start moves it.', 'visual-portfolio' ),
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
			'query'     => array(
				'type'        => 'string',
				'description' => __( 'Read only: how get-gallery reports a `posts` source that is not one post type (`ids`, `current_query`, `custom_query`, `post_types_set`). Sent back, it changes nothing.', 'visual-portfolio' ),
			),
			'settings'  => array(
				'type'        => 'object',
				'description' => __( 'Fields of a source that is neither `images` nor `posts`, as get-gallery reports them.', 'visual-portfolio' ),
			),
		);

		foreach ( $vocabulary['sources'] as $source ) {
			if ( ! empty( $source['schema']['properties'] ) ) {
				$properties = array_merge( $properties, $source['schema']['properties'] );
			}
		}

		return array(
			'type'                 => 'object',
			'description'          => __( 'What the gallery shows. See the sources of get-gallery-options for what each type takes. On update, fields left out keep their value.', 'visual-portfolio' ),
			'properties'           => $properties,
			'required'             => array( 'type' ),
			'additionalProperties' => false,
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
					'layout_type'  => array( 'type' => 'string' ),
					'source'       => array( 'type' => 'object' ),
					'settings'     => array( 'type' => 'object' ),
					'saved_layout' => array(
						'type'       => array( 'object', 'null' ),
						'properties' => array(
							'id'    => array( 'type' => 'integer' ),
							'title' => array( 'type' => 'string' ),
						),
					),
					'warnings'     => array(
						'type'  => 'array',
						'items' => array( 'type' => 'string' ),
					),
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
				'layouts'       => array(
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
				'sources'       => array(
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
				'settings'      => array(
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
				'saved_layouts' => array(
					'type'  => 'array',
					'items' => array(
						'type'       => 'object',
						'properties' => array(
							'id'    => array( 'type' => 'integer' ),
							'title' => array( 'type' => 'string' ),
						),
					),
				),
			),
		);
	}
}
new Visual_Portfolio_Abilities();
