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
	 * Post ids counted in one query. Past this the list of ids is split, which
	 * keeps a query under the packet size of an old MySQL.
	 *
	 * @var int
	 */
	const IDS_PER_QUERY = 100000;

	/**
	 * Terms already resolved in this request, by cache key.
	 *
	 * @var array
	 */
	private static $resolved = array();

	/**
	 * Visual_Portfolio_Filter_Terms constructor.
	 */
	public function __construct() {
		// forget the cached terms when what a visitor can see changes.
		add_action( 'transition_post_status', array( __CLASS__, 'maybe_forget_for_status' ), 10, 3 );
		add_action( 'deleted_post', array( __CLASS__, 'maybe_forget_for_post' ), 10, 2 );
		add_action( 'set_object_terms', array( __CLASS__, 'maybe_forget_for_terms' ), 10, 6 );
		add_action( 'deleted_term_relationships', array( __CLASS__, 'maybe_forget_for_removed_terms' ) );
		add_action( 'edited_term', array( __CLASS__, 'forget' ) );
		add_action( 'delete_term', array( __CLASS__, 'forget' ) );
	}

	/**
	 * Terms of a gallery, in the order its filter lists them.
	 *
	 * The filter lists what the gallery holds without the filter and past the
	 * current page, so the terms do not change while a visitor clicks through
	 * them.
	 *
	 * @param array           $atts     - gallery options in the legacy format.
	 * @param int|string|null $query_id - id of the loop asking, or null for the legacy parameters.
	 *
	 * @return array Terms, each with `key`, `filter`, `label`, `description`,
	 *               `count`, `taxonomy`, `id` and `parent`.
	 */
	public static function get( $atts, $query_id = null ) {
		// Resolved the way the items of the gallery are, so both run one query.
		$options = Visual_Portfolio_Get::get_options( $atts );

		if ( ! $options || empty( $options['content_source'] ) ) {
			return array();
		}

		$source     = $options['content_source'];
		$query_opts = Visual_Portfolio_Get::get_query_params( $options, true, false, $query_id );

		/** This filter is documented in classes/class-get-portfolio.php */
		$custom = apply_filters( 'vpf_custom_filter_terms', false, $query_opts, false, $options );

		if ( is_array( $custom ) ) {
			$terms = $custom['terms'] ?? array();
		} elseif ( 'images' === $source || 'social-stream' === $source ) {
			// A social source that has not fetched anything has no images yet.
			$terms = isset( $query_opts['images'] ) ? Visual_Portfolio_Get::get_images_terms( $query_opts, false )['terms'] : array();
		} else {
			// A gallery of the current query on a search page is keyed by what
			// the visitor typed, which is too many keys to keep.
			$terms = self::get_posts_terms( $query_opts, ! ( is_search() && 'current_query' === ( $options['posts_source'] ?? '' ) ) );
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
	 * A viewer who reads nothing but public posts gets the public answer, which
	 * is cached and shared. Only a viewer who can read other users' private
	 * posts is counted on every render.
	 *
	 * @param array $query_opts - `WP_Query` arguments of the gallery, unpaged.
	 * @param bool  $shareable  - whether the answer may be cached at all.
	 *
	 * @return array Terms keyed like `Visual_Portfolio_Get::get_posts_terms()`.
	 */
	private static function get_posts_terms( $query_opts, $shareable ) {
		// The order and the paging do not change which posts there are, and a
		// random order would give every request a key of its own.
		$args = array_merge(
			$query_opts,
			array(
				'fields'                 => 'ids',
				'posts_per_page'         => -1,
				'orderby'                => 'none',
				'no_found_rows'          => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			)
		);

		unset( $args['paged'], $args['offset'], $args['order'] );

		$taxonomies = array_values( array_filter( get_taxonomies(), array( 'Visual_Portfolio_Get', 'allow_taxonomies_for_filter' ) ) );

		if ( empty( $taxonomies ) ) {
			return array();
		}

		$cacheable = $shareable && ! self::reads_private_posts( $args );

		// Without statuses of its own the query shows a logged-in user their own
		// private posts as well, which the shared answer must not carry.
		if ( $cacheable && empty( $args['post_status'] ) ) {
			$args['post_status'] = array_values( get_post_stati( array( 'public' => true ) ) );

			if ( in_array( 'attachment', (array) ( $args['post_type'] ?? array() ), true ) ) {
				$args['post_status'][] = 'inherit';
			}
		}

		// The locale keeps apart the languages a translation plugin filters the
		// same query into.
		$key = 'vpf_filter_terms_' . md5( (string) wp_json_encode( array( $args, $taxonomies, get_locale() ) ) . self::get_version() );

		if ( $cacheable ) {
			if ( isset( self::$resolved[ $key ] ) ) {
				return self::$resolved[ $key ];
			}

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
	 * Whether the current user would see other users' private posts in a query
	 * that names no statuses of its own.
	 *
	 * @param array $args - `WP_Query` arguments.
	 *
	 * @return bool
	 */
	private static function reads_private_posts( $args ) {
		if ( ! is_user_logged_in() || ! empty( $args['post_status'] ) ) {
			return false;
		}

		$types = (array) ( $args['post_type'] ?? 'post' );

		if ( in_array( 'any', $types, true ) ) {
			$types = get_post_types( array( 'exclude_from_search' => false ) );
		}

		foreach ( $types as $type ) {
			$object = get_post_type_object( $type );

			if ( $object && current_user_can( $object->cap->read_private_posts ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * How many of the given posts every term of the given taxonomies holds.
	 *
	 * One grouped query instead of the terms of every post: a relationship is
	 * unique per post and term, so a count of rows is a count of posts. The
	 * database reads the relationships of the taxonomies once per query, so the
	 * ids go in as few queries as the packet size allows.
	 *
	 * @param int[]    $ids        - post ids.
	 * @param string[] $taxonomies - taxonomies to count in.
	 *
	 * @return array Counts keyed by term id.
	 */
	private static function count_terms( $ids, $taxonomies ) {
		global $wpdb;

		$counts = array();

		foreach ( array_chunk( array_map( 'intval', $ids ), self::IDS_PER_QUERY ) as $chunk ) {
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
	 * Whether a post is one a visitor sees in a gallery.
	 *
	 * @param WP_Post|null $post   - post.
	 * @param string       $status - status to judge it by, its own by default.
	 *
	 * @return bool
	 */
	private static function is_public( $post, $status = '' ) {
		if ( ! $post instanceof WP_Post ) {
			return false;
		}

		$type   = get_post_type_object( $post->post_type );
		$status = get_post_status_object( $status ? $status : $post->post_status );

		return $type && ( $type->public || $type->publicly_queryable ) && $status && $status->public;
	}

	/**
	 * Forget the cached terms when a post comes into or leaves the public view.
	 *
	 * Saving a draft, or editing a published post, changes nothing a visitor
	 * sees in a filter; a changed term of a published post is caught below.
	 *
	 * @param string  $new_status - new status.
	 * @param string  $old_status - old status.
	 * @param WP_Post $post       - post.
	 */
	public static function maybe_forget_for_status( $new_status, $old_status, $post ) {
		if ( self::is_public( $post, $new_status ) !== self::is_public( $post, $old_status ) ) {
			self::forget();
		}
	}

	/**
	 * Forget the cached terms when a public post is deleted outright.
	 *
	 * @param int     $post_id - post id.
	 * @param WP_Post $post    - post.
	 */
	public static function maybe_forget_for_post( $post_id, $post = null ) {
		if ( self::is_public( $post ) ) {
			self::forget();
		}
	}

	/**
	 * Forget the cached terms when the terms of a public post change.
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

		if ( $tt_ids !== $old_tt_ids ) {
			self::maybe_forget_for_removed_terms( $object_id );
		}
	}

	/**
	 * Forget the cached terms when terms are taken off a public post.
	 *
	 * @param int $object_id - object id.
	 */
	public static function maybe_forget_for_removed_terms( $object_id ) {
		if ( self::is_public( get_post( $object_id ) ) ) {
			self::forget();
		}
	}
}
new Visual_Portfolio_Filter_Terms();
