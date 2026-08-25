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
	 * Query id of the loop a block belongs to.
	 *
	 * Every control resolves its state through this: with an id the loop reads
	 * and writes `vp-{id}-page|filter|sort`, so paging one gallery leaves the
	 * other galleries on the page where they are. A loop saved before the
	 * attribute existed has none, and keeps the legacy global parameters.
	 *
	 * @param array $context - block context of the control.
	 *
	 * @return int|null
	 */
	public static function get_query_id( $context ) {
		if ( empty( $context ) || ! is_array( $context ) ) {
			return null;
		}

		return Visual_Portfolio_Get::sanitize_query_id( $context['vp/queryId'] ?? null );
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
		$seed = self::get_control_random_seed( $context );

		if ( ! $url || '#' === $url || ! $seed ) {
			return $url;
		}

		return add_query_arg( 'vpf_random_seed', $seed, $url );
	}

	/**
	 * URL of one page of a loop.
	 *
	 * The controls that link to a single page ask for it here rather than
	 * through `get_pagination_links()`: that one runs `paginate_links()` and
	 * reads its markup back with a regular expression to hand out the whole set
	 * of anchors, and a block that wants one address would build and parse the
	 * lot to throw all but one of them away.
	 *
	 * @param int   $page    - page number.
	 * @param array $context - block context of the control.
	 *
	 * @return string URL, already escaped, or `#` when there is none.
	 */
	public static function get_page_url( $page, $context ) {
		$page = (int) $page;

		if ( $page < 1 ) {
			return '#';
		}

		$url = Visual_Portfolio_Get::get_pagenum_link(
			array( 'vp_page' => $page ),
			self::get_query_id( $context )
		);

		return $url ? esc_url( self::add_random_seed( $url, $context ) ) : '#';
	}

	/**
	 * Rebuild the context a loop provides, out of its saved attributes.
	 *
	 * `wp_head` runs long before any block is rendered, so whatever has to
	 * answer for a loop up there - the pagination links of the document head -
	 * resolves its context by hand. Going through the registered block type is
	 * what makes the result identical to the context the render pipeline builds
	 * further down, defaults and all, so the page count is calculated once and
	 * serves both.
	 *
	 * @param array $attributes - saved attributes of a loop block.
	 *
	 * @return array Block context, keyed the way `providesContext` names it.
	 */
	public static function get_context_from_attributes( $attributes ) {
		$block_type = WP_Block_Type_Registry::get_instance()->get_registered( 'visual-portfolio/loop' );

		if ( ! $block_type || empty( $block_type->provides_context ) ) {
			return array();
		}

		$context = array();

		foreach ( $block_type->provides_context as $key => $attribute ) {
			if ( isset( $attributes[ $attribute ] ) ) {
				$context[ $key ] = $attributes[ $attribute ];
			} elseif ( isset( $block_type->attributes[ $attribute ]['default'] ) ) {
				$context[ $key ] = $block_type->attributes[ $attribute ]['default'];
			}
		}

		return $context;
	}

	/**
	 * The random seed a control of this loop has to carry, if any.
	 *
	 * Links get it through `add_random_seed()`; a control that submits a form
	 * carries it as a hidden input instead.
	 *
	 * @param array $context - block context of the control.
	 *
	 * @return string Seed, or an empty string when the loop is not random.
	 */
	public static function get_control_random_seed( $context ) {
		return self::is_random_order( $context ) ? (string) Visual_Portfolio_Get::get_random_seed() : '';
	}

	/**
	 * The URL a control form submits to.
	 *
	 * A GET form throws away the query string of its action and replaces it with
	 * its own fields, so the action is the path alone and everything the form has
	 * to keep travels as a hidden input - see `get_preserved_inputs()`.
	 *
	 * @return string Unescaped URL.
	 */
	public static function get_form_action() {
		$parts = explode( '?', Visual_Portfolio_Get::get_current_url(), 2 );

		return $parts[0];
	}

	/**
	 * Hidden inputs that carry the rest of the URL through a form submit.
	 *
	 * A GET form sends its own fields and nothing else. Without these, sorting
	 * one gallery would send every other gallery on the page back to page one -
	 * and on a site with plain permalinks it would lose the query string the
	 * page itself is addressed by.
	 *
	 * @param array $exclude - parameter names the form writes itself.
	 * @param array $extra   - parameters to add or override, name => value.
	 *
	 * @return string
	 */
	public static function get_preserved_inputs( $exclude = array(), $extra = array() ) {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$params = isset( $_GET ) && is_array( $_GET ) ? wp_unslash( $_GET ) : array();

		foreach ( $exclude as $name ) {
			unset( $params[ $name ] );
		}

		// Assigned one by one rather than merged: a query string may name a
		// parameter `0`, and merging would renumber it into something else.
		foreach ( $extra as $name => $value ) {
			$params[ $name ] = $value;
		}

		return self::render_hidden_inputs( $params );
	}

	/**
	 * Flatten parameters into hidden inputs, arrays included.
	 *
	 * @param array  $params - parameters.
	 * @param string $prefix - name of the array these parameters came out of.
	 *
	 * @return string
	 */
	private static function render_hidden_inputs( $params, $prefix = '' ) {
		$html = '';

		foreach ( $params as $name => $value ) {
			$field = '' === $prefix ? (string) $name : $prefix . '[' . $name . ']';

			if ( is_array( $value ) ) {
				$html .= self::render_hidden_inputs( $value, $field );
				continue;
			}

			$html .= sprintf(
				'<input type="hidden" name="%1$s" value="%2$s" />',
				esc_attr( $field ),
				esc_attr( sanitize_text_field( (string) $value ) )
			);
		}

		return $html;
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
