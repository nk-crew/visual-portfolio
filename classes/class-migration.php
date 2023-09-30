<?php
/**
 * Migrations
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Migrations
 */
class Visual_Portfolio_Migrations {
	/**
	 * The version.
	 *
	 * @var string
	 */
	protected $version = VISUAL_PORTFOLIO_VERSION;

	/**
	 * Initial version.
	 *
	 * @var string
	 */
	protected $initial_version = '1.16.2';

	/**
	 * Visual_Portfolio_Migrations constructor.
	 */
	public function __construct() {
		if ( is_admin() ) {
			add_action( 'admin_init', array( $this, 'init' ), 3 );
		} else {
			add_action( 'wp', array( $this, 'init' ), 3 );
		}
	}

	/**
	 * Init.
	 */
	public function init() {
		// Migration code added after `$this->initial_version` plugin version.
		$saved_version   = get_option( 'vpf_db_version', $this->initial_version );
		$current_version = $this->version;

		foreach ( $this->get_migrations() as $migration ) {
			if ( version_compare( $saved_version, $migration['version'], '<' ) ) {
				call_user_func( $migration['cb'] );
			}
		}

		if ( version_compare( $saved_version, $current_version, '<' ) ) {
			update_option( 'vpf_db_version', $current_version );
		}
	}

	/**
	 * Get all available migrations.
	 *
	 * @return array
	 */
	public function get_migrations() {
		return array(
			array(
				'version' => '3.0.0',
				'cb'      => array( $this, 'v_3_0_0' ),
			),
			array(
				'version' => '2.15.0',
				'cb'      => array( $this, 'v_2_15_0' ),
			),
			array(
				'version' => '2.10.0',
				'cb'      => array( $this, 'v_2_10_0' ),
			),
			array(
				'version' => '2.0.0',
				'cb'      => array( $this, 'v_2_0_0' ),
			),
			array(
				'version' => '1.11.0',
				'cb'      => array( $this, 'v_1_11_0' ),
			),
		);
	}

	/**
	 * Add new attributes and values from old attributes.
	 */
	public function v_3_0_0() {
		// Get all available Layouts.
		// Don't use WP_Query on the admin side https://core.trac.wordpress.org/ticket/18408.
		$layouts_query = get_posts(
			array(
				'post_type'      => 'vp_lists',
				'posts_per_page' => -1,
				'paged'          => -1,
			)
		);

		$attributes_to_change = array(
			// Align.
			'items_style_default__align'                   => 'items_style_default__caption_text_align',
			'items_style_fade__align'                      => 'items_style_fade__overlay_text_align',
			'items_style_fly__align'                       => 'items_style_fly__overlay_text_align',
			'items_style_emerge__align'                    => 'items_style_emerge__caption_text_align',
			'items_style_caption_move__align'              => 'items_style_caption_move__caption_text_align',

			// Color.
			'items_style_default__bg_color'                => 'items_style_default__overlay_bg_color',
			'items_style_default__text_color'              => 'items_style_default__overlay_text_color',
			'items_style_default__meta_text_color'         => 'items_style_default__caption_text_color',
			'items_style_default__meta_links_color'        => 'items_style_default__caption_links_color',
			'items_style_default__meta_links_hover_color'  => 'items_style_default__caption_links_hover_color',
			'items_style_fade__bg_color'                   => 'items_style_fade__overlay_bg_color',
			'items_style_fade__text_color'                 => 'items_style_fade__overlay_text_color',
			'items_style_fly__bg_color'                    => 'items_style_fly__overlay_bg_color',
			'items_style_fly__text_color'                  => 'items_style_fly__overlay_text_color',
			'items_style_emerge__bg_color'                 => 'items_style_emerge__caption_bg_color',
			'items_style_emerge__text_color'               => 'items_style_emerge__caption_text_color',
			'items_style_emerge__links_color'              => 'items_style_emerge__caption_links_color',
			'items_style_emerge__links_hover_color'        => 'items_style_emerge__caption_links_hover_color',
			'items_style_emerge__img_overlay_bg_color'     => 'items_style_emerge__overlay_bg_color',
			'items_style_caption-move__bg_color'           => 'items_style_caption-move__caption_bg_color',
			'items_style_caption-move__text_color'         => 'items_style_caption-move__caption_text_color',
			'items_style_caption-move__img_overlay_bg_color' => 'items_style_caption-move__overlay_bg_color',
			'items_style_caption-move__overlay_text_color' => 'items_style_caption-move__overlay_text_color',

			// Move Under Image.
			'items_style_fade__move_overlay_under_image'   => 'items_style_fade__overlay_under_image',
			'items_style_fly__move_overlay_under_image'    => 'items_style_fly__overlay_under_image',
			'items_style_emerge__move_overlay_under_image' => 'items_style_emerge__caption_under_image',
			'items_style_caption-move__move_overlay_under_image' => 'items_style_caption-move__caption_under_image',
		);

		$attributes_border_radius = array(
			'items_style_default__images_rounded_corners',
			'items_style_fade__images_rounded_corners',
			'items_style_fly__images_rounded_corners',
			'items_style_emerge__images_rounded_corners',
			'items_style_caption_move__images_rounded_corners',
		);

		if ( $layouts_query ) {
			foreach ( $layouts_query as $post ) {
				// Change Portfolio content source to Post with custom post type Portfolio.
				if ( 'portfolio' === get_post_meta( $post->ID, 'vp_content_source', true ) ) {
					update_post_meta( $post->ID, 'vp_content_source', 'post-based' );
					update_post_meta( $post->ID, 'vp_posts_source', 'portfolio' );
				}

				foreach ( $attributes_to_change as $old_attr => $new_attr ) {
					$old_val = get_post_meta( $post->ID, 'vp_' . $old_attr, true );
					$new_val = get_post_meta( $post->ID, 'vp_' . $new_attr, true );

					if ( $old_val && ! $new_val ) {
						update_post_meta( $post->ID, 'vp_' . $new_attr, $old_val );
					}
				}

				foreach ( $attributes_border_radius as $attr_name ) {
					$attr_val = get_post_meta( $post->ID, 'vp_' . $attr_name, true );

					if ( is_numeric( $attr_val ) ) {
						update_post_meta( $post->ID, 'vp_' . $attr_name, $attr_val . 'px' );
					}
				}
			}
			wp_reset_postdata();
		}
	}

	/**
	 * Check the old portfolio slug option and create a page with archive page based on it.
	 */
	public function v_2_15_0() {
		// Backward compatible with old slug option.
		$settings_section = 'vp_general';
		$option_name      = 'portfolio_slug';
		$options          = get_option( $settings_section );

		if ( isset( $options[ $option_name ] ) ) {
			$custom_slug = $options[ $option_name ];
			$archive_id  = get_option( '_vp_add_archive_page' );

			if ( $archive_id ) {
				// Update archive slug on page.
				wp_update_post(
					array(
						'ID'        => $archive_id,
						'post_name' => wp_slash( $custom_slug ),
					)
				);

				// Rewrite flush rules.
				visual_portfolio()->defer_flush_rewrite_rules();
			} else {
				// Create archive page.
				Visual_Portfolio_Archive_Mapping::create_archive_page( $custom_slug );
			}

			// Delete old option.
			unset( $options[ $option_name ] );
			update_option( $settings_section, $options );
		}
	}

	/**
	 * Move popup title and description settings to single Layouts.
	 */
	public function v_2_10_0() {
		$options = get_option( 'vp_images' );

		if ( ! isset( $options['lazy_loading'] ) ) {
			return;
		}

		if ( 'off' === $options['lazy_loading'] || ! $options['lazy_loading'] ) {
			$options['lazy_loading'] = '';
		} else {
			$options['lazy_loading'] = 'vp';
		}

		update_option( 'vp_images', $options );
	}

	/**
	 * 1. Change Portfolio content source to Post with custom post type Portfolio
	 * 2. Change filters, sort and pagination to layout-elements.
	 */
	public function v_2_0_0() {
		// Get all available Layouts.
		// Don't use WP_Query on the admin side https://core.trac.wordpress.org/ticket/18408.
		$layouts_query = get_posts(
			array(
				'post_type'      => 'vp_lists',
				'posts_per_page' => -1,
				'paged'          => -1,
			)
		);

		if ( $layouts_query ) {
			foreach ( $layouts_query as $post ) {
				// Change Portfolio content source to Post with custom post type Portfolio.
				if ( 'portfolio' === get_post_meta( $post->ID, 'vp_content_source', true ) ) {
					update_post_meta( $post->ID, 'vp_content_source', 'post-based' );
					update_post_meta( $post->ID, 'vp_posts_source', 'portfolio' );
				}

				// Change filters, sort and pagination to layout-elements.
				if ( ! get_post_meta( $post->ID, 'vp_layout_elements', true ) ) {
					$top        = array();
					$bottom     = array();
					$filter     = get_post_meta( $post->ID, 'vp_filter', true );
					$sort       = get_post_meta( $post->ID, 'vp_sort', true );
					$pagination = get_post_meta( $post->ID, 'vp_pagination_style', true );

					// Filter.
					if ( $filter && 'false' !== $filter && false !== $filter ) {
						$top[] = 'filter';
					} else {
						update_post_meta( $post->ID, 'vp_filter', 'minimal' );
					}

					// Sort.
					if ( $sort && 'false' !== $sort && false !== $sort ) {
						$top[] = 'sort';
					} else {
						update_post_meta( $post->ID, 'vp_sort', 'dropdown' );
					}

					// Pagination.
					if ( $pagination && 'false' !== $pagination && false !== $pagination ) {
						$bottom[] = 'pagination';
					} else {
						update_post_meta( $post->ID, 'vp_pagination_style', 'minimal' );
					}

					// Layout Elements.
					if ( ! empty( $top ) || ! empty( $bottom ) ) {
						update_post_meta(
							$post->ID,
							'vp_layout_elements',
							array(
								'top'    => array(
									'elements' => $top,
									'align'    => 'center',
								),
								'items'  => array(
									'elements' => array( 'items' ),
								),
								'bottom' => array(
									'elements' => $bottom,
									'align'    => 'center',
								),
							)
						);
					}
				}
			}
			wp_reset_postdata();
		}
	}

	/**
	 * Move popup title and description settings to single Layouts.
	 */
	public function v_1_11_0() {
		$options = get_option( 'vp_popup_gallery' );

		if ( ! isset( $options['show_caption'] ) && ! isset( $options['caption_title'] ) && ! isset( $options['caption_description'] ) ) {
			return;
		}

		$new_show_caption       = isset( $options['show_caption'] ) ? 'on' === $options['show_caption'] : true;
		$new_title_source       = $new_show_caption && isset( $options['caption_title'] ) ? $options['caption_title'] : 'none';
		$new_description_source = $new_show_caption && isset( $options['caption_description'] ) ? $options['caption_description'] : 'none';

		// Get all available Layouts.
		// Don't use WP_Query on the admin side https://core.trac.wordpress.org/ticket/18408.
		$layouts_query = get_posts(
			array(
				'post_type'      => 'vp_lists',
				'posts_per_page' => -1,
				'paged'          => -1,
			)
		);
		if ( $layouts_query ) {
			foreach ( $layouts_query as $post ) {
				update_post_meta( $post->ID, 'vp_items_click_action_popup_title_source', $new_title_source );
				update_post_meta( $post->ID, 'vp_items_click_action_popup_description_source', $new_description_source );
			}
			wp_reset_postdata();
		}

		// remove saved old options.
		if ( isset( $options['show_caption'] ) ) {
			unset( $options['show_caption'] );
		}
		if ( isset( $options['caption_title'] ) ) {
			unset( $options['caption_title'] );
		}
		if ( isset( $options['caption_description'] ) ) {
			unset( $options['caption_description'] );
		}

		update_option( 'vp_popup_gallery', $options );
	}
}

new Visual_Portfolio_Migrations();
