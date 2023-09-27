<?php
/**
 * Control condition check.
 *
 * @package visual-portfolio
 */

/**
 * Visual_Portfolio_Control_Get_Value
 */
class Visual_Portfolio_Control_Get_Value {
    /**
     * Get control value.
     * Supported array names like `images[3].format`
     *
     * @param string $name - control name.
     * @param array  $attributes - block attributes.
     *
     * @return mixed value.
     */
    public static function get( $name, $attributes ) {
        $val = isset( $attributes[ $name ] ) ? $attributes[ $name ] : null;

        // Parse arrays and objects.
        // Example `images[3].format`.
        if ( null !== $val && preg_match( '/[\[\.]/', $name ) ) {
            // Find parts, used for objects.
            // Example `images.format`.
            $val_object_parts = explode( '.', $name );
            $val_parts        = array();

            if ( $val_object_parts && ! empty( $val_object_parts ) ) {
                // Find parts, used for arrays.
                // Example `images[3]`.
                foreach ( $val_object_parts as $obj_part ) {
                    if ( preg_match( '/[\[]/', $obj_part ) ) {
                        $val_array_parts = preg_split( '/[\[\]]/', $obj_part );

                        if ( $val_array_parts && ! empty( $val_array_parts ) ) {
                            foreach ( $val_array_parts as $arr_part ) {
                                if ( '' !== $arr_part ) {
                                    $arr_part_int = (int) $arr_part;
                                    if ( "${$arr_part_int}" === $arr_part ) {
                                        $val_parts[] = $arr_part_int;
                                    } else {
                                        $val_parts[] = $arr_part;
                                    }
                                }
                            }
                        }
                    } else {
                        $val_parts[] = $obj_part;
                    }
                }

                // Try to find value in attributes.
                if ( ! empty( $val_parts ) ) {
                    $current_val = $attributes;

                    foreach ( $val_parts as $part_name ) {
                        if ( $current_val && isset( $current_val[ $part_name ] ) ) {
                            $current_val = $current_val[ $part_name ];
                        } else {
                            $current_val = null;
                        }
                    }

                    $val = $current_val;
                }
            }
        }

        return $val;
    }
}
