<?php
/**
 * Terms of a gallery filter, resolved when the gallery is rendered.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual_Portfolio_Filter_Terms
 */
class Visual_Portfolio_Filter_Terms {
	/**
	 * Transient that holds the version the cached terms are keyed by.
	 *
	 * @var string
	 */
	const VERSION_KEY = 'vpf_filter_terms_version';

	/**
	 * Terms already resolved in this request, by cache key.
	 *
	 * @var array
	 */
	private static $resolved = array();

	/**
	 * Watch what changes the terms a gallery of posts has.
	 */
	public static function init() {
		add_action( 'save_post', array( __CLASS__, 'maybe_forget_for_post' ), 10, 2 );
		add_action( 'deleted_post', array( __CLASS__, 'maybe_forget_for_post' ), 10, 2 );
		add_action( 'set_object_terms', array( __CLASS__, 'maybe_forget_for_terms' ), 10, 6 );
		add_action( 'created_term', array( __CLASS__, 'maybe_forget_for_taxonomy' ), 10, 3 );
		add_action( 'edited_term', array( __CLASS__, 'maybe_forget_for_taxonomy' ), 10, 3 );
		add_action( 'delete_term', array( __CLASS__, 'maybe_forget_for_taxonomy' ), 10, 3 );
	}

	/**
	 * Terms of a gallery, in the order its filter lists them.
	 *
	 * The filter lists what the gallery holds without the filter and past the
	 * current page, so the terms do not change while a visitor clicks through
	 * them.
	 *
	 * @param array           $options  - gallery options in the legacy format.
	 * @param int|string|null $query_id - id of the loop asking, or null for the legacy parameters.
	 *
	 * @return array Terms, each with `key`, `filter`, `label`, `description`,
	 *               `count`, `taxonomy`, `id` and `parent`.
	 */
	public static function get( $options, $query_id = null ) {
		$source     = $options['content_source'] ?? '';
		$query_opts = Visual_Portfolio_Get::get_query_params( $options, true, false, $query_id );

		/** This filter is documented in classes/class-get-portfolio.php */
		$custom = apply_filters( 'vpf_custom_filter_terms', false, $query_opts, false, $options );

		if ( is_array( $custom ) ) {
			$terms = $custom['terms'] ?? array();
		} elseif ( 'images' === $source || 'social-stream' === $source ) {
			$terms = Visual_Portfolio_Get::get_images_terms( $query_opts, false )['terms'];
		} else {
			$terms = self::get_posts_terms( $query_opts );
		}

		$result = array();

		foreach ( $terms as $term ) {
			$id = (int) ( $term['id'] ?? 0 );

			$result[] = array(
				'key'         => self::get_key( $id, $term['filter'] ?? '' ),
				'filter'      => (string) ( $term['filter'] ?? '' ),
				'label'       => (string) ( $term['label'] ?? '' ),
				'description' => (string) ( $term['description'] ?? '' ),
				'count'       => (int) ( $term['count'] ?? 0 ),
				'taxonomy'    => (string) ( $term['taxonomy'] ?? '' ),
				'id'          => $id,
				'parent'      => (int) ( $term['parent'] ?? 0 ),
			);
		}

		return $result;
	}

	/**
	 * Identity of a term in a filter.
	 *
	 * A term of a taxonomy is its id, which survives a new slug. Image
	 * categories are not terms and all have id 0, so they are their slug.
	 *
	 * @param int    $id     - term id.
	 * @param string $filter - term slug.
	 *
	 * @return string
	 */
	public static function get_key( $id, $filter ) {
		return $id ? 'term:' . (int) $id : 'slug:' . $filter;
	}

	/**
	 * Terms of the posts a query returns, with how many of them each holds.
	 *
	 * Cached for visitors who are not logged in: what a logged-in user may read
	 * depends on who they are.
	 *
	 * @param array $query_opts - `WP_Query` arguments of the gallery, unpaged.
	 *
	 * @return array Terms keyed like `Visual_Portfolio_Get::get_posts_terms()`.
	 */
	private static function get_posts_terms( $query_opts ) {
		$args = array_merge(
			$query_opts,
			array(
				'fields'                 => 'ids',
				'posts_per_page'         => -1,
				'no_found_rows'          => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			)
		);

		unset( $args['paged'] );

		$taxonomies = array_values( array_filter( get_taxonomies(), array( 'Visual_Portfolio_Get', 'allow_taxonomies_for_filter' ) ) );

		if ( empty( $taxonomies ) ) {
			return array();
		}

		// The locale keeps apart the languages a translation plugin filters the
		// same query into.
		$key       = 'vpf_filter_terms_' . md5( (string) wp_json_encode( array( $args, $taxonomies, get_locale() ) ) . self::get_version() );
		$cacheable = ! is_user_logged_in();

		if ( $cacheable && isset( self::$resolved[ $key ] ) ) {
			return self::$resolved[ $key ];
		}

		if ( $cacheable ) {
			$cached = get_transient( $key );

			if ( is_array( $cached ) ) {
				self::$resolved[ $key ] = $cached;

				return $cached;
			}
		}

		$ids    = ( new WP_Query( $args ) )->posts;
		$counts = self::count_terms( $ids, $taxonomies );
		$terms  = array();

		if ( ! empty( $counts ) ) {
			// Asked by id and ordered the way `get_terms()` orders them, which is
			// where plugins that reorder terms step in.
			$found = get_terms(
				array(
					'taxonomy'               => $taxonomies,
					'include'                => array_keys( $counts ),
					'hide_empty'             => false,
					'update_term_meta_cache' => false,
				)
			);

			foreach ( is_array( $found ) ? $found : array() as $term ) {
				$terms[] = array(
					'filter'      => $term->slug,
					'label'       => $term->name,
					'description' => $term->description,
					'count'       => $counts[ $term->term_id ] ?? 0,
					'taxonomy'    => $term->taxonomy,
					'id'          => $term->term_id,
					'parent'      => $term->parent,
				);
			}
		}

		if ( $cacheable ) {
			self::$resolved[ $key ] = $terms;
			set_transient( $key, $terms, DAY_IN_SECONDS );
		}

		return $terms;
	}

	/**
	 * How many of the given posts every term of the given taxonomies holds.
	 *
	 * One grouped query instead of the terms of every post: a relationship is
	 * unique per post and term, so a count of rows is a count of posts.
	 *
	 * @param int[]    $ids        - post ids.
	 * @param string[] $taxonomies - taxonomies to count in.
	 *
	 * @return array Counts keyed by term id.
	 */
	private static function count_terms( $ids, $taxonomies ) {
		global $wpdb;

		$counts = array();

		// Chunked, so the list of ids in one query stays a sensible size.
		foreach ( array_chunk( array_map( 'intval', $ids ), 5000 ) as $chunk ) {
			$rows = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT tt.term_id, COUNT(*) AS items FROM {$wpdb->term_relationships} AS tr INNER JOIN {$wpdb->term_taxonomy} AS tt ON tt.term_taxonomy_id = tr.term_taxonomy_id WHERE tt.taxonomy IN (" . implode( ', ', array_fill( 0, count( $taxonomies ), '%s' ) ) . ') AND tr.object_id IN (' . implode( ', ', array_fill( 0, count( $chunk ), '%d' ) ) . ') GROUP BY tt.term_id',
					array_merge( $taxonomies, $chunk )
				)
			);

			foreach ( $rows as $row ) {
				$counts[ (int) $row->term_id ] = ( $counts[ (int) $row->term_id ] ?? 0 ) + (int) $row->items;
			}
		}

		return $counts;
	}

	/**
	 * Version the cached terms are keyed by.
	 *
	 * @return string
	 */
	private static function get_version() {
		$version = get_transient( self::VERSION_KEY );

		if ( ! $version ) {
			$version = self::forget();
		}

		return (string) $version;
	}

	/**
	 * Drop every cached set of terms by starting a new version.
	 *
	 * @return string The new version.
	 */
	public static function forget() {
		$version = uniqid( '', true );

		set_transient( self::VERSION_KEY, $version );
		self::$resolved = array();

		return $version;
	}

	/**
	 * Forget the cached terms when a post a gallery may show changes.
	 *
	 * @param int     $post_id - post id.
	 * @param WP_Post $post    - post.
	 */
	public static function maybe_forget_for_post( $post_id, $post = null ) {
		if ( ! $post instanceof WP_Post || 'auto-draft' === $post->post_status || ! is_post_type_viewable( $post->post_type ) ) {
			return;
		}

		self::forget();
	}

	/**
	 * Forget the cached terms when a term a filter may list is added, renamed
	 * or deleted.
	 *
	 * @param int    $term_id  - term id.
	 * @param int    $tt_id    - term taxonomy id.
	 * @param string $taxonomy - taxonomy.
	 */
	public static function maybe_forget_for_taxonomy( $term_id, $tt_id, $taxonomy ) {
		if ( Visual_Portfolio_Get::allow_taxonomies_for_filter( $taxonomy ) ) {
			self::forget();
		}
	}

	/**
	 * Forget the cached terms when the terms of a post a gallery may show change.
	 *
	 * @param int    $object_id  - object id.
	 * @param array  $terms      - terms given.
	 * @param array  $tt_ids     - term taxonomy ids set.
	 * @param string $taxonomy   - taxonomy.
	 * @param bool   $append     - whether the terms were appended.
	 * @param array  $old_tt_ids - term taxonomy ids before.
	 */
	public static function maybe_forget_for_terms( $object_id, $terms, $tt_ids, $taxonomy, $append, $old_tt_ids ) {
		$tt_ids     = array_map( 'intval', (array) $tt_ids );
		$old_tt_ids = array_map( 'intval', (array) $old_tt_ids );

		sort( $tt_ids );
		sort( $old_tt_ids );

		if ( $tt_ids === $old_tt_ids || ! Visual_Portfolio_Get::allow_taxonomies_for_filter( $taxonomy ) ) {
			return;
		}

		self::maybe_forget_for_post( $object_id, get_post( $object_id ) );
	}
}

Visual_Portfolio_Filter_Terms::init();
