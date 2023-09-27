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

        register_block_type(
            visual_portfolio()->plugin_path . 'gutenberg/block-saved',
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
                'align'     => '',
                'className' => '',
            ),
            $attributes
        );

        if ( ! $attributes['id'] ) {
            return '';
        }

        // WPML support.
        // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound
        $attributes['id'] = apply_filters( 'wpml_object_id', $attributes['id'], 'vp_lists', true );

        $class_name = 'wp-block-visual-portfolio';

        if ( $attributes['align'] ) {
            $class_name .= ' align' . $attributes['align'];
        }

        if ( $attributes['className'] ) {
            $class_name .= ' ' . $attributes['className'];
        }
        ?>
        <div
        <?php
            echo ' class="' . esc_attr( $class_name ) . '"';
            echo isset( $attributes['ghostkitSR'] ) && $attributes['ghostkitSR'] ? ' data-ghostkit-sr="' . esc_attr( $attributes['ghostkitSR'] ) . '"' : '';
        ?>
        >
            <?php
            // The function returns clean data because it includes templates that use escaping functions before output.
            // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
            echo Visual_Portfolio_Get::get( array( 'id' => $attributes['id'] ) );
            ?>
        </div>
        <?php

        return ob_get_clean();
    }
}
new Visual_Portfolio_Gutenberg_Saved_Block();
