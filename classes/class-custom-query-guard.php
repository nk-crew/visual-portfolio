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
	 * A custom query string without the statuses the current user may not read.
	 *
	 * A user who can read other users' private posts of every post type the
	 * query names keeps the query as written. Anyone else keeps the public
	 * statuses, and `inherit` when the query names attachments alone. Only the
	 * `post_status` pairs change; a pair left with nothing is dropped, so the
	 * query falls back to published posts.
	 *
	 * @param string $query_string - custom query, as the Custom Query field holds it.
	 *
	 * @return string
	 */
	public static function restrict( $query_string ) {
		if ( ! is_string( $query_string ) || false === stripos( $query_string, 'post_status' ) ) {
			return $query_string;
		}

		// Decoded the way `Visual_Portfolio_Get::get_query_params()` reads it.
		$decoded = html_entity_decode( $query_string );
		$vars    = array();

		parse_str( $decoded, $vars );

		$types = isset( $vars['post_type'] ) ? (array) $vars['post_type'] : array( 'any' );
		$types = array_filter( array_map( 'trim', explode( ',', implode( ',', $types ) ) ) );

		if ( self::can_read_private( $types ) ) {
			return $query_string;
		}

		$allowed = get_post_stati( array( 'public' => true ) );

		if ( array( 'attachment' ) === array_values( array_unique( $types ) ) ) {
			$allowed[] = 'inherit';
		}

		$pairs   = array();
		$changed = false;

		foreach ( explode( '&', $decoded ) as $pair ) {
			$parts = explode( '=', $pair, 2 );
			$name  = urldecode( $parts[0] );

			if ( 'post_status' !== $name && 0 !== strpos( $name, 'post_status[' ) ) {
				$pairs[] = $pair;
				continue;
			}

			$asked = array_map( 'trim', explode( ',', urldecode( $parts[1] ?? '' ) ) );
			$kept  = array_intersect( $asked, $allowed );

			if ( $kept !== $asked ) {
				$changed = true;
			}

			if ( ! empty( $kept ) ) {
				$pairs[] = $parts[0] . '=' . implode( ',', $kept );
			}
		}

		return $changed ? implode( '&', $pairs ) : $query_string;
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
