<?php
/**
 * Add custom meta data to posts.
 *
 * @package visual-portfolio/admin
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Custom_Post_Meta
 */
class Visual_Portfolio_Custom_Post_Meta {
	/**
	 * Visual_Portfolio_Custom_Post_Meta constructor.
	 */
	public static function init() {
		// add post formats.
		add_action( 'after_setup_theme', array( __CLASS__, 'add_extra_post_format' ), 99 );
		add_action( 'init', array( __CLASS__, 'register_post_meta' ) );
		add_action( 'add_meta_boxes', array( __CLASS__, 'add_post_format_metaboxes' ), 1 );
		add_action( 'save_post', array( __CLASS__, 'save_post_format_metaboxes' ) );
		add_action( 'save_post', array( __CLASS__, 'update_words_count' ) );
		add_action( 'wp_head', array( __CLASS__, 'update_views_count' ) );
	}

	/**
	 * Check if current page is gutenberg.
	 *
	 * @return boolean
	 */
	public static function is_gutenberg() {
		$current_screen = get_current_screen();
		if ( method_exists( $current_screen, 'is_block_editor' ) && $current_screen->is_block_editor() ) {
			return true;
		}

		return false;
	}

	/**
	 * Add video post format.
	 */
	public static function add_extra_post_format() {
		global $_wp_theme_features;

		$formats = array( 'image', 'video' );

		// Add existing formats.
		if ( isset( $_wp_theme_features['post-formats'] ) && isset( $_wp_theme_features['post-formats'][0] ) ) {
			$formats = array_merge( (array) $_wp_theme_features['post-formats'][0], $formats );
		}
		$formats = array_unique( $formats );

		add_theme_support( 'post-formats', $formats );
	}

	/**
	 * Register post meta.
	 */
	public static function register_post_meta() {
		$post_type_names = array_keys( get_post_types() );

		foreach ( $post_type_names as $post_type ) {
			if ( ! is_post_type_viewable( $post_type ) ) {
				continue;
			}

			// Register meta for all post types.
			register_meta(
				'post',
				'_vp_format_video_url',
				array(
					'object_subtype' => $post_type,
					'type'           => 'string',
					'single'         => true,
					'show_in_rest'   => true,
					'auth_callback'  => array( __CLASS__, 'rest_auth' ),
				)
			);
			register_meta(
				'post',
				'_vp_image_focal_point',
				array(
					'object_subtype' => $post_type,
					'type'           => 'object',
					'single'         => true,
					'show_in_rest'   => array(
						'schema' => array(
							'type'       => 'object',
							'properties' => array(
								'x' => array(
									'type' => 'number',
								),
								'y' => array(
									'type' => 'number',
								),
							),
						),
					),
					'auth_callback'  => array( __CLASS__, 'rest_auth' ),
				)
			);

			// Add support for 'custom-fields' to work in Gutenberg.
			add_post_type_support( $post_type, 'custom-fields' );
		}
	}

	/**
	 * Determines REST API authentication.
	 *
	 * @param bool   $allowed Whether it is allowed.
	 * @param string $meta_key The meta key being checked.
	 * @param int    $post_id The post ID being checked.
	 * @param int    $user_id The user ID being checked.
	 * @param string $cap The current capability.
	 * @param array  $caps All capabilities.
	 * @return bool Whether the user can do it.
	 */
	// phpcs:ignore
	public static function rest_auth( $allowed, $meta_key, $post_id, $user_id, $cap, $caps ) {
		return user_can( $user_id, 'edit_post', $post_id );
	}

	/**
	 * Add post format metaboxes.
	 *
	 * @param string $post_type post type.
	 */
	public static function add_post_format_metaboxes( $post_type ) {
		// Prevent if Gutenberg enabled.
		if ( self::is_gutenberg() ) {
			return;
		}

		// Prevent if no Video post format supported.
		if ( ! post_type_supports( $post_type, 'post-formats' ) ) {
			return;
		}

		add_meta_box(
			'vp_format_video',
			esc_html__( 'Video', 'visual-portfolio' ),
			array( __CLASS__, 'add_video_format_metabox' ),
			null,
			'side',
			'default'
		);
	}

	/**
	 * Add Video Format metabox
	 *
	 * @param object $post The post object.
	 */
	public static function add_video_format_metabox( $post ) {
		wp_nonce_field( basename( __FILE__ ), 'vp_format_video_nonce' );

		$video_url   = self::get_video_format_url( $post->ID );
		$oembed_html = false;

		$wpkses_iframe = array(
			'iframe' => array(
				'src'             => array(),
				'height'          => array(),
				'width'           => array(),
				'frameborder'     => array(),
				'allowfullscreen' => array(),
			),
		);

		if ( $video_url ) {
			$oembed = visual_portfolio()->get_oembed_data( $video_url );

			if ( $oembed && isset( $oembed['html'] ) ) {
				$oembed_html = $oembed['html'];
			}
		}
		?>

		<p></p>
		<input class="vp-input" name="_vp_format_video_url" type="url" id="_vp_format_video_url" value="<?php echo esc_attr( $video_url ); ?>" placeholder="<?php echo esc_attr__( 'https://', 'visual-portfolio' ); ?>">
		<div class="vp-oembed-preview">
			<?php
			if ( $oembed_html ) {
				echo wp_kses( $oembed_html, $wpkses_iframe );
			}
			?>
		</div>
		<style>
			#vp_format_video {
				display: <?php echo has_post_format( 'video' ) ? 'block' : 'none'; ?>;
			}
		</style>
		<?php
	}

	/**
	 * Save Format metabox
	 *
	 * @param int $post_id The post ID.
	 */
	public static function save_post_format_metaboxes( $post_id ) {
		if ( ! isset( $_POST['vp_format_video_nonce'] ) ) {
			return;
		}

		if ( ! wp_verify_nonce( sanitize_key( $_POST['vp_format_video_nonce'] ), basename( __FILE__ ) ) ) {
			return;
		}

		$meta = array(
			'_vp_format_video_url',
		);

		foreach ( $meta as $item ) {
			if ( isset( $_POST[ $item ] ) ) {
				if ( is_array( $_POST[ $item ] ) ) {
					$result = array_map( 'sanitize_text_field', wp_unslash( $_POST[ $item ] ) );
				} else {
					$result = sanitize_text_field( wp_unslash( $_POST[ $item ] ) );
				}

				update_post_meta( $post_id, $item, $result );

				// remove old video meta.
				if ( '_vp_format_video_url' === $item && get_post_meta( $post_id, 'video_url', true ) ) {
					delete_post_meta( $post_id, 'video_url' );
				}
			} else {
				update_post_meta( $post_id, $item, false );
			}
		}
	}

	/**
	 * Get video format URL.
	 *
	 * @param int $post_id The post ID.
	 */
	public static function get_video_format_url( $post_id ) {
		if ( ! $post_id ) {
			$post_id = get_the_ID();
		}

		$video_url = get_post_meta( $post_id, '_vp_format_video_url', true );

		// fallback.
		if ( ! $video_url ) {
			$video_url = get_post_meta( $post_id, 'video_url', true );
		}

		return $video_url;
	}

	/**
	 * Get featured image focal point.
	 *
	 * @param int $post_id The post ID.
	 */
	public static function get_featured_image_focal_point( $post_id ) {
		if ( ! $post_id ) {
			$post_id = get_the_ID();
		}

		$focal_point = get_post_meta( $post_id, '_vp_image_focal_point', true );

		if (
			! isset( $focal_point ) ||
			empty( $focal_point ) ||
			! isset( $focal_point['x'] ) || ! isset( $focal_point['y'] ) ||
			( '0.5' === $focal_point['x'] && '0.5' === $focal_point['y'] )
		) {
			return null;
		}

		return $focal_point;
	}

	/**
	 * Update views count.
	 *
	 * @param int $post_id The post ID.
	 */
	public static function update_views_count( $post_id ) {
		if ( ! is_single() ) {
			return;
		}

		if ( ! $post_id ) {
			$post_id = get_the_ID();
		}

		$current_views = self::get_views_count( $post_id );

		update_post_meta( $post_id, '_vp_views_count', $current_views + 1 );

		// Support for https://wordpress.org/plugins/post-views-counter/ .
		if ( function_exists( 'pvc_view_post' ) ) {
			pvc_view_post( $post_id );
		}
	}

	/**
	 * Get views count.
	 *
	 * @param int $post_id The post ID.
	 */
	public static function get_views_count( $post_id ) {
		if ( ! $post_id ) {
			$post_id = get_the_ID();
		}

		// Support for https://wordpress.org/plugins/post-views-counter/ .
		if ( function_exists( 'pvc_get_post_views' ) ) {
			return pvc_get_post_views( $post_id );
		}

		$current_views = get_post_meta( $post_id, '_vp_views_count', true );

		if ( ! $current_views ) {
			$current_views = 0;
		}

		return $current_views;
	}

	/**
	 * Update reading time.
	 *
	 * @param int $post_id The post ID.
	 */
	public static function update_words_count( $post_id ) {
		if ( ! $post_id ) {
			$post_id = get_the_ID();
		}

		$current_reading_time = self::calculate_words_count( $post_id );

		update_post_meta( $post_id, '_vp_words_count', $current_reading_time );
	}

	/**
	 * Get reading time.
	 *
	 * Read time is based on the average reading speed of an adult (roughly 265 WPM).
	 * We take the total word count of a post and translate it into minutes.
	 * For posts in Chinese, Japanese and Korean, it's a function of
	 * number of characters (500 characters/min).
	 *
	 * @thanks https://help.medium.com/hc/en-us/articles/214991667-Read-time
	 *
	 * @param int $post_id The post ID.
	 */
	public static function get_reading_time( $post_id ) {
		if ( ! $post_id ) {
			$post_id = get_the_ID();
		}

		$post_words_count = get_post_meta( $post_id, '_vp_words_count', true );

		if ( ! $post_words_count ) {
			$post_words_count = self::calculate_words_count( $post_id );
		}

		$locale = get_locale();

		switch ( $locale ) {
			// zh_CN - Chinese (China)
			// zh_HK - Chinese (Hong Kong SAR China)
			// zh_SG - Chinese (Singapore)
			// zh_TW - Chinese (Taiwan)
			// ja_JP - Japanese (Japan)
			// ko_KR - Korean (South Korea).
			case 'zh_CN':
			case 'zh_HK':
			case 'zh_SG':
			case 'zh_TW':
			case 'ja_JP':
			case 'ko_KR':
				$reading_time = $post_words_count / 500;
				break;
			default:
				$reading_time = $post_words_count / 265;
				break;
		}

		// When reading time is 0, return it as `< 1` instead of `0`.
		if ( 1 > $reading_time ) {
			$reading_time = esc_html__( '< 1', 'visual-portfolio' );
		} else {
			$reading_time = ceil( $reading_time );
		}

		return $reading_time;
	}

	/**
	 * Calculate words count.
	 *
	 * @param int $post_id The post ID.
	 */
	public static function calculate_words_count( $post_id ) {
		if ( ! $post_id ) {
			$post_id = get_the_ID();
		}

		$content     = get_the_content( null, false, $post_id );
		$content     = wp_strip_all_tags( $content );
		$words_count = count( preg_split( '/\s+/', $content ) );

		return $words_count;
	}
}

Visual_Portfolio_Custom_Post_Meta::init();
