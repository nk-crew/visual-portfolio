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
