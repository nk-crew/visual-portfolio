<?php
/**
 * Helper function to convert legacy Visual Portfolio attributes to modern attributes and vice versa.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual_Portfolio_Convert_Attributes
 */
class Visual_Portfolio_Convert_Attributes {

	/**
	 * Attribute mapping configuration
	 *
	 * @var array
	 */
	private static $attribute_mappings = array(
		// Direct mappings (modern.key -> legacy.key).
		'direct' => array(
			'queryType' => 'content_source',
			'blockId'   => 'block_id',
		),
		// Nested mappings (modern.parent.child -> legacy.key).
		'nested' => array(
			'baseQuery.perPage'                    => 'items_count',
			'postsQuery.source'                    => 'posts_source',
			'postsQuery.postTypesSet'              => 'post_types_set',
			'postsQuery.ids'                       => 'posts_ids',
			'postsQuery.excludeIds'                => 'posts_excluded_ids',
			'postsQuery.order'                     => 'posts_order_direction',
			'postsQuery.orderBy'                   => 'posts_order_by',
			'postsQuery.offset'                    => 'posts_offset',
			'postsQuery.taxonomies'                => 'posts_taxonomies',
			'postsQuery.taxonomiesRelation'        => 'posts_taxonomies_relation',
			'postsQuery.avoidDuplicates'           => 'posts_avoid_duplicate_posts',
			'postsQuery.customQuery'               => 'posts_custom_query',
			'imagesQuery.images'                   => 'images',
			'imagesQuery.categories'               => 'image_categories',
			'imagesQuery.orderBy'                  => 'images_order_by',
			'imagesQuery.order'                    => 'images_order_direction',
			'imagesQuery.titlesSource'             => 'images_titles_source',
			'imagesQuery.descriptionsSource'       => 'images_descriptions_source',
		),
	);

	/**
	 * Value transformations for attributes that need different values
	 *
	 * @var array
	 */
	private static $value_transformations = array(
		// Modern value -> Legacy value.
		'modern_to_legacy' => array(
			'queryType' => array(
				'posts' => 'post-based',
			),
		),
		// Legacy value -> Modern value.
		'legacy_to_modern' => array(
			'content_source' => array(
				'post-based' => 'posts',
			),
		),
	);

	/**
	 * Default structures for modern attributes
	 *
	 * @var array
	 */
	private static $modern_defaults = array(
		'baseQuery'   => array(
			'perPage'  => 6,
			'maxPages' => 1,
		),
		'postsQuery'  => array(
			'source'             => 'portfolio',
			'postTypesSet'       => array( 'post' ),
			'ids'                => array(),
			'excludeIds'         => array(),
			'order'              => 'desc',
			'orderBy'            => 'post_date',
			'offset'             => 0,
			'taxonomies'         => array(),
			'taxonomiesRelation' => 'or',
			'avoidDuplicates'    => false,
			'customQuery'        => '',
		),
		'imagesQuery' => array(
			'images'             => array(),
			'categories'         => array(),
			'orderBy'            => 'default',
			'order'              => 'asc',
			'titlesSource'       => 'custom',
			'descriptionsSource' => 'custom',
		),
		'sourceQuery' => array(),
	);

	/**
	 * Get nested value from array using dot notation
	 *
	 * @param array  $data Array to search in.
	 * @param string $path  Dot notation path.
	 *
	 * @return mixed
	 */
	private static function get_nested_value( $data, $path ) {
		$keys    = explode( '.', $path );
		$current = $data;

		foreach ( $keys as $key ) {
			if ( ! isset( $current[ $key ] ) ) {
				return null;
			}
			$current = $current[ $key ];
		}

		return $current;
	}

	/**
	 * Set nested value in array using dot notation
	 *
	 * @param array  $data Array to modify.
	 * @param string $path  Dot notation path.
	 * @param mixed  $value Value to set.
	 */
	private static function set_nested_value( &$data, $path, $value ) {
		$keys = explode( '.', $path );
		$temp = &$data;

		// Navigate to the parent of the final key.
		for ( $i = 0; $i < count( $keys ) - 1; $i++ ) {
			$key = $keys[ $i ];
			if ( ! isset( $temp[ $key ] ) || ! is_array( $temp[ $key ] ) ) {
				$temp[ $key ] = array();
			}
			$temp = &$temp[ $key ];
		}

		// Set the final value.
		$final_key          = $keys[ count( $keys ) - 1 ];
		$temp[ $final_key ] = $value;
	}

	/**
	 * Convert modern attributes to legacy format
	 *
	 * @param array $modern_attributes Modern attributes array.
	 * @param bool  $include_defaults  Whether to include default structure for unset values.
	 *
	 * @return array Legacy attributes array.
	 */
	public static function modern_to_legacy( $modern_attributes, $include_defaults = false ) {
		$legacy = array();

		// Merge with defaults if include_defaults is true.
		$attributes_to_convert = $modern_attributes;
		if ( $include_defaults ) {
			// Merge one level deep, so a partially set group keeps the defaults
			// of the keys it does not carry.
			foreach ( self::$modern_defaults as $key => $default_value ) {
				$value = $modern_attributes[ $key ] ?? null;

				$attributes_to_convert[ $key ] = is_array( $value )
					? array_merge( $default_value, $value )
					: $default_value;
			}
		}

		// Handle direct mappings.
		foreach ( self::$attribute_mappings['direct'] as $modern_key => $legacy_key ) {
			if ( isset( $attributes_to_convert[ $modern_key ] ) ) {
				$value = $attributes_to_convert[ $modern_key ];

				// Apply value transformation if needed.
				if ( isset( self::$value_transformations['modern_to_legacy'][ $modern_key ] ) ) {
					$transformations = self::$value_transformations['modern_to_legacy'][ $modern_key ];
					if ( isset( $transformations[ $value ] ) ) {
						$value = $transformations[ $value ];
					}
				}

				$legacy[ $legacy_key ] = $value;
			}
		}

		// Handle nested mappings.
		foreach ( self::$attribute_mappings['nested'] as $modern_path => $legacy_key ) {
			$value = self::get_nested_value( $attributes_to_convert, $modern_path );
			if ( null !== $value ) {
				$legacy[ $legacy_key ] = $value;
			}
		}

		$query_type = $attributes_to_convert['queryType'] ?? '';

		/**
		 * Map the settings of a third-party content source to legacy options.
		 *
		 * The built-in sources own `postsQuery` and `imagesQuery`, and the maps
		 * above convert them. Everything else writes to the free-form
		 * `sourceQuery` attribute, and only the source itself knows which
		 * options its own `vpf_extend_query_args` hooks read - so it maps them
		 * here.
		 *
		 * The JS twin of this filter is the `mapToLegacy` callback of
		 * `registerLoopSource()`; both are covered by the same fixture in
		 * `tests/fixtures/loop-source-attributes.json`.
		 *
		 * @param array  $legacy       Legacy options built so far.
		 * @param string $query_type   Selected content source.
		 * @param array  $source_query Settings of the source.
		 */
		return apply_filters(
			'vpf_convert_loop_source_attributes',
			$legacy,
			$query_type,
			$attributes_to_convert['sourceQuery'] ?? array()
		);
	}

	/**
	 * Convert legacy attributes to modern format
	 *
	 * @param array $legacy_attributes Legacy attributes array.
	 * @param bool  $include_defaults  Whether to include default structure for unset values.
	 *
	 * @return array Modern attributes array.
	 */
	public static function legacy_to_modern( $legacy_attributes, $include_defaults = false ) {
		$modern = array();

		// Set default structure only if include_defaults is true.
		if ( $include_defaults ) {
			foreach ( self::$modern_defaults as $key => $default_value ) {
				$modern[ $key ] = $default_value;
			}
		}

		// Handle direct mappings (reverse).
		foreach ( self::$attribute_mappings['direct'] as $modern_key => $legacy_key ) {
			if ( isset( $legacy_attributes[ $legacy_key ] ) ) {
				$value = $legacy_attributes[ $legacy_key ];

				// Apply value transformation if needed.
				if ( isset( self::$value_transformations['legacy_to_modern'][ $legacy_key ] ) ) {
					$transformations = self::$value_transformations['legacy_to_modern'][ $legacy_key ];
					if ( isset( $transformations[ $value ] ) ) {
						$value = $transformations[ $value ];
					}
				}

				$modern[ $modern_key ] = $value;
			}
		}

		// Handle nested mappings (reverse).
		foreach ( self::$attribute_mappings['nested'] as $modern_path => $legacy_key ) {
			if ( isset( $legacy_attributes[ $legacy_key ] ) ) {
				self::set_nested_value( $modern, $modern_path, $legacy_attributes[ $legacy_key ] );
			}
		}

		return $modern;
	}
}
