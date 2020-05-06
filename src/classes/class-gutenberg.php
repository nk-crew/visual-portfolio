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
                case 'gallery':
                    $attributes[ $control['name'] ]['type']  = 'array';
                    $attributes[ $control['name'] ]['items'] = array(
                        'type' => 'object',
                    );
                    break;
            }

            if ( isset( $control['default'] ) ) {
                $attributes[ $control['name'] ]['default'] = $control['default'];
            }
        }

        register_block_type(
            'visual-portfolio/block',
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
        ob_start();

        $class_name = 'wp-block-visual-portfolio';

        if ( isset( $attributes['className'] ) && $attributes['className'] ) {
            $class_name .= ' ' . $attributes['className'];
        }

        ?>
        <div class="<?php echo esc_attr( $class_name ); ?>">
            <?php
            // phpcs:ignore
            echo Visual_Portfolio_Get::get( $attributes );
            ?>
        </div>
        <?php

        return ob_get_clean();
    }

    /**
     * Enqueue script for Gutenberg editor
     */
    public function enqueue_block_editor_assets() {
        wp_enqueue_script(
            '@@plugin_name-gutenberg',
            plugins_url( '../gutenberg/index.min.js', __FILE__ ),
            array( 'wp-editor', 'wp-i18n', 'wp-element', 'wp-components', 'jquery' ),
            '@@plugin_version',
            true
        );
        wp_enqueue_style(
            '@@plugin_name-gutenberg',
            plugins_url( '../gutenberg/style.min.css', __FILE__ ),
            array(),
            '@@plugin_version'
        );

        wp_localize_script(
            '@@plugin_name-gutenberg',
            'VPGutenbergVariables',
            array(
                'nonce'    => wp_create_nonce( 'vp-ajax-nonce' ),
                'controls' => Visual_Portfolio_Controls::get_registered_array(),
            )
        );
    }
}
new Visual_Portfolio_Gutenberg_Block();
