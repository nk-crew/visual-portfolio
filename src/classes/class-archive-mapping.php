<?php
/**
 * Archive Mapping.
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

use Visual_Portfolio_Settings as Settings;

/**
 * Class Visual_Portfolio_Archive_Mapping
 */
class Visual_Portfolio_Archive_Mapping {
    /**
     * Archive Page.
     *
     * @var int $archive_page
     */
    private $archive_page = null;

    /**
     * Posts per page.
     *
     * @var integer
     */
    private $posts_per_page = -1;

    /**
     * Permalink settings.
     *
     * @var array
     */
    private $permalinks = array();

    /**
     * Visual_Portfolio_Archive_Mapping constructor.
     */
    public function __construct() {
        add_action( 'init', array( $this, 'init' ), 9 );
    }

    /**
     * Initialize archive.
     *
     * @see __construct
     */
    public function init() {
        $this->archive_page   = Settings::get_option( 'portfolio_archive_page', 'vp_general' );
        $this->posts_per_page = Settings::get_option( 'archive_page_items_per_page', 'vp_general' );
        $this->permalinks     = self::get_permalink_structure();

        if ( isset( $this->archive_page ) && ! empty( $this->archive_page ) && Visual_Portfolio_Custom_Post_Type::portfolio_post_type_is_registered() ) {

            $this->init_rewrite_rules();

            if ( -1 === (int) $this->posts_per_page ) {
                $this->posts_per_page = 9999;
            }

            add_action( 'pre_get_posts', array( $this, 'maybe_override_archive' ) );
            add_action( 'pre_post_update', array( $this, 'pre_page_update' ), 10, 2 );
            add_action( 'deleted_post', array( $this, 'delete_archive_page' ), 10, 1 );
            add_action( 'trashed_post', array( $this, 'delete_archive_page' ), 10, 1 );
            add_action( 'update_option_vp_general', array( $this, 'flush_rewrite_rules_after_update' ), 10, 3 );
            add_action( 'vpf_extend_query_args', array( $this, 'extend_query_args' ), 10, 2 );
            add_filter( 'vpf_layout_element_options', array( $this, 'unset_pagination_archive_page' ), 10, 1 );

            // Add a post display state for special Portfolio Archive page.
            add_filter( 'display_post_states', array( $this, 'add_display_post_states' ), 10, 2 );

            // Add Permalinks.
            add_action( 'admin_init', array( $this, 'permalink_settings_init' ) );
            add_action( 'admin_init', array( $this, 'permalink_settings_save' ), 12 );
            add_filter( 'post_type_link', array( $this, 'portfolio_permalink_replacements' ), 1, 2 );
            add_filter( 'vpf_extend_filter_items', array( $this, 'add_filter_items' ), 10, 2 );
            add_filter( 'the_title', array( $this, 'set_archive_title' ), 10, 2 );
            add_filter( 'body_class', array( $this, 'add_body_archive_classes' ), 10, 1 );
            add_filter( 'redirect_canonical', array( $this, 'maybe_redirect_canonical_links' ), 10, 2 );
            add_filter( 'pre_get_shortlink', array( $this, 'remove_taxanomy_shortlinks' ), 10, 4 );
        }

        self::create_archive_page();
    }

    /**
     * Remove Taxonomy Shortlinks.
     *
     * @param bool|string $shortlink   - Short-circuit return value. Either false or a URL string.
     * @param int         $id          - Post ID, or 0 for the current post.
     * @param string      $context     - The context for the link. One of 'post' or 'query'.
     * @param bool        $allow_slugs - Whether to allow post slugs in the shortlink.
     * @return bool|string
     */
    public function remove_taxanomy_shortlinks( $shortlink, $id, $context, $allow_slugs ) {
        if ( 0 === $id && 'query' === $context && ! $shortlink ) {
            $shortlink = $this->remove_taxanomy_shortlink_by_slug( get_query_var( 'vp_category' ) ) ??
            $this->remove_taxanomy_shortlink_by_slug( get_query_var( 'portfolio_tag' ), 'portfolio_tag' ) ??
            false;
        }

        return $shortlink;
    }

    /**
     * Remove Taxonomy Shortlink by Taxonomy slug.
     *
     * @param string      $slug - Taxonomy slug.
     * @param string      $taxonomy - Name of Taxonomy.
     * @param bool|string $shortlink - Short-circuit return value. Either false or a URL string.
     * @return bool|string
     */
    private function remove_taxanomy_shortlink_by_slug( $slug, $taxonomy = 'portfolio_category', $shortlink = false ) {
        if ( $slug && ! empty( $slug ) ) {
            $terms = get_terms(
                array(
                    'slug' => $slug,
                )
            );
            if ( ! empty( $terms ) && is_array( $terms ) ) {
                foreach ( $terms as $term ) {
                    if ( $taxonomy === $term->taxonomy && $slug === $term->slug ) {
                        $shortlink = '';
                        break;
                    }
                }
            }
        }

        return $shortlink;
    }

    /**
     * Maybe redirect canonical Portfolio Archive Page.
     * When registering a post, standard rules for overwriting archives are created,
     * Which do not suit us for a number of reasons. To catch redirects according to these standard rules, we need the following function.
     * This function controls requests to standard portfolio pages of archives, taxonomies and pagination, and, depending on the settings of permalinks,
     * Allows or disables the standard redirect.
     *
     * @param string $redirect_url - Redirect URL.
     * @param string $requested_url - Requested URL.
     * @return string|bool
     */
    public function maybe_redirect_canonical_links( $redirect_url, $requested_url ) {
        $queried_object = get_queried_object();
        if (
            untrailingslashit( $redirect_url ) === untrailingslashit( get_home_url() ) &&
            (int) get_option( 'page_on_front' ) === (int) $this->archive_page
        ) {
            $is_category_redirect = strpos( $requested_url, $this->permalinks['category_base'] ) !== false;
            $is_tag_redirect      = strpos( $requested_url, $this->permalinks['tag_base'] ) !== false;
            $is_portfolio_archive = ! $is_category_redirect &&
                                    ! $is_tag_redirect &&
                                    strpos( $requested_url, $this->permalinks['portfolio_base'] ) !== false &&
                                    isset( $queried_object ) &&
                                    (int) $queried_object->ID === (int) $this->archive_page;
            $parse_page_from_link = intval( untrailingslashit( str_replace( trailingslashit( $redirect_url ) . 'page/', '', $requested_url ) ) );

            if ( $is_portfolio_archive ) {
                $redirect_url = get_home_url();
            }

            if ( $is_category_redirect || $is_tag_redirect || $parse_page_from_link > 0 ) {
                $redirect_url = false;
            }
        } elseif ( isset( $queried_object ) && (int) $queried_object->ID === (int) $this->archive_page ) {

            $parse_page_from_link = intval( untrailingslashit( str_replace( trailingslashit( $redirect_url ) . 'page/', '', $requested_url ) ) );

            if ( $parse_page_from_link > 0 ) {
                $redirect_url = false;
            }
        }
        return $redirect_url;
    }

    /**
     * Filters the list of CSS body class names for the current archive.
     *
     * @param array $classes - An array of body class names.
     * @return string
     */
    public function add_body_archive_classes( $classes ) {
        if (
            isset( $_REQUEST['vp_preview_post_id'] ) &&
            ! empty( $_REQUEST['vp_preview_post_id'] ) &&
            isset( $_REQUEST['vp_preview_nonce'] ) &&
            ! empty( $_REQUEST['vp_preview_nonce'] ) &&
            wp_verify_nonce( sanitize_key( $_REQUEST['vp_preview_nonce'] ), 'vp-ajax-nonce' )
        ) {
            $post_id = intval( $_REQUEST['vp_preview_post_id'] );
        }

        $post_id = $post_id ?? get_the_ID() ?? null;

        if ( $post_id && get_post_meta( $post_id, '_vp_post_type_mapped', true ) ) {
            $classes[] = 'visual-portfolio-archive';
            $classes[] = 'archive';
            $classes[] = 'post-type-archive';

            $unused_classes = array( 'single', 'single-page', 'page', 'postid-' . $post_id, 'page-id-' . $post_id );
            foreach ( $unused_classes as $unused_class ) {
                $founding_key = array_search( $unused_class, $classes, true );
                if ( false !== $founding_key ) {
                    unset( $classes[ $founding_key ] );
                }
            }
        }
        return $classes;
    }

    /**
     * Change Title for Archive Taxonomy pages.
     *
     * @param string $title - Post title.
     * @param int    $id - Post ID.
     * @return string
     */
    public function set_archive_title( $title, $id = 0 ) {
        if ( $id && get_post_meta( $id, '_vp_post_type_mapped', true ) ) {
            global $wp_query;

            if ( isset( $wp_query->query['vp_category'] ) ) {
                $category = get_term_by( 'slug', $wp_query->query['vp_category'], 'portfolio_category' );
                // translators: %s - taxonomy name.
                $title = sprintf( esc_html__( 'Portfolio Category: %s', '@@text_domain' ), esc_html( ucfirst( $category->name ) ) );
            }

            if ( isset( $wp_query->query['portfolio_tag'] ) ) {
                $tag = get_term_by( 'slug', $wp_query->query['portfolio_tag'], 'portfolio_tag' );
                // translators: %s - taxonomy name.
                $title = sprintf( esc_html__( 'Portfolio Tag: %s', '@@text_domain' ), esc_html( ucfirst( $tag->name ) ) );
            }
        }
        return $title;
    }

    /**
     * Add filter items.
     *
     * @param array $terms - Current terms.
     * @param array $vp_options - Current vp_list options.
     * @return array
     */
    public function add_filter_items( $terms, $vp_options ) {
        if (
            isset( $_REQUEST['vp_preview_post_id'] ) &&
            ! empty( $_REQUEST['vp_preview_post_id'] ) &&
            isset( $_REQUEST['vp_preview_nonce'] ) &&
            ! empty( $_REQUEST['vp_preview_nonce'] ) &&
            wp_verify_nonce( sanitize_key( $_REQUEST['vp_preview_nonce'] ), 'vp-ajax-nonce' )
        ) {
            $post_id = intval( $_REQUEST['vp_preview_post_id'] );
        }

        $post_id = $post_id ?? get_the_ID() ?? null;

        if (
            $post_id &&
            get_post_meta( $post_id, '_vp_post_type_mapped', true ) &&
            'current_query' === $vp_options['posts_source'] &&
            'post-based' === $vp_options['content_source']
        ) {

            $query_opts = Visual_Portfolio_Get::get_query_params( $vp_options, true );
            // Get active item.
            $active_item     = Visual_Portfolio_Get::get_filter_active_item( $query_opts );
            $portfolio_query = new WP_Query(
                array(
                    'post_type'      => 'portfolio',
                    'posts_per_page' => -1,
                )
            );
            $term_items      = Visual_Portfolio_Get::get_posts_terms( $portfolio_query, $active_item );

            // Add 'All' active item.
            if ( ! empty( $term_items['terms'] ) && $vp_options['filter_text_all'] ) {
                array_unshift(
                    $term_items['terms'],
                    array(
                        'filter'      => '*',
                        'label'       => $vp_options['filter_text_all'],
                        'description' => false,
                        'count'       => false,
                        'id'          => 0,
                        'parent'      => 0,
                        'active'      => ! $term_items['there_is_active'],
                        'url'         => Visual_Portfolio_Get::get_pagenum_link(
                            array(
                                'vp_filter' => '',
                                'vp_page'   => 1,
                            )
                        ),
                        'class'       => 'vp-filter__item' . ( ! $term_items['there_is_active'] ? ' vp-filter__item-active' : '' ),
                    )
                );
            }
            if ( ! empty( $term_items['terms'] ) ) {
                $terms = $term_items['terms'];
            }
        }

        return $terms;
    }

    /**
     * Init permalink settings.
     *
     * @return void
     */
    public function permalink_settings_init() {
        add_settings_section(
            'portfolio-permalink',
            esc_html__( 'Portfolio permalinks', '@@text_domain' ),
            array( $this, 'settings' ),
            'permalink'
        );

        add_settings_field(
            'vp_category_slug',
            esc_html__( 'Portfolio category base', '@@text_domain' ),
            array( $this, 'slug_input' ),
            'permalink',
            'optional',
            array(
                'id'          => 'vp_category_slug',
                'placeholder' => esc_attr_x( 'portfolio-category', 'slug', '@@text_domain' ),
                'value'       => 'category_base',
            )
        );

        add_settings_field(
            'vp_tag_slug',
            esc_html__( 'Portfolio tag base', '@@text_domain' ),
            array( $this, 'slug_input' ),
            'permalink',
            'optional',
            array(
                'id'          => 'vp_tag_slug',
                'placeholder' => esc_attr_x( 'portfolio-tag', 'slug', '@@text_domain' ),
                'value'       => 'tag_base',
            )
        );
    }

    /**
     * Get permalink settings for things like portfolios and taxonomies.
     *
     * The permalink settings are stored to the option instead of
     * being blank and inheritting from the locale. This speeds up page loading
     * times by negating the need to switch locales on each page load.
     *
     * This is more inline with WP core behavior which does not localize slugs.
     *
     * @param boolean $replace_portfolio_slug - replace portfolio slug automatically. Used in post type registration.
     *
     * @return array
     */
    public static function get_permalink_structure( $replace_portfolio_slug = false ) {
        $saved_permalinks = (array) get_option( 'portfolio_permalinks', array() );
        $permalinks       = wp_parse_args(
            array_filter( $saved_permalinks ),
            array(
                'portfolio_base'         => '%portfolio_page_slug%',
                'category_base'          => _x( 'portfolio-category', 'slug', '@@text_domain' ),
                'tag_base'               => _x( 'portfolio-tag', 'slug', '@@text_domain' ),
                'attribute_base'         => '',
            )
        );

        if ( $saved_permalinks !== $permalinks ) {
            update_option( 'portfolio_permalinks', $permalinks );
        }

        // Replace portfolio page slug.
        if ( $replace_portfolio_slug && strpos( $permalinks['portfolio_base'], '%portfolio_page_slug%' ) !== false ) {
            $permalinks['portfolio_base'] = str_replace( '%portfolio_page_slug%', self::get_portfolio_slug(), $permalinks['portfolio_base'] );
        }

        $permalinks['portfolio_base'] = ltrim( $permalinks['portfolio_base'], '/\\' );

        $permalinks['portfolio_base'] = untrailingslashit( $permalinks['portfolio_base'] );
        $permalinks['category_base']  = untrailingslashit( $permalinks['category_base'] );
        $permalinks['tag_base']       = untrailingslashit( $permalinks['tag_base'] );

        return $permalinks;
    }

    /**
     * Show a slug input box.
     *
     * @param array $attributes - Setting attributes.
     * @return void
     */
    public function slug_input( $attributes ) {
        $id          = $attributes['id'];
        $placeholder = $attributes['placeholder'];
        $value       = $attributes['value'];
        ?>
        <input
            name="<?php echo esc_attr( $id ); ?>"
            id="<?php echo esc_attr( $id ); ?>"
            value="<?php echo esc_html( isset( $this->permalinks[ $value ] ) ? $this->permalinks[ $value ] : '' ); ?>"
            placeholder="<?php echo esc_attr( $placeholder ); ?>"
            type="text"
            class="regular-text code"
        />
        <?php
    }

    /**
     * Show the settings.
     */
    public function settings() {
        /* translators: %s: Home URL */
        echo wp_kses_post( wpautop( sprintf( __( 'If you like, you may enter custom structures for your portfolio URLs here. For example, using <code>portfolio</code> would make your portfolio links like <code>%sportfolio/sample-portfolio/</code>. This setting affects portfolio URLs only, not things such as portfolio categories. We also recommend you use the <code>%%portfolio_page_slug%%</code> slug, which will automatically use the slug of you Portfolio Archive page.', '@@text_domain' ), esc_url( home_url( '/' ) ) ) ) );

        $page_slug    = '%portfolio_page_slug%';
        $default_slug = _x( 'portfolio', 'default-slug', '@@text_domain' );
        $current_base = trailingslashit( $this->permalinks['portfolio_base'] );
        $structures   = array(
            0  => '',
            1  => trailingslashit( $page_slug ),
            2  => trailingslashit( $page_slug ) . trailingslashit( '%portfolio_category%' ),

            // Only used in the html output in the settings.
            99 => trailingslashit( $default_slug ),
        );

        ?>
        <table class="form-table vp-permalink-structure">
            <tbody>
                <tr>
                    <th><label><input name="portfolio_permalink" type="radio" value="<?php echo esc_attr( $structures[0] ); ?>" class="vp-permalink-radio" <?php checked( $structures[99], $current_base ); ?> /> <?php esc_html_e( 'Default', '@@text_domain' ); ?></label></th>
                    <td><code class="default-example"><?php echo esc_html( home_url() ); ?>/?portfolio=sample-portfolio</code> <code class="non-default-example"><?php echo esc_html( home_url() ); ?>/<?php echo esc_html( $default_slug ); ?>/sample-portfolio/</code></td>
                </tr>
                <tr>
                    <th><label><input name="portfolio_permalink" type="radio" value="<?php echo esc_attr( $structures[1] ); ?>" class="vp-permalink-radio" <?php checked( $structures[1], $current_base ); ?> /> <?php esc_html_e( 'Portfolio base', '@@text_domain' ); ?></label></th>
                    <td><code><?php echo esc_html( home_url() ); ?>/<?php echo esc_html( $page_slug ); ?>/sample-portfolio/</code></td>
                </tr>
                <tr>
                    <th><label><input name="portfolio_permalink" type="radio" value="<?php echo esc_attr( $structures[2] ); ?>" class="vp-permalink-radio" <?php checked( $structures[2], $current_base ); ?> /> <?php esc_html_e( 'Portfolio base with category', '@@text_domain' ); ?></label></th>
                    <td><code><?php echo esc_html( home_url() ); ?>/<?php echo esc_html( $page_slug ); ?>/portfolio-category/sample-portfolio/</code></td>
                </tr>
                <tr>
                    <th><label><input name="portfolio_permalink" id="portfolio_custom_selection" type="radio" value="custom" class="tog" <?php checked( in_array( $current_base, $structures, true ), false ); ?> />
                        <?php esc_html_e( 'Custom base', '@@text_domain' ); ?></label></th>
                    <td>
                        <input name="portfolio_permalink_structure" id="portfolio_permalink_structure" type="text" value="<?php echo esc_attr( $current_base ? $current_base : '' ); ?>" class="regular-text code"> <span class="description"><?php esc_html_e( 'Enter a custom base to use. A base must be set or WordPress will use default instead.', '@@text_domain' ); ?></span>
                    </td>
                </tr>
            </tbody>
        </table>
        <?php wp_nonce_field( 'vp-permalinks', 'vp-permalinks-nonce' ); ?>
        <script type="text/javascript">
            jQuery( function( $ ) {
                $( 'input.vp-permalink-radio' ).on( 'change', function() {
                    $( '#portfolio_permalink_structure' ).val( $( this ).val() );
                } );

                $('.permalink-structure input').on( 'change', function() {
                    $( '.vp-permalink-structure' ).find( 'code.non-default-example, code.default-example' ).hide();

                    if ( $( this ).val() ) {
                        $( '.vp-permalink-structure code.non-default-example' ).show();
                        $( '.vp-permalink-structure input' ).removeAttr( 'disabled' );
                    } else {
                        $( '.vp-permalink-structure code.default-example' ).show();
                        $( '.vp-permalink-structure input:eq(0)' ).trigger( 'click' );
                        $( '.vp-permalink-structure input' ).attr( 'disabled', 'disabled' );
                    }
                } );

                $( '.permalink-structure input:checked' ).trigger( 'change' );
                $( '#portfolio_permalink_structure' ).on( 'focus', function() {
                    $( '#portfolio_custom_selection' ).trigger( 'click' );
                } );
            } );
        </script>
        <?php
    }

    /**
     * Save the permalink settings.
     */
    public function permalink_settings_save() {
        if ( ! is_admin() ) {
            return;
        }

        // We need to save the options ourselves; settings api does not trigger save for the permalinks page.
        if (
            isset( $_POST['permalink_structure'], $_POST['vp-permalinks-nonce'], $_POST['vp_category_slug'], $_POST['vp_tag_slug'] ) &&
            wp_verify_nonce( sanitize_key( $_POST['vp-permalinks-nonce'] ), 'vp-permalinks' )
        ) {
            $permalinks                  = (array) get_option( 'portfolio_permalinks', array() );
            $permalinks['category_base'] = sanitize_text_field( wp_unslash( $_POST['vp_category_slug'] ) );
            $permalinks['tag_base']      = sanitize_text_field( wp_unslash( $_POST['vp_tag_slug'] ) );

            // Generate portfolio base.
            // After WordPress update to 6.1 version we encountered an error saving permalinks.
            // Thus, the data stored in permalinks is now checked for the presence of % symbols in their strings.
            // When validating a 'custom' value, there is no percentage in this line, which generates an error.
            // Text of error: A structure tag is required when using custom permalinks.
            // This has now been fixed by adding a strict check on the 'custom' value.
            $portfolio_base = isset( $_POST['portfolio_permalink'] ) &&
                            'custom' !== $_POST['portfolio_permalink'] ?
                            sanitize_option( 'permalink_structure', wp_unslash( $_POST['portfolio_permalink'] ) ) :
                            ( isset( $_POST['portfolio_permalink'] ) ? 'custom' : '' );

            if ( 'custom' === $portfolio_base ) {
                if ( isset( $_POST['portfolio_permalink_structure'] ) ) {
                    $portfolio_base = preg_replace( '#/+#', '/', '/' . str_replace( '#', '', trim( sanitize_option( 'permalink_structure', wp_unslash( $_POST['portfolio_permalink_structure'] ) ) ) ) );
                } else {
                    $portfolio_base = '/';
                }

                // This is an invalid base structure and breaks pages.
                if ( '/%portfolio_category%/' === trailingslashit( $portfolio_base ) ) {
                    $portfolio_base = '/%portfolio_page_slug%' . $portfolio_base;
                }
            } elseif ( empty( $portfolio_base ) ) {
                $portfolio_base = '/' . _x( 'portfolio', 'default-slug', '@@text_domain' );
            }

            $permalinks['portfolio_base'] = $portfolio_base;

            update_option( 'portfolio_permalinks', $permalinks );
        }
    }

    /**
     * Initialize archive rewrite rules.
     *
     * @return void
     */
    public function init_rewrite_rules() {
        $slug = get_post_field( 'post_name', $this->archive_page );
        add_rewrite_tag( '%vp_page_query%', '([^&]+)' );
        add_rewrite_tag( '%vp_page_archive%', '([^&]+)' );
        add_rewrite_tag( '%vp_category%', '([^&]+)' );

        add_rewrite_rule(
            '^' . $slug . '/page/?([0-9]{1,})/?',
            'index.php?post_type=portfolio&vp_page_archive=1&vp_page_query=$matches[1]',
            'top'
        );
        if ( (int) get_option( 'page_on_front' ) === (int) $this->archive_page ) {
            add_rewrite_rule(
                '^page/?([0-9]{1,})/?',
                'index.php?post_type=portfolio&vp_page_archive=1&vp_page_query=$matches[1]',
                'top'
            );
        }
        add_rewrite_rule(
            '^' . $this->permalinks['category_base'] . '/([^/]*)/page/?([0-9]{1,})/?',
            'index.php?post_type=portfolio&vp_page_archive=1&portfolio_category=$matches[1]&vp_category=$matches[1]&vp_page_query=$matches[2]',
            'top'
        );
        add_rewrite_rule(
            '^' . $this->permalinks['category_base'] . '/([^/]*)/?',
            'index.php?post_type=portfolio&vp_page_archive=1&portfolio_category=$matches[1]&vp_category=$matches[1]&vp_page_query=1',
            'top'
        );
        add_rewrite_rule(
            '^' . $this->permalinks['tag_base'] . '/([^/]*)/page/?([0-9]{1,})/?',
            'index.php?post_type=portfolio&vp_page_archive=1&portfolio_tag=$matches[1]&vp_page_query=$matches[2]',
            'top'
        );
        add_rewrite_rule(
            '^' . $this->permalinks['tag_base'] . '/([^/]*)/?',
            'index.php?post_type=portfolio&vp_page_archive=1&portfolio_tag=$matches[1]&vp_page_query=1',
            'top'
        );
    }

    /**
     * Replace tags in Portfolio Permalinks.
     *
     * @param  string  $permalink - current permalink.
     * @param  WP_Post $post - current post.
     * @return string
     */
    public function portfolio_permalink_replacements( $permalink, $post ) {
        // Category slug.
        if ( strpos( $permalink, '%portfolio_category%' ) !== false ) {
            $terms = get_the_terms( $post, 'portfolio_category' );
            if ( ! is_wp_error( $terms ) && ! empty( $terms ) && is_object( $terms[0] ) ) {
                $term_slug = array_pop( $terms )->slug;
            } else {
                $term_slug = 'no-portfolio_category';
            }

            $permalink = str_replace( '%portfolio_category%', $term_slug, $permalink );
        }

        return $permalink;
    }

    /**
     * Override an archive page based on passed query arguments.
     *
     * @param WP_Query $query The query to check.
     */
    public function maybe_override_archive( $query ) {
        if ( is_admin() ) {
            return;
        }

        $post_type = 'portfolio';

        // Maybe Redirect.
        if ( is_page() ) {
            $object_id = get_queried_object_id();
            $post_meta = get_post_meta( $object_id, '_vp_post_type_mapped', true );
            if ( ! $post_meta && get_query_var( 'paged' ) ) {
                return;
            }
        }

        if (
            (
                is_post_type_archive( $post_type ) ||
                (
                    (int) get_option( 'page_on_front' ) === (int) $this->archive_page &&
                    isset( $object_id ) &&
                    (int) $object_id === (int) $this->archive_page
                )
            ) &&
            '' !== $this->archive_page && $query->is_main_query()
        ) {
            $post_id = absint( $this->archive_page );
            $post_id = Visual_Portfolio_3rd_WPML::get_object_id( $post_id );
            $query->set( 'post_type', 'page' );
            $query->set( 'page_id', $post_id );
            $query->set( 'original_archive_type', 'page' );
            $query->set( 'original_archive_id', $post_type );
            $query->set( 'term_tax', '' );
            $query->is_archive           = false;
            $query->is_single            = true;
            $query->is_singular          = true;
            $query->is_page              = true;
            $query->is_post_type_archive = false;

            if (
                isset( $query->query['vp_category'] ) &&
                ! empty( $query->query['vp_category'] ) &&
                ! isset( $query->query['vp_filter'] )
            ) {
                $query->set( 'vp_filter', 'portfolio_category:' . $query->query['vp_category'] );
            }

            if (
                isset( $query->query['vp_page_query'] ) &&
                ! empty( $query->query['vp_page_query'] ) &&
                (
                    // phpcs:ignore WordPress.Security.NonceVerification
                    isset( $_REQUEST['vpf_ajax_call'] ) && settype( sanitize_text_field( wp_unslash( $_REQUEST['vpf_ajax_call'] ) ), 'bool' )
                )
            ) {
                unset( $query->query['vp_page_query'] );
                unset( $query->query_vars['vp_page_query'] );
            }

            if ( isset( $query->query['portfolio_tag'] ) && isset( $query->query['vp_page_archive'] ) ) {
                /**
                 * Fix WordPress Notices for Tag Taxonomy.
                 * If not set post type from queried object, header auto classes not set and generate notice error.
                 */
                $query->is_page        = false;
                $query->is_tag         = true;
                $post                  = new stdClass();
                $post->post_type       = $post_type;
                $post->ID              = $post_id;
                $query->queried_object = new WP_Post( $post );
            }
        }
    }

    /**
     * Substituting query parameters before block output.
     *
     * @param array $args - Query arguments.
     * @param array $options - Block options.
     * @return array
     */
    public function extend_query_args( $args, $options ) {
        if (
            isset( $_REQUEST['vp_preview_post_id'] ) &&
            ! empty( $_REQUEST['vp_preview_post_id'] ) &&
            isset( $_REQUEST['vp_preview_nonce'] ) &&
            ! empty( $_REQUEST['vp_preview_nonce'] ) &&
            wp_verify_nonce( sanitize_key( $_REQUEST['vp_preview_nonce'] ), 'vp-ajax-nonce' )
        ) {
            $post_id = intval( $_REQUEST['vp_preview_post_id'] );
        }

        $post_id = $post_id ?? $args['page_id'] ?? null;

        if ( $post_id && 'current_query' === $options['posts_source'] ) {
            $post_meta = get_post_meta( (int) $post_id, '_vp_post_type_mapped', true );
            if ( ! empty( $post_meta ) && $post_meta ) {

                $args['post_type'] = $post_meta;

                if (
                    isset( $args['vp_page_archive'] ) &&
                    $args['vp_page_archive'] &&
                    isset( $args['vp_page_query'] ) &&
                    ! empty( $args['vp_page_query'] )
                ) {
                    $args['paged'] = $args['vp_page_query'];
                }

                if ( isset( $args['page_id'] ) ) {
                    unset( $args['page_id'] );
                }

                unset( $args['p'] );
                $args['posts_per_page'] = $this->posts_per_page;
            }
        }
        return $args;
    }

    /**
     * If not set default paged style - Delete pagination on archive pagination pages: /pages/<page_number>.
     *
     * @param array $options - Block Options.
     * @return array
     */
    public function unset_pagination_archive_page( $options ) {
        global $wp_query;
        if ( $wp_query && isset( $wp_query->query_vars ) && is_array( $wp_query->query_vars ) && 'current_query' === $options['posts_source'] ) {
            $is_page_archive = $wp_query->query_vars['vp_page_archive'] ?? false;
            /**
             * Also check the standard rewrite requests and find out if the page is an archive.
             */
            $is_page_archive = isset( $wp_query->query_vars['paged'] ) &&
                            isset( $wp_query->query_vars['original_archive_id'] ) &&
                            'portfolio' === $wp_query->query_vars['original_archive_id'] ? true : $is_page_archive;

            if ( $is_page_archive ) {
                foreach ( $options['layout_elements'] as $position => $container ) {
                    if ( ! empty( $container['elements'] ) ) {
                        $key = array_search( 'pagination', $container['elements'], true );
                        if ( false !== $key && isset( $options['pagination'] ) ) {
                            if ( 'paged' === $options['pagination'] || is_tax() ) {
                                // phpcs:ignore WordPress.Security.NonceVerification
                                $vp_page = isset( $_REQUEST['vp_page'] ) && ! empty( $_REQUEST['vp_page'] ) ? sanitize_option( 'posts_per_page', wp_unslash( $_REQUEST['vp_page'] ) ) : null;

                                $options['start_page'] = $wp_query->query_vars['vp_page_query'] ?? $vp_page ?? $wp_query->query_vars['paged'] ?? 1;
                                if ( 0 === $options['start_page'] && 0 === $wp_query->query_vars['paged'] ) {
                                    $options['start_page'] = 1;
                                }
                            } else {
                                unset( $options['layout_elements'][ $position ]['elements'][ $key ] );
                            }
                        }
                    }
                }
            }
        }
        return $options;
    }

    /**
     * Update Post meta mapped after save general archive page option.
     *
     * @param int $post_id - Post ID.
     * @return int
     */
    public static function save_archive_page_option( $post_id ) {

        if ( is_numeric( $post_id ) ) {

            self::delete_post_type_mapped_meta();

            visual_portfolio()->defer_flush_rewrite_rules();

            update_post_meta( (int) $post_id, '_vp_post_type_mapped', 'portfolio' );
        }

        return $post_id;
    }

    /**
     * Delete pages list transient if page title updated.
     * Rewrite flush rules if archive slug changed.
     *
     * @param int   $post_ID - Post ID.
     * @param array $data - Save Post data.
     * @return void
     */
    public function pre_page_update( $post_ID, $data ) {
        if (
            'page' === $data['post_type'] &&
            (int) $this->archive_page === (int) $post_ID &&
            get_post_field( 'post_name', $post_ID ) !== $data['post_name']
        ) {
            visual_portfolio()->defer_flush_rewrite_rules();
        }
    }

    /**
     * Delete pages list transient if page status set as trashed.
     * Also delete archive page and set old slug for default archive permalinks.
     *
     * @param int $post_ID - Post ID.
     * @return void
     */
    public function delete_archive_page( $post_ID ) {
        if ( ! empty( $this->archive_page ) && (int) $post_ID === (int) $this->archive_page ) {
            Settings::update_option( 'portfolio_archive_page', 'vp_general', '' );

            self::delete_post_type_mapped_meta();
        }
    }

    /**
     * Rewrite Flush Rules after update portfolio page option.
     *
     * @param  array  $old_value - Old value before update.
     * @param  array  $value - New value after update.
     * @param  string $option - Name of option.
     * @return void
     */
    public function flush_rewrite_rules_after_update( $old_value, $value, $option ) {
        if (
            isset( $old_value['portfolio_archive_page'] ) &&
            isset( $value['portfolio_archive_page'] ) &&
            'vp_general' === $option
        ) {
            if (
                ! empty( $value['portfolio_archive_page'] ) &&
                $old_value['portfolio_archive_page'] === $value['portfolio_archive_page']
            ) {
                visual_portfolio()->defer_flush_rewrite_rules();
            }

            if (
                empty( $value['portfolio_archive_page'] ) &&
                $old_value['portfolio_archive_page'] !== $value['portfolio_archive_page'] &&
                is_numeric( $old_value['portfolio_archive_page'] )
            ) {
                self::delete_post_type_mapped_meta();

                visual_portfolio()->defer_flush_rewrite_rules();
            }
        }
    }

    /**
     * Remove mapped post meta from all pages.
     *
     * @return void
     */
    private static function delete_post_type_mapped_meta() {
        global $wpdb;
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM %s
                WHERE meta_key = '_vp_post_type_mapped'",
                $wpdb->postmeta
            )
        );
    }

    /**
     * Create default archive page.
     *
     * @param string $custom_slug - Default Archive Slug.
     * @return void
     */
    public static function create_archive_page( $custom_slug = 'portfolio' ) {
        if ( ! get_option( '_vp_add_archive_page' ) && ! get_option( '_vp_trying_to_add_archive_page' ) ) {

            add_option( '_vp_trying_to_add_archive_page', true );

            $args = array(
                'post_title'    => esc_html__( 'Portfolio', '@@text_domain' ),
                'post_status'   => 'publish',
                'post_type'     => 'page',
                'post_name'     => $custom_slug,
            );

            // Insert the post into the database.
            $post_id = wp_insert_post( $args );

            if ( ! is_wp_error( $post_id ) ) {

                Settings::update_option( 'portfolio_archive_page', 'vp_general', $post_id );

                visual_portfolio()->defer_flush_rewrite_rules();

                self::save_archive_page_option( $post_id );

                $post = get_post( $post_id );

                $slug = $post->post_name;

                wp_update_post(
                    wp_slash(
                        array(
                            'ID'           => $post_id,
                            'post_content' => '<!-- wp:visual-portfolio/block {"block_id":"' . hash( 'crc32b', $slug . $post_id ) . '","content_source":"post-based","posts_source":"current_query","items_gap":30,"layout_elements":{"top":{"elements":["filter"],"align":"center"},"items":{"elements":["items"]},"bottom":{"elements":["pagination"],"align":"center"}},"pagination":"paged"} /-->',
                        )
                    )
                );

                add_option( '_vp_add_archive_page', $post_id );
            }
        }
    }

    /**
     * Add a post display state for special Portfolio Archive page in the pages list table.
     *
     * @param array   $post_states - An array of post display states.
     * @param WP_Post $post        - The current post object.
     * @return array $post_states  - An array of post display states.
     */
    public function add_display_post_states( $post_states, $post ) {
        if ( 'page' === $post->post_type ) {
            // If successful, returns the post type slug.
            $post_type = get_post_meta( $post->ID, '_vp_post_type_mapped', true );
            if ( $post_type && ! empty( $post_type ) ) {
                $post_states[] = esc_html__( 'Portfolio Page', '@@text_domain' );
            }
        }
        return $post_states;
    }

    /**
     * Get Portfolio Archive Slug.
     *
     * @return string
     */
    public static function get_portfolio_slug() {
        // When deleting the archive page, we leave the old slug without overwriting the permalinks.
        // In this case, instead of the archives page, a standard archives page with the corresponding template is substituted.
        $custom_slug = _x( 'portfolio', 'default-slug', '@@text_domain' );

        $archive_page = Settings::get_option( 'portfolio_archive_page', 'vp_general' );

        if ( isset( $archive_page ) && ! empty( $archive_page ) ) {
            // If there is a selected page of archives, we substitute its slug.
            $custom_slug = get_post_field( 'post_name', $archive_page );
        }

        return $custom_slug;
    }
}
new Visual_Portfolio_Archive_Mapping();
