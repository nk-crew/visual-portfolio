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
		$types = array_filter( array_map( 'trim', is_array( $args['post_type'] ?? null ) ? $args['post_type'] : explode( ',', (string) ( $args['post_type'] ?? 'post' ) ) ) );

		if ( self::can_read_private( $types ) ) {
			return $args;
		}

		$allowed = array_values( get_post_stati( array( 'public' => true ) ) );

		if ( array( 'attachment' ) === array_values( array_unique( $types ) ) ) {
			$allowed[] = 'inherit';
		}

		$asked = array_map( 'trim', is_array( $args['post_status'] ?? '' ) ? $args['post_status'] : explode( ',', (string) ( $args['post_status'] ?? '' ) ) );
		$kept  = array_values( array_intersect( $asked, $allowed ) );

		$args['post_status'] = empty( $kept ) ? $allowed : $kept;

		return $args;
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
