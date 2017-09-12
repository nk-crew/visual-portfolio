<?php
/**
 * Item meta template.
 *
 * @var $args
 * @package visual-portfolio
 */

?>

<div class="vp-portfolio__item-overlay vp-portfolio__item-align-<?php echo esc_attr( $args['style_options']['align'] ); ?>">
    <div class="vp-portfolio__item-meta">
        <?php
        if ( $args['style_options']['show_title'] && $args['title'] ) {
            ?>
            <h2 class="nk-portfolio__item-meta-title">
                <?php
                if ( $args['url'] ) {
                    ?>
                    <a href="<?php echo esc_url( $args['url'] ); ?>">
                        <?php echo esc_html( $args['title'] ); ?>
                    </a>
                    <?php
                } else {
                    echo esc_html( $args['title'] );
                }
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
        ?>
    </div>
</div>
