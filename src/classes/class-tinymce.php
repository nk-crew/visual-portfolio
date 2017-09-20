<?php
/**
 * Extend TinyMCE toolbar
 *
 * @package visual-portfolio/tinymce
 */
class Visual_Portfolio_TinyMCE {
    /**
     * Visual_Portfolio_TinyMCE constructor.
     */
    public function __construct() {
        $this->init_hooks();
    }

    /**
     * Hooks.
     */
    public function init_hooks() {
        add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );
        add_action( 'admin_head', array( $this, 'admin_head' ) );
    }

    /**
     * Admin Head Action.
     */
    public function admin_head() {
        if ( current_user_can( 'edit_posts' ) && current_user_can( 'edit_pages' ) ) {
            add_filter( 'mce_external_plugins', array( $this, 'mce_external_plugins' ) );
            add_filter( 'mce_buttons', array( $this, 'mce_buttons' ) );
        }
    }

    /**
     * Enqueue admin scripts
     *
     * @param string $page - page name.
     */
    public function admin_enqueue_scripts( $page ) {
        if ( 'post.php' === $page || 'post-new.php' === $page ) {
            // add tiny mce data.
            $data_tiny_mce = array();

            // get all visual-portfolio post types.
            $vp_query = new WP_Query(array(
                'post_type'      => 'vp_lists',
                'posts_per_page' => -1,
                'showposts'      => -1,
                'paged'          => -1,
            ));
            while ( $vp_query->have_posts() ) {
                $vp_query->the_post();
                $data_tiny_mce[] = array(
                    'id'    => get_the_ID(),
                    'title' => get_the_title(),
                );
            }
            wp_reset_postdata();

            // return if no data.
            if ( ! count( $data_tiny_mce ) ) {
                return;
            }

            wp_enqueue_script( 'visual-portfolio-tinymce-localize', visual_portfolio()->plugin_url . 'assets/admin/js/mce-localize.js' );
            wp_localize_script( 'visual-portfolio-tinymce-localize', 'Visual_Portfolio_TinyMCE_Options', $data_tiny_mce );
        }
    }

    /**
     * Add script for button
     *
     * @param array $plugins - available plugins.
     *
     * @return mixed
     */
    public function mce_external_plugins( $plugins ) {
        $plugins['visual_portfolio'] = visual_portfolio()->plugin_url . 'assets/admin/js/mce-dropdown.js';
        return $plugins;
    }

    /**
     * Add dropdown button to tinymce
     *
     * @param array $buttons - available buttons.
     *
     * @return mixed
     */
    public function mce_buttons( $buttons ) {
        array_push( $buttons, 'visual_portfolio' );
        return $buttons;
    }
}
