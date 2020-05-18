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

// phpcs:ignore
$inline_meta = $opts['show_author'] && $args['author'] ||
    $opts['show_date'] ||
    $opts['show_comments_count'] && '' !== $args['comments_count'] ||
    $opts['show_views_count'] && $args['views_count'] ||
    $opts['show_reading_time'] && $args['reading_time'];

// phpcs:ignore
$show_meta = $inline_meta ||
    $opts['show_icon'] && $opts['icon'] ||
    $opts['show_title'] && $args['title'] ||
    $opts['show_excerpt'] && $args['excerpt'] ||
    $opts['show_categories'] && $args['categories'] && ! empty( $args['categories'] );

?>

<figcaption class="vp-portfolio__item-overlay vp-portfolio__item-align-<?php echo esc_attr( $opts['align'] ); ?>">
    <?php if ( $show_meta ) : ?>
        <div class="vp-portfolio__item-meta">
            <?php

            // Show Categories.
            if ( $opts['show_categories'] && $args['categories'] && ! empty( $args['categories'] ) ) {
                ?>
                <ul class="vp-portfolio__item-meta-categories">
                    <?php
                    // phpcs:ignore
                    $count = $opts['categories_count'];

                    // phpcs:ignore
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

            // Show Title.
            if ( $opts['show_title'] && $args['title'] ) {
                ?>
                <h2 class="vp-portfolio__item-meta-title">
                    <?php
                    if ( $args['url'] ) {
                        ?>
                        <a href="<?php echo esc_url( $args['url'] ); ?>"
                            <?php
                            if ( isset( $args['url_target'] ) && $args['url_target'] ) :
                                ?>
                                target="<?php echo esc_attr( $args['url_target'] ); ?>"
                                rel="noopener noreferrer"
                                <?php
                            endif;
                            ?>
                        >
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

            // Inline Meta.
            if ( $inline_meta ) {
                ?>
                <div class="vp-portfolio__item-meta-inline">
                <?php

                // Show Author.
                if ( $opts['show_author'] ) {
                    ?>
                    <div class="vp-portfolio__item-meta-part vp-portfolio__item-meta-author">
                        <span class="vp-portfolio__item-meta-part-icon">
                            <?php
                            if ( $args['author_avatar'] ) {
                                if ( $args['author_url'] ) {
                                    ?>
                                    <a href="<?php echo esc_url( $args['author_url'] ); ?>">
                                    <?php
                                }
                                ?>
                                <img src="<?php echo esc_url( $args['author_avatar'] ); ?>" alt="<?php echo esc_attr( $args['author'] ); ?>" width="50" height="50">
                                <?php
                                if ( $args['author_url'] ) {
                                    ?>
                                    </a>
                                    <?php
                                }
                            } else {
                                ?>
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="10" cy="6" r="5" stroke="currentColor" stroke-width="1.5"/>
                                    <path d="M2 18.5C2.55106 14.3854 5.84867 11.5 10 11.5C14.1513 11.5 17.4489 14.3854 18 18.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                <?php
                            }
                            ?>
                        </span>
                        <span class="vp-portfolio__item-meta-part-text">
                            <?php
                            if ( $args['author_url'] ) {
                                ?>
                                <a href="<?php echo esc_url( $args['author_url'] ); ?>">
                                <?php
                            }

                            // translators: %s - author name.
                            echo sprintf( esc_html__( 'By %s', '@@text_domain' ), esc_html( $args['author'] ) );

                            if ( $args['author_url'] ) {
                                ?>
                                </a>
                                <?php
                            }
                            ?>
                        </span>
                    </div>
                    <?php
                }

                // Show Date.
                if ( $opts['show_date'] ) {
                    ?>
                    <div class="vp-portfolio__item-meta-part vp-portfolio__item-meta-date">
                        <span class="vp-portfolio__item-meta-part-icon">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="1" y="3.5" width="18" height="15.5" rx="3" stroke="currentColor" stroke-width="1.5"/>
                                <path d="M6 5V1M14 5V1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M18.5 9H1.5" stroke="currentColor" stroke-width="1.5"/>
                            </svg>
                        </span>
                        <span class="vp-portfolio__item-meta-part-text">
                            <?php echo esc_html( $args['published'] ); ?>
                        </span>
                    </div>
                    <?php
                }

                // Show Comments Count.
                if ( $opts['show_comments_count'] && '' !== $args['comments_count'] ) {
                    ?>
                    <div class="vp-portfolio__item-meta-part vp-portfolio__item-meta-comments">
                        <span class="vp-portfolio__item-meta-part-icon">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 15V15C2.34315 15 1 13.6569 1 12V4C1 2.34315 2.34315 1 4 1H16C17.6569 1 19 2.34315 19 4V12C19 13.6569 17.6569 15 16 15H11.5" stroke="currentColor" stroke-width="1.5"/>
                                <path d="M3.5 15H5.20001V19L9.5 15H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </span>
                        <span class="vp-portfolio__item-meta-part-text">
                            <?php
                            if ( $args['comments_url'] ) {
                                ?>
                                <a href="<?php echo esc_url( $args['comments_url'] ); ?>">
                                <?php
                            }

                            if ( ! $args['comments_count'] ) {
                                echo esc_html__( 'No Comments', '@@text_domain' );
                            } else {
                                // translators: %s Number of comments.
                                echo esc_html( printf( _n( '%s Comment', '%s Comments', $args['comments_count'], '@@text_domain' ), number_format_i18n( (int) $args['comments_count'] ) ) );
                            }

                            if ( $args['comments_url'] ) {
                                ?>
                                </a>
                                <?php
                            }
                            ?>
                        </span>
                    </div>
                    <?php
                }

                // Show Views Count.
                if ( $opts['show_views_count'] && $args['views_count'] ) {
                    ?>
                    <div class="vp-portfolio__item-meta-part vp-portfolio__item-meta-views">
                        <span class="vp-portfolio__item-meta-part-icon">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="10" cy="10" r="2.5" fill="currentColor"/>
                                <path d="M1 10C1 10 4.27273 3 10 3C15.7273 3 19 10 19 10C19 10 15.7273 17 10 17C4.27273 17 1 10 1 10Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </span>
                        <span class="vp-portfolio__item-meta-part-text">
                            <?php
                            // translators: %s Number of views.
                            echo esc_html( sprintf( _n( '%s View', '%s Views', $args['views_count'], '@@text_domain' ), number_format_i18n( (int) $args['views_count'] ) ) );
                            ?>
                        </span>
                    </div>
                    <?php
                }

                // Show Reading Time.
                if ( $opts['show_reading_time'] && $args['reading_time'] ) {
                    ?>
                    <div class="vp-portfolio__item-meta-part vp-portfolio__item-meta-reading-rime">
                        <span class="vp-portfolio__item-meta-part-icon">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.60001 16.8823C2.60001 16.3207 2.84403 15.7821 3.2784 15.3849C3.71277 14.9878 4.30189 14.7647 4.91618 14.7647H17.4235" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M4.91618 1H17.4235V19H4.91618C4.30189 19 3.71277 18.7629 3.2784 18.341C2.84403 17.919 2.60001 17.3467 2.60001 16.75V3.25C2.60001 2.65326 2.84403 2.08097 3.2784 1.65901C3.71277 1.23705 4.30189 1 4.91618 1V1Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </span>
                        <span class="vp-portfolio__item-meta-part-text">
                            <?php
                            echo esc_html(
                                sprintf(
                                    // translators: %s Reading time minutes.
                                    _n(
                                        '%s Min Read',
                                        '%s Mins Read',
                                        is_string( $args['reading_time'] ) ? 1 : $args['reading_time'],
                                        '@@text_domain'
                                    ),
                                    is_string( $args['reading_time'] ) ? $args['reading_time'] : number_format_i18n( (int) $args['reading_time'] )
                                )
                            );
                            ?>
                        </span>
                    </div>
                    <?php
                }

                ?>
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
            ?>
        </div>
    <?php endif; ?>
</figcaption>
