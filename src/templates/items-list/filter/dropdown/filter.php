<?php
/**
 * Dropdown filter template.
 *
 * @var $args
 *
 * @package visual-portfolio
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

?>

<div class="<?php echo esc_attr( $args['class'] ); ?> vp-filter__style-dropdown">
    <select>
        <?php
        foreach ( $args['items'] as $item ) {
            ?>
            <option class="<?php echo esc_attr( $item['class'] ); ?>" data-vp-url="<?php echo esc_url( $item['url'] ); ?>" data-vp-filter="<?php echo esc_attr( $item['filter'] ); ?>" value="<?php echo esc_attr( $item['filter'] ); ?>" <?php selected( $item['active'] ); ?>>
                <?php echo esc_html( $item['label'] ); ?>

                <?php
                if ( $args['show_count'] && $item['count'] ) {
                    ?>
                    (<?php echo esc_html( $item['count'] ); ?>)
                    <?php
                }
                ?>
            </option>
            <?php
        }
        ?>
    </select>
</div>
