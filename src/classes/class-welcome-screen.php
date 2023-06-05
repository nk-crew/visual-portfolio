<?php
/**
 * Welcome Screen.
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Welcome_Screen
 */
class Visual_Portfolio_Welcome_Screen {
    /**
     * Visual_Portfolio_Welcome_Screen constructor.
     */
    public function __construct() {
        add_action( 'admin_init', array( $this, 'redirect_to_welcome_screen' ) );
        add_action( 'admin_menu', array( $this, 'welcome_screen_page' ) );
        add_action( 'admin_head', array( $this, 'welcome_screen_remove_page' ) );
    }

    /**
     * Check if we can display notice.
     */
    public function redirect_to_welcome_screen() {
        // Bail if no activation redirect.
        if ( ! get_transient( '_visual_portfolio_welcome_screen_activation_redirect' ) ) {
            return;
        }

        // Delete the redirect transient.
        delete_transient( '_visual_portfolio_welcome_screen_activation_redirect' );

        // Bail if activating from network, or bulk.
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        if ( is_network_admin() || isset( $_GET['activate-multi'] ) ) {
            return;
        }

        // Redirect to welcome page.
        wp_safe_redirect( add_query_arg( array( 'page' => 'visual-portfolio-welcome' ), admin_url( Visual_Portfolio_Custom_Post_Type::get_menu_slug() ) ) );
    }

    /**
     * Add welcome screen page.
     */
    public function welcome_screen_page() {
        add_submenu_page(
            Visual_Portfolio_Custom_Post_Type::get_menu_slug(),
            esc_html__( 'Visual Portfolio Welcome Screen', '@@text_domain' ),
            esc_html__( 'Visual Portfolio Welcome Screen', '@@text_domain' ),
            'manage_options',
            'visual-portfolio-welcome',
            array( $this, 'welcome_screen_page_content' )
        );
    }

    /**
     * Remove welcome screen page from admin menu.
     */
    public function welcome_screen_remove_page() {
        remove_submenu_page( Visual_Portfolio_Custom_Post_Type::get_menu_slug(), 'visual-portfolio-welcome' );
    }

    /**
     * Add welcome screen page content.
     */
    public function welcome_screen_page_content() {
        if ( function_exists( 'print_emoji_detection_script' ) ) {
            print_emoji_detection_script();
        }
        $go_pro_links = array(
            'head'          => Visual_Portfolio_Admin::get_plugin_site_url(
                array(
                    'utm_medium'   => 'welcome_page',
                    'utm_campaign' => 'go_pro_head',
                )
            ),
            'more_features' => Visual_Portfolio_Admin::get_plugin_site_url(
                array(
                    'sub_path'     => '',
                    'utm_medium'   => 'welcome_page',
                    'utm_campaign' => 'more_features',
                )
            ),
            'docs'          => Visual_Portfolio_Admin::get_plugin_site_url(
                array(
                    'sub_path'     => 'docs/getting-started',
                    'utm_medium'   => 'welcome_page',
                    'utm_campaign' => 'docs',
                )
            ),
            'foot'          => Visual_Portfolio_Admin::get_plugin_site_url(
                array(
                    'utm_medium'   => 'settings_page',
                    'utm_campaign' => 'go_pro_foot',
                )
            ),
        );
        ?>
        <div class="vpf-welcome-screen">
            <div class="vpf-welcome-head">
                <img class="vpf-welcome-head-background" src="<?php echo esc_url( visual_portfolio()->plugin_url . 'assets/admin/images/admin-welcome-background.jpg' ); ?>" alt="<?php echo esc_attr__( 'Visual Portfolio', '@@text_domain' ); ?>">
                <h2 class="vpf-welcome-head-logo">
                    <i class="dashicons-visual-portfolio"></i>
                    <?php echo esc_html__( 'Visual Portfolio', '@@text_domain' ); ?>
                </h2>
                <div class="vpf-welcome-subtitle"><?php echo esc_html__( 'Thank you for choosing Visual Portfolio - The Modern Gallery, Posts Grid and Portfolio Plugin for WordPress.', '@@text_domain' ); ?></div>

                <div class="vpf-welcome-head-pro-info">
                    <div><strong><?php echo esc_html__( 'You\'re using free Visual Portfolio plugin. Enjoy! 🙂', '@@text_domain' ); ?></strong></div>
                    <div>
                        <?php
                        // translators: %s - pro link.
                        echo sprintf( esc_html__( 'Want to get more power with Pro? Visit %s', '@@text_domain' ), '<a target="_blank" rel="noopener noreferrer" href="' . esc_url( $go_pro_links['head'] ) . '">visualportfolio.co/pricing</a>' );
                        ?>
                    </div>
                </div>
            </div>

            <div class="vpf-welcome-content">
                <h2 class="vpf-welcome-content-title"><?php echo esc_html__( 'Main Features & Solutions', '@@text_domain' ); ?></h2>

                <ul class="vpf-welcome-content-features">
                    <li>
                        <span>🏆</span>
                        <strong><?php echo esc_html__( 'Visual Gallery Builder', '@@text_domain' ); ?></strong>
                        <p><?php echo esc_html__( 'Build your portfolio and gallery blocks with no coding knowledge. Thanks to Gutenberg page builder you are able to create and customize galleries visually.', '@@text_domain' ); ?></p>
                    </li>
                    <li>
                        <span>🚀</span>
                        <strong><?php echo esc_html__( 'Optimized to be Fast as Native', '@@text_domain' ); ?></strong>
                        <p><?php echo esc_html__( 'Due to the modular code structure, all scripts and styles are loaded only when they are needed for the current page that displays your gallery.', '@@text_domain' ); ?></p>
                    </li>

                    <li>
                        <span>📱</span>
                        <strong><?php echo esc_html__( 'Layouts', '@@text_domain' ); ?></strong>
                        <p><?php echo esc_html__( 'Our gallery plugin shipped with popular layouts such as Masonry and Justified (Flickr).', '@@text_domain' ); ?></p>
                    </li>
                    <li>
                        <span>🎨</span>
                        <strong><?php echo esc_html__( 'Visual Effects', '@@text_domain' ); ?></strong>
                        <p><?php echo esc_html__( 'Showcase your projects ang gallery images with clean and beautiful visual styles.', '@@text_domain' ); ?></p>
                    </li>

                    <li>
                        <span>⚙️</span>
                        <strong><?php echo esc_html__( 'Easy to Customize', '@@text_domain' ); ?></strong>
                        <p><?php echo esc_html__( 'The gallery block with live preview includes a lot of design settings that are point-and-click, no coding knowledge required.', '@@text_domain' ); ?></p>
                    </li>
                    <li>
                        <span>💎</span>
                        <strong><?php echo esc_html__( 'Posts Query Builder', '@@text_domain' ); ?></strong>
                        <p><?php echo esc_html__( 'Display posts, portfolios, and any other post types, filter by taxonomies, author, date ranges, and much more options.', '@@text_domain' ); ?></p>
                    </li>

                    <li>
                        <span>⚡</span>
                        <strong><?php echo esc_html__( 'Powerful Lightbox', '@@text_domain' ); ?></strong>
                        <p><?php echo esc_html__( 'Visual Portfolio uses scripts for lightboxes that is high performance, mobile optimized and retina-ready.', '@@text_domain' ); ?></p>
                    </li>
                    <li>
                        <span>📹</span>
                        <strong><?php echo esc_html__( 'Video and 🎵 Audio Support', '@@text_domain' ); ?></strong>
                        <p><?php echo esc_html__( 'Present not only photos, but also audios and videos within a single gallery.', '@@text_domain' ); ?></p>
                    </li>
                </ul>

                <hr>

                <div class="vpf-welcome-content-buttons">
                    <a target="_blank" rel="noopener noreferrer" href="<?php echo esc_url( $go_pro_links['more_features'] ); ?>"><?php echo esc_html__( 'More Features', '@@text_domain' ); ?></a>
                    <a target="_blank" rel="noopener noreferrer" href="<?php echo esc_url( $go_pro_links['docs'] ); ?>"><?php echo esc_html__( 'Documentation', '@@text_domain' ); ?></a>
                </div>
            </div>

            <div class="vpf-welcome-foot-pro-info">
                <h2>
                    <?php echo esc_html__( 'Upgrade to Visual Portfolio Pro', '@@text_domain' ); ?>
                    <br>
                    <?php echo esc_html__( 'and Get More Power!', '@@text_domain' ); ?>
                </h2>
                <ul>
                    <li><?php echo esc_html__( 'Social Feeds', '@@text_domain' ); ?></li>
                    <li><?php echo esc_html__( 'Stylish Effects', '@@text_domain' ); ?></li>
                    <li><?php echo esc_html__( 'Watermarks Protection', '@@text_domain' ); ?></li>
                    <li><?php echo esc_html__( 'Age Gate Protection', '@@text_domain' ); ?></li>
                    <li><?php echo esc_html__( 'Instagram-like Image Filters', '@@text_domain' ); ?></li>
                    <li><?php echo esc_html__( 'Advanced Query Settings', '@@text_domain' ); ?></li>
                    <li><?php echo esc_html__( 'Popup for Posts and Pages', '@@text_domain' ); ?></li>
                    <li><?php echo esc_html__( 'Popup Deep Linking', '@@text_domain' ); ?></li>
                    <li><?php echo esc_html__( 'White Label', '@@text_domain' ); ?></li>
                    <li><?php echo esc_html__( 'And much more...', '@@text_domain' ); ?></li>
                </ul>
                <a target="_blank" rel="noopener noreferrer" href="<?php echo esc_url( $go_pro_links['foot'] ); ?>"><?php echo esc_html__( 'Upgrade to PRO Now', '@@text_domain' ); ?></a>
            </div>
        </div>
        <?php
    }
}

new Visual_Portfolio_Welcome_Screen();
