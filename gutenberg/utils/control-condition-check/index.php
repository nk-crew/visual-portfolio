<?php
/**
 * Control condition check.
 *
 * @package visual-portfolio
 */

/**
 * Visual_Portfolio_Control_Condition_Check
 */
class Visual_Portfolio_Control_Condition_Check {
    /**
     * Compare 2 values
     *
     * @param mixed  $left Left value.
     * @param string $operator Operator.
     * @param mixed  $right Right value.
     *
     * @return boolean
     */
    public static function compare( $left, $operator, $right ) {
        $check_result = true;

        switch ( $operator ) {
            case '==':
                // phpcs:ignore WordPress.PHP.StrictComparisons.LooseComparison
                $check_result = $left == $right;
                break;
            case '===':
                $check_result = $left === $right;
                break;
            case '!=':
                // phpcs:ignore WordPress.PHP.StrictComparisons.LooseComparison
                $check_result = $left != $right;
                break;
            case '!==':
                $check_result = $left !== $right;
                break;
            case '*=':
                $check_result = strpos( $left, $right ) !== false;
                break;
            case '>=':
                $check_result = $left >= $right;
                break;
            case '<=':
                $check_result = $left <= $right;
                break;
            case '>':
                $check_result = $left > $right;
                break;
            case '<':
                $check_result = $left < $right;
                break;
            case '&&':
            case 'AND':
                $check_result = $left && $right;
                break;
            case '||':
            case 'OR':
                $check_result = $left || $right;
                break;
            default:
                $check_result = $left;
                break;
        }

        return $check_result;
    }

    /**
     * Conditions check for controls.
     *
     * @param array  $condition - condition params.
     * @param array  $attributes - block attributes.
     * @param string $relation - Can be one of 'AND' or 'OR'.
     *
     * @return boolean is check pass.
     */
    public static function check( $condition, $attributes, $relation = 'AND' ) {
        // by default result will be TRUE for relation AND
        // and FALSE for relation OR.
        $result         = 'AND' === $relation;
        $child_relation = $result ? 'OR' : 'AND';

        foreach ( $condition as $data ) {
            if ( is_array( $data ) && ! isset( $data['control'] ) ) {
                $result = self::compare( $result, $relation, self::check( $data, $attributes, $child_relation ) );
            } elseif ( isset( $data['control'] ) ) {
                $left     = Visual_Portfolio_Control_Get_Value::get( $data['control'], $attributes );
                $operator = isset( $data['operator'] ) ? $data['operator'] : '==';
                $right    = isset( $data['value'] ) ? $data['value'] : 'true';

                if ( 'true' === $left ) {
                    $left = true;
                } elseif ( 'false' === $left ) {
                    $left = false;
                }

                if ( 'true' === $right ) {
                    $right = true;
                } elseif ( 'false' === $right ) {
                    $right = false;
                }

                $result = self::compare( $result, $relation, self::compare( $left, $operator, $right ) );
            }
        }

        return $result;
    }
}
