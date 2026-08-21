<?php
/**
 * Get portfolio list
 *
 * @package visual-portfolio/get
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Slugify.
if ( ! class_exists( 'Cocur\Slugify\Slugify' ) ) {
	require_once visual_portfolio()->plugin_path . 'vendors/slugify/RuleProvider/RuleProviderInterface.php';
	require_once visual_portfolio()->plugin_path . 'vendors/slugify/RuleProvider/DefaultRuleProvider.php';
	require_once visual_portfolio()->plugin_path . 'vendors/slugify/SlugifyInterface.php';
	require_once visual_portfolio()->plugin_path . 'vendors/slugify/Slugify.php';
}
/**
 * Class Visual_Portfolio_Get
 */
class Visual_Portfolio_Get {
	/**
	 * ID of the current printed portfolio
	 *
	 * @var int
	 */
	private static $id = 0;

	/**
	 * ID of the current printed single filter
	 *
	 * @var int
	 */
	private static $filter_id = 0;

	/**
	 * ID of the current printed single sort
	 *
	 * @var int
	 */
	private static $sort_id = 0;

	/**
	 * Random number for random order.
	 *
	 * @var int
	 */
	private static $rand_seed_session = false;

	/**
	 * Array with already used IDs on the page. Used for option 'Avoid Duplicates'
	 *
	 * @var array
	 */
	private static $used_posts = array();

	/**
	 * Check for main query to avoid duplication.
	 *
	 * @var array
	 */
	private static $check_main_query = true;

	/**
	 * Array with all used layout IDs
	 *
	 * @var array
	 */
	private static $used_layouts = array();

	/**
	 * Resolved loop items, keyed by loop attributes and request state.
	 *
	 * @var array
	 */
	private static $loop_items_cache = array();

	/**
	 * Roles of the query string parameters the loop pipeline reads.
	 *
	 * The names themselves depend on the loop, see `get_query_var_name()`.
	 *
	 * @var array
	 */
	private static $loop_query_vars = array( 'page', 'filter', 'sort' );

	/**
	 * Query string name of a loop state parameter.
	 *
	 * A loop with a `queryId` owns its parameters - `vp-3-page` moves that loop
	 * and nothing else, which is what lets two galleries live on one page. A
	 * caller without an id gets the legacy global names: the legacy renderer
	 * goes through these very helpers, and its URLs are public.
	 *
	 * @param string          $name     - `page`, `filter` or `sort`.
	 * @param int|string|null $query_id - id of the loop, or null for the legacy names.
	 *
	 * @return string
	 */
	public static function get_query_var_name( $name, $query_id = null ) {
		$query_id = self::sanitize_query_id( $query_id );

		return null === $query_id ? 'vp_' . $name : 'vp-' . $query_id . '-' . $name;
	}

	/**
	 * Normalize a loop query id.
	 *
	 * The id ends up inside a query string name, so anything that is not a
	 * positive integer is refused rather than escaped - a loop that cannot name
	 * its parameters reads the legacy ones instead of an unusable name.
	 *
	 * @param int|string|null $query_id - id of the loop.
	 *
	 * @return int|null
	 */
	public static function sanitize_query_id( $query_id ) {
		if ( null === $query_id || is_bool( $query_id ) || is_array( $query_id ) || ! is_numeric( $query_id ) ) {
			return null;
		}

		$query_id = (int) $query_id;

		return $query_id > 0 ? $query_id : null;
	}

	/**
	 * Get all available layouts.
	 *
	 * @return array
	 */
	public static function get_all_layouts() {
        // phpcs:ignore Squiz.PHP.CommentedOutCode.Found, Squiz.Commenting.BlockComment.NoEmptyLineBefore
		/*
		 * Example:
			array(
				'new_layout' => array(
					'title'    => esc_html__( 'New Layout', 'text_domain' ),
					'controls' => array(
						... controls ...
					),
				),
			)
		 */
		$layouts = apply_filters( 'vpf_extend_layouts', array() );

		// Extend specific layout controls.
		foreach ( $layouts as $name => $layout ) {
			if ( isset( $layout['controls'] ) ) {
                // phpcs:ignore Squiz.PHP.CommentedOutCode.Found, Squiz.Commenting.BlockComment.NoEmptyLineBefore
				/*
				 * Example:
					array(
						... controls ...
					)
				 */
				$layouts[ $name ]['controls'] = apply_filters( 'vpf_extend_layout_' . $name . '_controls', $layout['controls'] );
			}
		}

		return $layouts;
	}

	/**
	 * Get all available items styles.
	 *
	 * @return array
	 */
	public static function get_all_items_styles() {
        // phpcs:ignore Squiz.PHP.CommentedOutCode.Found, Squiz.Commenting.BlockComment.NoEmptyLineBefore
		/*
		 * Example:
			array(
				'new_items_style' => array(
					'title'            => esc_html__( 'New Items Style', 'visual-portfolio' ),
					'builtin_controls' => array(
						'images_rounded_corners' => true,
						'show_title'             => true,
						'show_categories'        => true,
						'show_date'              => true,
						'show_author'            => true,
						'show_comments_count'    => true,
						'show_views_count'       => true,
						'show_reading_time'      => true,
						'show_excerpt'           => true,
						'show_icons'             => false,
						'align'                  => true,
					),
					'controls'         => array(
						... controls ...
					),
				),
			)
		 */
		$items_styles = apply_filters( 'vpf_extend_items_styles', array() );

		// Extend specific item style controls.
		foreach ( $items_styles as $name => $style ) {
			if ( isset( $style['controls'] ) ) {
                // phpcs:ignore Squiz.PHP.CommentedOutCode.Found, Squiz.Commenting.BlockComment.NoEmptyLineBefore
				/*
				 * Example:
					array(
						... controls ...
					)
				 */
				$items_styles[ $name ]['controls'] = apply_filters( 'vpf_extend_item_style_' . $name . '_controls', $style['controls'] );
			}
		}

		return $items_styles;
	}

	/**
	 * Get all available options of post.
	 *
	 * @param array $atts options for portfolio list to print.
	 * @return array
	 */
	public static function get_options( $atts = array() ) {
		$id       = isset( $atts['id'] ) ? $atts['id'] : false;
		$block_id = isset( $atts['block_id'] ) ? $atts['block_id'] : false;

		if ( ! $id && ! $block_id ) {
			return false;
		}

		$result = array();

		$registered = Visual_Portfolio_Controls::get_registered_array();

		// Get default or saved layout options.
		foreach ( $registered as $item ) {
			if ( isset( $atts[ $item['name'] ] ) ) {
				$result[ $item['name'] ] = $atts[ $item['name'] ];
			} else {
				$result[ $item['name'] ] = Visual_Portfolio_Controls::get_registered_value( $item['name'], $block_id ? false : $id );
			}
		}

		// Options a loop block carries that no legacy control registers. The
		// loop above keeps registered controls only, so these would never
		// reach the query.
		foreach ( array_keys( Visual_Portfolio_Security::get_loop_only_options() ) as $name ) {
			if ( isset( $atts[ $name ] ) ) {
				$result[ $name ] = $atts[ $name ];
			}
		}

		if ( ! isset( $result['id'] ) ) {
			$result['id'] = $block_id ? $block_id : $id;
		}

		// filter.
		$result = Visual_Portfolio_Security::sanitize_attributes( apply_filters( 'vpf_get_options', $result, $atts ) );

		return $result;
	}

	/**
	 * Check if portfolio showed in preview mode.
	 */
	public static function is_preview() {
		$frame = false;
		if ( isset( $_POST['vp_preview_nonce'] ) && wp_verify_nonce( sanitize_key( $_POST['vp_preview_nonce'] ), 'vp-ajax-nonce' ) ) {
            // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash
			$frame = isset( $_POST['vp_preview_frame'] ) ? Visual_Portfolio_Security::sanitize_boolean( $_POST['vp_preview_frame'] ) : false;
			$id    = isset( $_POST['vp_preview_frame_id'] ) ? sanitize_text_field( wp_unslash( $_POST['vp_preview_frame_id'] ) ) : false;

			// Elementor preview.
			if ( ! $frame && ! $id && isset( $_REQUEST['vp_preview_type'] ) && 'elementor' === $_REQUEST['vp_preview_type'] ) {
                // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash
				$frame = isset( $_REQUEST['vp_preview_frame'] ) ? Visual_Portfolio_Security::sanitize_boolean( $_REQUEST['vp_preview_frame'] ) : false;
			}
		}

		return $frame;
	}

	/**
	 * Allow taxonomies to show in Filter
	 *
	 * @param string $taxonomy taxonomy name.
	 *
	 * @return bool
	 */
	public static function allow_taxonomies_for_filter( $taxonomy ) {
		// check taxonomies from settings.
		$custom_taxonomies        = Visual_Portfolio_Settings::get_option( 'filter_taxonomies', 'vp_general' );
		$custom_taxonomies        = explode( ',', $custom_taxonomies );
		$custom_taxonomies_result = false;
		if ( $custom_taxonomies && ! empty( $custom_taxonomies ) ) {
			foreach ( $custom_taxonomies as $tax ) {
				$custom_taxonomies_result = $custom_taxonomies_result || $taxonomy === $tax;
			}
		}

		return apply_filters(
			'vpf_allow_taxonomy_for_filter',
			$custom_taxonomies_result
				|| strpos( $taxonomy, 'category' ) !== false
				|| strpos( $taxonomy, 'jetpack-portfolio-type' ) !== false
				|| 'product_cat' === $taxonomy,
			$taxonomy
		);
	}

	/**
	 * Prepare config, that will be used for output.
	 *
	 * @param array $atts options for portfolio list to print.
	 *
	 * @return array|bool
	 */
	public static function get_output_config( $atts = array() ) {
		if ( ! is_array( $atts ) ) {
			return '';
		}

		$options = self::get_options( $atts );

		if ( ! $options ) {
			return false;
		}

		do_action( 'vpf_before_get_output', $options );

		self::$used_layouts[] = $options['id'];

		// generate unique ID.
		$uid   = ++self::$id;
		$uid   = hash( 'crc32b', $uid . $options['id'] );
		$class = 'vp-portfolio vp-uid-' . $uid;

		// Add ID to class.
		$class .= ' vp-id-' . $options['id'];

		// Add custom class.
		if ( isset( $atts['class'] ) ) {
			$class .= ' ' . $atts['class'];
		}

		// Add custom CSS from VC.
		if ( function_exists( 'vc_shortcode_custom_css_class' ) && isset( $atts['vc_css'] ) ) {
			$class .= ' ' . vc_shortcode_custom_css_class( $atts['vc_css'] );
		}

		// stretch class.
		if ( $options['stretch'] ) {
			$class .= ' vp-portfolio__stretch';
		}

		// Filter to replace the main layout with custom. Particularly needed for password protection or age verification.
		$custom_output = apply_filters( 'vpf_custom_output', false, $uid, $class, $options );

		if ( $custom_output ) {
			return array(
				'custom_output' => $custom_output,
			);
		}

		$no_image = Visual_Portfolio_Settings::get_option( 'no_image', 'vp_general' );

		// prepare image sizes.
		$img_size_popup    = 'vp_xl_popup';
		$img_size_md_popup = 'vp_md_popup';
		$img_size_sm_popup = 'vp_sm_popup';
		$img_size          = 'vp_xl';
		$columns_count     = false;

		switch ( $options['layout'] ) {
			case 'masonry':
				$columns_count = (int) $options['masonry_columns'];
				break;
			case 'grid':
				$columns_count = (int) $options['grid_columns'];
				break;
			case 'tiles':
				$columns_count = explode( '|', $options['tiles_type'], 1 );
				$columns_count = (int) $columns_count[0];
				break;
		}

		switch ( $columns_count ) {
			case 1:
				$img_size = 'vp_xl';
				break;
			case 2:
				$img_size = 'vp_xl';
				break;
			case 3:
				$img_size = 'vp_xl';
				break;
			case 4:
				$img_size = 'vp_lg';
				break;
			case 5:
				$img_size = 'vp_lg';
				break;
		}

		$is_preview = self::is_preview();

		$query           = self::resolve_query( $options );
		$query_opts      = $query['query_opts'];
		$portfolio_query = $query['portfolio_query'];
		$start_page      = $query['start_page'];
		$max_pages       = $query['max_pages'];
		$next_page_url   = $query['next_page_url'];

		$options['start_page']    = $start_page;
		$options['max_pages']     = $max_pages;
		$options['next_page_url'] = $next_page_url;

		/**
		 * Prepare data-attributes.
		 */
		$data_attrs = array(
			'data-vp-layout'             => $options['layout'],
			'data-vp-content-source'     => $options['content_source'],
			'data-vp-items-style'        => $options['items_style'],
			'data-vp-items-click-action' => $options['items_click_action'],
			'data-vp-items-gap'          => $options['items_gap'],
			'data-vp-items-gap-vertical' => $options['items_gap_vertical'],
			'data-vp-pagination'         => $options['pagination'],
			'data-vp-next-page-url'      => $next_page_url,
		);

		if (
			(
				'post-based' === $options['content_source'] &&
				'rand' === $options['posts_order_by']
			) ||
			(
				isset( $options['images'] ) &&
				! empty( $options['images'] ) &&
				is_array( $options['images'] ) &&
				'rand' === $options['images_order_by']
			)
		) {
			$data_attrs['data-vp-random-seed'] = self::get_rand_seed_session();
		}

		if ( 'tiles' === $options['layout'] || $is_preview ) {
			$data_attrs['data-vp-tiles-type'] = $options['tiles_type'];
		}
		if ( 'masonry' === $options['layout'] || $is_preview ) {
			$data_attrs['data-vp-masonry-columns'] = $options['masonry_columns'];

			if ( $options['masonry_images_aspect_ratio'] ) {
				$data_attrs['data-vp-masonry-images-aspect-ratio'] = $options['masonry_images_aspect_ratio'];
			}

			if ( $options['masonry_horizontal_order'] ) {
				$data_attrs['data-vp-masonry-horizontal-order'] = 'true';
			}
		}
		if ( 'grid' === $options['layout'] || $is_preview ) {
			$data_attrs['data-vp-grid-columns'] = $options['grid_columns'];

			if ( $options['grid_images_aspect_ratio'] ) {
				$data_attrs['data-vp-grid-images-aspect-ratio'] = $options['grid_images_aspect_ratio'];
			}
		}
		if ( 'justified' === $options['layout'] || $is_preview ) {
			$data_attrs['data-vp-justified-row-height']           = $options['justified_row_height'];
			$data_attrs['data-vp-justified-row-height-tolerance'] = $options['justified_row_height_tolerance'];
			$data_attrs['data-vp-justified-max-rows-count']       = $options['justified_max_rows_count'];
			$data_attrs['data-vp-justified-last-row']             = $options['justified_last_row'];
		}

		if ( 'slider' === $options['layout'] || $is_preview ) {
			$data_attrs['data-vp-slider-effect'] = $options['slider_effect'];

			switch ( $options['slider_items_height_type'] ) {
				case 'auto':
					$data_attrs['data-vp-slider-items-height'] = 'auto';
					break;
				case 'static':
					$data_attrs['data-vp-slider-items-height']     = ( $options['slider_items_height_static'] ? $options['slider_items_height_static'] : '200' ) . 'px';
					$data_attrs['data-vp-slider-items-min-height'] = $options['slider_items_min_height'];
					break;
				case 'dynamic':
					$data_attrs['data-vp-slider-items-height']     = ( $options['slider_items_height_dynamic'] ? $options['slider_items_height_dynamic'] : '80' ) . '%';
					$data_attrs['data-vp-slider-items-min-height'] = $options['slider_items_min_height'];
					break;
				// no default.
			}

			switch ( $options['slider_slides_per_view_type'] ) {
				case 'auto':
					$data_attrs['data-vp-slider-slides-per-view'] = 'auto';
					break;
				case 'custom':
					$data_attrs['data-vp-slider-slides-per-view'] = $options['slider_slides_per_view_custom'] ? $options['slider_slides_per_view_custom'] : '3';
					break;
				// no default.
			}

			$data_attrs['data-vp-slider-speed']                = $options['slider_speed'];
			$data_attrs['data-vp-slider-autoplay']             = $options['slider_autoplay'];
			$data_attrs['data-vp-slider-autoplay-hover-pause'] = $options['slider_autoplay_hover_pause'] ? 'true' : 'false';
			$data_attrs['data-vp-slider-centered-slides']      = $options['slider_centered_slides'] ? 'true' : 'false';
			$data_attrs['data-vp-slider-loop']                 = $options['slider_loop'] ? 'true' : 'false';
			$data_attrs['data-vp-slider-free-mode']            = $options['slider_free_mode'] ? 'true' : 'false';
			$data_attrs['data-vp-slider-free-mode-sticky']     = $options['slider_free_mode_sticky'] ? 'true' : 'false';
			$data_attrs['data-vp-slider-arrows']               = $options['slider_arrows'] ? 'true' : 'false';
			$data_attrs['data-vp-slider-bullets']              = $options['slider_bullets'] ? 'true' : 'false';
			$data_attrs['data-vp-slider-bullets-dynamic']      = $options['slider_bullets_dynamic'] ? 'true' : 'false';
			$data_attrs['data-vp-slider-mousewheel']           = $options['slider_mousewheel'] ? 'true' : 'false';

			$data_attrs['data-vp-slider-thumbnails'] = $options['slider_thumbnails'] ? 'true' : 'false';

			if ( $options['slider_thumbnails'] ) {
				$data_attrs['data-vp-slider-thumbnails-height'] = 'auto';
				$data_attrs['data-vp-slider-thumbnails-gap']    = $options['slider_thumbnails_gap'] ? $options['slider_thumbnails_gap'] : '0';

				switch ( $options['slider_thumbnails_height_type'] ) {
					case 'auto':
						$data_attrs['data-vp-slider-thumbnails-height'] = 'auto';
						break;
					case 'static':
						$data_attrs['data-vp-slider-thumbnails-height'] = ( $options['slider_thumbnails_height_static'] ? $options['slider_thumbnails_height_static'] : '100' ) . 'px';
						break;
					case 'dynamic':
						$data_attrs['data-vp-slider-thumbnails-height'] = ( $options['slider_thumbnails_height_dynamic'] ? $options['slider_thumbnails_height_dynamic'] : '30' ) . '%';
						break;
					// no default.
				}

				switch ( $options['slider_thumbnails_per_view_type'] ) {
					case 'auto':
						$data_attrs['data-vp-slider-thumbnails-per-view'] = 'auto';
						break;
					case 'custom':
						$data_attrs['data-vp-slider-thumbnails-per-view'] = $options['slider_thumbnails_per_view_custom'] ? $options['slider_thumbnails_per_view_custom'] : '6';
						break;
					// no default.
				}
			}
		}

		// get options for the current style.
		$style_options      = array();
		$style_options_slug = 'items_style_' . $options['items_style'] . '__';
		foreach ( $options as $k => $opt ) {
			// add option to array.
			if ( substr( $k, 0, strlen( $style_options_slug ) ) === $style_options_slug ) {
				$opt_name = str_replace( $style_options_slug, '', $k );

				$style_options[ $opt_name ] = $opt;
			}

			// remove style options from the options list.
			if ( substr( $k, 0, strlen( 'items_style_' ) ) === 'items_style_' ) {
				unset( $options[ $k ] );
			}
		}

        // phpcs:ignore Squiz.PHP.CommentedOutCode.Found, Squiz.Commenting.BlockComment.NoEmptyLineBefore
		/*
		 * Example:
			array(
				'data-vp-my-attribute' => 'data',
			)
		 */
		$data_attrs = apply_filters( 'vpf_extend_portfolio_data_attributes', $data_attrs, $options, $style_options );
		$class      = apply_filters( 'vpf_extend_portfolio_class', $class, $options, $style_options );

		$items_class = 'vp-portfolio__items vp-portfolio__items-style-' . $options['items_style'];

		if ( isset( $style_options['show_overlay'] ) && $style_options['show_overlay'] ) {
			$items_class .= ' vp-portfolio__items-show-overlay-' . $style_options['show_overlay'];
		}
		if ( isset( $style_options['show_caption'] ) && $style_options['show_caption'] ) {
			$items_class .= ' vp-portfolio__items-show-caption-' . $style_options['show_caption'];
		}

		if ( isset( $style_options['show_img_overlay'] ) && $style_options['show_img_overlay'] ) {
			$items_class .= ' vp-portfolio__items-show-img-overlay-' . $style_options['show_img_overlay'];
		}

		$items_class = apply_filters( 'vpf_extend_portfolio_items_class', $items_class, $options, $style_options );

		/**
		 * Prepare each item args.
		 */
		$each_item_args = array(
			'uid'                => '',
			'post_id'            => '',
			'post_type'          => '',
			'url'                => '',
			'aria_label'         => '',
			'title'              => '',
			'excerpt'            => '',
			'content'            => '',
			'comments_count'     => '',
			'comments_url'       => '',
			'author'             => '',
			'author_url'         => '',
			'author_avatar'      => '',
			'views_count'        => '',
			'reading_time'       => '',
			'format'             => '',
			'published'          => '',
			'published_time'     => '',
			'categories'         => array(),
			'filter'             => '',
			'video'              => '',
			'image_id'           => '',
			'img_size_popup'     => $img_size_popup,
			'img_size_md_popup'  => $img_size_md_popup,
			'img_size_sm_popup'  => $img_size_sm_popup,
			'img_size'           => $img_size,
			'no_image'           => $no_image,
			'opts'               => $style_options,
			'vp_opts'            => $options,
		);

		$items = self::build_items( $each_item_args, $query_opts, $options, $portfolio_query );

		$notices = array();

		// No items found notice.
		if ( empty( $items ) ) {
			$class .= ' vp-portfolio-not-found';

			// Don't display any output if no items found (works on frontend only).
			if ( $options['no_items_notice'] && ( $is_preview || 'notice' === $options['no_items_action'] ) ) {
				$notices[] = $options['no_items_notice'];
			}
		}

		$errors = array();

		if ( isset( $query_opts['error'] ) && ! empty( $query_opts['error'] ) && ( $is_preview || is_admin_bar_showing() ) ) {
			$class   .= ' vp-portfolio-errors';
			$errors[] = $query_opts['error'];
		}

		$result = array(
			'options'           => $options,
			'style_options'     => $style_options,
			'class'             => $class,
			'data_attrs'        => $data_attrs,
			'items_class'       => $items_class,
			'items'             => $items,
			'notices'           => $notices,
			'errors'            => $errors,
			'img_size_popup'    => $img_size_popup,
			'img_size_md_popup' => $img_size_md_popup,
			'img_size_sm_popup' => $img_size_sm_popup,
			'img_size'          => $img_size,
		);

		return $result;
	}

	/**
	 * Resolve the query for the given options.
	 *
	 * Pure code motion out of `get_output_config()`, so the native Gallery Loop
	 * blocks resolve their query through exactly the same path as the legacy
	 * gallery - including the `vpf_custom_query_result` extension point.
	 *
	 * @param array           $options portfolio options.
	 * @param int|string|null $query_id id of the loop the query belongs to, or null for the legacy parameters.
	 *
	 * @return array {
	 *     @type array       $query_opts      Query options.
	 *     @type object|null $portfolio_query Query object, null for images and social sources.
	 *     @type int         $max_pages       Total pages count.
	 *     @type int         $start_page      Currently requested page.
	 *     @type string|bool $next_page_url   URL of the next page, false when there is none.
	 * }
	 */
	private static function resolve_query( $options, $query_id = null ) {
		$start_page = self::get_current_page_number( $query_id );
		$is_images  = 'images' === $options['content_source'];
		$is_social  = 'social-stream' === $options['content_source'];

		// Get query params.
		$query_opts = self::get_query_params( $options, false, $options['id'], $query_id );

		/**
		 * Filter to provide a custom query result object for non-standard content sources.
		 * Return a query-like object with have_posts(), the_post(), reset_postdata() methods
		 * and max_num_pages property, or false to use default WP_Query.
		 *
		 * @param bool|object $custom_query Custom query object or false.
		 * @param array       $query_opts   Query options.
		 * @param array       $options      Portfolio options.
		 */
		$custom_query = apply_filters( 'vpf_custom_query_result', false, $query_opts, $options );

		$portfolio_query = null;

		if ( $is_images || $is_social ) {
			if ( isset( $query_opts['max_num_pages'] ) ) {
				$max_pages = (int) ( $query_opts['max_num_pages'] < $start_page ? $start_page : $query_opts['max_num_pages'] );
			} else {
				$max_pages = $start_page;
			}
		} elseif ( $custom_query ) {
			// Use custom query object provided by extensions.
			$portfolio_query = $custom_query;
			$max_pages       = (int) ( $portfolio_query->max_num_pages < $start_page ? $start_page : $portfolio_query->max_num_pages );
		} else {
			// get Post List.
			$portfolio_query = new WP_Query( $query_opts );

			$max_pages = (int) ( $portfolio_query->max_num_pages < $start_page ? $start_page : $portfolio_query->max_num_pages );

			// `max_num_pages` counts every post the query matched, and an offset
			// is not part of that count - so a loop that skips the first few
			// advertised pages past the end of its own results, and the last of
			// them came up empty.
			$offset   = isset( $options['posts_offset'] ) ? max( 0, (int) $options['posts_offset'] ) : 0;
			$per_page = isset( $query_opts['posts_per_page'] ) ? (int) $query_opts['posts_per_page'] : 0;

			if ( $offset && $per_page > 0 ) {
				$reachable = (int) ceil( max( 0, (int) $portfolio_query->found_posts - $offset ) / $per_page );
				$max_pages = max( $start_page, min( $max_pages, $reachable ) );
			}
		}

		// A ceiling the gallery is not allowed to pass, whatever the query found.
		// Zero lifts it, the way the core Query block reads the same setting.
		$max_pages_limit = isset( $options['max_pages'] ) ? max( 0, (int) $options['max_pages'] ) : 0;

		if ( $max_pages_limit ) {
			$max_pages = min( $max_pages, $max_pages_limit );
		}

		$next_page_url = ( ! $max_pages || $max_pages >= $start_page + 1 ) ? self::get_pagenum_link(
			array(
				'vp_page' => $start_page + 1,
			),
			$query_id
		) : false;

		return array(
			'query_opts'      => $query_opts,
			'portfolio_query' => $portfolio_query,
			'max_pages'       => $max_pages,
			'start_page'      => $start_page,
			'next_page_url'   => $next_page_url,
		);
	}

	/**
	 * Build the normalized items array out of a resolved query.
	 *
	 * Pure code motion out of `get_output_config()`. Keeps every extension point
	 * of the legacy pipeline: `vpf_custom_items`, `vpf_image_item_args` and
	 * `vpf_post_item_args`.
	 *
	 * @param array           $each_item_args  Default item args template.
	 * @param array           $query_opts      Query options.
	 * @param array           $options         Portfolio options.
	 * @param object|null     $portfolio_query Query object, null for images and social sources.
	 * @param int|string|null $query_id        id of the loop the items belong to, or null for the legacy parameters.
	 *
	 * @return array
	 */
	private static function build_items( $each_item_args, $query_opts, $options, $portfolio_query = null, $query_id = null ) {
		$is_images      = 'images' === $options['content_source'];
		$is_social      = 'social-stream' === $options['content_source'];
		$img_size_popup = $each_item_args['img_size_popup'];

		// This hack exists because wp_reset_postdata() does not work in some situations.
		// Captured here rather than before the query: resolving a query never runs
		// the loop, so the global post is still the one we have to restore.
		$old_post = isset( $GLOBALS['post'] ) ? $GLOBALS['post'] : null;

		$items = array();

		/**
		 * Filter to provide custom items array for non-standard content sources.
		 * Return an array of items or false to use default processing.
		 * Each item should follow the $each_item_args structure.
		 *
		 * @param bool|array $custom_items   Custom items array or false.
		 * @param array      $each_item_args Default item args template.
		 * @param array      $query_opts     Query options.
		 * @param array      $options        Portfolio options.
		 */
		$custom_items = apply_filters( 'vpf_custom_items', false, $each_item_args, $query_opts, $options );

		if ( is_array( $custom_items ) && ! empty( $custom_items ) ) {
			// Use custom items provided by extensions.
			$items = $custom_items;
		} elseif ( ( $is_images || $is_social ) &&
			isset( $query_opts['images'] ) &&
			is_array( $query_opts['images'] ) &&
			! empty( $query_opts['images'] ) ) {

			foreach ( $query_opts['images'] as $img ) {
				// Get category taxonomies for data filter.
				$filter_values = array();
				$categories    = array();

				if ( isset( $img['categories'] ) && is_array( $img['categories'] ) ) {
					foreach ( $img['categories'] as $cat ) {
						$slug = self::create_slug( $cat );

						if ( ! in_array( $slug, $filter_values, true ) ) {
							// add in filter.
							$filter_values[] = $slug;

							// add in categories array.
							$url = self::get_pagenum_link(
								array(
									'vp_filter' => rawurlencode( $slug ),
									'vp_page'   => 1,
								),
								$query_id
							);

							$categories[] = array(
								'slug'        => $slug,
								'label'       => $cat,
								'description' => '',
								'count'       => '',
								'taxonomy'    => '',
								'id'          => 0,
								'parent'      => 0,
								'url'         => $url,
							);
						}
					}
				}

				$args = array_merge(
					$each_item_args,
					array(
						'uid'            => isset( $img['uid'] ) && $img['uid'] ? $img['uid'] : '',
						'url'            => isset( $img['url'] ) && $img['url'] ? $img['url'] : Visual_Portfolio_Images::wp_get_attachment_image_url( $img['id'], $img_size_popup ),
						'title'          => isset( $img['title'] ) && $img['title'] ? $img['title'] : '',
						'alt'            => isset( $img['alt'] ) ? $img['alt'] : '',
						'content'        => isset( $img['description'] ) && $img['description'] ? $img['description'] : '',
						'format'         => isset( $img['format'] ) && $img['format'] ? $img['format'] : 'standard',
						'published_time' => isset( $img['published_time'] ) && $img['published_time'] ? $img['published_time'] : '',
						'filter'         => implode( ',', $filter_values ),
						'image_id'       => intval( $img['id'] ),
						'focal_point'    => isset( $img['focalPoint'] ) && $img['focalPoint'] ? $img['focalPoint'] : '',
						'allow_popup'    => ! isset( $img['url'] ) || ! $img['url'],
						'categories'     => $categories,
						'author'         => isset( $img['author'] ) && $img['author'] ? $img['author'] : '',
						'author_url'     => isset( $img['author'] ) && isset( $img['author_url'] ) && $img['author'] && $img['author_url'] ? $img['author_url'] : '',
					)
				);

				// Excerpt.
				if ( ! empty( $args['opts']['show_excerpt'] ) ) {
					$args['excerpt'] = self::get_item_excerpt( $args );
				}

				if ( 'video' === $args['format'] && isset( $img['video_url'] ) && $img['video_url'] ) {
					$args['video'] = $img['video_url'];
				}

				$args = apply_filters( 'vpf_image_item_args', $args, $img );

				$items[] = $args;
			}
		} elseif ( isset( $portfolio_query ) ) {
			while ( $portfolio_query->have_posts() ) {
				$portfolio_query->the_post();

				$the_post  = get_post();
				$post_type = get_post_type();

				self::$used_posts[] = get_the_ID();

				// Get category taxonomies for data filter.
				$filter_values  = array();
				$categories     = array();
				$all_taxonomies = get_object_taxonomies( $the_post );

				foreach ( $all_taxonomies as $cat ) {
					// allow only specific taxonomies for filter.
					if ( ! self::allow_taxonomies_for_filter( $cat ) ) {
						continue;
					}

					$category = get_the_terms( $the_post, $cat );

					if ( $category && ! in_array( $category, $filter_values, true ) ) {
						foreach ( $category as $cat_item ) {
							// add in filter.
							$filter_values[] = $cat_item->slug;

							// add in categories array.
							$unique_name  = rawurlencode( $cat_item->taxonomy . ':' ) . $cat_item->slug;
							$url          = self::get_pagenum_link(
								array(
									'vp_filter' => $unique_name,
									'vp_page'   => 1,
								),
								$query_id
							);
							$categories[] = array(
								'slug'        => $cat_item->slug,
								'label'       => $cat_item->name,
								'description' => $cat_item->description,
								'count'       => $cat_item->count,
								'taxonomy'    => $cat_item->taxonomy,
								'id'          => $cat_item->term_id,
								'parent'      => $cat_item->parent,
								'url'         => $url,
							);
						}
					}
				}

				$args = array_merge(
					$each_item_args,
					array(
						'uid'            => hash( 'crc32b', 'post-' . get_the_ID() ),
						'post_id'        => get_the_ID(),
						'post_type'      => $post_type,
						'url'            => get_permalink(),
						'title'          => get_the_title(),
						'content'        => get_the_content(),
						'format'         => get_post_format() ? get_post_format() : 'standard',
						'published_time' => get_the_date( 'Y-m-d H:i:s', $the_post ),
						'filter'         => implode( ',', $filter_values ),
						'image_id'       => 'attachment' === $post_type ? get_the_ID() : get_post_thumbnail_id( get_the_ID() ),
						'focal_point'    => Visual_Portfolio_Custom_Post_Meta::get_featured_image_focal_point( get_the_ID() ),
						'categories'     => $categories,
						'comments_count' => get_comments_number( get_the_ID() ),
						'comments_url'   => get_comments_link( get_the_ID() ),
						'views_count'    => Visual_Portfolio_Custom_Post_Meta::get_views_count( get_the_ID() ),
						'reading_time'   => Visual_Portfolio_Custom_Post_Meta::get_reading_time( get_the_ID() ),
					)
				);

				// Author.
				$author_id = get_the_author_meta( 'ID' );
				if ( $author_id ) {
					$args['author']        = get_the_author();
					$args['author_url']    = get_author_posts_url( $author_id );
					$args['author_avatar'] = get_avatar_url( $author_id, array( 'size' => 50 ) );
				}

				// Excerpt.
				if ( ! empty( $args['opts']['show_excerpt'] ) ) {
					$args['excerpt'] = self::get_item_excerpt( $args );
				}

				$args['allow_popup'] = isset( $args['image_id'] ) && $args['image_id'];

				if ( 'video' === $args['format'] ) {
					$video_url = Visual_Portfolio_Custom_Post_Meta::get_video_format_url( get_the_ID() );
					if ( $video_url ) {
						$args['video']       = $video_url;
						$args['allow_popup'] = true;
					}
				}

				$args = apply_filters( 'vpf_post_item_args', $args, $args['post_id'] );

				$items[] = $args;
			}

			$portfolio_query->reset_postdata();

			// Sometimes, when we use WPBakery Page Builder, without this reset output is wrong.
			wp_reset_postdata();

			// This hack exists because wp_reset_postdata() does not work in some situations.
            // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
			$GLOBALS['post'] = $old_post;
		}

		return $items;
	}

	/**
	 * Default per-item args for the block pipeline.
	 *
	 * The same keys `get_output_config()` prepares, minus the skin options: in the
	 * block world an item is composed of blocks, so there is no items style to
	 * read options from. The `opts` key stays for the signature of the
	 * `vpf_image_item_args` / `vpf_post_item_args` callbacks.
	 *
	 * @param array $options portfolio options.
	 *
	 * @return array
	 */
	public static function default_item_args( $options ) {
		return array(
			'uid'               => '',
			'post_id'           => '',
			'post_type'         => '',
			'url'               => '',
			'aria_label'        => '',
			'title'             => '',
			'excerpt'           => '',
			'content'           => '',
			'comments_count'    => '',
			'comments_url'      => '',
			'author'            => '',
			'author_url'        => '',
			'author_avatar'     => '',
			'views_count'       => '',
			'reading_time'      => '',
			'format'            => '',
			'published'         => '',
			'published_time'    => '',
			'categories'        => array(),
			'filter'            => '',
			'video'             => '',
			'image_id'          => '',
			'img_size_popup'    => 'vp_xl_popup',
			'img_size_md_popup' => 'vp_md_popup',
			'img_size_sm_popup' => 'vp_sm_popup',
			'img_size'          => 'vp_xl',
			'no_image'          => Visual_Portfolio_Settings::get_option( 'no_image', 'vp_general' ),
			'focal_point'       => '',
			'allow_popup'       => false,
			'opts'              => array(),
			'vp_opts'           => $options,
		);
	}

	/**
	 * Build the memoization key for `get_loop_items()`.
	 *
	 * The request state that narrows the query is part of the identity - without
	 * it a filtered loop would be served the unfiltered items of an earlier call.
	 * Which parameters count as that state depends on the loop, so the id is
	 * part of the identity too: two loops read two different pages out of one
	 * request.
	 *
	 * @param array           $atts options for the loop.
	 * @param int|string|null $query_id id of the loop, or null for the legacy parameters.
	 *
	 * @return string|bool md5 hash, or false when the attributes are not serializable.
	 */
	private static function get_loop_items_cache_key( $atts, $query_id = null ) {
		$query_id = self::sanitize_query_id( $query_id );
		$state    = array( 'query_id' => $query_id );

		// Read where the pipeline reads it. `$_REQUEST` also carries the body of
		// a POST - the REST preview is one - so the key would vary while the
		// items it names do not, and with some `request_order` settings it would
		// vary with cookies as well.
		foreach ( self::$loop_query_vars as $role ) {
			$name = self::get_query_var_name( $role, $query_id );

            // phpcs:ignore WordPress.Security.NonceVerification
			$state[ $name ] = isset( $_GET[ $name ] ) ? sanitize_text_field( wp_unslash( $_GET[ $name ] ) ) : null;
		}

		// The random seed is one per request, whichever loop asks for it, and
		// `get_rand_seed_session()` reads it out of `$_REQUEST`.
        // phpcs:ignore WordPress.Security.NonceVerification
		$state['vpf_random_seed'] = isset( $_REQUEST['vpf_random_seed'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['vpf_random_seed'] ) ) : null;

		$identity = wp_json_encode( array( $atts, $state ) );

		// Without a reliable identity, two different loops would share one entry,
		// which is worse than resolving the query twice.
		return false === $identity ? false : md5( $identity );
	}

	/**
	 * Get items for a native Gallery Loop block.
	 *
	 * The single data entry point of the loop block family: same query engine,
	 * same pagination, filtering and sorting, same extension points as the
	 * legacy gallery - without any of its markup concerns.
	 *
	 * @param array           $atts options for the loop.
	 * @param int|string|null $query_id id of the loop, or null for the legacy parameters.
	 *
	 * @return array|bool
	 */
	public static function get_loop_items( $atts, $query_id = null ) {
		if ( ! is_array( $atts ) ) {
			return false;
		}

		$cache_key = self::get_loop_items_cache_key( $atts, $query_id );

		// Several blocks of one loop ask for the same items in a single request.
		if ( false !== $cache_key && isset( self::$loop_items_cache[ $cache_key ] ) ) {
			return self::$loop_items_cache[ $cache_key ];
		}

		$options = self::get_options( $atts );

		// No source is the same answer as no options: there is nothing to resolve,
		// and every branch from here reads it.
		if ( ! $options || ! isset( $options['content_source'] ) ) {
			return false;
		}

		// Loop galleries are always paged: without it `get_query_params()` does not
		// resolve `paged` and the images branch slices from a negative offset.
		if ( empty( $options['pagination'] ) ) {
			$options['pagination'] = 'paged';
		}

		/**
		 * Fires before the loop items are resolved.
		 *
		 * Per-render preparation, such as resetting cached social streams.
		 *
		 * @param array $options portfolio options.
		 */
		do_action( 'vpf_before_loop_items', $options );

		$query = self::resolve_query( $options, $query_id );
		$items = self::build_items( self::default_item_args( $options ), $query['query_opts'], $options, $query['portfolio_query'], $query_id );

		/**
		 * Fires after the loop items are resolved.
		 *
		 * @param array $options portfolio options.
		 */
		do_action( 'vpf_after_loop_items', $options );

		// The legacy pipeline only fills the excerpt behind the `show_excerpt` skin
		// option, and skins do not exist here - every item gets one.
		foreach ( $items as $k => $item ) {
			$items[ $k ]['excerpt'] = self::get_item_excerpt( $item );
		}

		/**
		 * Filters the resolved loop items.
		 *
		 * @param array $result  items, max_pages, start_page and options.
		 * @param array $options portfolio options.
		 */
		$result = apply_filters(
			'vpf_loop_items',
			array(
				'items'      => $items,
				'max_pages'  => $query['max_pages'],
				'start_page' => $query['start_page'],
				'options'    => $options,
			),
			$options
		);

		if ( false !== $cache_key ) {
			self::$loop_items_cache[ $cache_key ] = $result;
		}

		return $result;
	}

	/**
	 * Get the random seed of the current session.
	 *
	 * Public counterpart of `get_rand_seed_session()`: the loop control blocks
	 * add the seed to their links so a randomly ordered loop stays stable across
	 * pages without JavaScript.
	 *
	 * @return int
	 */
	public static function get_random_seed() {
		return self::get_rand_seed_session();
	}

	/**
	 * Print portfolio by post ID or options
	 *
	 * @param array $atts options for portfolio list to print.
	 *
	 * @return string
	 */
	public static function get( $atts = array() ) {
		$config = self::get_output_config( $atts );

		if ( ! $config ) {
			return '';
		}

		if ( isset( $config['custom_output'] ) ) {
			return $config['custom_output'];
		}

		$options       = $config['options'];
		$style_options = $config['style_options'];
		$data_attrs    = $config['data_attrs'];
		$class         = $config['class'];
		$items         = $config['items'];
		$items_class   = $config['items_class'];
		$notices       = $config['notices'];
		$errors        = $config['errors'];

		// Insert styles and scripts.
		Visual_Portfolio_Assets::enqueue( $atts );

		// No items found.
		if ( empty( $items ) ) {
			if ( empty( $notices ) ) {
				return '';
			}

			ob_start();

			?>
			<div class="<?php echo esc_attr( $class ); ?>">
				<?php
				foreach ( $notices as $notice ) {
					self::notice( $notice );
				}
				?>
			</div>
			<?php

			return ob_get_clean();
		}

		ob_start();

		/**
		 * Wrapper start.
		 */
		do_action( 'vpf_before_wrapper_start', $options, $style_options );

		visual_portfolio()->include_template(
			'items-list/wrapper-start',
			array(
				'options'       => $options,
				'style_options' => $style_options,
				'data_attrs'    => $data_attrs,
				'class'         => $class,
			)
		);

		if ( ! empty( $errors ) ) {
			?>
				<?php
				foreach ( $errors as $error ) {
					self::error( $error );
				}
				?>
			<?php
		}

		do_action( 'vpf_after_wrapper_start', $options, $style_options );

		/**
		 * Top layout elements.
		 */
		self::print_layout_elements( 'top', $options );

		/**
		 * Items wrap.
		 */
		?>
		<div class="vp-portfolio__items-wrap">
			<?php

			/**
			 * Items wrapper start.
			 */
			do_action( 'vpf_before_items_wrapper_start', $options, $style_options );

			visual_portfolio()->include_template(
				'items-list/items-wrapper-start',
				array(
					'options'       => $options,
					'style_options' => $style_options,
					'class'         => $items_class,
				)
			);

			do_action( 'vpf_after_items_wrapper_start', $options, $style_options );

			/**
			 * Each item.
			 */
			if ( is_array( $items ) && ! empty( $items ) ) {
				foreach ( $items as $item_args ) {
					self::each_item( $item_args );
				}
			}

			/**
			 * Items wrapper end.
			 */
			do_action( 'vpf_before_items_wrapper_end', $options, $style_options );

			visual_portfolio()->include_template(
				'items-list/items-wrapper-end',
				array(
					'options'       => $options,
					'style_options' => $style_options,
				)
			);

			do_action( 'vpf_after_items_wrapper_end', $options, $style_options );

			// Slider arrows and bullets.
			if ( 'slider' === $options['layout'] ) {
				if ( $options['slider_arrows'] ) {
					visual_portfolio()->include_template(
						'items-list/layouts/slider/arrows',
						array(
							'options'       => $options,
							'style_options' => $style_options,
						)
					);
				}
				if ( $options['slider_bullets'] ) {
					visual_portfolio()->include_template(
						'items-list/layouts/slider/bullets',
						array(
							'options'       => $options,
							'style_options' => $style_options,
						)
					);
				}
			}

			?>
		</div>
		<?php

		/**
		 * Slider thumbnails.
		 */
		if ( 'slider' === $options['layout'] && $options['slider_thumbnails'] ) {
			$slider_thumbnails = array();

			if ( is_array( $items ) && ! empty( $items ) ) {
				foreach ( $items as $item_args ) {
					$slider_thumbnails[] = $item_args['image_id'];
				}
			}

			visual_portfolio()->include_template(
				'items-list/layouts/slider/thumbnails',
				array(
					'options'       => $options,
					'style_options' => $style_options,
					'thumbnails'    => $slider_thumbnails,
					'img_size'      => $config['img_size'],
				)
			);
		}

		/**
		 * Bottom layout elements.
		 */
		self::print_layout_elements( 'bottom', $options );

		/**
		 * Wrapper end.
		 */
		do_action( 'vpf_before_wrapper_end', $options, $style_options );

		visual_portfolio()->include_template(
			'items-list/wrapper-end',
			array(
				'options'       => $options,
				'style_options' => $style_options,
			)
		);

		do_action( 'vpf_after_wrapper_end', $options, $style_options );

		do_action( 'vpf_after_get_output', $options, $style_options );

		return ob_get_clean();
	}

	/**
	 * Print layout elements like Filter, Sort, Search and Pagination.
	 *
	 * @param string $position elements position.
	 * @param array  $options options for portfolio list to print.
	 */
	public static function print_layout_elements( $position, $options ) {
		$options         = apply_filters( 'vpf_layout_element_options', $options );
		$layout_elements = $options['layout_elements'];

		if ( ! isset( $layout_elements[ $position ] ) || ! isset( $layout_elements[ $position ]['elements'] ) ) {
			return;
		}

		$registered   = Visual_Portfolio_Controls::get_registered_array();
		$control_data = $registered['layout_elements'];
		$class_name   = 'vp-portfolio__layout-elements';

		if ( $position ) {
			$class_name .= ' vp-portfolio__layout-elements-' . $position;
		}

		if ( isset( $layout_elements[ $position ]['align'] ) ) {
			$class_name .= ' vp-portfolio__layout-elements-align-' . $layout_elements[ $position ]['align'];
		}

		ob_start();
		foreach ( $layout_elements[ $position ]['elements'] as $element ) {
			if ( isset( $control_data['options'][ $element ]['render_callback'] ) && is_callable( $control_data['options'][ $element ]['render_callback'] ) ) {
				call_user_func( $control_data['options'][ $element ]['render_callback'], $options, $element, $position );
			}
			do_action( 'vpf_layout_elements', $options, $element, $position );
		}
		$elements_content = ob_get_clean();

		if ( ! $elements_content ) {
			return;
		}

		?>
		<div class="<?php echo esc_attr( $class_name ); ?>">
		<?php

		// In this case, pluggable pagination, filters and sorting templates are displayed.
		// Included templates are cleared and passed as a ready-made cleared string in the callback function called above.
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo $elements_content;

		?>
		</div>
		<?php
	}

	/**
	 * Print portfolio filter by post ID or options
	 *
	 * @param array $atts options for portfolio list to print.
	 *
	 * @return string
	 */
	public static function get_filter( $atts = array() ) {
		$options = self::get_options( $atts );

		$options = array_merge(
			$options,
			array(
				'filter'            => $atts['type'],
				'filter_show_count' => 'true' === $atts['show_count'],
				'filter_text_all'   => $atts['text_all'] ?? esc_attr__( 'All', 'visual-portfolio' ),
			)
		);

		$align = $atts['align'] ?? 'center';

		// generate unique ID.
		$uid = ++self::$filter_id;
		$uid = hash( 'crc32b', $uid . $options['id'] );

		$class = 'vp-single-filter vp-filter-uid-' . $uid . ' vp-id-' . $options['id'];

		// Add custom class.
		if ( isset( $atts['class'] ) ) {
			$class .= ' ' . $atts['class'];
		}

		ob_start();

		?>
		<div class="vp-portfolio__layout-elements vp-portfolio__layout-elements-align-<?php echo esc_attr( $align ); ?>">
			<div class="<?php echo esc_attr( $class ); ?>">
				<?php self::filter( $options ); ?>
			</div>
		</div>
		<?php

		return ob_get_clean();
	}

	/**
	 * Print portfolio sort by post ID or options
	 *
	 * @param array $atts options for portfolio list to print.
	 *
	 * @return string
	 */
	public static function get_sort( $atts = array() ) {
		$options = self::get_options( $atts );

		$options = array_merge(
			$options,
			array(
				'sort' => $atts['type'],
			)
		);

		$align = $atts['align'] ?? 'center';

		// generate unique ID.
		$uid = ++self::$sort_id;
		$uid = hash( 'crc32b', $uid . $options['id'] );

		$class = 'vp-single-sort vp-sort-uid-' . $uid . ' vp-id-' . $options['id'];

		// Add custom class.
		if ( isset( $atts['class'] ) ) {
			$class .= ' ' . $atts['class'];
		}

		ob_start();

		?>
		<div class="vp-portfolio__layout-elements vp-portfolio__layout-elements-align-<?php echo esc_attr( $align ); ?>">
			<div class="<?php echo esc_attr( $class ); ?>">
				<?php self::sort( $options ); ?>
			</div>
		</div>
		<?php

		return ob_get_clean();
	}

	/**
	 * Get current page number
	 * ?vp_page=2 , or ?vp-3-page=2 for a loop that carries a query id.
	 *
	 * @param int|string|null $query_id - id of the loop asking, or null for the legacy parameter.
	 *
	 * @return int
	 */
	public static function get_current_page_number( $query_id = null ) {
		$name = self::get_query_var_name( 'page', $query_id );

        // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash, WordPress.Security.NonceVerification
		return max( 1, isset( $_GET[ $name ] ) ? Visual_Portfolio_Security::sanitize_number( $_GET[ $name ] ) : 1 );
	}

	/**
	 * Calculate how many pages the given query produces.
	 *
	 * The active filter is taken from the request by `get_query_params()`, so
	 * the result already accounts for `?vp_filter` - or for the filter of the
	 * given loop.
	 *
	 * @param array           $options - block options in the legacy format.
	 * @param int|string|null $query_id - id of the loop asking, or null for the legacy parameters.
	 *
	 * @return int
	 */
	public static function calculate_max_pages( $options, $query_id = null ) {
		$options = Visual_Portfolio_Security::validate_calculate_max_pages_params( $options );

		$content_source = $options['content_source'] ?? '';

		// `get_query_params()` expects a populated set of options, and there is
		// nothing to count without a source anyway.
		if ( ! $content_source ) {
			return 1;
		}

		$items_count = (int) ( $options['items_count'] ?? 0 );

		// A count of `0` divides by zero further down. A negative count means
		// "all items" and is handled by `get_query_params()`.
		if ( 0 === $items_count ) {
			$items_count = 6;
		}

		$options['items_count'] = $items_count;

		$query_opts = self::get_query_params( $options, false, false, $query_id );

		if ( isset( $query_opts['max_num_pages'] ) ) {
			return max( 1, (int) $query_opts['max_num_pages'] );
		}

		// Branch order mirrors `resolve_query()` on purpose: the count and the
		// items have to agree about which query answers for this source.
		if ( 'images' === $content_source || 'social-stream' === $content_source ) {
			$images_count = count( $query_opts['images'] ?? array() );

			return max( 1, (int) ceil( $images_count / $items_count ) );
		}

		/**
		 * Sources that answer with their own query object resolve through this
		 * filter in `resolve_query()`, so the page count has to ask it too -
		 * otherwise such a loop reports a single page to the pagination blocks
		 * and visitors never get past page one.
		 *
		 * @see Visual_Portfolio_Get::resolve_query() for the filter contract.
		 */
		$custom_query = apply_filters( 'vpf_custom_query_result', false, $query_opts, $options );

		if ( $custom_query ) {
			return isset( $custom_query->max_num_pages ) ? max( 1, (int) $custom_query->max_num_pages ) : 1;
		}

		// Everything left over is a `WP_Query`, which is what `resolve_query()`
		// does with it too. A source that widens the query through
		// `vpf_extend_query_args` rather than replacing the object used to fall
		// past here and report one page while rendering several.
		$query     = new WP_Query( $query_opts );
		$max_pages = $query->max_num_pages ? $query->max_num_pages : ceil( $query->found_posts / $items_count );

		return max( 1, (int) $max_pages );
	}

	/**
	 * "rand" orderby don't work fine for paged, so we need to use custom solution.
	 * thanks to https://gist.github.com/hlashbrooke/6298714 .
	 */
	private static function get_rand_seed_session() {
		// already prepared.
		if ( self::$rand_seed_session ) {
			return self::$rand_seed_session;
		}

		// Reset vpf_random_seed on load of initial archive page.
		if ( self::get_current_page_number() === 1 ) {
			if ( isset( self::$rand_seed_session ) ) {
				self::$rand_seed_session = false;
			}
		}

		// Get vpf_random_seed from request variable if it exists.
        // phpcs:ignore WordPress.Security.NonceVerification
		if ( isset( $_REQUEST['vpf_random_seed'] ) && is_numeric( $_REQUEST['vpf_random_seed'] ) ) {
            // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash, WordPress.Security.NonceVerification
			self::$rand_seed_session = Visual_Portfolio_Security::sanitize_number( $_REQUEST['vpf_random_seed'] );
		}

		// Set new vpf_random_seed if none exists.
		if ( ! self::$rand_seed_session ) {
			self::$rand_seed_session = wp_rand();
		}

		return self::$rand_seed_session;
	}

	/**
	 * Sort associative array by custom field.
	 *
	 * @param array  $data - Sortable array.
	 * @param string $field - Array field by which sorting will take place.
	 * @param string $order - Sorting order (asc and desc).
	 * @return array
	 */
	public static function sort_array_by_field( $data, $field, $order = 'desc' ) {
		if ( ! is_array( $data ) ) {
			return array();
		}
		$array_with_empty_fields     = array();
		$array_with_not_empty_fields = array();

		/**
		 * We add a service key to the properties of array elements to sort fields of equal value by keys.
		 * This is only necessary when sorting in descending order.
		 */
		if ( 'desc' === $order ) {
			foreach ( $data as $key => &$element ) {
				$element['__VP_SORT_ID__'] = $key;
			}
		}

		/**
		 * In some cases,
		 * The function may sort elements with the same values ​​differently in php 7 and php 8.
		 * This is due to the following change in how the usort function works.
		 * If two members compare as equal, they retain their original order.
		 * Prior to PHP 8.0.0, their relative order in the sorted array was undefined.
		 */
		usort(
			$data,
			function ( $a, $b ) use ( $field, $order ) {
				// Primary comparison by field values.
				if ( isset( $a[ $field ] ) && isset( $b[ $field ] ) ) {
					$comparsion = 'asc' === $order ? strcmp( $a[ $field ], $b[ $field ] ) : strcmp( $b[ $field ], $a[ $field ] );

					if ( 0 !== $comparsion ) {
						return $comparsion;
					}
				}

				// Secondary comparison by keys when values are equal.
				if ( 'desc' === $order ) {
					return strcmp( $b['__VP_SORT_ID__'], $a['__VP_SORT_ID__'] );
				}

				return 0;
			}
		);

		// Clearing the array of service keys.
		if ( 'desc' === $order ) {
			foreach ( $data as $key => &$element ) {
				unset( $element['__VP_SORT_ID__'] );
			}
		}

		foreach ( $data as $item ) {
			if ( empty( $item[ $field ] ) ) {
				$array_with_empty_fields[] = $item;
			} else {
				$array_with_not_empty_fields[] = $item;
			}
		}

		$data = array_merge( $array_with_not_empty_fields, $array_with_empty_fields );

		return $data;
	}

	/**
	 * Fill images with the data stored on their attachment posts.
	 *
	 * @param array $images images list.
	 * @param array $options portfolio options.
	 *
	 * @return array
	 */
	private static function prepare_images_data( $images, $options ) {
		if ( empty( $images ) ) {
			return $images;
		}

		$title_source       = $options['images_titles_source'] ?? 'custom';
		$description_source = $options['images_descriptions_source'] ?? 'custom';
		$order_by           = $options['images_order_by'] ?? 'default';

		// Attachment meta is read below only for these sources and orders,
		// so the rest of the galleries don't pay for the meta cache.
		$with_meta = 'none' !== $title_source ||
			'none' !== $description_source ||
			in_array( $order_by, array( 'image_title', 'image_caption', 'image_alt', 'image_description' ), true );

		$images_ids = array();
		foreach ( $images as $img ) {
			$images_ids[] = (int) $img['id'];
		}

		// Find all used attachments.
		$all_attachments = get_posts(
			array(
				'post_type'              => 'attachment',
				'posts_per_page'         => -1,
				'paged'                  => -1,
				'post__in'               => $images_ids,
				'update_post_meta_cache' => $with_meta,
				'update_post_term_cache' => false,
			)
		);

		$all_attachments = array_column( $all_attachments, null, 'ID' );

		// prepare titles and descriptions.
		foreach ( $images as $k => $img ) {
			$attachment = $all_attachments[ (int) $img['id'] ] ?? false;

			// Nothing to take the data from once the attachment is deleted.
			if ( ! $attachment ) {
				continue;
			}

			$has_custom_alt = array_key_exists( 'alt', $img );
			$item_alt       = $has_custom_alt ? (string) $img['alt'] : '';
			$img_meta       = array(
				'title'       => '',
				'description' => '',
				'caption'     => '',
				'alt'         => '',
				'none'        => '',
			);

			// get image meta if needed.
			if ( $with_meta ) {
				$img_meta['title']       = $attachment->post_title;
				$img_meta['description'] = $attachment->post_content;
				$img_meta['caption']     = wp_get_attachment_caption( $attachment->ID );
				$img_meta['alt']         = get_post_meta( $attachment->ID, '_wp_attachment_image_alt', true );
			}

			if ( $has_custom_alt && '' !== trim( $item_alt ) ) {
				$img_meta['alt'] = $item_alt;
			}

			// title.
			if ( 'custom' !== $title_source ) {
				$images[ $k ]['title'] = $img_meta[ $title_source ] ?? '';
			}

			// image title.
			$images[ $k ]['image_title'] = $img_meta['title'];

			// description.
			if ( 'custom' !== $description_source ) {
				$images[ $k ]['description'] = $img_meta[ $description_source ] ?? '';
			}

			// image description.
			$images[ $k ]['image_description'] = $img_meta['description'];

			// image caption.
			$images[ $k ]['image_caption'] = $img_meta['caption'];

			// image alt.
			$images[ $k ]['image_alt'] = $img_meta['alt'];

			// add published date.
			$images[ $k ]['published_time'] = get_the_date( 'Y-m-d H:i:s', $attachment );
		}

		return $images;
	}

	/**
	 * Get query params array.
	 *
	 * @param array           $options portfolio options.
	 * @param bool            $for_filter prevent retrieving GET variable if used for filter.
	 * @param int             $layout_id portfolio layout id.
	 * @param int|string|null $query_id id of the loop the query belongs to, or null for the legacy parameters.
	 *
	 * @return array
	 */
	public static function get_query_params( $options, $for_filter = false, $layout_id = false, $query_id = null ) {
		$options    = apply_filters( 'vpf_extend_options_before_query_args', $options, $layout_id );
		$query_opts = array();
		$is_images  = 'images' === $options['content_source'];

		// The state this query is narrowed by. A filter list asks for the
		// unnarrowed query, so it never reads the active filter.
		$active_filter = $for_filter ? false : self::get_filter_active_item( $query_opts, $query_id );
		$active_sort   = self::get_current_sort( $query_id );

		$paged = 0;
		if ( isset( $options['pagination'] ) && $options['pagination'] ) {
			$paged = self::get_current_page_number( $query_id );
		}
		$count = isset( $options['items_count'] ) ? intval( $options['items_count'] ) : 6;

		if ( $is_images ) {
			$query_opts['images'] = array();

			if ( ! isset( $options['images'] ) || ! is_array( $options['images'] ) ) {
				$options['images'] = array();
			}

			// add unique IDs.
			foreach ( $options['images'] as $k => $img ) {
				$options['images'][ $k ]['uid'] = hash( 'crc32b', 'image-' . $k . $img['id'] );
			}

			if ( $count < 0 ) {
				$count = 99999;
			}

			// Load certain taxonomies.
			$images = array();

			if ( false !== $active_filter ) {
				$category = $active_filter;

				foreach ( $options['images'] as $img ) {
					if ( isset( $img['categories'] ) && is_array( $img['categories'] ) ) {
						foreach ( $img['categories'] as $cat ) {
							if ( self::create_slug( $cat ) === $category ) {
								$images[] = $img;
								break;
							}
						}
					}
				}
			} else {
				$images = $options['images'];
			}

			// order.
			$custom_order           = false;
			$custom_order_direction = $options['images_order_direction'];

			if ( isset( $options['images_order_by'] ) ) {
				$custom_order = $options['images_order_by'];
			}

			// custom sorting.
			switch ( $active_sort ) {
				case 'title':
				case 'date':
					$custom_order           = $active_sort;
					$custom_order_direction = 'asc';
					break;
				case 'title_desc':
					$custom_order           = 'title';
					$custom_order_direction = 'desc';
					break;
				case 'date_desc':
					$custom_order           = 'date';
					$custom_order_direction = 'desc';
					break;
			}

			// Sorting reads the image data from the attachment posts, so the whole
			// gallery has to be loaded before the page can be picked. Manual and
			// random orders, and the ones sorting by the values stored in the block,
			// are known upfront — those load the current page only, after the slicing.
			$order_from_attachments = $custom_order &&
				! in_array( $custom_order, array( 'default', 'rand' ), true ) &&
				! ( 'title' === $custom_order && 'custom' === ( $options['images_titles_source'] ?? 'custom' ) ) &&
				! ( 'description' === $custom_order && 'custom' === ( $options['images_descriptions_source'] ?? 'custom' ) );

			if ( $order_from_attachments ) {
				$images = self::prepare_images_data( $images, $options );
			}

			if ( $custom_order && ! empty( $images ) ) {
				switch ( $custom_order ) {
					case 'date':
					case 'title':
					case 'description':
					case 'image_title':
					case 'image_caption':
					case 'image_alt':
					case 'image_description':
						if ( 'date' === $custom_order ) {
							$custom_order = 'published_time';
						}

						/**
						 * We've reworked this code to work correctly with empty sortable values.
						 * Now images with filled values ​​will be sorted first.
						 * And empty images will be inserted later at the very end of the array.
						 */
						$images = self::sort_array_by_field( $images, $custom_order, $custom_order_direction );
						break;
					case 'rand':
						// We don't need to randomize order for filter,
						// because filter list will be always changed once AJAX loaded.
						if ( ! $for_filter ) {
                            // phpcs:ignore WordPress.WP.AlternativeFunctions.rand_seeding_mt_srand
							mt_srand( self::get_rand_seed_session() );
							for ( $i = count( $images ) - 1; $i > 0; $i-- ) {
                                // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged, WordPress.WP.AlternativeFunctions.rand_mt_rand
								$j            = @mt_rand( 0, $i );
								$tmp          = $images[ $i ];
								$images[ $i ] = $images[ $j ];
								$images[ $j ] = $tmp;
							}
						}

						break;
				}

				if (
					'desc' === $custom_order_direction &&
					(
						'rand' === $custom_order ||
						'default' === $custom_order
					)
				) {
					$images = array_reverse( $images );
				}
			}

			// pages count.
			if ( ! empty( $images ) ) {
				$query_opts['max_num_pages'] = ceil( count( $images ) / $count );
			} else {
				$query_opts['max_num_pages'] = 0;
			}

			$start_from_item = ( $paged - 1 ) * $count;
			$end_on_item     = $start_from_item + $count;

			if ( $for_filter ) {
				$start_from_item = 0;
				$end_on_item     = 99999;
			}

			// get images for current page only.
			foreach ( (array) $images as $k => $img ) {
				$i = $k + 1;
				if ( $i > $start_from_item && $i <= $end_on_item ) {
					$query_opts['images'][] = $img;
				}
			}

			// The filter list is built from the categories stored in the block, so
			// it never reads the attachment data — and `$for_filter` keeps every
			// image in the slice, which would load the whole gallery for nothing.
			if ( ! $order_from_attachments && ! $for_filter ) {
				$query_opts['images'] = self::prepare_images_data( $query_opts['images'], $options );
			}
		} else {
			$query_opts = array(
				'posts_per_page' => $count,
				'paged'          => $paged,
				'orderby'        => 'post_date',
				'order'          => 'DESC',
				'post_type'      => 'portfolio',
			);

			// Get all available categories for filter.
			if ( $for_filter ) {
				$query_opts['posts_per_page'] = -1;
				$query_opts['paged']          = -1;
			}

			// Post based.
			if ( 'post-based' === $options['content_source'] ) {
				// Exclude IDs.
				if ( ! empty( $options['posts_excluded_ids'] ) ) {
					$query_opts['post__not_in'] = $options['posts_excluded_ids'];
				}

				// Order By.
				switch ( $options['posts_order_by'] ) {
					case 'title':
						$query_opts['orderby'] = 'title';
						break;

					case 'id':
						$query_opts['orderby'] = 'ID';
						break;

					case 'post__in':
						$query_opts['orderby'] = 'post__in';
						break;

					case 'menu_order':
						// We should order by `menu_order` and as fallback order by `post_date`.
						$query_opts['orderby'] = array(
							'menu_order' => $options['posts_order_direction'],
							'post_date'  => 'desc',
						);
						break;

					case 'comment_count':
						$query_opts['orderby'] = 'comment_count';
						break;

					case 'modified':
						$query_opts['orderby'] = 'modified';
						break;

					case 'rand':
						// Update ORDER BY clause to use vpf_random_seed.
						$query_opts['orderby'] = 'RAND(' . self::get_rand_seed_session() . ')';
						break;

					default:
						$query_opts['orderby'] = 'post_date';
						break;
				}

				// Order.
				$query_opts['order'] = $options['posts_order_direction'];

				if ( 'ids' === $options['posts_source'] ) { // IDs.
					$query_opts['post_type']    = 'any';
					$query_opts['post__not_in'] = array();

					if ( ! empty( $options['posts_ids'] ) ) {
						$query_opts['post__in'] = $options['posts_ids'];
					}

					// Ignore sticky posts by default for manual selection.
					$query_opts['ignore_sticky_posts'] = true;
				} elseif ( 'custom_query' === $options['posts_source'] ) { // Custom Query.
					$query_opts['post_type'] = 'any';

					$tmp_arr = array();
					parse_str( html_entity_decode( $options['posts_custom_query'] ), $tmp_arr );
					$query_opts = array_merge( $query_opts, $tmp_arr );
				} elseif ( 'current_query' === $options['posts_source'] ) {
					global $wp_query;

					if ( $wp_query && isset( $wp_query->query_vars ) && is_array( $wp_query->query_vars ) ) {
						$query_vars = $wp_query->query_vars;

						// Unset `offset` because if is set, $wp_query overrides/ignores the paged parameter and breaks pagination.
						if ( isset( $query_vars['offset'] ) ) {
							unset( $query_vars['offset'] );
						}

						// Add post type.
						if ( empty( $query_vars['post_type'] ) && is_singular() ) {
							$query_vars['post_type'] = get_post_type( get_the_ID() );
						}

						// Add pagination paged value.
						if ( $query_opts['paged'] && ( ! isset( $query_vars['paged'] ) || ! $query_vars['paged'] ) ) {
							$query_vars['paged'] = $query_opts['paged'];
						}

						$query_opts = $query_vars;
					}
				} else {
					$query_opts['post_type'] = $options['posts_source'];

					// Post Types Set.
					if ( 'post_types_set' === $options['posts_source'] ) {
						$query_opts['post_type'] = (array) $options['post_types_set'];
					}

					// Taxonomies.
					if ( ! empty( $options['posts_taxonomies'] ) && ! isset( $query_opts['tax_query'] ) ) {
						$terms_list = get_terms(
							get_object_taxonomies( is_array( $query_opts['post_type'] ) ? $query_opts['post_type'] : array( $query_opts['post_type'] ) ),
							array(
								'hide_empty' => false,
							)
						);

                        // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
						$query_opts['tax_query'] = array(
							// We save strings like 'or', 'and'
							// but to use it we need these strings in uppercase.
							'relation' => strtoupper( $options['posts_taxonomies_relation'] ),
						);

						// We need this empty array, because when taxonomy selected,
						// and posts don't have this taxonomy, we will see all available posts.
						// Related topic: https://wordpress.org/support/topic/exclude-certain-category-from-filter/.
						if ( 'OR' === $query_opts['tax_query']['relation'] ) {
							$query_opts['tax_query'][] = array();
						}

						foreach ( $options['posts_taxonomies'] as $taxonomy ) {
							$taxonomy_name = null;

							foreach ( $terms_list as $term ) {
								if ( $term->term_id === (int) $taxonomy ) {
									$taxonomy_name = $term->taxonomy;
									continue;
								}
							}

							if ( $taxonomy_name ) {
								$query_opts['tax_query'][] = array(
									'taxonomy' => $taxonomy_name,
									'field'    => 'id',
									'terms'    => $taxonomy,
								);
							}
						}
					}

					// Offset.
					if ( isset( $options['posts_offset'] ) && $options['posts_offset'] ) {
						$query_opts['offset'] = $options['posts_offset'] + ( $paged - 1 ) * $count;
					}
				}

				// Narrow the query the way the Filters panel asks.
				if ( ! empty( $options['posts_authors'] ) ) {
					$query_opts['author__in'] = array_map( 'intval', (array) $options['posts_authors'] );
				}

				if ( ! empty( $options['posts_keyword'] ) ) {
					$query_opts['s'] = (string) $options['posts_keyword'];
				}

				// The post being viewed has no business appearing in a gallery
				// on its own page. Unlike "avoid duplicates", which is about
				// several galleries sharing a page, this is about one post
				// listing itself.
				if ( ! $for_filter && ! empty( $options['posts_exclude_current'] ) && is_singular() ) {
					$current                    = get_queried_object_id();
					$not_current                = (array) ( isset( $query_opts['post__not_in'] ) ? $query_opts['post__not_in'] : array() );
					$query_opts['post__not_in'] = array_merge( $not_current, array( $current ) );
				}

				// Avoid duplicates.
				// We should prevent this when using filter, since all current posts will be excluded
				// from the filter query and we may not see all filter buttons.
				if ( ! $for_filter && $options['posts_avoid_duplicate_posts'] ) {
					// On a single post the page's own list is that post, so
					// counting it as shown would hide it - the job of the
					// "Exclude the current post" switch above. A loop offers
					// that switch and so leaves the list out when it is off;
					// a legacy gallery has no such switch and keeps the
					// behaviour it always had.
					$with_main_query = ! (
						array_key_exists( 'posts_exclude_current', $options ) &&
						empty( $options['posts_exclude_current'] ) &&
						is_singular()
					);

					$not_id                     = (array) ( isset( $query_opts['post__not_in'] ) ? $query_opts['post__not_in'] : array() );
					$query_opts['post__not_in'] = array_merge( $not_id, self::get_all_used_posts( $with_main_query ) );

					// Remove posts from post__in.
					if ( isset( $query_opts['post__in'] ) ) {
						$query_opts['post__in'] = array_diff( (array) $query_opts['post__in'], (array) $query_opts['post__not_in'] );
					}
				}
			}

			// Custom sorting.
			$custom_order           = false;
			$custom_order_direction = false;

			switch ( $active_sort ) {
				case 'title':
				case 'date':
					$custom_order           = 'post_' . $active_sort;
					$custom_order_direction = 'asc';
					break;
				case 'title_desc':
					$custom_order           = 'post_title';
					$custom_order_direction = 'desc';
					break;
				case 'date_desc':
					$custom_order           = 'post_date';
					$custom_order_direction = 'desc';
					break;
			}

			if ( $custom_order && $custom_order_direction ) {
				$query_opts['orderby'] = $custom_order;
				$query_opts['order']   = $custom_order_direction;
			}

			// Asked again now that `$query_opts` is filled: the `current_query`
			// branch replaces it with the main query's vars and `custom_query`
			// merges the author's own query string into it, and both are how a
			// mapped archive passes its `vp_filter` in - there is no request
			// parameter to read it from.
			$active_filter = $for_filter ? false : self::get_filter_active_item( $query_opts, $query_id );

			// Load certain taxonomies using custom filter.
			if ( false !== $active_filter ) {
				$taxonomies = explode( ':', $active_filter );

				if ( $taxonomies && isset( $taxonomies[0] ) && isset( $taxonomies[1] ) ) {
                    // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
					$query_opts['tax_query'] = array(
						'relation' => 'AND',
						array(
							'taxonomy' => $taxonomies[0],
							'field'    => 'slug',
							'terms'    => $taxonomies[1],
						),
						isset( $query_opts['tax_query'] ) ? $query_opts['tax_query'] : '',
					);
				}
			}
		}

		$query_opts = apply_filters( 'vpf_extend_query_args', $query_opts, $options, $layout_id );

		return $query_opts;
	}

	/**
	 * Print notice
	 *
	 * @param string $notice notice string.
	 */
	public static function notice( $notice ) {
		if ( ! $notice ) {
			return;
		}
		visual_portfolio()->include_template(
			'notices/notices',
			array(
				'notice' => $notice,
			)
		);
	}

	/**
	 * Print error
	 *
	 * @param string $error error string.
	 */
	public static function error( $error ) {
		if ( ! $error ) {
			return;
		}
		visual_portfolio()->include_template(
			'errors/errors',
			array(
				'error' => $error,
			)
		);
	}

	/**
	 * Print filters
	 *
	 * @param array $vp_options current vp_list options.
	 */
	public static function filter( $vp_options ) {
		if ( ! $vp_options['filter'] ) {
			return;
		}

		$is_images  = 'images' === $vp_options['content_source'];
		$is_social  = 'social-stream' === $vp_options['content_source'];
		$query_opts = self::get_query_params( $vp_options, true );

		// Get active item.
		$active_item = self::get_filter_active_item( $query_opts );

		/**
		 * Filter to provide custom filter terms for non-standard content sources.
		 * Return array with 'terms' and 'there_is_active' keys, or false for default.
		 *
		 * @param bool|array $custom_terms Custom terms data or false.
		 * @param array      $query_opts   Query options.
		 * @param mixed      $active_item  Currently active filter item.
		 * @param array      $vp_options   Portfolio options.
		 */
		$custom_filter_terms = apply_filters( 'vpf_custom_filter_terms', false, $query_opts, $active_item, $vp_options );

		if ( is_array( $custom_filter_terms ) ) {
			$term_items = $custom_filter_terms;
		} elseif ( $is_images || $is_social ) {
			$term_items = self::get_images_terms( $query_opts, $active_item );
		} else {
			$portfolio_query = new WP_Query( $query_opts );
			$term_items      = self::get_posts_terms( $portfolio_query, $active_item );
		}

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
					'url'         => self::get_pagenum_link(
						array(
							'vp_filter' => '',
							'vp_page'   => 1,
						)
					),
					'class'       => 'vp-filter__item' . ( ! $term_items['there_is_active'] ? ' vp-filter__item-active' : '' ),
				)
			);
		}

		// No filters available.
		if ( empty( $term_items['terms'] ) ) {
			return;
		}

		// get options for the current filter.
		$filter_options      = array();
		$filter_options_slug = 'filter_' . $vp_options['filter'] . '__';

		foreach ( $vp_options as $k => $opt ) {
			// add option to array.
			if ( substr( $k, 0, strlen( $filter_options_slug ) ) === $filter_options_slug ) {
				$opt_name                    = str_replace( $filter_options_slug, '', $k );
				$filter_options[ $opt_name ] = $opt;
			}

			// remove style options from the options list.
			if ( substr( $k, 0, strlen( $filter_options_slug ) ) === $filter_options_slug ) {
				unset( $vp_options[ $k ] );
			}
		}

		$args = array(
			'class'      => 'vp-filter',
            // phpcs:ignore Squiz.PHP.CommentedOutCode.Found, Squiz.Commenting.BlockComment.NoEmptyLineBefore
			/*
			 * Example:
				array(
					array(
						'filter'      => '*',
						'label'       => $options['filter_text_all'],
						'description' => false,
						'count'       => false,
						'active'      => true,
						'url'         => Visual_Portfolio_Get::get_pagenum_link(
							array(
								'vp_filter' => '',
								'vp_page' => 1,
							)
						),
						'class'       => 'vp-filter__item',
					),
				)
			 */
			'items'      => apply_filters( 'vpf_extend_filter_items', $term_items['terms'], $vp_options ),
			'show_count' => $vp_options['filter_show_count'],
			'opts'       => $filter_options,
			'vp_opts'    => $vp_options,
		);

		?>
		<div class="vp-portfolio__filter-wrap">
		<?php

		$filter_style_pref = '';

		if ( 'default' !== $vp_options['filter'] ) {
			$filter_style_pref = '/' . $vp_options['filter'];
		}

		visual_portfolio()->include_template( 'items-list/filter' . $filter_style_pref . '/filter', $args );

		// We need to include these styles, since users can insert filters using separate shortcode.
		Visual_Portfolio_Assets::store_used_assets(
			'visual-portfolio-filter-' . $vp_options['filter'],
			'items-list/filter' . $filter_style_pref . '/style',
			'template_style'
		);

		?>
		</div>
		<?php
	}

	/**
	 * Get post terms.
	 *
	 * @param WP_Query $portfolio_query - The WordPress Portfolio Query class.
	 * @param boolean  $active_item - Actime filter item.
	 * @return array
	 */
	public static function get_posts_terms( $portfolio_query, $active_item ) {
		/**
		 * TODO: make caching using set_transient function. Info here - https://wordpress.stackexchange.com/a/145960
		 */
		$term_ids        = array();
		$term_taxonomies = array();
		$terms           = array();
		$there_is_active = false;
		$term_counts     = array(); // Track actual counts from query results.

		// This hack exists because wp_reset_postdata() does not work in some situations.
		$old_post = isset( $GLOBALS['post'] ) ? $GLOBALS['post'] : null;

		while ( $portfolio_query->have_posts() ) {
			$portfolio_query->the_post();
			$current_post_id = get_the_ID();
			$all_taxonomies  = get_object_taxonomies( get_post() );

			foreach ( $all_taxonomies as $cat ) {
				// allow only specific taxonomies for filter.
				if ( ! self::allow_taxonomies_for_filter( $cat ) ) {
					continue;
				}

				// Retrieve terms.
				$category = get_the_terms( get_post(), $cat );
				if ( ! $category ) {
					continue;
				}

				// Prepare each terms array.
				foreach ( $category as $cat_item ) {
					if ( ! in_array( $cat_item->term_id, $term_ids, true ) ) {
						$term_ids[] = $cat_item->term_id;
					}
					if ( ! in_array( $cat_item->taxonomy, $term_taxonomies, true ) ) {
						$term_taxonomies[] = $cat_item->taxonomy;
					}
					// Count posts for this term based on actual query results.
					// Use post ID to avoid double-counting the same post for the same term.
					if ( ! isset( $term_counts[ $cat_item->term_id ] ) ) {
						$term_counts[ $cat_item->term_id ] = array();
					}
					if ( ! in_array( $current_post_id, $term_counts[ $cat_item->term_id ], true ) ) {
						$term_counts[ $cat_item->term_id ][] = $current_post_id;
					}
				}
			}
		}

		$portfolio_query->reset_postdata();

		// Sometimes, when we use WPBakery Page Builder, without this reset output is wrong.
		wp_reset_postdata();

		// stupid hack as wp_reset_postdata() function is not working in some situations...
        // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
		$GLOBALS['post'] = $old_post;

		// Get all available terms and then pick only needed by ID
		// we need this to support reordering plugins.
		$all_terms = get_terms(
			array(
				'taxonomy'   => $term_taxonomies,
				'hide_empty' => true,
			)
		);

		if ( isset( $all_terms ) && is_array( $all_terms ) ) {
			foreach ( $all_terms as $term ) {
				if ( in_array( $term->term_id, $term_ids, true ) ) {
					$unique_name = rawurlencode( $term->taxonomy . ':' ) . $term->slug;

					$url = self::get_pagenum_link(
						array(
							'vp_filter' => $unique_name,
							'vp_page'   => 1,
						)
					);

					$is_active = rawurldecode( $unique_name ) === $active_item;

					$terms[ $unique_name ] = array(
						'filter'      => $term->slug,
						'label'       => $term->name,
						'description' => $term->description,
						'count'       => isset( $term_counts[ $term->term_id ] ) ? count( $term_counts[ $term->term_id ] ) : 0,
						'taxonomy'    => $term->taxonomy,
						'id'          => $term->term_id,
						'parent'      => $term->parent,
						'active'      => $is_active,
						'url'         => $url,
						'class'       => 'vp-filter__item' . ( $is_active ? ' vp-filter__item-active' : '' ),
					);

					if ( $is_active ) {
						$there_is_active = true;
					}
				}
			}
		}

		return array(
			'terms'           => $terms,
			'there_is_active' => $there_is_active,
		);
	}

	/**
	 * Get images terms.
	 *
	 * @param array   $query_opts - Query array params.
	 * @param boolean $active_item - Active filter item.
	 * @return array
	 */
	public static function get_images_terms( $query_opts, $active_item ) {
		$terms           = array();
		$there_is_active = false;

		// Counts are keyed by the slug, not by the label: the filter query matches
		// on the slug, so several labels that slugify to one term ("Cats", "cats")
		// return the images of all of them and have to be counted as one term.
		// An image that carries two such labels is still one image, the same way
		// `get_posts_terms()` counts a post once per term.
		$categories_count = array();

		foreach ( $query_opts['images'] as $img ) {
			if ( ! isset( $img['categories'] ) || ! is_array( $img['categories'] ) ) {
				continue;
			}

			$counted_slugs = array();

			foreach ( $img['categories'] as $cat ) {
				$slug = self::create_slug( $cat );

				if ( isset( $counted_slugs[ $slug ] ) ) {
					continue;
				}

				$counted_slugs[ $slug ]    = true;
				$categories_count[ $slug ] = ( isset( $categories_count[ $slug ] ) ? $categories_count[ $slug ] : 0 ) + 1;
			}
		}

		foreach ( $query_opts['images'] as $img ) {
			if ( isset( $img['categories'] ) && is_array( $img['categories'] ) ) {
				foreach ( $img['categories'] as $cat ) {
					$slug = self::create_slug( $cat );
					$url  = self::get_pagenum_link(
						array(
							'vp_filter' => rawurlencode( $slug ),
							'vp_page'   => 1,
						)
					);

					// add in terms array.
					$terms[ $slug ] = array(
						'filter'      => $slug,
						'label'       => $cat,
						'description' => '',
						'count'       => isset( $categories_count[ $slug ] ) && $categories_count[ $slug ] ? $categories_count[ $slug ] : '',
						'taxonomy'    => 'category',
						'id'          => 0,
						'parent'      => 0,
						'active'      => $active_item === $slug,
						'url'         => $url,
						'class'       => 'vp-filter__item' . ( $active_item === $slug ? ' vp-filter__item-active' : '' ),
					);

					if ( $active_item === $slug ) {
						$there_is_active = true;
					}
				}
			}
		}

		return array(
			'terms'           => $terms,
			'there_is_active' => $there_is_active,
		);
	}

	/**
	 * Get filter active item.
	 *
	 * @param array           $query_opts - Query array params.
	 * @param int|string|null $query_id - id of the loop asking, or null for the legacy parameter.
	 *
	 * @return boolean|string
	 */
	public static function get_filter_active_item( $query_opts, $query_id = null ) {
		// Get active item.
		$active_item = false;
		$name        = self::get_query_var_name( 'filter', $query_id );

        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( ( isset( $_GET[ $name ] ) || isset( $query_opts['vp_filter'] ) ) ) {
            // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$active_item = sanitize_text_field( wp_unslash( $_GET[ $name ] ?? $query_opts['vp_filter'] ) );
		}

		return $active_item;
	}

	/**
	 * Get current sort slug
	 * ?vp_sort=date_desc , or ?vp-3-sort=date_desc for a loop that carries a query id.
	 *
	 * @param int|string|null $query_id - id of the loop asking, or null for the legacy parameter.
	 *
	 * @return string
	 */
	public static function get_current_sort( $query_id = null ) {
		$name = self::get_query_var_name( 'sort', $query_id );

        // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.NonceVerification
		return isset( $_GET[ $name ] ) ? sanitize_text_field( wp_unslash( $_GET[ $name ] ) ) : '';
	}

	/**
	 * Get available sort items.
	 *
	 * Labels are not escaped, escape them on output.
	 *
	 * @param array $vp_options current vp_list options.
	 *
	 * @return array sort slug => label.
	 */
	public static function get_sort_items( $vp_options = array() ) {
		$items = apply_filters(
			'vpf_extend_sort_items',
			array(
				''           => __( 'Default sorting', 'visual-portfolio' ),
				'date_desc'  => __( 'Sort by date (newest)', 'visual-portfolio' ),
				'date'       => __( 'Sort by date (oldest)', 'visual-portfolio' ),
				'title'      => __( 'Sort by title (A-Z)', 'visual-portfolio' ),
				'title_desc' => __( 'Sort by title (Z-A)', 'visual-portfolio' ),
			),
			$vp_options
		);

		// This filter used to receive escaped labels, so callbacks written
		// against that may return escaped ones. Decoding keeps a single level of
		// escaping either way, since every caller escapes on output.
		return array_map(
			function ( $label ) {
				return is_string( $label ) ? html_entity_decode( $label, ENT_QUOTES, get_bloginfo( 'charset' ) ) : $label;
			},
			$items
		);
	}

	/**
	 * Get the sort options available to a Gallery Loop block.
	 *
	 * The loop family gets its own extension point instead of reusing the legacy
	 * `vpf_extend_sort_items`: the sort block stores which of these options it
	 * shows, so the set has to be something Pro and themes can extend knowing
	 * the loop it is asked about. The base list is shared, and so is the
	 * handling - the chosen value keeps travelling in `vp_sort`, and
	 * `get_query_params()` resolves it. An option beyond the built-in four needs
	 * a `vpf_extend_query_args` callback to order by.
	 *
	 * Labels are not escaped, escape them on output.
	 *
	 * @param array $loop_options options of the loop the block belongs to.
	 *
	 * @return array sort slug => label.
	 */
	public static function get_loop_sort_options( $loop_options = array() ) {
		/**
		 * Filters the sort options a Gallery Loop block can offer.
		 *
		 * @param array $options      sort slug => label.
		 * @param array $loop_options options of the loop.
		 */
		$options = apply_filters( 'vpf_loop_sort_options', self::get_sort_items( $loop_options ), $loop_options );

		return is_array( $options ) ? $options : array();
	}

	/**
	 * Get URL of the given sort item.
	 *
	 * @param string          $slug sort slug.
	 * @param array           $vp_options current vp_list options.
	 * @param int|string|null $query_id - id of the loop the control belongs to, or null for the legacy parameters.
	 *
	 * @return string
	 */
	public static function get_sort_item_url( $slug, $vp_options = array(), $query_id = null ) {
		return apply_filters(
			'vpf_extend_sort_item_url',
			self::get_pagenum_link(
				array(
					'vp_sort' => rawurlencode( $slug ),
					'vp_page' => 1,
				),
				$query_id
			),
			$slug,
			$vp_options
		);
	}

	/**
	 * Print sort
	 *
	 * @param array $vp_options current vp_list options.
	 */
	public static function sort( $vp_options ) {
		if ( ! $vp_options['sort'] ) {
			return;
		}

		$terms = array();

		// Get active item.
		$active_item = self::get_current_sort();

		$sort_items = self::get_sort_items( $vp_options );

		foreach ( $sort_items as $slug => $label ) {
			$url = self::get_sort_item_url( $slug, $vp_options );

			$is_active = ! $active_item && ! $slug ? true : $active_item === $slug;

			// add in terms array.
			$terms[ $slug ] = array(
				'sort'        => $slug,
				'label'       => $label,
				'description' => '',
				'active'      => $is_active,
				'url'         => $url,
				'class'       => 'vp-sort__item' . ( $is_active ? ' vp-sort__item-active' : '' ),
			);
		}

		// get options for the current sort.
		$sort_options      = array();
		$sort_options_slug = 'sort_' . $vp_options['sort'] . '__';

		foreach ( $vp_options as $k => $opt ) {
			// add option to array.
			if ( substr( $k, 0, strlen( $sort_options_slug ) ) === $sort_options_slug ) {
				$opt_name                  = str_replace( $sort_options_slug, '', $k );
				$sort_options[ $opt_name ] = $opt;
			}

			// remove style options from the options list.
			if ( substr( $k, 0, strlen( $sort_options_slug ) ) === $sort_options_slug ) {
				unset( $vp_options[ $k ] );
			}
		}

		$args = array(
			'class'   => 'vp-sort',
			'items'   => $terms,
			'opts'    => $sort_options,
			'vp_opts' => $vp_options,
		);

		?>
		<div class="vp-portfolio__sort-wrap">
		<?php

		$sort_style_pref = '';

		if ( 'default' !== $vp_options['sort'] ) {
			$sort_style_pref = '/' . $vp_options['sort'];
		}

		visual_portfolio()->include_template( 'items-list/sort' . $sort_style_pref . '/sort', $args );

		// We need to include these styles, since users can insert sort using separate shortcode.
		Visual_Portfolio_Assets::store_used_assets(
			'visual-portfolio-sort-' . $vp_options['sort'],
			'items-list/sort' . $sort_style_pref . '/style',
			'template_style'
		);

		?>
		</div>
		<?php
	}

	/**
	 * Get item kind label for aria-label generation.
	 *
	 * @param array $args - item args.
	 *
	 * @return string
	 */
	private static function get_item_kind_label( $args ) {
		$format        = $args['format'] ?? '';
		$format_labels = array(
			'video'   => esc_html__( 'video', 'visual-portfolio' ),
			'audio'   => esc_html__( 'audio', 'visual-portfolio' ),
			'gallery' => esc_html__( 'gallery', 'visual-portfolio' ),
		);

		if ( isset( $format_labels[ $format ] ) ) {
			return $format_labels[ $format ];
		}

		$post_type = $args['post_type'] ?? '';

		if ( '' === $post_type && ! empty( $args['post_id'] ) ) {
			$post_type = get_post_type( intval( $args['post_id'] ) );
		}

		if ( $post_type ) {
			$post_type_labels = array(
				'post'    => esc_html__( 'Post', 'visual-portfolio' ),
				'page'    => esc_html__( 'Page', 'visual-portfolio' ),
				'product' => esc_html__( 'Product', 'visual-portfolio' ),
				'shop'    => esc_html__( 'Shop', 'visual-portfolio' ),
				'project' => esc_html__( 'Project', 'visual-portfolio' ),
				'work'    => esc_html__( 'Work', 'visual-portfolio' ),
			);

			if ( isset( $post_type_labels[ $post_type ] ) ) {
				return $post_type_labels[ $post_type ];
			}

			$post_type_fallback = ucwords( str_replace( array( '-', '_' ), ' ', $post_type ) );
			$post_type_fallback = wp_strip_all_tags( $post_type_fallback );

			if ( '' !== trim( $post_type_fallback ) ) {
				return $post_type_fallback;
			}
		}

		$content_source        = $args['vp_opts']['content_source'] ?? '';
		$content_source_labels = array(
			'images'        => esc_html__( 'image', 'visual-portfolio' ),
			'social-stream' => esc_html__( 'social post', 'visual-portfolio' ),
		);

		if ( isset( $content_source_labels[ $content_source ] ) ) {
			return $content_source_labels[ $content_source ];
		}

		return esc_html__( 'item', 'visual-portfolio' );
	}

	/**
	 * Get item aria-label.
	 *
	 * @param array $args - item args.
	 *
	 * @return string
	 */
	public static function get_item_aria_label( $args ) {
		$aria_label = wp_strip_all_tags( $args['aria_label'] ?? '' );

		if ( '' === trim( $aria_label ) ) {
			$aria_label = wp_strip_all_tags( $args['title'] ?? '' );
		}

		if ( '' !== trim( $aria_label ) ) {
			return $aria_label;
		}

		// translators: %s - item type label such as image, post type name, video, etc.
		$aria_label = sprintf( esc_html__( 'Open %s', 'visual-portfolio' ), self::get_item_kind_label( $args ) );

		/**
		 * Filters the generated aria-label for each item link.
		 *
		 * @param string $aria_label generated aria-label.
		 * @param array  $args       item args.
		 */
		return apply_filters( 'vpf_item_aria_label', $aria_label, $args );
	}

	/**
	 * Print each item
	 *
	 * @param array $args current item data.
	 *      'url' - post/image url.
	 *      'title' - post/image title.
	 *      'format' - post/image format.
	 *      'published' - post/image published.
	 *      'published_time' - post/image published time.
	 *      'categories' - categories array.
	 *      'filter' - filters string.
	 *      'video' - video url.
	 *      'image_id' - image id.
	 *      'img_size_popup' - image size for popup.
	 *      'img_size_md_popup' - md image size for popup.
	 *      'img_size_sm_popup' - sm image size for popup.
	 *      'img_size' - image size.
	 *      'no_image' - no image id.
	 *      'opts' - style options.
	 *      'vp_opts' - vp options.
	 */
	private static function each_item( $args ) {
		global $post;

		$is_posts = 'post-based' === $args['vp_opts']['content_source'] || 'portfolio' === $args['vp_opts']['content_source'];

		// In older plugin versions we used the query objects in these templates.
		// And some theme authors used these data to run wp functions to output posts data.
		// In order to add back-compatibility, we need to "restore" such a possibility.
		//
		// Example: https://wordpress.org/support/topic/title-and-link-error-for-blog/.
		$set_post_object = $is_posts && isset( $args['post_id'] ) && $args['post_id'];

		if ( $set_post_object ) {
            // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
			$post = get_post( $args['post_id'] );

			setup_postdata( $post );
		}

		// prepare image.
		$image_attrs = '';
		$custom_alt  = isset( $args['alt'] ) ? trim( (string) $args['alt'] ) : '';

		if ( '' !== $custom_alt ) {
			$image_attrs = array(
				'alt' => $custom_alt,
			);
		}

		$args['image'] = Visual_Portfolio_Images::get_attachment_image( $args['image_id'], $args['img_size'], false, $image_attrs );

		// prepare date.
		if ( isset( $args['opts']['show_date'] ) ) {
			if ( 'human' === $args['opts']['show_date'] ) {
				// translators: %s - published in human format.
				$args['published'] = sprintf( esc_html__( '%s ago', 'visual-portfolio' ), human_time_diff( mysql2date( 'U', $args['published_time'], true ), current_time( 'timestamp' ) ) ); //phpcs:ignore WordPress.DateTime.CurrentTimeTimestamp.Requested
			} elseif ( $args['opts']['show_date'] ) {
				$args['published'] = mysql2date( $args['opts']['date_format'] ? $args['opts']['date_format'] : 'F j, Y', $args['published_time'], true );
			}

			// fallback for Visual Portfolio 1.2.1 version.
			$args['opts']['date_human_format'] = 'human' === $args['opts']['show_date'];
			$args['published_human_format']    = $args['published'];
		}

		// add video format args.
		if ( 'video' === $args['format'] && $args['video'] ) {
			$args['format_video_url'] = $args['video'];

			if ( ! $is_posts ) {
				$args['url'] = $args['video'];
			}
		}

		// prepare read more button.
		if ( isset( $args['opts']['show_read_more'] ) && $args['opts']['show_read_more'] ) {
			if ( $is_posts && 'more_tag' === $args['opts']['show_read_more'] ) {
				if ( strpos( get_post_field( 'post_content', $args['post_id'] ), '<!--more-->' ) ) {
					$args['opts']['read_more_url'] = $args['url'] . '#more-' . $args['post_id'];
				} else {
					$args['opts']['show_read_more'] = false;
				}
			} else {
				$args['opts']['read_more_url'] = $args['url'];
			}
		}

		// Click action.
		$args['url_target'] = false;
		$args['url_rel']    = false;

		switch ( $args['vp_opts']['items_click_action'] ) {
			case 'popup_gallery':
				break;
			case false:
				$args['url'] = false;
				break;
			default:
				$args['url_target'] = $args['vp_opts']['items_click_action_url_target'] ? $args['vp_opts']['items_click_action_url_target'] : false;
				$args['url_rel']    = $args['vp_opts']['items_click_action_url_rel'] ? $args['vp_opts']['items_click_action_url_rel'] : false;
				break;
		}

		$args['aria_label'] = self::get_item_aria_label( $args );

		// No Image.
		if ( ! $args['image'] && $args['no_image'] ) {
			$args['image'] = Visual_Portfolio_Images::get_attachment_image( $args['no_image'], $args['img_size'], false, '' );
		}

		// Class.
		$args['class'] = 'vp-portfolio__item-wrap';
		if ( $is_posts ) {
			// post_class functionality.
			$args['class'] = join( ' ', get_post_class( $args['class'], $args['post_id'] ) );
		}

		if ( ! $is_posts && is_array( $args['categories'] ) && ! empty( $args['categories'] ) ) {
			foreach ( $args['categories'] as $category ) {
				$args['class'] .= ' category-' . $category['slug'];
			}
		}

		if ( $args['uid'] ) {
			$args['class'] .= ' vp-portfolio__item-uid-' . esc_attr( $args['uid'] );
		}

		$args = apply_filters( 'vpf_each_item_args', $args );

		// Tag Name.
		$tag_name = $is_posts ? 'article' : 'div';
		$tag_name = apply_filters( 'vpf_each_item_tag_name', $tag_name, $args );

		$attrs = array(
			'class'          => $args['class'],
			'data-vp-filter' => $args['filter'],
		);

		if ( isset( $args['focal_point'] ) && $args['focal_point'] && ! empty( $args['focal_point'] ) ) {
			$attrs['style'] = '--vp-images__object-position: ' . esc_attr( 100 * floatval( $args['focal_point']['x'] ) ) . '% ' . esc_attr( 100 * floatval( $args['focal_point']['y'] ) ) . '%;';
		}

		$attrs = apply_filters( 'vpf_each_item_tag_attrs', $attrs, $args );
		?>

		<<?php echo esc_attr( $tag_name ); ?>
		<?php
		foreach ( $attrs as $name => $val ) {
			echo esc_attr( $name ) . '="' . esc_attr( $val ) . '" ';
		}
		?>
		>
			<?php
			if ( $args['vp_opts']['items_click_action'] && 'url' !== $args['vp_opts']['items_click_action'] ) {
				self::item_popup_data( $args );
			}
			?>
			<?php do_action( 'vpf_before_each_item', $args ); ?>
			<figure class="vp-portfolio__item">
				<?php
				do_action( 'vpf_each_item_start', $args );

				$items_style_pref = '';
				if ( 'default' !== $args['vp_opts']['items_style'] ) {
					$items_style_pref = '/' . $args['vp_opts']['items_style'];
				}
				visual_portfolio()->include_template( 'items-list/items-style' . $items_style_pref . '/image', $args );
				visual_portfolio()->include_template( 'items-list/items-style' . $items_style_pref . '/meta', $args );

				do_action( 'vpf_each_item_end', $args );
				?>
			</figure>
			<?php do_action( 'vpf_after_each_item', $args ); ?>
		</<?php echo esc_attr( $tag_name ); ?>>
		<?php

		if ( $set_post_object ) {
			wp_reset_postdata();
		}
	}

	/**
	 * Print item popup data.
	 *
	 * @param array $args - item args.
	 */
	private static function item_popup_data( $args ) {
		$popup_image  = false;
		$popup_video  = false;
		$popup_output = false;

		if ( isset( $args['allow_popup'] ) && $args['allow_popup'] ) {
			if ( isset( $args['format_video_url'] ) && $args['format_video_url'] ) {
				$popup_video = self::get_popup_video( $args );
			} else {
				$img_id = $args['image_id'] ? $args['image_id'] : $args['no_image'];

				$popup_image = self::get_popup_image( $img_id, $args );
			}
		}

		if ( $popup_image ) {
			$popup_output = self::popup_image_output( $popup_image, $args );
		} elseif ( $popup_video ) {
			$popup_output = self::popup_video_output( $popup_video, $args );
		}

		$popup_output = apply_filters( 'vpf_popup_output', $popup_output, $args );

		echo wp_kses( $popup_output, 'vp_popup' );
	}

	/**
	 * Get item popup image data.
	 *
	 * @param  int   $img_id - image id.
	 * @param  array $args - item args.
	 * @return array|bool
	 */
	public static function get_popup_image( $img_id, $args ) {
		$popup_image = false;
		if ( $img_id ) {
			$attachment = get_post( $args['image_id'] );

			if ( $attachment && 'attachment' === $attachment->post_type ) {
				$img_meta    = wp_get_attachment_image_src( $args['image_id'], $args['img_size_popup'] );
				$img_md_meta = wp_get_attachment_image_src( $args['image_id'], $args['img_size_md_popup'] );
				$img_sm_meta = wp_get_attachment_image_src( $args['image_id'], $args['img_size_sm_popup'] );

				if ( ! $img_meta ) {
					$img_meta = array(
						wp_get_attachment_url( $args['image_id'] ),
						0,
						0,
					);
				}

				if ( ! $img_md_meta ) {
					$img_md_meta = $img_meta;
				}

				if ( ! $img_sm_meta ) {
					$img_sm_meta = $img_meta;
				}

				$popup_image = apply_filters(
					'vpf_popup_image_data',
					array(
						'id'               => $args['image_id'],
						'title'            => $attachment->post_title,
						'description'      => $attachment->post_content,
						'caption'          => wp_get_attachment_caption( $attachment->ID ),
						'alt'              => isset( $args['alt'] ) && '' !== trim( (string) $args['alt'] ) ? trim( (string) $args['alt'] ) : get_post_meta( $attachment->ID, '_wp_attachment_image_alt', true ),
						'url'              => $img_meta[0],
						'srcset'           => wp_get_attachment_image_srcset( $args['image_id'], $args['img_size_popup'] ),
						'width'            => $img_meta[1],
						'height'           => $img_meta[2],
						'md_url'           => $img_md_meta[0],
						'md_width'         => $img_md_meta[1],
						'md_height'        => $img_md_meta[2],
						'sm_url'           => $img_sm_meta[0],
						'sm_width'         => $img_sm_meta[1],
						'sm_height'        => $img_sm_meta[2],
						'item_title'       => $args['title'],
						'item_description' => $args['content'],
						'item_excerpt'     => self::get_item_excerpt( $args ),
						'item_author'      => $args['author'],
						'item_author_url'  => $args['author_url'],
					)
				);
			} elseif ( $args['image_id'] ) {
				$popup_image = apply_filters( 'vpf_popup_custom_image_data', false, $args['image_id'] );

				// Check items title and description availability.
				if ( $popup_image && ! isset( $popup_image['item_title'] ) ) {
					$popup_image['item_title'] = $popup_image['title'] ?? '';
				}
				if ( $popup_image && ! isset( $popup_image['item_description'] ) ) {
					$popup_image['item_description'] = $popup_image['description'] ?? '';
				}
				if ( $popup_image && ! isset( $popup_image['item_excerpt'] ) ) {
					$popup_image['item_excerpt'] = self::get_item_excerpt( $args );
				}
				if ( $popup_image && ! isset( $popup_image['item_author'] ) ) {
					$popup_image['item_author'] = $popup_image['author'] ?? '';
				}
			}
		}
		return $popup_image;
	}

	/**
	 * Get item popup video data.
	 *
	 * @param array $args - item args.
	 *
	 * @return array
	 */
	public static function get_popup_video( $args ) {
		return array(
			'url'              => $args['format_video_url'],
			'poster'           => wp_get_attachment_image_url( $args['image_id'], 'full' ),
			'item_title'       => $args['title'] ?? null,
			'item_description' => $args['content'] ?? null,
			'item_excerpt'     => self::get_item_excerpt( $args ),
			'item_author'      => $args['author'] ?? null,
			'item_author_url'  => $args['author_url'] ?? null,
		);
	}

	/**
	 * Build trimmed item excerpt for grid meta and lightbox sources.
	 * Independent of the Display Excerpt items-style toggle.
	 *
	 * @param array $args Item args.
	 * @return string
	 */
	public static function get_item_excerpt( $args ) {
		$words_count = isset( $args['opts']['excerpt_words_count'] ) ? (int) $args['opts']['excerpt_words_count'] : 15;

		if ( $words_count < 1 ) {
			$words_count = 15;
		}

		// Reuse already computed grid excerpt when present.
		if ( ! empty( $args['excerpt'] ) ) {
			return $args['excerpt'];
		}

		$post_id = isset( $args['post_id'] ) ? (int) $args['post_id'] : 0;

		if ( $post_id ) {
			$raw = has_excerpt( $post_id ) ? get_the_excerpt( $post_id ) : ( $args['content'] ?? '' );

			if ( $raw ) {
				return wp_trim_words( do_shortcode( $raw ), $words_count, '...' );
			}

			return '';
		}

		if ( ! empty( $args['content'] ) ) {
			return wp_trim_words( $args['content'], $words_count, '...' );
		}

		return '';
	}

	/**
	 * Print image popup.
	 *
	 * @param array $image_data - item popup image data.
	 * @param array $args  - item args.
	 *
	 * @return string|bool
	 */
	public static function popup_image_output( $image_data, $args ) {
		$popup_output = false;

		if ( $image_data ) {
			ob_start();

			$title_source       = $args['vp_opts']['items_click_action_popup_title_source'] ? $args['vp_opts']['items_click_action_popup_title_source'] : '';
			$description_source = $args['vp_opts']['items_click_action_popup_description_source'] ? $args['vp_opts']['items_click_action_popup_description_source'] : '';

			visual_portfolio()->include_template(
				'popup/image-popup-data',
				array(
					'title_source'       => $title_source,
					'description_source' => $description_source,
					'image_data'         => $image_data,
					'args'               => $args,
					'opts'               => $args['vp_opts'],
				)
			);

			$popup_output = ob_get_clean();
		}

		return $popup_output;
	}

	/**
	 * Print video popup.
	 *
	 * @param array $video_data - item popup video data.
	 * @param array $args  - item args.
	 *
	 * @return string|bool
	 */
	public static function popup_video_output( $video_data, $args ) {
		$popup_output = false;

		if ( $video_data ) {
			ob_start();

			$title_source       = $args['vp_opts']['items_click_action_popup_title_source'] ? $args['vp_opts']['items_click_action_popup_title_source'] : '';
			$description_source = $args['vp_opts']['items_click_action_popup_description_source'] ? $args['vp_opts']['items_click_action_popup_description_source'] : '';

			visual_portfolio()->include_template(
				'popup/video-popup-data',
				array(
					'title_source'       => $title_source,
					'description_source' => $description_source,
					'video_data'         => $video_data,

					// We need to check existence of args to prevent possible conflicts.
					'args'               => isset( $args ) ? $args : null,
					'opts'               => isset( $args['vp_opts'] ) ? $args['vp_opts'] : null,
				)
			);

			$popup_output = ob_get_clean();
		}

		return $popup_output;
	}

	/**
	 * Print pagination
	 *
	 * @param array $vp_options - current vp_list options.
	 */
	public static function pagination( $vp_options ) {
		if ( ! $vp_options['pagination_style'] || ! $vp_options['pagination'] ) {
			return;
		}

		// get options for the current pagination.
		$pagination_options      = array();
		$pagination_options_slug = 'pagination_' . $vp_options['pagination_style'] . '__';
		foreach ( $vp_options as $k => $opt ) {
			// add option to array.
			if ( substr( $k, 0, strlen( $pagination_options_slug ) ) === $pagination_options_slug ) {
				$opt_name                        = str_replace( $pagination_options_slug, '', $k );
				$pagination_options[ $opt_name ] = $opt;
			}

			// remove style options from the options list.
			if ( substr( $k, 0, strlen( $pagination_options_slug ) ) === $pagination_options_slug ) {
				unset( $vp_options[ $k ] );
			}
		}

		$args = array(
			'type'          => $vp_options['pagination'],
			'next_page_url' => $vp_options['next_page_url'],
			'start_page'    => $vp_options['start_page'],
			'max_pages'     => $vp_options['max_pages'],
			'class'         => 'vp-pagination',
			'opts'          => $pagination_options,
			'vp_opts'       => $vp_options,
		);

		$args = apply_filters( 'vpf_pagination_args', $args, $vp_options );

		// No more posts.
		if ( ! $args['next_page_url'] ) {
			$args['class'] .= ' vp-pagination__no-more';
		}

		?>
		<div class="vp-portfolio__pagination-wrap">
		<?php

		$pagination_style_pref = '';
		if ( 'default' !== $vp_options['pagination_style'] ) {
			$pagination_style_pref = '/' . $vp_options['pagination_style'];
		}

		switch ( $vp_options['pagination'] ) {
			case 'infinite':
			case 'load-more':
				if ( 'infinite' === $vp_options['pagination'] ) {
					$args['text_load']     = $vp_options['pagination_infinite_text_load'];
					$args['text_loading']  = $vp_options['pagination_infinite_text_loading'];
					$args['text_end_list'] = $vp_options['pagination_infinite_text_end_list'];
				} else {
					$args['text_load']     = $vp_options['pagination_load_more_text_load'];
					$args['text_loading']  = $vp_options['pagination_load_more_text_loading'];
					$args['text_end_list'] = $vp_options['pagination_load_more_text_end_list'];
				}

				if ( ! $vp_options['pagination_hide_on_end'] || $args['next_page_url'] ) {
					visual_portfolio()->include_template( 'items-list/pagination' . $pagination_style_pref . '/' . $vp_options['pagination'], $args );
				}

				break;
			default:
				// Scroll to top.
				if ( $vp_options['pagination_paged__scroll_top'] ) {
					$args['class'] .= ' vp-pagination__scroll-top';

					if ( isset( $vp_options['pagination_paged__scroll_top_offset'] ) ) {
						$args['scroll_top_offset'] = $vp_options['pagination_paged__scroll_top_offset'];
					}
				}

				// parse html string and make arrays.
				$filtered_links = self::get_pagination_links( $args, $vp_options );

				if ( ! empty( $filtered_links ) ) {
					$args['items'] = $filtered_links;
					visual_portfolio()->include_template( 'items-list/pagination' . $pagination_style_pref . '/paged', $args );
				}

				break;
		}

		?>
		</div>
		<?php
	}

	/**
	 * Get pagination links.
	 *
	 * @param array           $args - Block Arguments.
	 * @param array           $vp_options - Block Options.
	 * @param int|string|null $query_id - id of the loop the pagination belongs to, or null for the legacy parameters.
	 *
	 * @return array
	 */
	public static function get_pagination_links( $args, $vp_options, $query_id = null ) {
		$pagination_links = paginate_links(
			array(
				'base'      => esc_url_raw(
					str_replace(
						999999999,
						'%#%',
						remove_query_arg(
							'add-to-cart',
							self::get_pagenum_link(
								array(
									'vp_page' => 999999999,
								),
								$query_id
							)
						)
					)
				),
				'format'    => '',
				'type'      => 'array',
				'current'   => $args['start_page'],
				'total'     => $args['max_pages'],
				'prev_text' => '&lt;',
				'next_text' => '&gt;',
				'end_size'  => $args['end_size'] ?? 1,
				'mid_size'  => $args['mid_size'] ?? 2,
			)
		);

		// parse html string and make arrays.
		$filtered_links = array();
		if ( $pagination_links ) {
			foreach ( $pagination_links as $link ) {
				$tag_data = self::extract_tags( $link, array( 'a', 'span' ) );
				$tag_data = ! empty( $tag_data ) ? $tag_data[0] : $tag_data;

				if ( ! empty( $tag_data ) ) {
					$atts  = isset( $tag_data['attributes'] ) ? $tag_data['attributes'] : false;
					$href  = $atts && isset( $atts['href'] ) ? $atts['href'] : false;
					$class = $atts && isset( $atts['class'] ) ? $atts['class'] : '';
					$label = isset( $tag_data['contents'] ) ? $tag_data['contents'] : false;

					$arr = array(
						'url'           => $href,
						'label'         => $label,
						'class'         => 'vp-pagination__item',
						'active'        => strpos( $class, 'current' ) !== false,
						'is_prev_arrow' => strpos( $class, 'prev' ) !== false,
						'is_next_arrow' => strpos( $class, 'next' ) !== false,
						'is_dots'       => strpos( $class, 'dots' ) !== false,
					);

					if ( $arr['active'] ) {
						$arr['class'] .= ' vp-pagination__item-active';
					}
					if ( $arr['is_prev_arrow'] ) {
						$arr['class'] .= ' vp-pagination__item-prev';
					}
					if ( $arr['is_next_arrow'] ) {
						$arr['class'] .= ' vp-pagination__item-next';
					}
					if ( $arr['is_dots'] ) {
						$arr['class'] .= ' vp-pagination__item-dots';
					}

					// skip arrows if disabled.
					if ( ! $vp_options['pagination_paged__show_arrows'] && ( $arr['is_prev_arrow'] || $arr['is_next_arrow'] ) ) {
						continue;
					}

					// skip numbers if disabled.
					if ( ! $vp_options['pagination_paged__show_numbers'] && ! $arr['is_prev_arrow'] && ! $arr['is_next_arrow'] ) {
						continue;
					}

					$filtered_links[] = apply_filters( 'vpf_pagination_item_data', $arr, $args, $vp_options );
				}
			}
		}

		return $filtered_links;
	}

	/**
	 * The URL of the request being served.
	 *
	 * Read off `REQUEST_URI` rather than rebuilt, because a site may be running
	 * on permalinks nothing else reproduces - `/index.php/%postname%` among them.
	 * Only where the server said nothing is it built back from the parsed request.
	 *
	 * @return string Unescaped URL.
	 */
	public static function get_current_url() {
		if ( isset( $_SERVER['HTTP_HOST'], $_SERVER['REQUEST_URI'] ) ) {
			return esc_url_raw( wp_unslash( ( is_ssl() ? 'https' : 'http' ) . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'] ) );
		}

		global $wp;

		$current_url = trailingslashit( home_url( $wp->request ) );

        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( ! empty( $_GET ) ) {
            // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$current_url = add_query_arg( array_map( 'sanitize_text_field', wp_unslash( $_GET ) ), $current_url );
		}

		return $current_url;
	}

	/**
	 * Return current page url with paged support.
	 *
	 * Arguments are always named after the legacy parameters (`vp_page`,
	 * `vp_filter`, `vp_sort`). With a query id they are written under the names
	 * of that loop instead, so every caller builds a link the same way and only
	 * the loop decides which parameters it owns. Parameters of other loops are
	 * part of the current URL and survive untouched.
	 *
	 * @param array           $query_arg - custom query arg.
	 * @param int|string|null $query_id - id of the loop the link belongs to, or null for the legacy parameters.
	 *
	 * @return string
	 */
	public static function get_pagenum_link( $query_arg = array(), $query_id = null ) {
		$current_url = self::get_current_url();

		$names = array(
			'vp_filter' => self::get_query_var_name( 'filter', $query_id ),
			'vp_sort'   => self::get_query_var_name( 'sort', $query_id ),
			'vp_page'   => self::get_query_var_name( 'page', $query_id ),
		);

		if ( 'vp_page' !== $names['vp_page'] ) {
			$renamed = array();

			foreach ( $query_arg as $key => $value ) {
				$renamed[ $names[ $key ] ?? $key ] = $value;
			}

			$query_arg = $renamed;
		}

		// An empty filter or sort, and the first page, are the default state -
		// they are dropped from the URL rather than written into it.
		foreach ( array( 'vp_filter', 'vp_sort' ) as $legacy_name ) {
			$name = $names[ $legacy_name ];

			if ( isset( $query_arg[ $name ] ) && ! $query_arg[ $name ] ) {
				unset( $query_arg[ $name ] );
				$current_url = remove_query_arg( $name, $current_url );
			}
		}

		if ( isset( $query_arg[ $names['vp_page'] ] ) && 1 === $query_arg[ $names['vp_page'] ] ) {
			unset( $query_arg[ $names['vp_page'] ] );
			$current_url = remove_query_arg( $names['vp_page'], $current_url );
		}

		// Add custom query args.
		$current_url = add_query_arg( $query_arg, $current_url );

		/**
		 * Filters a link built by the gallery controls.
		 *
		 * @param string          $current_url resulting URL, unescaped.
		 * @param array           $query_arg   query arguments added to it, under the names of the loop.
		 * @param int|string|null $query_id    id of the loop the link belongs to, null for the legacy parameters.
		 */
		$current_url = apply_filters( 'vpf_get_pagenum_link', $current_url, $query_arg, $query_id );

		return $current_url;
	}

	/**
	 * Create slug from user input string.
	 *
	 * @param string $str - user string.
	 * @param string $delimiter - words delimiter.
	 *
	 * @return string
	 */
	public static function create_slug( $str, $delimiter = '_' ) {
		$slug = $str;

		if ( class_exists( 'Cocur\Slugify\Slugify' ) ) {
			$slugify = new Cocur\Slugify\Slugify();
			$slug    = $slugify->slugify( $str, $delimiter );

			// Sometimes Slugify can't add slug to string with unicode.
			// We will return the standard string.
			if ( ! $slug ) {
				$slug = $str;
			}
		}

		return $slug;
	}

	/**
	 * Get list with all used posts on the current page.
	 *
	 * @return array
	 */
	/**
	 * The posts resolved so far, to be put back after a lookup.
	 *
	 * Resolving a loop records its posts, and "avoid duplicates" reads that
	 * record - so anything that resolves a loop out of document order, such as
	 * a `wp_head` lookup, changes what the loops after it are allowed to show.
	 *
	 * @return array
	 */
	public static function snapshot_used_posts() {
		return self::$used_posts;
	}

	/**
	 * Put a snapshot of the resolved posts back.
	 *
	 * @param array $snapshot - what `snapshot_used_posts()` returned.
	 *
	 * @return void
	 */
	public static function restore_used_posts( $snapshot ) {
		self::$used_posts = (array) $snapshot;
	}

	/**
	 * Get all used posts.
	 *
	 * @param bool $with_main_query - whether the page's own list counts as shown.
	 *                                A loop asks without it on a single post,
	 *                                where that list is the post being viewed and
	 *                                "Exclude the current post" is the switch that
	 *                                owns it.
	 * @return array
	 */
	public static function get_all_used_posts( $with_main_query = true ) {
		// add post IDs from main query.
		if ( $with_main_query && self::$check_main_query && ! self::is_preview() ) {
			self::$check_main_query = false;

			global $wp_query;

			if ( isset( $wp_query ) && isset( $wp_query->posts ) ) {
				foreach ( $wp_query->posts as $post ) {
					self::$used_posts[] = $post->ID;
				}
			}
		}

		return self::$used_posts;
	}

	/**
	 * Get list with all used portfolios on the current page.
	 *
	 * @return array
	 */
	public static function get_all_used_layouts() {
		return self::$used_layouts;
	}

	/**
	 * Extract specific HTML tags and their attributes from a string.
	 *
	 * Found in http://w-shadow.com/blog/2009/10/20/how-to-extract-html-tags-and-their-attributes-with-php/
	 *
	 * You can either specify one tag, an array of tag names, or a regular expression that matches the tag name(s).
	 * If multiple tags are specified you must also set the $selfclosing parameter and it must be the same for
	 * all specified tags (so you can't extract both normal and self-closing tags in one go).
	 *
	 * The function returns a numerically indexed array of extracted tags. Each entry is an associative array
	 * with these keys :
	 *  tag_name    - the name of the extracted tag, e.g. "a" or "img".
	 *  offset      - the numberic offset of the first character of the tag within the HTML source.
	 *  contents    - the inner HTML of the tag. This is always empty for self-closing tags.
	 *  attributes  - a name -> value array of the tag's attributes, or an empty array if the tag has none.
	 *  full_tag    - the entire matched tag, e.g. '<a href="http://example.com">example.com</a>'. This key
	 *                will only be present if you set $return_the_entire_tag to true.
	 *
	 * @param string       $html The HTML code to search for tags.
	 * @param string|array $tag The tag(s) to extract.
	 * @param bool         $selfclosing Whether the tag is self-closing or not. Setting it to null will force the script to try and make an educated guess.
	 * @param bool         $return_the_entire_tag Return the entire matched tag in 'full_tag' key of the results array.
	 * @param string       $charset The character set of the HTML code. Defaults to ISO-8859-1.
	 *
	 * @return array An array of extracted tags, or an empty array if no matching tags were found.
	 */
	private static function extract_tags( $html, $tag, $selfclosing = null, $return_the_entire_tag = false, $charset = 'ISO-8859-1' ) {

		if ( is_array( $tag ) ) {
			$tag = implode( '|', $tag );
		}

		// If the user didn't specify if $tag is a self-closing tag we try to auto-detect it by checking against a list of known self-closing tags.
		$selfclosing_tags = array( 'area', 'base', 'basefont', 'br', 'hr', 'input', 'img', 'link', 'meta', 'col', 'param' );
		if ( is_null( $selfclosing ) ) {
			$selfclosing = in_array( $tag, $selfclosing_tags, true );
		}

		// The regexp is different for normal and self-closing tags because I can't figure out how to make a sufficiently robust unified one.
		if ( $selfclosing ) {
			$tag_pattern =
				'@<(?P<tag>' . $tag . ')           # <tag
                (?P<attributes>\s[^>]+)?       # attributes, if any
                \s*/?>                   # /> or just >, being lenient here
                @xsi';
		} else {
			$tag_pattern =
				'@<(?P<tag>' . $tag . ')           # <tag
                (?P<attributes>\s[^>]+)?       # attributes, if any
                \s*>                 # >
                (?P<contents>.*?)         # tag contents
                </(?P=tag)>               # the closing </tag>
                @xsi';
		}

		$attribute_pattern =
			'@
            (?P<name>\w+)                         # attribute name
            \s*=\s*
            (
                (?P<quote>[\"\'])(?P<value_quoted>.*?)(?P=quote)    # a quoted value
                |                           # or
                (?P<value_unquoted>[^\s"\']+?)(?:\s+|$)           # an unquoted value (terminated by whitespace or EOF)
            )
            @xsi';

		// Find all tags.
		if ( ! preg_match_all( $tag_pattern, $html, $matches, PREG_SET_ORDER | PREG_OFFSET_CAPTURE ) ) {
			// Return an empty array if we didn't find anything.
			return array();
		}

		$tags = array();
		foreach ( $matches as $match ) {

			// Parse tag attributes, if any.
			$attributes = array();
			if ( ! empty( $match['attributes'][0] ) ) {

				if ( preg_match_all( $attribute_pattern, $match['attributes'][0], $attribute_data, PREG_SET_ORDER ) ) {
					// Turn the attribute data into a name->value array.
					foreach ( $attribute_data as $attr ) {
						if ( ! empty( $attr['value_quoted'] ) ) {
							$value = $attr['value_quoted'];
						} elseif ( ! empty( $attr['value_unquoted'] ) ) {
							$value = $attr['value_unquoted'];
						} else {
							$value = '';
						}

						// Passing the value through html_entity_decode is handy when you want to extract link URLs or something like that. You might want to remove or modify this call if it doesn't fit your situation.
						$value = html_entity_decode( $value, ENT_QUOTES, $charset );

						$attributes[ $attr['name'] ] = $value;
					}
				}
			}

			$tag = array(
				'tag_name'   => $match['tag'][0],
				'offset'     => $match[0][1],
				'contents'   => ! empty( $match['contents'] ) ? $match['contents'][0] : '',   // empty for self-closing tags.
				'attributes' => $attributes,
			);
			if ( $return_the_entire_tag ) {
				$tag['full_tag'] = $match[0][0];
			}

			$tags[] = $tag;
		}

		return $tags;
	}
}

new Visual_Portfolio_Get();
