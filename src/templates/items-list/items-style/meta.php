<?php
/**
 * Item meta template.
 *
 * @var $args
 * @var $opts
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

?>

<div class="vp-portfolio__item-overlay vp-portfolio__item-align-<?php echo esc_attr( $opts['align'] ); ?>">
    <div class="vp-portfolio__item-meta">
        <?php

        // Show Title.
        if ( $opts['show_title'] && $args['title'] ) {
            ?>
            <h2 class="vp-portfolio__item-meta-title">
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

        // Show Date.
        if ( $opts['show_date'] ) {
            ?>
            <div class="vp-portfolio__item-meta-date">
                <?php echo esc_html( $args['published'] ); ?>
            </div>
            <?php
        }

        // Show Excerpt.
        if ( $opts['show_excerpt'] && $args['excerpt'] ) {
            ?>
            <div class="vp-portfolio__item-meta-excerpt">
                <?php echo esc_html( $args['excerpt'] ); ?>
            </div>
            <?php
        }

        // Show Read More.
        if ( $opts['show_read_more'] && $opts['read_more_label'] ) {
            ?>
            <a class="vp-portfolio__item-meta-read-more" href="<?php echo esc_url( $opts['read_more_url'] ); ?>">
                <?php echo esc_html( $opts['read_more_label'] ); ?>
            </a>
            <?php
        }

        // Show Categories.
        if ( $opts['show_categories'] && $args['categories'] && ! empty( $args['categories'] ) ) {
            ?>
            <ul class="vp-portfolio__item-meta-categories">
                <?php
                $count = $opts['categories_count'];
                foreach ( $args['categories'] as $category ) {
                    if ( ! $count ) {
                        break;
                    }
                    ?>
                    <li class="vp-portfolio__item-meta-category">
                        <a href="<?php echo esc_html( $category['url'] ); ?>">
                            <?php echo esc_html( $category['label'] ); ?>
                        </a>
                    </li>
                    <?php
                    $count--;
                }
                ?>
            </ul>
            <?php
        }
        ?>
    </div>
</div>
