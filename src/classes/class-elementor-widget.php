<?php
/**
 * Widget for Elementor
 *
 * @package @@plugin_name/elementor
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Elementor_Widget
 */
class Visual_Portfolio_Elementor_Widget extends \Elementor\Widget_Base {
    /**
     * Constructor of Visual_Portfolio_Elementor_Widget class.
     *
     * @param array      $data default widget data.
     * @param null|array $args default widget args.
     */
    public function __construct( $data = array(), $args = null ) {
        parent::__construct( $data, $args );

        if ( $this->is_preview_mode() ) {
            wp_register_script( 'iframe-resizer', visual_portfolio()->plugin_url . 'assets/vendor/iframe-resizer/iframeResizer.min.js', '', '4.2.1', true );
            wp_register_script( 'visual-portfolio-elementor', visual_portfolio()->plugin_url . 'assets/admin/js/elementor.min.js', array( 'elementor-frontend', 'iframe-resizer', 'jquery' ), '@@plugin_version', true );

            wp_register_style( 'visual-portfolio-elementor', visual_portfolio()->plugin_url . 'assets/admin/css/elementor.min.css', array(), '@@plugin_version' );
        }
    }

    /**
     * Is edit mode check.
     *
     * @return boolean
     */
    public function is_preview_mode() {
        return \Elementor\Plugin::$instance->preview->is_preview_mode() || \Elementor\Plugin::$instance->editor->is_edit_mode();
    }

    /**
     * Get widget name.
     *
     * @return string Widget name.
     */
    public function get_name() {
        return 'visual-portfolio';
    }

    /**
     * Get widget title.
     *
     * @return string Widget title.
     */
    public function get_title() {
        return __( 'Visual Portfolio', '@@text_domain' );
    }

    /**
     * Get widget icon.
     *
     * @return string Widget icon.
     */
    public function get_icon() {
        return 'eicon-gallery-grid';
    }

    /**
     * Get widget categories.
     *
     * @return array Widget categories.
     */
    public function get_categories() {
        return array( 'general' );
    }

    /**
     * Get widget keywords.
     *
     * @return array Widget keywords.
     */
    public function get_keywords() {
        return array( 'portfolio', 'gallery', 'images', 'visual portfolio', 'vpf' );
    }

    /**
     * Get script dependencies.
     *
     * @return array Widget script dependencies.
     */
    public function get_script_depends() {
        if ( $this->is_preview_mode() ) {
            return array( 'visual-portfolio-elementor' );
        }

        return array();
    }

    /**
     * Get style dependencies.
     *
     * @return array Widget style dependencies.
     */
    public function get_style_depends() {
        if ( $this->is_preview_mode() ) {
            return array( 'visual-portfolio-elementor' );
        }

        return array();
    }

    /**
     * Adds different input fields to allow the user to change and customize the widget settings.
     */
    // phpcs:ignore
    protected function _register_controls() {
        // get all visual-portfolio post types.
        // Don't use WP_Query on the admin side https://core.trac.wordpress.org/ticket/18408 .
        $vp_query = get_posts(
            array(
                'post_type'      => 'vp_lists',
                'posts_per_page' => -1,
                'showposts'      => -1,
                'paged'          => -1,
            )
        );

        $options = array();
        foreach ( $vp_query as $post ) {
            $options[ $post->ID ] = '#' . $post->ID . ' - ' . $post->post_title;
        }

        $this->start_controls_section(
            'content_section',
            array(
                'label' => __( 'General', '@@text_domain' ),
                'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
            )
        );

        $this->add_control(
            'id',
            array(
                'label'   => esc_html__( 'Select Layout', '@@text_domain' ),
                'type'    => \Elementor\Controls_Manager::SELECT2,
                'options' => $options,
                'dynamic' => array(
                    'active' => true,
                ),
            )
        );

        $this->end_controls_section();
    }

    /**
     * Render widget output on the frontend.
     */
    protected function render() {
        $settings = array_merge(
            array(
                'id'    => false,
                'class' => '',
            ),
            $this->get_settings()
        );

        if ( ! $settings['id'] ) {
            return;
        }

        if ( $this->is_preview_mode() ) {
            $this->add_render_attribute(
                'wrapper',
                array(
                    'class'   => 'visual-portfolio-elementor-preview',
                    'data-id' => $settings['id'],
                )
            );
        }

        ?>
        <div
            <?php
                // phpcs:ignore
                echo $this->get_render_attribute_string( 'wrapper' );
            ?>
        >
            <?php if ( $this->is_preview_mode() ) : ?>
                <iframe></iframe>
            <?php else : ?>
                <?php echo do_shortcode( '[visual_portfolio id="' . esc_attr( $settings['id'] ) . '"]' ); ?>
            <?php endif; ?>
        </div>
        <?php
    }

    /**
     * Render shortcode widget output in the editor.
     *
     * Written as a Backbone JavaScript template and used to generate the live preview.
     *
     * @since 1.0.0
     * @access protected
     */
    protected function content_template() {}

    /**
     * Render Plain Content
     *
     * @param array $instance instance data.
     */
    public function render_plain_content( $instance = array() ) {}
}
