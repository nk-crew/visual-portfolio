<?php
/**
 * Rest API functions
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Rest
 */
class Visual_Portfolio_Rest extends WP_REST_Controller {
	/**
	 * Namespace.
	 *
	 * @var string
	 */
	protected $namespace = 'visual-portfolio/v';

	/**
	 * Version.
	 *
	 * @var string
	 */
	protected $version = '1';

	/**
	 * Visual_Portfolio_Rest constructor.
	 */
	public function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register rest routes.
	 */
	public function register_routes() {
		$namespace = $this->namespace . $this->version;

		// Get layouts list.
		register_rest_route(
			$namespace,
			'/get_layouts/',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_layouts' ),
				'permission_callback' => array( $this, 'get_layouts_permission' ),
			)
		);

		// Update layout data.
		register_rest_route(
			$namespace,
			'/update_layout/',
			array(
				'methods'             => WP_REST_Server::EDITABLE,
				'callback'            => array( $this, 'update_layout' ),
				'permission_callback' => array( $this, 'update_layout_permission' ),
			)
		);

		// Update gallery items count notice state.
		register_rest_route(
			$namespace,
			'/update_gallery_items_count_notice_state/',
			array(
				'methods'             => WP_REST_Server::EDITABLE,
				'callback'            => array( $this, 'update_gallery_items_count_notice_state' ),
				'permission_callback' => array( $this, 'update_gallery_items_count_notice_state_permission' ),
			)
		);

		// Get filter items.
		register_rest_route(
			$namespace,
			'/get_filter_items/',
			array(
				'methods'             => WP_REST_Server::EDITABLE,
				'callback'            => array( $this, 'get_filter_items' ),
				'permission_callback' => array( $this, 'get_filter_items_permission' ),
			)
		);

		// Get gallery items for the editor preview of a Gallery Loop block.
		if ( visual_portfolio()->supports_loop_blocks() ) {
			register_rest_route(
				$namespace,
				'/get_loop_items/',
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'get_loop_items' ),
					'permission_callback' => array( $this, 'get_loop_items_permission' ),
				)
			);
		}

		// Get max pages.
		$max_pages_route = array(
			'methods'             => array( WP_REST_Server::READABLE, WP_REST_Server::CREATABLE ),
			'callback'            => array( $this, 'get_max_pages' ),
			'permission_callback' => array( $this, 'get_max_pages_permission' ),
		);

		register_rest_route( $namespace, '/get_max_pages/', $max_pages_route );

		// Deprecated alias, the other routes in this namespace use snake_case.
		register_rest_route( $namespace, '/get-max-pages/', $max_pages_route );
	}

	/**
	 * Check permission for getting max pages.
	 *
	 * @return bool Whether the current user has permission.
	 */
	public function get_max_pages_permission() {
		return current_user_can( 'edit_posts' );
	}

	/**
	 * Calculate max pages based on modern query attributes.
	 *
	 * @param array $params Full query data in the modern format.
	 * @return int $max_pages Response max pages data.
	 */
	public function calculate_max_pages( $params ) {
		return Visual_Portfolio_Get::calculate_max_pages(
			Visual_Portfolio_Convert_Attributes::modern_to_legacy( $params )
		);
	}

	/**
	 * Get max pages based on query attributes.
	 *
	 * @param WP_REST_Request $request Full data about the request.
	 * @return WP_REST_Response Response object with max pages data.
	 */
	public function get_max_pages( $request ) {
		// Get parameters from either query params or request body.
		$params = $request->get_params();

		// If this is a POST request, also check for JSON body data.
		if ( 'POST' === $request->get_method() ) {
			$json_params = $request->get_json_params();
			if ( ! empty( $json_params ) ) {
				$params = array_merge( $params, $json_params );
			}
		}

		$max_pages = $this->calculate_max_pages( $params );

		// Return response.
		return rest_ensure_response(
			array(
				'max_pages' => $max_pages,
			)
		);
	}

	/**
	 * Build the "All" filter item.
	 *
	 * @param int  $post_id - post the filter is displayed on.
	 * @param bool $active - whether no filter is applied.
	 *
	 * @return array
	 */
	private function get_all_filter_item( $post_id, $active = true ) {
		$url = get_permalink( $post_id );

		return array(
			'filter'      => '*',
			'label'       => esc_html__( 'All', 'visual-portfolio' ),
			'description' => '',
			'count'       => false,
			'active'      => $active,
			'url'         => $url ? $url : home_url(),
			'taxonomy'    => '',
			'id'          => 0,
			'parent'      => 0,
		);
	}

	/**
	 * Get filter items.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return WP_REST_Response|WP_Error Response object on success, or WP_Error object on failure.
	 */
	public function get_filter_items( $request ) {
		// Get parameters from either query params or request body.
		$params = $request->get_params();

		// If this is a POST request, also check for JSON body data.
		if ( 'POST' === $request->get_method() ) {
			$json_params = $request->get_json_params();
			if ( ! empty( $json_params ) ) {
				$params = array_merge( $params, $json_params );
			}
		}

		$params         = Visual_Portfolio_Convert_Attributes::modern_to_legacy( $params );
		$content_source = $params['content_source'] ?? false;
		$post_id        = absint( $request->get_param( 'post_id' ) );

		if ( ! $content_source ) {
			return $this->error(
				'missing_params',
				esc_html__( 'Required parameters are missing.', 'visual-portfolio' )
			);
		}

		// Define allowed parameters for each content source.
		$source_configs = apply_filters(
			'vpf_rest_filter_items_source_configs',
			array(
				'post-based' => array(
					'posts_source',
					'post_types_set',
					'posts_taxonomies',
					'posts_taxonomies_relation',
					'posts_order_by',
					'posts_order_direction',
				),
				'images' => array(
					'images',
					'images_titles_source',
					'images_descriptions_source',
					'images_order_by',
					'images_order_direction',
					'items_count',
				),
			),
			$params
		);

		// Sources that are not filterable have no terms to offer, but they are
		// not an error - the block simply shows the "All" item.
		if ( ! isset( $source_configs[ $content_source ] ) ) {
			return $this->success(
				array(
					$this->get_all_filter_item(
						$post_id,
						! Visual_Portfolio_Get::get_filter_active_item( array() )
					),
				)
			);
		}

		// Filter and add only relevant parameters.
		$allowed_keys    = array_flip( $source_configs[ $content_source ] );
		$filtered_params = array_intersect_key( $params, $allowed_keys );

		$options = array_merge(
			array( 'content_source' => $content_source ),
			$filtered_params
		);

		// Get query parameters.
		$query_opts = Visual_Portfolio_Get::get_query_params( $options, true );

		// Get active filter item.
		$active_item = Visual_Portfolio_Get::get_filter_active_item( $query_opts );

		// Get filter items.
		if ( 'images' === $content_source || 'social-stream' === $content_source ) {
			$term_items = Visual_Portfolio_Get::get_images_terms( $query_opts, $active_item );
		} else {
			$portfolio_query = new WP_Query( $query_opts );
			$term_items      = Visual_Portfolio_Get::get_posts_terms( $portfolio_query, $active_item );
		}

		// Helper function to generate filter URLs.
		$get_filter_url = function ( $filter = '', $taxonomy = '' ) use ( $post_id, $content_source ) {
			// Get the permalink of the current post.
			$url = get_permalink( $post_id );

			// If no valid URL found, fallback to home URL.
			if ( ! $url ) {
				$url = home_url();
			}

			// Add new filter parameter if it exists.
			if ( $filter && '*' !== $filter ) {
				if ( 'images' === $content_source || 'social-stream' === $content_source ) {
					$url = add_query_arg( 'vp_filter', rawurlencode( $filter ), $url );
				}
				if ( 'post-based' === $content_source ) {
					$post_filter = rawurlencode( $taxonomy . ':' ) . $filter;
					$url         = add_query_arg( 'vp_filter', $post_filter, $url );
				}
			}

			return $url;
		};

		// Prepare response.
		$response = array();

		// Add 'All' item.
		$response[] = $this->get_all_filter_item( $post_id, ! $active_item );

		// Add term items.
		if ( ! empty( $term_items['terms'] ) ) {
			foreach ( $term_items['terms'] as $term ) {
				$response[] = array(
					'filter'      => $term['filter'],
					'label'       => $term['label'],
					'description' => $term['description'],
					'count'       => $term['count'],
					'active'      => $term['active'],
					'url'         => $get_filter_url( $term['filter'], $term['taxonomy'] ),
					'taxonomy'    => $term['taxonomy'] ?? '',
					'id'          => $term['id'],
					'parent'      => $term['parent'],
				);
			}
		}

		return $this->success( $response );
	}

	/**
	 * Whether the current user edits content of any kind.
	 *
	 * The query endpoints answer with data the editor needs to preview a block,
	 * so editing anything is enough - a user without the blanket `edit_posts` may
	 * still edit a custom post type the block is used in.
	 *
	 * @return bool
	 */
	private function can_edit_content() {
		if ( current_user_can( 'edit_posts' ) ) {
			return true;
		}

		foreach ( get_post_types( array( 'show_in_rest' => true ), 'objects' ) as $post_type ) {
			if ( current_user_can( $post_type->cap->edit_posts ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Get filter items permission.
	 *
	 * @return mixed
	 */
	public function get_filter_items_permission() {
		if ( $this->can_edit_content() ) {
			return true;
		}

		return $this->error( 'not_allowed', esc_html__( 'Sorry, you are not allowed to get filter items.', 'visual-portfolio' ), true );
	}

	/**
	 * Get loop items permission.
	 *
	 * @return mixed
	 */
	public function get_loop_items_permission() {
		if ( $this->can_edit_content() ) {
			return true;
		}

		return $this->error( 'not_allowed', esc_html__( 'Sorry, you are not allowed to get gallery items.', 'visual-portfolio' ), true );
	}

	/**
	 * URLs of an item image in the sizes the editor offers.
	 *
	 * @param int|string $image_id - attachment id, or the remote id of a Pro social image.
	 * @param string     $fallback_url - URL to answer with when the id resolves to nothing.
	 *
	 * @return array
	 */
	private function get_item_image_sizes( $image_id, $fallback_url ) {
		// Remote images of the social sources exist in a single size.
		$is_attachment = $image_id && is_numeric( $image_id );
		$urls          = array();

		foreach ( array( 'thumbnail', 'medium', 'large', 'full' ) as $size ) {
			$src = $is_attachment ? wp_get_attachment_image_src( (int) $image_id, $size ) : false;

			$urls[ $size ] = $src ? $src[0] : $fallback_url;
		}

		return $urls;
	}

	/**
	 * Get gallery items of a Gallery Loop block.
	 *
	 * Items come from the same pipeline the front end renders, mapped with the
	 * same context mapper the item blocks read - the editor preview cannot drift
	 * away from the rendered gallery because it never resolves anything itself.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return WP_REST_Response|WP_Error Response object on success, or WP_Error object on failure.
	 */
	public function get_loop_items( $request ) {
		$params      = $request->get_params();
		$json_params = $request->get_json_params();

		if ( ! empty( $json_params ) ) {
			$params = array_merge( $params, $json_params );
		}

		$params         = Visual_Portfolio_Convert_Attributes::modern_to_legacy( $params, true );
		$content_source = $params['content_source'] ?? false;

		if ( ! $content_source ) {
			return $this->error(
				'missing_params',
				esc_html__( 'Required parameters are missing.', 'visual-portfolio' )
			);
		}

		// Define allowed parameters for each content source.
		$source_configs = apply_filters(
			'vpf_rest_loop_items_source_configs',
			array(
				'post-based' => array(
					'posts_source',
					'post_types_set',
					'posts_ids',
					'posts_excluded_ids',
					'posts_offset',
					'posts_taxonomies',
					'posts_taxonomies_relation',
					'posts_order_by',
					'posts_order_direction',
					'posts_avoid_duplicate_posts',
					'posts_custom_query',
				),
				'images' => array(
					'images',
					'image_categories',
					'images_titles_source',
					'images_descriptions_source',
					'images_order_by',
					'images_order_direction',
				),
			),
			$params
		);

		// A source no options are registered for has nothing that can be
		// previewed safely, but it is not an error - the block shows its
		// empty state.
		if ( ! isset( $source_configs[ $content_source ] ) ) {
			return $this->success(
				array(
					'items'     => array(),
					'max_pages' => 1,
				)
			);
		}

		$allowed_keys = array_flip( array_merge( $source_configs[ $content_source ], array( 'items_count' ) ) );

		$options = array_merge(
			array(
				'content_source' => $content_source,

				// The preview is not a gallery on a page, it only needs an id the
				// options resolver accepts.
				'block_id'       => 'rest-loop-preview',
			),
			array_intersect_key( $params, $allowed_keys )
		);

		ksort( $options );

		// The editor debounces its requests, but the social sources of the Pro
		// plugin answer from external APIs - without a cache a few edits are
		// enough to reach an Instagram or Unsplash rate limit.
		//
		// The cached answer is per user: `perm` below narrows the query to what
		// the current user may read, so two editors can get different items for
		// the same options. It is also per request state - the pipeline reads
		// the page, filter and sort out of the request, so options alone would
		// serve page one's items for every page.
		$request_state = array();

		foreach ( array( 'vp_page', 'vp_filter', 'vp_sort' ) as $name ) {
			$request_state[ $name ] = $request->get_param( $name );
		}

		$cache_key = 'vpf_loop_preview_' . md5( (string) wp_json_encode( array( $options, $request_state, get_current_user_id() ) ) );
		$cached    = get_transient( $cache_key );

		if ( is_array( $cached ) ) {
			return $this->success( $cached );
		}

		// The `custom_query` source hands a hand-written query string straight to
		// `WP_Query`, so the preview must not be a way to read posts the user
		// cannot open in the editor. `perm` makes `WP_Query` apply the current
		// user's read capabilities to any non-public status the query asks for.
		$restrict_to_readable = static function ( $query ) {
			$query->set( 'perm', 'readable' );
		};

		add_action( 'pre_get_posts', $restrict_to_readable );

		$result = Visual_Portfolio_Get::get_loop_items( $options );

		remove_action( 'pre_get_posts', $restrict_to_readable );

		$response = array(
			'items'     => array(),
			'max_pages' => 1,
		);

		if ( $result ) {
			foreach ( $result['items'] as $item ) {
				$item_data = Visual_Portfolio_Block_Item_Template::map_item_to_context( $item, $result['options'], '' );

				$item_data['imageSizes'] = $this->get_item_image_sizes(
					$item['image_id'] ?? '',
					$item_data['itemImgUrl'] ?? ''
				);

				$response['items'][] = $item_data;
			}

			$response['max_pages'] = max( 1, (int) $result['max_pages'] );
		}

		set_transient( $cache_key, $response, MINUTE_IN_SECONDS );

		return $this->success( $response );
	}

	/**
	 * Get layout data permission.
	 *
	 * @return mixed
	 */
	public function get_layouts_permission() {
		if ( current_user_can( 'edit_posts' ) ) {
			return true;
		}

		foreach ( get_post_types( array( 'show_in_rest' => true ), 'objects' ) as $post_type ) {
			if ( current_user_can( $post_type->cap->edit_posts ) ) {
				return true;
			}
		}

		return $this->error( 'not_allowed', esc_html__( 'Sorry, you are not allowed to get list of saved layouts.', 'visual-portfolio' ), true );
	}

	/**
	 * Get layout data.
	 *
	 * @return mixed
	 */
	public function get_layouts() {
		// get all visual-portfolio post types.
		// Don't use WP_Query on the admin side https://core.trac.wordpress.org/ticket/18408 .
		$layouts  = array();
		$vp_query = get_posts(
			array(
				'post_type'              => 'vp_lists',
				'posts_per_page'         => -1,
				'paged'                  => -1,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			)
		);
		foreach ( $vp_query as $post ) {
			$layouts[] = array(
				'id'       => $post->ID,
				'title'    => $post->post_title,
				'edit_url' => admin_url( 'post.php?post=' . $post->ID ) . '&action=edit',
			);
		}

		if ( ! empty( $layouts ) ) {
			return $this->success( $layouts );
		} else {
			return $this->error( 'no_layouts_found', __( 'Layouts not found.', 'visual-portfolio' ) );
		}
	}

	/**
	 * Update layout data permission.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 *
	 * @return true|WP_Error
	 */
	public function update_layout_permission( $request ) {
		$post_id = isset( $request['post_id'] ) ? intval( $request['post_id'] ) : 0;

		if ( ! $post_id ) {
			return $this->error( 'post_id_required', esc_html__( 'Post ID is required for this request.', 'visual-portfolio' ), true );
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return $this->error( 'not_allowed', esc_html__( 'Sorry, you are not allowed to edit saved layouts data.', 'visual-portfolio' ), true );
		}

		return true;
	}

	/**
	 * Update layout data.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 *
	 * @return WP_REST_Response|WP_Error Response object on success, or WP_Error object on failure.
	 */
	public function update_layout( $request ) {
		$post_id = isset( $request['post_id'] ) ? intval( $request['post_id'] ) : 0;
		$data    = isset( $request['data'] ) ? $request['data'] : false;

		if ( $post_id && $data ) {
			$meta = array_keys( Visual_Portfolio_Get::get_options( array( 'id' => $post_id ) ) );

			foreach ( $meta as $name ) {
				// Save with prefix.
				$prefixed_name = 'vp_' . $name;

				if ( isset( $data[ $prefixed_name ] ) ) {
					if (
						'vp_images' === $prefixed_name ||
						'vp_layout_elements' === $prefixed_name ||
						'vp_custom_css' === $prefixed_name
					) {
						$result = $data[ $prefixed_name ];
					} elseif ( is_array( $data[ $prefixed_name ] ) ) {
						$result = array_map( 'sanitize_text_field', wp_unslash( $data[ $prefixed_name ] ) );
					} else {
						$result = sanitize_text_field( wp_unslash( $data[ $prefixed_name ] ) );
					}

					update_post_meta( $post_id, $prefixed_name, $result );
				}
			}
		}

		return $this->success( true );
	}

	/**
	 * Update gallery items count notice state permission.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 *
	 * @return true|WP_Error
	 */
	public function update_gallery_items_count_notice_state_permission( $request ) {
		$post_id = isset( $request['post_id'] ) ? intval( $request['post_id'] ) : 0;

		if ( ! $post_id || ! current_user_can( 'manage_options' ) ) {
			return $this->error( 'user_dont_have_permission', esc_html__( 'User don\'t have permissions to change options.', 'visual-portfolio' ), true );
		}

		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return $this->error( 'user_dont_have_permission', esc_html__( 'User don\'t have permissions to change options.', 'visual-portfolio' ), true );
		}

		return true;
	}

	/**
	 * Update layout data.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 *
	 * @return WP_REST_Response|WP_Error Response object on success, or WP_Error object on failure.
	 */
	public function update_gallery_items_count_notice_state( $request ) {
		update_option( 'visual_portfolio_items_count_notice_state', $request->get_param( 'notice_state' ) );

		return $this->success( true );
	}

	/**
	 * Success rest.
	 *
	 * @param mixed $response response data.
	 * @return mixed
	 */
	public function success( $response ) {
		return new WP_REST_Response(
			array(
				'success'  => true,
				'response' => $response,
			),
			200
		);
	}

	/**
	 * Error rest.
	 *
	 * @param mixed   $code       error code.
	 * @param mixed   $response   response data.
	 * @param boolean $true_error use true error response to stop the code processing.
	 * @return mixed
	 */
	public function error( $code, $response, $true_error = false ) {
		if ( $true_error ) {
			return new WP_Error( $code, $response, array( 'status' => 401 ) );
		}

		return new WP_REST_Response(
			array(
				'error'      => true,
				'success'    => false,
				'error_code' => $code,
				'response'   => $response,
			),
			401
		);
	}
}

new Visual_Portfolio_Rest();
