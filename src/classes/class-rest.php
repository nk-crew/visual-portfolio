<?php
/**
 * Rest API functions
 *
 * @package @@plugin_name
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
                'methods'  => WP_REST_Server::READABLE,
                'callback' => array( $this, 'get_layouts' ),
            )
        );
    }

    /**
     * Get attachment image <img> tag.
     *
     * @return mixed
     */
    public function get_layouts() {
        // get all visual-portfolio post types.
        // Don't use WP_Query on the admin side https://core.trac.wordpress.org/ticket/18408 .
        $layouts  = array();
        $vp_query = get_posts(
            array(
                'post_type'      => 'vp_lists',
                'posts_per_page' => -1,
                'showposts'      => -1,
                'paged'          => -1,
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
            return $this->error( 'no_layouts_found', __( 'Layouts not found.', '@@text_domain' ) );
        }
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
     * @param mixed $code     error code.
     * @param mixed $response response data.
     * @return mixed
     */
    public function error( $code, $response ) {
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
