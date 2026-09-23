<?php
/**
 * Post statuses a custom query may ask for on behalf of a user.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual_Portfolio_Custom_Query_Guard
 */
class Visual_Portfolio_Custom_Query_Guard {
	/**
	 * Query vars that ask for one post, which `WP_Query` hands over without a
	 * status check when it is asked for ids.
	 *
	 * @var array
	 */
	const SINGLE_POST_VARS = array( 'p', 'page_id', 'name', 'pagename', 'attachment', 'attachment_id', 'subpost', 'subpost_id' );

	/**
	 * Visual_Portfolio_Custom_Query_Guard constructor.
	 */
	public function __construct() {
		// check the custom queries of the galleries a post is saved with.
		add_filter( 'wp_insert_post_data', array( $this, 'guard_post_content' ), 10, 2 );
	}

	/**
	 * Query arguments without the statuses the current user may not read.
	 *
	 * Read from the arguments `WP_Query` gets rather than from the text of the
	 * custom query: `parse_str()` and the sanitizing before it turn many
	 * spellings into `post_status`. A user who can read other users' private
	 * posts of every post type the query names keeps it as written. Anyone
	 * else gets the public statuses they asked for, and `inherit` when the
	 * query names attachments alone; a query that asked for none of them, or
	 * for no status at all, is given them all. A query for one post by id or
	 * slug checks no status unless it is given one.
	 *
	 * @param array $args - `WP_Query` arguments.
	 *
	 * @return array
	 */
	public static function restrict_args( $args ) {
		$types = self::get_types( $args );

		if ( self::can_read_private( $types ) ) {
			return $args;
		}

		$allowed = self::get_allowed_statuses( $types );
		$kept    = array_values( array_intersect( self::get_statuses( $args ), $allowed ) );

		$args['post_status'] = empty( $kept ) ? $allowed : $kept;

		return $args;
	}

	/**
	 * A custom query string that asks for no status the current user may not
	 * read.
	 *
	 * The query is read the way a gallery reads it when it renders, and one
	 * that would reach other statuses gets the statuses allowed to the user
	 * appended: `parse_str()` keeps the last value of a name. Everything the
	 * user wrote stays as written.
	 *
	 * @param string $query_string - custom query, as stored.
	 *
	 * @return string
	 */
	public static function restrict_query_string( $query_string ) {
		if ( ! is_string( $query_string ) || '' === trim( $query_string ) ) {
			return $query_string;
		}

		$sanitized = Visual_Portfolio_Security::sanitize_attributes( array( 'posts_custom_query' => $query_string ) );
		$vars      = array();

		parse_str( html_entity_decode( (string) ( $sanitized['posts_custom_query'] ?? '' ) ), $vars );

		// The type the custom query source falls back to.
		$vars = array_merge( array( 'post_type' => 'any' ), $vars );

		if ( empty( $vars['post_status'] ) && ! array_filter( array_intersect_key( $vars, array_flip( self::SINGLE_POST_VARS ) ) ) ) {
			return $query_string;
		}

		$asked   = self::get_statuses( $vars );
		$allowed = self::get_statuses( self::restrict_args( $vars ) );

		if ( $asked === $allowed ) {
			return $query_string;
		}

		return $query_string . '&post_status=' . implode( ',', $allowed );
	}

	/**
	 * Statuses a query names, in order.
	 *
	 * @param array $args - `WP_Query` arguments.
	 *
	 * @return string[]
	 */
	private static function get_statuses( $args ) {
		$statuses = is_array( $args['post_status'] ?? '' ) ? $args['post_status'] : explode( ',', (string) ( $args['post_status'] ?? '' ) );

		return array_values( array_filter( array_map( 'trim', $statuses ) ) );
	}

	/**
	 * Restrict the custom queries of the galleries in a post being saved.
	 *
	 * Only a save by a user is checked: an import or a command run without one
	 * is left as it is. Content that needs no change is not serialized again.
	 *
	 * @param array $data    - slashed post data about to be saved.
	 * @param array $postarr - slashed post data given to the save.
	 *
	 * @return array
	 */
	public function guard_post_content( $data, $postarr ) {
		unset( $postarr );

		if ( ! get_current_user_id() || empty( $data['post_content'] ) || false === strpos( $data['post_content'], 'wp:visual-portfolio/' ) ) {
			return $data;
		}

		$changed = false;
		$blocks  = self::restrict_blocks( parse_blocks( wp_unslash( $data['post_content'] ) ), $changed );

		if ( $changed ) {
			$data['post_content'] = wp_slash( serialize_blocks( $blocks ) );
		}

		return $data;
	}

	/**
	 * Restrict the custom queries of Gallery Loop and classic Visual Portfolio
	 * blocks, at any depth.
	 *
	 * @param array $blocks  - parsed blocks.
	 * @param bool  $changed - set when a query was changed.
	 *
	 * @return array
	 */
	private static function restrict_blocks( $blocks, &$changed ) {
		foreach ( $blocks as $index => $block ) {
			$name = $block['blockName'] ?? '';

			if ( 'visual-portfolio/loop' === $name && isset( $block['attrs']['postsQuery']['customQuery'] ) ) {
				$query = self::restrict_query_string( $block['attrs']['postsQuery']['customQuery'] );

				if ( $query !== $block['attrs']['postsQuery']['customQuery'] ) {
					$blocks[ $index ]['attrs']['postsQuery']['customQuery'] = $query;
					$changed = true;
				}
			} elseif ( 'visual-portfolio/block' === $name && isset( $block['attrs']['posts_custom_query'] ) ) {
				$query = self::restrict_query_string( $block['attrs']['posts_custom_query'] );

				if ( $query !== $block['attrs']['posts_custom_query'] ) {
					$blocks[ $index ]['attrs']['posts_custom_query'] = $query;
					$changed = true;
				}
			}

			if ( ! empty( $block['innerBlocks'] ) ) {
				$blocks[ $index ]['innerBlocks'] = self::restrict_blocks( $block['innerBlocks'], $changed );
			}
		}

		return $blocks;
	}

	/**
	 * Post types a query names.
	 *
	 * @param array $args - `WP_Query` arguments.
	 *
	 * @return string[]
	 */
	private static function get_types( $args ) {
		return array_values( array_filter( array_map( 'trim', is_array( $args['post_type'] ?? null ) ? $args['post_type'] : explode( ',', (string) ( $args['post_type'] ?? 'post' ) ) ) ) );
	}

	/**
	 * Statuses anyone may see posts of the given types in.
	 *
	 * @param string[] $types - post types.
	 *
	 * @return string[]
	 */
	private static function get_allowed_statuses( $types ) {
		$allowed = array_values( get_post_stati( array( 'public' => true ) ) );

		if ( array( 'attachment' ) === array_values( array_unique( $types ) ) ) {
			$allowed[] = 'inherit';
		}

		return $allowed;
	}

	/**
	 * Whether the current user may read other users' private posts of every
	 * given post type.
	 *
	 * @param string[] $types - post types; `any` stands for every public one.
	 *
	 * @return bool
	 */
	private static function can_read_private( $types ) {
		if ( in_array( 'any', $types, true ) ) {
			$types = get_post_types( array( 'public' => true ) );
		}

		foreach ( $types as $type ) {
			$object = get_post_type_object( $type );

			if ( ! $object || ! current_user_can( $object->cap->read_private_posts ) ) {
				return false;
			}
		}

		return ! empty( $types );
	}
}
new Visual_Portfolio_Custom_Query_Guard();
