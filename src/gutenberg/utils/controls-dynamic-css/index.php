<?php
/**
 * Parse controls data and generate styles output.
 *
 * @package @@plugin_name
 */

/**
 * Visual_Portfolio_Controls_Dynamic_CSS
 */
class Visual_Portfolio_Controls_Dynamic_CSS {
    /**
     * Prepare CSS for options.
     *
     * @param array $options block options.
     *
     * @return string
     */
    public static function get( $options ) {
        $result   = '';
        $selector = '';

        if ( isset( $options['block_id'] ) ) {
            $selector = $options['block_id'];
        } elseif ( isset( $options['id'] ) ) {
            $selector = $options['id'];
        }
        if ( ! $selector ) {
            return $result;
        }

        $selector = '.vp-id-' . $selector;

        $registered = Visual_Portfolio_Controls::get_registered_array();

        // Controls styles.
        foreach ( $registered as $k => $control ) {
            if ( ! isset( $control['style'] ) || empty( $control['style'] ) ) {
                continue;
            }

            // Check condition.
            if (
                ! isset( $control['condition'] ) ||
                empty( $control['condition'] ) ||
                ! Visual_Portfolio_Control_Condition_Check::check( $control['condition'], $options )
            ) {
                continue;
            }

            foreach ( $control['style'] as $data ) {
                $result .= self::prepare_styles_from_params( $selector, $options[ $control['name'] ], $data );
            }
        }

        // Custom CSS.
        if ( isset( $options['custom_css'] ) && $options['custom_css'] ) {
            // replace 'selector' to actual css selector.
            $custom_css = str_replace( 'selector', $selector, $options['custom_css'] );

            // a little security fix.
            $custom_css = str_replace( '</', '&lt;/', $custom_css );

            if ( isset( $options['id'] ) ) {
                $custom_css = str_replace( '&gt;', '>', $custom_css );
                $custom_css = str_replace( '\"', '"', $custom_css );
                $custom_css = str_replace( "\'", "'", $custom_css );
            }

            $result .= $custom_css;
        }

        return $result;
    }

    /**
     * Prepare styles from params
     * Params example:
        array(
            'element'  => '$ .inner-selector',
            'property' => 'height',
            'mask'     => '$px',
        )
     *
     * @param string $selector CSS selector.
     * @param mixed  $value Property value.
     * @param array  $params Output params.
     *
     * @return string
     */
    public static function prepare_styles_from_params( $selector, $value, $params ) {
        $result = '';

        if ( ! $selector || ! isset( $value ) || empty( $value ) || null === $value || ! isset( $params['property'] ) ) {
            return $result;
        }

        // Value mask.
        if ( isset( $params['mask'] ) ) {
            $value = str_replace( '$', $value, $params['mask'] );
        }

        // Custom selector mask.
        if ( isset( $params['element'] ) && strpos( $params['element'], '$' ) !== false ) {
            $selector = str_replace( '$', $selector, $params['element'] );
        } else {
            $selector = $selector . ( isset( $params['element'] ) ? ( ' ' . $params['element'] ) : '' );
        }

        $property = $params['property'];

        // Prepare CSS.
        $result = "${selector} { ${property}: ${value}; } ";

        return $result;
    }
}
