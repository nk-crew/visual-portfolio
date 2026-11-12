<?php
/**
 * REST API of the Saved Layouts library.
 *
 * @package visual-portfolio/saved-layouts-rest
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Saved_Layouts_REST
 *
 * The library reads and writes layouts through core's `wp/v2/vp_lists`
 * route, which this class extends with a `vpf_layout` field. What core has no
 * route for lives under `visual-portfolio/v1/saved-layouts`.
 */
class Visual_Portfolio_Saved_Layouts_REST {
	/**
	 * Route namespace.
	 */
	const NAMESPACE = 'visual-portfolio/v1';

	/**
	 * Type of an exported file.
	 */
	const EXPORT_TYPE = 'visual-portfolio/saved-layouts';

	/**
	 * Version of the exported file format.
	 */
	const EXPORT_VERSION = 1;

	/**
	 * Usage counts of the layouts in the current response, keyed by id.
	 *
	 * @var array
	 */
	private static $counts = array();

	/**
	 * Constructor.
	 */
	public function __construct() {
		// REST.
		add_action( 'rest_api_init', array( $this, 'register_fields' ) );
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
		add_filter( 'the_posts', array( $this, 'prime_counts' ), 10, 2 );
	}

	/**
	 * Add the library's data to every layout core returns.
	 */
	public function register_fields() {
		register_rest_field(
			Visual_Portfolio_Saved_Layouts::POST_TYPE,
			'vpf_layout',
			array(
				'get_callback' => array( $this, 'get_layout_field' ),
				'schema'       => array(
					'type'     => 'object',
					'context'  => array( 'edit' ),
					'readonly' => true,
				),
			)
		);
	}

	/**
	 * Count usage for a whole page of layouts at once.
	 *
	 * @param WP_Post[] $posts - queried posts.
	 * @param WP_Query  $query - query.
	 *
	 * @return WP_Post[]
	 */
	public function prime_counts( $posts, $query ) {
		if ( defined( 'REST_REQUEST' ) && REST_REQUEST && Visual_Portfolio_Saved_Layouts::POST_TYPE === $query->get( 'post_type' ) && $posts && self::can_manage_layouts() ) {
			Visual_Portfolio_Saved_Layout_Usage::run_pending();

			self::$counts += Visual_Portfolio_Saved_Layout_Usage::get_counts( wp_list_pluck( $posts, 'ID' ) );
		}

		return $posts;
	}

	/**
	 * Whether the user works with the library.
	 *
	 * @return bool
	 */
	private static function can_manage_layouts() {
		$type = get_post_type_object( Visual_Portfolio_Saved_Layouts::POST_TYPE );

		return $type && current_user_can( $type->cap->edit_posts );
	}

	/**
	 * Library data of one layout.
	 *
	 * @param array $prepared - post as core prepared it.
	 *
	 * @return array
	 */
	public function get_layout_field( $prepared ) {
		$id = (int) $prepared['id'];

		if ( ! isset( self::$counts[ $id ] ) ) {
			self::$counts += Visual_Portfolio_Saved_Layout_Usage::get_counts( array( $id ) );
		}

		return array_merge(
			self::describe( $id ),
			array(
				'locked'     => Visual_Portfolio_Saved_Layouts::is_locked( $id ),
				'shortcode'  => sprintf( '[visual_portfolio id="%d"]', $id ),
				'usage'      => self::$counts[ $id ],
				'usageReady' => (bool) get_option( Visual_Portfolio_Saved_Layout_Usage::INDEXED_OPTION ),
				'editUrl'    => get_edit_post_link( $id, 'raw' ),
				'previewUrl' => Visual_Portfolio_Saved_Layout_Preview::get_url( $id ),
			)
		);
	}

	/**
	 * Kind, source and the settings a preview is drawn from.
	 *
	 * @param int $id - layout id.
	 *
	 * @return array
	 */
	public static function describe( $id ) {
		$loop = Visual_Portfolio_Saved_Layouts::get_layout_loop( $id );

		if ( $loop ) {
			$template = Visual_Portfolio_Saved_Layouts::find_block( $loop['innerBlocks'], 'visual-portfolio/item-template' );
			$attrs    = $template['attrs'] ?? array();
			$type     = $attrs['layoutType'] ?? 'grid';

			return array(
				'kind'    => 'blocks',
				'source'  => $loop['attrs']['queryType'] ?? 'posts',
				'preview' => array(
					'type'    => $type,
					'columns' => (int) ( $attrs['layoutColumnCount'] ?? 3 ),
					'tiles'   => $attrs['layoutTiles'] ?? '',
				),
			);
		}

		$options = Visual_Portfolio_Get::get_options( array( 'id' => $id ) );
		$type    = $options['layout'] ?? 'tiles';
		$sources = array(
			'post-based'    => 'posts',
			'images'        => 'images',
			'social-stream' => 'social',
		);

		return array(
			'kind'    => 'legacy',
			'source'  => $sources[ $options['content_source'] ?? '' ] ?? ( $options['content_source'] ?? '' ),
			'preview' => array(
				'type'    => $type,
				'columns' => (int) ( $options[ $type . '_columns' ] ?? 3 ),
				'tiles'   => (string) ( $options['tiles_type'] ?? '' ),
			),
		);
	}

	/**
	 * Register the routes core has no equivalent of.
	 */
	public function register_routes() {
		$id_arg = array(
			'id' => array(
				'type'     => 'integer',
				'required' => true,
			),
		);

		register_rest_route(
			self::NAMESPACE,
			'/saved-layouts/(?P<id>\d+)/usage',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_usage' ),
				'permission_callback' => array( $this, 'can_edit_layout' ),
				'args'                => $id_arg,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/saved-layouts/choices',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_choices' ),
				'permission_callback' => array( $this, 'can_sync' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/saved-layouts/(?P<id>\d+)/sync-source',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_sync_source' ),
				'permission_callback' => array( $this, 'can_sync' ),
				'args'                => $id_arg,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/saved-layouts/(?P<id>\d+)/restore',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'restore' ),
				'permission_callback' => array( $this, 'can_delete_layout' ),
				'args'                => $id_arg,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/saved-layouts/(?P<id>\d+)/duplicate',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'duplicate' ),
				'permission_callback' => array( $this, 'can_duplicate_layout' ),
				'args'                => $id_arg,
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/saved-layouts/export',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'export' ),
				'permission_callback' => array( $this, 'can_export' ),
				'args'                => array(
					'ids' => array(
						'type'     => 'array',
						'items'    => array( 'type' => 'integer' ),
						'required' => true,
					),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/saved-layouts/import',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'import' ),
				'permission_callback' => array( $this, 'can_create_layouts' ),
				'args'                => array(
					'file' => array(
						'type'     => 'object',
						'required' => true,
					),
				),
			)
		);
	}

	/**
	 * Whether the request names a layout the user can edit.
	 *
	 * @param WP_REST_Request $request - request.
	 *
	 * @return bool
	 */
	public function can_edit_layout( $request ) {
		$id = (int) $request['id'];

		return Visual_Portfolio_Saved_Layouts::POST_TYPE === get_post_type( $id ) && current_user_can( 'edit_post', $id );
	}

	/**
	 * Whether the user edits content that can hold a synced gallery.
	 *
	 * Editors and authors sync galleries without managing Saved Layouts,
	 * the way they insert them with the Saved Layout block.
	 *
	 * @return bool
	 */
	public function can_sync() {
		return current_user_can( 'edit_posts' );
	}

	/**
	 * Whether the user may read a layout to sync with it: a published one, a
	 * trashed one that was published, or any one the user can edit.
	 *
	 * @param WP_Post|null $post - layout.
	 *
	 * @return bool
	 */
	private static function can_read_for_sync( $post ) {
		if ( ! $post || Visual_Portfolio_Saved_Layouts::POST_TYPE !== $post->post_type ) {
			return false;
		}

		if ( current_user_can( 'edit_post', $post->ID ) || 'publish' === $post->post_status ) {
			return true;
		}

		// A trashed layout still syncs when it was published before.
		return 'trash' === $post->post_status && 'publish' === get_post_meta( $post->ID, '_wp_trash_meta_status', true );
	}

	/**
	 * Block-based layouts a gallery can sync with.
	 *
	 * @return WP_REST_Response
	 */
	public function get_choices() {
		$posts   = get_posts(
			array(
				'post_type'      => Visual_Portfolio_Saved_Layouts::POST_TYPE,
				'post_status'    => array( 'publish', 'draft', 'pending', 'private', 'future' ),
				'posts_per_page' => -1,
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);
		$choices = array();

		foreach ( $posts as $post ) {
			if ( self::can_read_for_sync( $post ) && Visual_Portfolio_Saved_Layouts::is_block_layout( $post ) ) {
				$choices[] = array(
					'id'    => $post->ID,
					'title' => html_entity_decode( get_the_title( $post ), ENT_QUOTES, 'UTF-8' ),
				);
			}
		}

		return rest_ensure_response( $choices );
	}

	/**
	 * What a synced gallery takes from a layout.
	 *
	 * @param WP_REST_Request $request - request.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_sync_source( $request ) {
		$post = get_post( (int) $request['id'] );

		if ( ! $post || Visual_Portfolio_Saved_Layouts::POST_TYPE !== $post->post_type || ! Visual_Portfolio_Saved_Layouts::is_block_layout( $post ) ) {
			return new WP_Error( 'vpf_layout_not_found', __( 'This Saved Layout no longer exists.', 'visual-portfolio' ), array( 'status' => 404 ) );
		}

		if ( ! self::can_read_for_sync( $post ) ) {
			return new WP_Error( 'vpf_layout_forbidden', __( 'This Saved Layout is not published.', 'visual-portfolio' ), array( 'status' => 403 ) );
		}

		return rest_ensure_response(
			array(
				'id'      => $post->ID,
				'title'   => html_entity_decode( get_the_title( $post ), ENT_QUOTES, 'UTF-8' ),
				'status'  => $post->post_status,
				'content' => $post->post_content,
				'locked'  => Visual_Portfolio_Saved_Layouts::is_locked( $post->ID ),
				'editUrl' => current_user_can( 'edit_post', $post->ID ) ? (string) get_edit_post_link( $post->ID, 'raw' ) : '',
			)
		);
	}

	/**
	 * Whether the request names a layout the user can delete and restore.
	 *
	 * @param WP_REST_Request $request - request.
	 *
	 * @return bool
	 */
	public function can_delete_layout( $request ) {
		$id = (int) $request['id'];

		return Visual_Portfolio_Saved_Layouts::POST_TYPE === get_post_type( $id ) && current_user_can( 'delete_post', $id );
	}

	/**
	 * Bring a layout back from the trash with the status it had, so a layout
	 * pages insert shows on them again.
	 *
	 * @param WP_REST_Request $request - request.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public function restore( $request ) {
		add_filter( 'wp_untrash_post_status', 'wp_untrash_post_set_previous_status', 10, 3 );
		$restored = wp_untrash_post( (int) $request['id'] );
		remove_filter( 'wp_untrash_post_status', 'wp_untrash_post_set_previous_status', 10 );

		if ( ! $restored ) {
			return new WP_Error( 'vpf_layout_not_restored', __( 'The Saved Layout could not be restored.', 'visual-portfolio' ), array( 'status' => 400 ) );
		}

		return rest_ensure_response( array( 'status' => get_post_status( (int) $request['id'] ) ) );
	}

	/**
	 * Whether the user can copy the layout into a new one.
	 *
	 * @param WP_REST_Request $request - request.
	 *
	 * @return bool
	 */
	public function can_duplicate_layout( $request ) {
		return $this->can_edit_layout( $request ) && $this->can_create_layouts();
	}

	/**
	 * Whether the user can create layouts.
	 *
	 * @return bool
	 */
	public function can_create_layouts() {
		$type = get_post_type_object( Visual_Portfolio_Saved_Layouts::POST_TYPE );

		return $type && current_user_can( $type->cap->create_posts );
	}

	/**
	 * Whether the user can edit every layout asked for.
	 *
	 * @param WP_REST_Request $request - request.
	 *
	 * @return bool
	 */
	public function can_export( $request ) {
		$ids = (array) $request['ids'];

		if ( ! $ids ) {
			return false;
		}

		foreach ( $ids as $id ) {
			if ( Visual_Portfolio_Saved_Layouts::POST_TYPE !== get_post_type( (int) $id ) || ! current_user_can( 'edit_post', (int) $id ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Posts that use a layout.
	 *
	 * @param WP_REST_Request $request - request.
	 *
	 * @return WP_REST_Response
	 */
	public function get_usage( $request ) {
		return rest_ensure_response( Visual_Portfolio_Saved_Layout_Usage::get_usage( (int) $request['id'] ) );
	}

	/**
	 * Copy a layout into a new draft named "<title> (copy)".
	 *
	 * @param WP_REST_Request $request - request.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public function duplicate( $request ) {
		$source = get_post( (int) $request['id'] );
		$id     = wp_insert_post(
			wp_slash(
				array(
					'post_type'    => Visual_Portfolio_Saved_Layouts::POST_TYPE,
					'post_status'  => 'publish',
					'post_title'   => sprintf(
						// translators: %s - title of the copied layout.
						__( '%s (copy)', 'visual-portfolio' ),
						$source->post_title
					),
					'post_content' => $source->post_content,
				)
			),
			true
		);

		if ( is_wp_error( $id ) ) {
			return $id;
		}

		foreach ( self::get_layout_meta( $source->ID ) as $key => $value ) {
			update_post_meta( $id, $key, wp_slash( $value ) );
		}

		return rest_ensure_response( array( 'id' => $id ) );
	}

	/**
	 * The file an export downloads.
	 *
	 * @param WP_REST_Request $request - request.
	 *
	 * @return WP_REST_Response
	 */
	public function export( $request ) {
		$layouts = array();

		foreach ( (array) $request['ids'] as $id ) {
			$post = get_post( (int) $id );

			$layouts[] = array(
				'title'   => $post->post_title,
				'kind'    => Visual_Portfolio_Saved_Layouts::is_block_layout( $post ) ? 'blocks' : 'legacy',
				'content' => $post->post_content,
				'meta'    => self::get_layout_meta( $post->ID ),
			);
		}

		return rest_ensure_response(
			array(
				'type'    => self::EXPORT_TYPE,
				'version' => self::EXPORT_VERSION,
				'layouts' => $layouts,
			)
		);
	}

	/**
	 * Create layouts from an exported file.
	 *
	 * Attachments do not travel between sites, so an image id the site does
	 * not have is dropped from the layout, and the response counts them.
	 *
	 * @param WP_REST_Request $request - request.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public function import( $request ) {
		$file = $request['file'];

		if ( self::EXPORT_TYPE !== ( $file['type'] ?? '' ) || (int) ( $file['version'] ?? 0 ) > self::EXPORT_VERSION || ! is_array( $file['layouts'] ?? null ) ) {
			return new WP_Error( 'vpf_import_invalid', __( 'This file is not a Visual Portfolio Saved Layouts export.', 'visual-portfolio' ), array( 'status' => 400 ) );
		}

		$created = array();
		$dropped = 0;

		foreach ( $file['layouts'] as $layout ) {
			if ( ! is_array( $layout ) ) {
				continue;
			}

			$content = is_string( $layout['content'] ?? null ) ? $layout['content'] : '';
			$meta    = is_array( $layout['meta'] ?? null ) ? $layout['meta'] : array();

			if ( has_blocks( $content ) ) {
				$blocks  = parse_blocks( $content );
				$blocks  = self::drop_missing_images( $blocks, $dropped );
				$content = serialize_blocks( $blocks );
			}

			$id = wp_insert_post(
				wp_slash(
					array(
						'post_type'    => Visual_Portfolio_Saved_Layouts::POST_TYPE,
						'post_status'  => 'publish',
						'post_title'   => sanitize_text_field( $layout['title'] ?? '' ),
						'post_content' => $content,
					)
				),
				true
			);

			if ( is_wp_error( $id ) ) {
				continue;
			}

			foreach ( $meta as $key => $value ) {
				if ( ! self::is_layout_meta_key( $key ) ) {
					continue;
				}

				if ( 'vp_images' === $key && is_array( $value ) ) {
					$value = self::filter_existing_images( $value, $dropped );
				}

				update_post_meta( $id, $key, wp_slash( $value ) );
			}

			$created[] = $id;
		}

		return rest_ensure_response(
			array(
				'created'       => $created,
				'droppedImages' => $dropped,
			)
		);
	}

	/**
	 * Layout meta that belongs in a copy or an export.
	 *
	 * @param int $id - layout id.
	 *
	 * @return array
	 */
	private static function get_layout_meta( $id ) {
		$meta = array();

		foreach ( get_post_meta( $id ) as $key => $values ) {
			if ( self::is_layout_meta_key( $key ) ) {
				$meta[ $key ] = maybe_unserialize( $values[0] );
			}
		}

		return $meta;
	}

	/**
	 * Whether a meta key holds a layout setting.
	 *
	 * @param string $key - meta key.
	 *
	 * @return bool
	 */
	private static function is_layout_meta_key( $key ) {
		return is_string( $key ) && 0 === strpos( $key, 'vp_' );
	}

	/**
	 * Remove images the site does not have from every loop's images source.
	 *
	 * @param array $blocks - parsed blocks.
	 * @param int   $dropped - count of removed images.
	 *
	 * @return array
	 */
	private static function drop_missing_images( $blocks, &$dropped ) {
		foreach ( $blocks as $index => $block ) {
			if ( 'visual-portfolio/loop' === ( $block['blockName'] ?? '' ) && isset( $block['attrs']['imagesQuery']['images'] ) && is_array( $block['attrs']['imagesQuery']['images'] ) ) {
				$blocks[ $index ]['attrs']['imagesQuery']['images'] = self::filter_existing_images( $block['attrs']['imagesQuery']['images'], $dropped );
			}

			if ( ! empty( $block['innerBlocks'] ) ) {
				$blocks[ $index ]['innerBlocks'] = self::drop_missing_images( $block['innerBlocks'], $dropped );
			}
		}

		return $blocks;
	}

	/**
	 * Images whose attachment exists here.
	 *
	 * @param array $images - images, each with an `id`.
	 * @param int   $dropped - count of removed images.
	 *
	 * @return array
	 */
	private static function filter_existing_images( $images, &$dropped ) {
		$kept = array();

		foreach ( $images as $image ) {
			if ( ! is_array( $image ) ) {
				++$dropped;
				continue;
			}

			$id = (int) ( $image['id'] ?? 0 );

			// An image added by URL has no attachment and travels as it is.
			if ( ( ! $id && ! empty( $image['imgUrl'] ) ) || ( $id && 'attachment' === get_post_type( $id ) ) ) {
				$kept[] = $image;
			} else {
				++$dropped;
			}
		}

		return $kept;
	}
}

new Visual_Portfolio_Saved_Layouts_REST();
