<?php
/**
 * Where Saved Layouts are used.
 *
 * @package visual-portfolio/saved-layout-usage
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Saved_Layout_Usage
 *
 * Every saved post records the layouts it uses in two non-unique meta keys,
 * one row per layout id: the ones its Gallery Loops sync with, and the ones it
 * inserts whole through the Saved Layout block or the shortcode. Content saved
 * before this index existed is indexed once, in the background.
 *
 * Shortcodes inside page builders live in the builders' own meta and are not
 * counted.
 */
class Visual_Portfolio_Saved_Layout_Usage {
	/**
	 * Layout ids a post's loops sync with.
	 */
	const SYNCED_META = '_vpf_saved_layout_synced';

	/**
	 * Layout ids a post inserts whole.
	 */
	const INSERTED_META = '_vpf_saved_layout_inserted';

	/**
	 * Set once every post saved before the index has been indexed.
	 */
	const INDEXED_OPTION = 'vpf_saved_layout_usage_indexed';

	/**
	 * Id of the last post the index of old content reached.
	 */
	const CURSOR_OPTION = 'vpf_saved_layout_usage_cursor';

	/**
	 * Background job that indexes old content.
	 */
	const BACKFILL_HOOK = 'vpf_saved_layout_usage_backfill';

	/**
	 * Background job that detaches the loops of a deleted layout.
	 */
	const DETACH_HOOK = 'vpf_saved_layout_detach';

	/**
	 * Option prefix holding what a deleted layout looked like.
	 */
	const DETACH_OPTION = 'vpf_saved_layout_detach_';

	/**
	 * Posts handled by one background run.
	 */
	const BATCH = 50;

	/**
	 * Statuses whose posts count as using a layout.
	 */
	const COUNTED_STATUSES = array( 'publish', 'future', 'draft', 'pending', 'private' );

	/**
	 * Constructor.
	 */
	public function __construct() {
		// index.
		add_action( 'save_post', array( $this, 'index_on_save' ), 20, 2 );
		add_action( 'admin_init', array( $this, 'maybe_schedule_backfill' ) );
		add_action( self::BACKFILL_HOOK, array( __CLASS__, 'run_backfill' ) );

		// delete.
		add_action( 'before_delete_post', array( $this, 'schedule_detach' ), 10, 2 );
		add_action( self::DETACH_HOOK, array( __CLASS__, 'run_detach' ) );
	}

	/**
	 * Index a post after it is saved.
	 *
	 * @param int     $post_id - post id.
	 * @param WP_Post $post - post.
	 */
	public function index_on_save( $post_id, $post ) {
		if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}

		self::index_post( $post );
	}

	/**
	 * Replace a post's usage rows with what its content uses now.
	 *
	 * @param int|WP_Post $post - post.
	 */
	public static function index_post( $post ) {
		$post = get_post( $post );

		if ( ! $post ) {
			return;
		}

		$uses = self::find_uses( $post->post_content );

		delete_post_meta( $post->ID, self::SYNCED_META );
		delete_post_meta( $post->ID, self::INSERTED_META );

		foreach ( $uses['synced'] as $id ) {
			add_post_meta( $post->ID, self::SYNCED_META, $id );
		}

		foreach ( $uses['inserted'] as $id ) {
			add_post_meta( $post->ID, self::INSERTED_META, $id );
		}
	}

	/**
	 * Layout ids a piece of content syncs with and inserts.
	 *
	 * @param string $content - post content.
	 *
	 * @return array `[ 'synced' => int[], 'inserted' => int[] ]`.
	 */
	public static function find_uses( $content ) {
		$uses = array(
			'synced'   => array(),
			'inserted' => array(),
		);

		if ( ! $content ) {
			return $uses;
		}

		if ( has_blocks( $content ) ) {
			self::collect_block_uses( parse_blocks( $content ), $uses );
		}

		if ( false !== strpos( $content, '[visual_portfolio' ) && preg_match_all( '/' . get_shortcode_regex( array( 'visual_portfolio' ) ) . '/', $content, $matches ) ) {
			foreach ( $matches[3] as $raw_attributes ) {
				$attributes = shortcode_parse_atts( $raw_attributes );

				if ( ! empty( $attributes['id'] ) ) {
					$uses['inserted'][] = (int) $attributes['id'];
				}
			}
		}

		$uses['synced']   = array_values( array_unique( array_filter( $uses['synced'] ) ) );
		$uses['inserted'] = array_values( array_unique( array_filter( $uses['inserted'] ) ) );

		return $uses;
	}

	/**
	 * Walk blocks for layout references.
	 *
	 * @param array $blocks - parsed blocks.
	 * @param array $uses - collected ids.
	 */
	private static function collect_block_uses( $blocks, &$uses ) {
		foreach ( $blocks as $block ) {
			$name = $block['blockName'] ?? '';

			if ( 'visual-portfolio/loop' === $name && ! empty( $block['attrs']['savedLayout']['id'] ) ) {
				$uses['synced'][] = (int) $block['attrs']['savedLayout']['id'];
			}

			if ( ( 'visual-portfolio/saved' === $name || 'nk/visual-portfolio' === $name ) && ! empty( $block['attrs']['id'] ) ) {
				$uses['inserted'][] = (int) $block['attrs']['id'];
			}

			self::collect_block_uses( $block['innerBlocks'] ?? array(), $uses );
		}
	}

	/**
	 * Number of posts using each layout.
	 *
	 * @param int[] $ids - layout ids.
	 *
	 * @return array `[ id => [ 'posts' => int, 'synced' => int ] ]`.
	 */
	public static function get_counts( $ids ) {
		global $wpdb;

		$ids    = array_values( array_filter( array_map( 'intval', (array) $ids ) ) );
		$counts = array();

		foreach ( $ids as $id ) {
			$counts[ $id ] = array(
				'posts'  => 0,
				'synced' => 0,
			);
		}

		if ( ! $ids ) {
			return $counts;
		}

		$id_placeholders     = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
		$status_placeholders = implode( ',', array_fill( 0, count( self::COUNTED_STATUSES ), '%s' ) );

		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT m.meta_value AS layout_id, m.meta_key AS kind, COUNT( DISTINCT m.post_id ) AS total
				FROM {$wpdb->postmeta} m
				INNER JOIN {$wpdb->posts} p ON p.ID = m.post_id
				WHERE m.meta_key IN ( %s, %s )
				AND m.meta_value IN ( {$id_placeholders} )
				AND p.post_status IN ( {$status_placeholders} )
				GROUP BY m.meta_value, m.meta_key",
				array_merge( array( self::SYNCED_META, self::INSERTED_META ), $ids, self::COUNTED_STATUSES )
			)
		);

		$posts = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT m.meta_value AS layout_id, COUNT( DISTINCT m.post_id ) AS total
				FROM {$wpdb->postmeta} m
				INNER JOIN {$wpdb->posts} p ON p.ID = m.post_id
				WHERE m.meta_key IN ( %s, %s )
				AND m.meta_value IN ( {$id_placeholders} )
				AND p.post_status IN ( {$status_placeholders} )
				GROUP BY m.meta_value",
				array_merge( array( self::SYNCED_META, self::INSERTED_META ), $ids, self::COUNTED_STATUSES )
			)
		);
		// phpcs:enable

		foreach ( $rows as $row ) {
			if ( self::SYNCED_META === $row->kind ) {
				$counts[ (int) $row->layout_id ]['synced'] = (int) $row->total;
			}
		}

		foreach ( $posts as $row ) {
			$counts[ (int) $row->layout_id ]['posts'] = (int) $row->total;
		}

		return $counts;
	}

	/**
	 * Ids of posts of any type that record a layout, newest first.
	 *
	 * Templates, template parts and synced patterns are posts that no
	 * `post_type => 'any'` query reaches, so the rows are read directly.
	 *
	 * @param int      $id - layout id.
	 * @param string[] $meta_keys - meta keys to read.
	 * @param string[] $statuses - post statuses, every status when empty.
	 *
	 * @return int[]
	 */
	private static function get_post_ids( $id, $meta_keys, $statuses = array() ) {
		global $wpdb;

		$key_placeholders = implode( ',', array_fill( 0, count( $meta_keys ), '%s' ) );
		$status_sql       = '';
		$args             = array_merge( $meta_keys, array( (string) (int) $id ) );

		if ( $statuses ) {
			$status_sql = ' AND p.post_status IN ( ' . implode( ',', array_fill( 0, count( $statuses ), '%s' ) ) . ' )';
			$args       = array_merge( $args, $statuses );
		}

		// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		return array_map(
			'intval',
			$wpdb->get_col(
				$wpdb->prepare(
					"SELECT DISTINCT p.ID FROM {$wpdb->posts} p
					INNER JOIN {$wpdb->postmeta} m ON m.post_id = p.ID
					WHERE m.meta_key IN ( {$key_placeholders} )
					AND m.meta_value = %s
					AND p.post_type != 'revision'{$status_sql}
					ORDER BY p.post_date DESC",
					$args
				)
			)
		);
		// phpcs:enable
	}

	/**
	 * Posts using a layout, with how each uses it.
	 *
	 * @param int $id - layout id.
	 * @param int $limit - most posts to describe.
	 *
	 * @return array `total`, and `items` each with `id`, `title`, `type`, `status`, `editUrl`, `synced`, `inserted` and `changes`.
	 */
	public static function get_usage( $id, $limit = 200 ) {
		$id    = (int) $id;
		$ids   = self::get_post_ids( $id, array( self::SYNCED_META, self::INSERTED_META ), self::COUNTED_STATUSES );
		$items = array();

		foreach ( array_slice( $ids, 0, $limit ) as $post_id ) {
			$post = get_post( $post_id );

			if ( ! $post || ! current_user_can( 'read_post', $post->ID ) ) {
				continue;
			}

			$synced   = in_array( (string) $id, get_post_meta( $post->ID, self::SYNCED_META ), true );
			$inserted = in_array( (string) $id, get_post_meta( $post->ID, self::INSERTED_META ), true );
			$type     = get_post_type_object( $post->post_type );

			$items[] = array(
				'id'       => $post->ID,
				'title'    => html_entity_decode( get_the_title( $post ), ENT_QUOTES, 'UTF-8' ),
				'type'     => $type ? $type->labels->singular_name : $post->post_type,
				'status'   => $post->post_status,
				'editUrl'  => current_user_can( 'edit_post', $post->ID ) ? (string) get_edit_post_link( $post->ID, 'raw' ) : '',
				'synced'   => $synced,
				'inserted' => $inserted,
				'changes'  => $synced ? self::count_changes( $post->post_content, $id ) : 0,
			);
		}

		return array(
			'total' => count( $ids ),
			'items' => $items,
		);
	}

	/**
	 * Settings a post's loops changed from a layout.
	 *
	 * @param string $content - post content.
	 * @param int    $id - layout id.
	 *
	 * @return int
	 */
	public static function count_changes( $content, $id ) {
		$total = 0;

		self::walk_loops(
			parse_blocks( $content ),
			$id,
			function ( $loop ) use ( &$total ) {
				foreach ( Visual_Portfolio_Saved_Layouts::sanitize_overrides( $loop['attrs']['savedLayout']['overrides'] ?? array() ) as $names ) {
					$total += count( $names );
				}

				return $loop;
			}
		);

		return $total;
	}

	/**
	 * Call a function on every loop synced with a layout, replacing each loop
	 * with what it returns.
	 *
	 * @param array    $blocks - parsed blocks.
	 * @param int      $id - layout id.
	 * @param callable $callback - receives and returns a loop block.
	 *
	 * @return array
	 */
	private static function walk_loops( $blocks, $id, $callback ) {
		foreach ( $blocks as $index => $block ) {
			if ( 'visual-portfolio/loop' === ( $block['blockName'] ?? '' ) && (int) ( $block['attrs']['savedLayout']['id'] ?? 0 ) === $id ) {
				$block = call_user_func( $callback, $block );
			}

			if ( ! empty( $block['innerBlocks'] ) ) {
				$block['innerBlocks'] = self::walk_loops( $block['innerBlocks'], $id, $callback );
			}

			$blocks[ $index ] = $block;
		}

		return $blocks;
	}

	/**
	 * Start indexing old content once.
	 */
	public function maybe_schedule_backfill() {
		if ( get_option( self::INDEXED_OPTION ) || wp_next_scheduled( self::BACKFILL_HOOK ) ) {
			return;
		}

		wp_schedule_single_event( time(), self::BACKFILL_HOOK );
	}

	/**
	 * Run one batch of the background work that is still pending: the index
	 * of old content, and the detach of each layout deleted for good.
	 *
	 * Runs from the background jobs and from every library request, so the
	 * work finishes even where WP-Cron does not run.
	 */
	public static function run_pending() {
		if ( ! get_option( self::INDEXED_OPTION ) ) {
			self::run_backfill();
		}

		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$pending = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s",
				$wpdb->esc_like( self::DETACH_OPTION ) . '%'
			)
		);

		foreach ( $pending as $name ) {
			self::run_detach( (int) substr( $name, strlen( self::DETACH_OPTION ) ) );
		}
	}

	/**
	 * Index one batch of posts with content that may use a layout, after the
	 * post the previous batch stopped at, and schedule the next batch.
	 * Indexing replaces a post's rows, so a batch run twice leaves the same
	 * rows.
	 *
	 * @return bool Whether posts are left for another batch.
	 */
	public static function run_backfill() {
		global $wpdb;

		$after = (int) get_option( self::CURSOR_OPTION, 0 );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$ids = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT ID FROM {$wpdb->posts}
				WHERE ID > %d
				AND post_type NOT IN ( 'revision', 'attachment' )
				AND ( post_content LIKE %s OR post_content LIKE %s OR post_content LIKE %s OR post_content LIKE %s )
				ORDER BY ID ASC
				LIMIT %d",
				$after,
				'%' . $wpdb->esc_like( 'wp:visual-portfolio/saved' ) . '%',
				'%' . $wpdb->esc_like( 'wp:nk/visual-portfolio' ) . '%',
				'%' . $wpdb->esc_like( '"savedLayout"' ) . '%',
				'%' . $wpdb->esc_like( '[visual_portfolio' ) . '%',
				self::BATCH
			)
		);

		foreach ( $ids as $id ) {
			self::index_post( (int) $id );
		}

		if ( count( $ids ) < self::BATCH ) {
			update_option( self::INDEXED_OPTION, true, false );
			delete_option( self::CURSOR_OPTION );

			return false;
		}

		update_option( self::CURSOR_OPTION, (int) end( $ids ), false );

		if ( ! wp_next_scheduled( self::BACKFILL_HOOK ) ) {
			wp_schedule_single_event( time(), self::BACKFILL_HOOK );
		}

		return true;
	}

	/**
	 * Before a block-based layout is deleted for good, remember what it looks
	 * like and detach the loops synced with it in the background.
	 *
	 * @param int     $post_id - post id.
	 * @param WP_Post $post - post.
	 */
	public function schedule_detach( $post_id, $post ) {
		if ( Visual_Portfolio_Saved_Layouts::POST_TYPE !== $post->post_type ) {
			return;
		}

		$layout = Visual_Portfolio_Saved_Layouts::get_layout_loop( $post_id );

		if ( ! $layout ) {
			return;
		}

		update_option(
			self::DETACH_OPTION . $post_id,
			array(
				'layout' => $layout,
				'locked' => Visual_Portfolio_Saved_Layouts::is_locked( $post_id ),
			),
			false
		);

		// The first batch runs now, the rest in the background.
		self::run_detach( (int) $post_id );
	}

	/**
	 * Detach one batch of loops synced with a deleted layout, writing into
	 * each the values it rendered with. Each post is saved through
	 * `wp_update_post()`, so a revision keeps what it held before.
	 *
	 * A detached loop no longer references the layout, so a rerun finds only
	 * the posts not done yet.
	 *
	 * @param int $id - deleted layout id.
	 *
	 * @return bool Whether loops are left for another run.
	 */
	public static function run_detach( $id ) {
		$id       = (int) $id;
		$snapshot = get_option( self::DETACH_OPTION . $id );

		if ( ! is_array( $snapshot ) || empty( $snapshot['layout'] ) ) {
			return false;
		}

		$post_ids = array_slice( self::get_post_ids( $id, array( self::SYNCED_META ) ), 0, self::BATCH );

		// The content is the site's own and is written back unchanged apart
		// from the loops, so it does not pass through the HTML filter a
		// background run without a user would apply to it.
		$kses = has_filter( 'content_save_pre', 'wp_filter_post_kses' );

		if ( $kses ) {
			kses_remove_filters();
		}

		try {
			foreach ( $post_ids as $post_id ) {
				$post   = get_post( $post_id );
				$blocks = self::walk_loops(
					parse_blocks( $post->post_content ),
					$id,
					function ( $loop ) use ( $snapshot ) {
						return self::detach_loop( $loop, $snapshot['layout'], ! empty( $snapshot['locked'] ) );
					}
				);

				wp_update_post(
					wp_slash(
						array(
							'ID'           => $post_id,
							'post_content' => serialize_blocks( $blocks ),
						)
					)
				);

				// A post `save_post` does not index, such as a template, still
				// drops its row here.
				delete_post_meta( $post_id, self::SYNCED_META, $id );
			}
		} finally {
			if ( $kses ) {
				kses_init_filters();
			}
		}

		if ( count( $post_ids ) < self::BATCH ) {
			delete_option( self::DETACH_OPTION . $id );

			return false;
		}

		if ( ! wp_next_scheduled( self::DETACH_HOOK, array( $id ) ) ) {
			wp_schedule_single_event( time(), self::DETACH_HOOK, array( $id ) );
		}

		return true;
	}

	/**
	 * A synced loop turned into a loop of its own with the same look.
	 *
	 * @param array $loop - parsed loop block.
	 * @param array $layout - the layout's loop block.
	 * @param bool  $locked - whether the layout was locked.
	 *
	 * @return array
	 */
	public static function detach_loop( $loop, $layout, $locked ) {
		$loop = Visual_Portfolio_Saved_Layouts::apply_layout( $loop, $layout, $locked );

		unset( $loop['attrs']['savedLayout'] );

		return $loop;
	}
}

new Visual_Portfolio_Saved_Layout_Usage();
