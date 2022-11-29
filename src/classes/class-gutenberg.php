<?php
/**
 * Gutenberg block.
 *
 * @package ghostkit
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Gutenberg_Block
 */
class Visual_Portfolio_Gutenberg_Block {
    /**
     * Registered controls, that will be used in Gutenberg block.
     *
     * @var array
     */
    public $registered_controls = array();

    /**
     * Visual_Portfolio_Gutenberg_Block constructor.
     */
    public function __construct() {
        add_action( 'init', array( $this, 'register_block' ), 11 );
        add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_block_editor_assets' ) );
    }

    /**
     * Register Block.
     */
    public function register_block() {
        if ( ! function_exists( 'register_block_type' ) ) {
            return;
        }

        // Default attributes.
        $attributes = array(
            'block_id' => array(
                'type' => 'string',
            ),
            'align' => array(
                'type' => 'string',
            ),
            'className' => array(
                'type' => 'string',
            ),
            'anchor' => array(
                'type' => 'string',
            ),
        );

        // Add dynamic attributes from registered controls.
        $controls = Visual_Portfolio_Controls::get_registered_array();

        foreach ( $controls as $control ) {
            if ( isset( $attributes[ $control['name'] ] ) ) {
                continue;
            }

            if ( 'html' === $control['type'] ) {
                continue;
            }

            $attributes[ $control['name'] ] = array(
                'type' => 'string',
            );

            switch ( $control['type'] ) {
                case 'checkbox':
                case 'toggle':
                    $attributes[ $control['name'] ]['type'] = 'boolean';
                    break;
                case 'number':
                case 'range':
                    $attributes[ $control['name'] ]['type'] = 'number';
                    break;
                case 'select':
                case 'select2':
                    if ( $control['multiple'] ) {
                        $attributes[ $control['name'] ]['type']  = 'array';
                        $attributes[ $control['name'] ]['items'] = array(
                            'type' => 'string',
                        );
                    }
                    break;
                case 'sortable':
                    $attributes[ $control['name'] ]['type']  = 'array';
                    $attributes[ $control['name'] ]['items'] = array(
                        'type' => 'string',
                    );
                    break;
                case 'gallery':
                    $attributes[ $control['name'] ]['type']  = 'array';
                    $attributes[ $control['name'] ]['items'] = array(
                        'type' => 'object',
                    );
                    break;
                case 'elements_selector':
                    $attributes[ $control['name'] ]['type']  = 'object';
                    $attributes[ $control['name'] ]['items'] = array(
                        'type' => 'object',
                    );
                    break;
                case 'notice':
                case 'pro_note':
                    unset( $attributes[ $control['name'] ] );
                    break;
            }

            if ( isset( $control['default'] ) ) {
                $attributes[ $control['name'] ]['default'] = $control['default'];
            }
        }

        register_block_type(
            visual_portfolio()->plugin_path . 'gutenberg/block',
            array(
                'render_callback' => array( $this, 'block_render' ),
                'attributes'      => $attributes,
            )
        );
    }

    /**
     * Block output
     *
     * @param array $attributes - block attributes.
     *
     * @return string
     */
    public function block_render( $attributes ) {
        $attributes = array_merge(
            array(
                'align'     => '',
                'className' => '',
            ),
            $attributes
        );

        $class_name = 'wp-block-visual-portfolio';

        if ( $attributes['align'] ) {
            $class_name .= ' align' . $attributes['align'];
        }

        if ( $attributes['className'] ) {
            $class_name .= ' ' . $attributes['className'];
        }

        $result = '<div class="' . esc_attr( $class_name ) . '"' . ( isset( $attributes['ghostkitSR'] ) && $attributes['ghostkitSR'] ? ' data-ghostkit-sr="' . esc_attr( $attributes['ghostkitSR'] ) . '"' : '' ) . '>';

        $result .= Visual_Portfolio_Get::get( $attributes );

        $result .= '</div>';

        return $result;
    }

    /**
     * Enqueue script for Gutenberg editor
     */
    public function enqueue_block_editor_assets() {
        // Block.
        wp_enqueue_script(
            'visual-portfolio-gutenberg',
            plugins_url( '../gutenberg/index.min.js', __FILE__ ),
            array( 'wp-i18n', 'wp-element', 'wp-components', 'jquery' ),
            '@@plugin_version',
            true
        );
        wp_enqueue_style(
            'visual-portfolio-gutenberg',
            plugins_url( '../gutenberg/style.min.css', __FILE__ ),
            array(),
            '@@plugin_version'
        );
        wp_style_add_data( 'visual-portfolio-gutenberg', 'rtl', 'replace' );
        wp_style_add_data( 'visual-portfolio-gutenberg', 'suffix', '.min' );

        wp_localize_script(
            'visual-portfolio-gutenberg',
            'VPGutenbergVariables',
            array(
                'nonce'                     => wp_create_nonce( 'vp-ajax-nonce' ),
                'plugin_name'               => visual_portfolio()->plugin_name,
                'plugin_url'                => visual_portfolio()->plugin_url,
                'admin_url'                 => get_admin_url(),
                'controls'                  => Visual_Portfolio_Controls::get_registered_array(),
                'controls_categories'       => Visual_Portfolio_Controls::get_registered_categories(),
                'items_count_notice'        => get_option( 'visual_portfolio_items_count_notice_state', 'show' ),
                'items_count_notice_limit'  => 40,
            )
        );

        // Meta.
        wp_enqueue_script(
            'visual-portfolio-gutenberg-custom-post-meta',
            plugins_url( '../gutenberg/custom-post-meta.min.js', __FILE__ ),
            array( 'wp-i18n', 'wp-element', 'wp-components', 'wp-plugins', 'jquery' ),
            '@@plugin_version',
            true
        );

        wp_localize_script(
            'visual-portfolio-gutenberg-custom-post-meta',
            'VPGutenbergMetaVariables',
            array(
                'nonce'       => wp_create_nonce( 'vp-ajax-nonce' ),
                'plugin_name' => visual_portfolio()->plugin_name,
            )
        );
    }
}
new Visual_Portfolio_Gutenberg_Block();
