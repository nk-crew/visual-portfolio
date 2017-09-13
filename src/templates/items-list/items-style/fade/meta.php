<?php
/**
 * Item meta template.
 *
 * @var $args
 * @package visual-portfolio
 */

?>

<a href="<?php echo esc_url( $args['url'] ); ?>" class="vp-portfolio__item-overlay vp-portfolio__item-align-<?php echo esc_attr( $args['style_options']['align'] ); ?>" data-vp-bg-color="<?php echo esc_attr( $args['style_options']['bg_color'] ); ?>" data-vp-text-color="<?php echo esc_attr( $args['style_options']['text_color'] ); ?>">
    <div class="vp-portfolio__item-meta">
        <?php
        if ( $args['style_options']['show_title'] && $args['title'] ) {
            ?>
            <h2 class="nk-portfolio__item-meta-title">
                <?php
                echo esc_html( $args['title'] );
                ?>
            </h2>
            <?php
        }

        if ( $args['style_options']['show_category'] && $args['category'] ) {
            ?>
            <div class="vp-portfolio__item-meta-category">
                <?php echo esc_html( $args['category'] ); ?>
            </div>
            <?php
        }

        if ( $args['style_options']['show_date'] && $args['published'] ) {
            ?>
            <div class="vp-portfolio__item-meta-date">
                <?php echo esc_html( $args['published'] ); ?>
            </div>
            <?php
        }

        if ( $args['style_options']['show_icon'] && $args['style_options']['icon'] ) {
            ?>
            <div class="vp-portfolio__item-meta-icon">
                <span class="<?php echo esc_attr( $args['style_options']['icon'] ); ?>"></span>
            </div>
            <?php
        }

        if ( $args['style_options']['show_excerpt'] && $args['excerpt'] ) {
            ?>
            <div class="vp-portfolio__item-meta-excerpt">
                <?php echo esc_html( $args['excerpt'] ); ?>
            </div>
            <?php
        }
        ?>
    </div>
</a>
