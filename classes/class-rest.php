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

		register_rest_route(
			$namespace,
			'/get-max-pages/',
			array(
				'methods'             => WP_REST_Server::READABLE . ', ' . WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'get_max_pages' ),
				'permission_callback' => array( $this, 'get_max_pages_permission' ),
			)
		);
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
	 * Calculate max pages based on query attributes.
	 *
	 * @param array $params Full query data.
	 * @return int $max_pages Response max pages data.
	 */
	public function calculate_max_pages( $params ) {
		// Convert modern params to legacy format.
		$params = Visual_Portfolio_Convert_Attributes::modern_to_legacy( $params );

		$params = Visual_Portfolio_Security::validate_calculate_max_pages_params( $params );

		$content_source = $params['content_source'] ?? '';
		$items_count    = (int) ( $params['items_count'] ?? 0 );

		// Add filter from GET if not in params.
		if ( empty( $params['vp_filter'] ) && ! empty( $_GET['vp_filter'] ) ) {
			$params['vp_filter'] = sanitize_text_field( wp_unslash( $_GET['vp_filter'] ) );
		}

		// Decode JSON images if needed.
		if ( 'images' === $content_source &&
			is_string( $params['images'] ?? '' ) &&
			0 === strpos( $params['images'], '[' ) ) {
			$decoded = json_decode( $params['images'], true );
			if ( JSON_ERROR_NONE === json_last_error() ) {
				$params['images'] = $decoded;
			}
		}

		// Get query options and calculate max pages.
		$options = array_merge(
			array(
				'content_source' => $content_source,
				'items_count'    => $items_count,
			),
			$params
		);

		$query_opts = Visual_Portfolio_Get::get_query_params( $options, false );

		if ( isset( $query_opts['max_num_pages'] ) ) {
			return max( 1, $query_opts['max_num_pages'] );
		}

		switch ( $content_source ) {
			case 'post-based':
				$query     = new WP_Query( $query_opts );
				$max_pages = $query->max_num_pages ? $query->max_num_pages : ceil( $query->found_posts / $items_count );
				return max( 1, $max_pages );

			case 'images':
			case 'social-stream':
				$images_count = count( $query_opts['images'] ?? array() );
				return max( 1, ceil( $images_count / $items_count ) );

			default:
				return 1;
		}
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
		$post_id        = $request->get_param( 'post_id' );

		if ( ! $content_source ) {
			return $this->error(
				'missing_params',
				esc_html__( 'Required parameters are missing.', 'visual-portfolio' )
			);
		}

		// Define allowed parameters for each content source.
		$source_configs = array(
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
		);

		// Build options array.
		$options = array(
			'content_source' => $content_source,
		);

		if ( isset( $source_configs[ $content_source ] ) ) {
			// Filter and add only relevant parameters.
			$allowed_keys    = array_flip( $source_configs[ $content_source ] );
			$filtered_params = array_intersect_key( $params, $allowed_keys );
			$options         = array_merge( $options, $filtered_params );
		} else {
			return $this->error(
				'invalid_content_source',
				/* translators: %s: Invalid content source type */
				sprintf( esc_html__( 'Invalid content source: %s', 'visual-portfolio' ), esc_html( $content_source ) )
			);
		}

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
		$get_filter_url = function( $filter = '', $taxonomy = '' ) use ( $post_id, $content_source ) {
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
		$response[] = array(
			'filter'      => '*',
			'label'       => esc_html__( 'All', 'visual-portfolio' ),
			'description' => '',
			'count'       => false,
			'active'      => ! $active_item,
			'url'         => $get_filter_url(),
			'taxonomy'    => '',
			'id'          => 0,
			'parent'      => 0,
		);

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
	 * Get filter items permission.
	 *
	 * @return mixed
	 */
	public function get_filter_items_permission() {
		if ( current_user_can( 'edit_posts' ) ) {
			return true;
		}

		foreach ( get_post_types( array( 'show_in_rest' => true ), 'objects' ) as $post_type ) {
			if ( current_user_can( $post_type->cap->edit_posts ) ) {
				return true;
			}
		}

		return $this->error( 'not_allowed', esc_html__( 'Sorry, you are not allowed to get filter items.', 'visual-portfolio' ), true );
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
