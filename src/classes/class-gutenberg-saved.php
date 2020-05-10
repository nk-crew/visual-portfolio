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
 * Class Visual_Portfolio_Gutenberg_Saved_Block
 */
class Visual_Portfolio_Gutenberg_Saved_Block {
    /**
     * Registered controls, that will be used in Gutenberg block.
     *
     * @var array
     */
    public $registered_controls = array();

    /**
     * Visual_Portfolio_Gutenberg_Saved_Block constructor.
     */
    public function __construct() {
        add_action( 'init', array( $this, 'register_block' ), 11 );
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
            'id' => array(
                'type' => 'string',
            ),
            'className' => array(
                'type' => 'string',
            ),
            'anchor' => array(
                'type' => 'string',
            ),
        );

        register_block_type(
            'visual-portfolio/saved',
            array(
                'render_callback' => array( $this, 'block_render' ),
                'attributes'      => $attributes,
            )
        );

        // Fallback.
        register_block_type(
            'nk/visual-portfolio',
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

        $attributes = array_merge(
            array(
                'id'        => '',
                'className' => '',
            ),
            $attributes
        );

        if ( ! $attributes['id'] ) {
            return '';
        }

        $class_name = 'wp-block-visual-portfolio';

        if ( $attributes['className'] ) {
            $class_name .= ' ' . $attributes['className'];
        }

        ?>
        <div class="<?php echo esc_attr( $class_name ); ?>">
            <?php
            // phpcs:ignore
            echo Visual_Portfolio_Get::get( array( 'id' => $attributes['id'] ) );
            ?>
        </div>
        <?php

        return ob_get_clean();
    }
}
new Visual_Portfolio_Gutenberg_Saved_Block();
