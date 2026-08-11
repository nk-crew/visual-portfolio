<?php
/**
 * Block Loop.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Loop block.
 */
class Visual_Portfolio_Block_Loop {
	/**
	 * Interactivity API store of the whole loop family.
	 */
	const STORE = 'visual-portfolio/loop';

	/**
	 * Whether a loop orders randomly, keyed by its query context.
	 *
	 * Every control of a loop asks the same question, and answering it means
	 * converting the whole loop context to options.
	 *
	 * @var array
	 */
	private static $random_order_cache = array();

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'register_block' ), 11 );

		// front-end behaviour, see `gutenberg/blocks/loop/view.js`.
		add_filter( 'render_block_visual-portfolio/loop', array( $this, 'add_directives' ), 10, 2 );
	}

	/**
	 * Register Block.
	 */
	public function register_block() {
		$view_module = 'build/gutenberg/blocks/loop/view';
		$asset       = Visual_Portfolio_Assets::get_asset_file( $view_module, 'script' );

		// One module for the family: it serves the directives of the loop, of
		// every control block and of the item template.
		wp_register_script_module(
			'visual-portfolio-block-loop-view',
			visual_portfolio()->plugin_url . $view_module . '.js',
			$asset['dependencies'],
			$asset['version']
		);

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop'
		);
	}

	/**
	 * Attach the store to the loop wrapper.
	 *
	 * The saved markup is not touched - it is a static block, and changing what
	 * `save.js` produces would invalidate every loop already in a post.
	 *
	 * @param string $block_content - rendered block.
	 * @param array  $block - parsed block.
	 *
	 * @return string
	 */
	public function add_directives( $block_content, $block ) {
		$block_id = $block['attrs']['block_id'] ?? '';

		// The region id has to survive a page load for the router to find the
		// loop again. Without an id there is nothing stable to name it by, and
		// the controls stay plain links.
		if ( ! $block_content || ! $block_id ) {
			return $block_content;
		}

		$processor = new WP_HTML_Tag_Processor( $block_content );

		if ( ! $processor->next_tag() ) {
			return $block_content;
		}

		$processor->set_attribute( 'data-wp-interactive', self::STORE );
		$processor->set_attribute( 'data-wp-router-region', 'vp-loop-' . $block_id );
		$processor->set_attribute( 'data-wp-context', wp_json_encode( array( 'loopId' => $block_id ) ) );
		$processor->set_attribute( 'data-wp-class--vp-is-loading', 'state.isLoading' );

		return $processor->get_updated_html();
	}

	/**
	 * Add the random seed to a control link.
	 *
	 * A randomly ordered loop reshuffles on every request, so without the seed
	 * in the link the second page would be drawn from a different order. The
	 * seed travels in the URL, which keeps the order stable with JavaScript off
	 * as well.
	 *
	 * @param string $url - control link, unescaped.
	 * @param array  $context - block context of the control.
	 *
	 * @return string
	 */
	public static function add_random_seed( $url, $context ) {
		if ( ! $url || '#' === $url || ! self::is_random_order( $context ) ) {
			return $url;
		}

		return add_query_arg( 'vpf_random_seed', Visual_Portfolio_Get::get_random_seed(), $url );
	}

	/**
	 * Whether the loop of a control orders its items randomly.
	 *
	 * @param array $context - block context of the control.
	 *
	 * @return bool
	 */
	private static function is_random_order( $context ) {
		if ( empty( $context ) || ! is_array( $context ) ) {
			return false;
		}

		$identity  = wp_json_encode( $context );
		$cache_key = false === $identity ? '' : md5( $identity );

		if ( $cache_key && isset( self::$random_order_cache[ $cache_key ] ) ) {
			return self::$random_order_cache[ $cache_key ];
		}

		$options = Visual_Portfolio_Gutenberg::transform_context_to_attributes( $context );

		// The same pair of options `Visual_Portfolio_Get::get_query_params()`
		// checks before it seeds the order of posts and of images.
		$is_random = (
			(
				'post-based' === ( $options['content_source'] ?? '' ) &&
				'rand' === ( $options['posts_order_by'] ?? '' )
			) ||
			(
				! empty( $options['images'] ) &&
				is_array( $options['images'] ) &&
				'rand' === ( $options['images_order_by'] ?? '' )
			)
		);

		if ( $cache_key ) {
			self::$random_order_cache[ $cache_key ] = $is_random;
		}

		return $is_random;
	}
}
new Visual_Portfolio_Block_Loop();
