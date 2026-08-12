<?php
/**
 * Tiles notation parser.
 *
 * @package visual-portfolio/tiles
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Turns the tiles notation into CSS Grid.
 *
 * The notation is the one the legacy Tiles layout has always used and the one
 * the `vpf_extend_tiles` presets are written in:
 *
 *     3|1,1|2,0.5|
 *     ^  ^   ^
 *     |  |   `- the tiles of the repeating pattern: width,height
 *     |  `----- first tile: one column wide, as tall as it is wide
 *     `-------- three columns
 *
 * Width is counted in columns and height is a multiple of the tile's own width,
 * exactly as the legacy layout read them - the old JavaScript set
 * `width: w * 100 / columns%` and `padding-top: h * 100%`. The pattern repeats
 * for as many items as the loop resolved.
 *
 * The class is a pure function of that string: no WordPress, no block, no
 * options. That is what lets the whole preset catalogue be covered by unit
 * tests, which is the only way a notation with this much history stays honest.
 */
class Visual_Portfolio_Tiles_Parser {
	/**
	 * The notation used when nothing was saved, or when what was saved is unusable.
	 */
	const DEFAULT_TILES = '3|1,1|';

	/**
	 * Widest grid the columns control offers.
	 */
	const MAX_COLUMNS = 6;

	/**
	 * Longest pattern accepted.
	 *
	 * A pattern is repeated over every item, so its length is the number of
	 * generated rules. The longest preset shipped is ten tiles; the cap is only
	 * here so that a hand written string cannot turn into a stylesheet.
	 */
	const MAX_TILES = 24;

	/**
	 * Tallest tile, in rows.
	 *
	 * Row spans place a tile, they do not size it - the height comes from
	 * `aspect-ratio`. A span beyond this means the notation mixed heights that
	 * have no useful common measure, and packing them is not worth hundreds of
	 * row tracks.
	 */
	const MAX_ROW_SPAN = 6;

	/**
	 * Read a tiles string.
	 *
	 * Mirrors the legacy reader (`getTilesSettings()` in `assets/js/layout-tiles.js`)
	 * including its forgiving parts: `:` is accepted next to `|` as a separator,
	 * trailing empties are dropped, and a segment that is not a number falls
	 * back to 1 rather than failing the whole string.
	 *
	 * @param string $tiles - tiles notation.
	 *
	 * @return array {
	 *     @type int   $columns Number of columns.
	 *     @type array $tiles   Tiles of the pattern, each with `width` (columns),
	 *                          `height` (multiple of its own width) and `row_span`.
	 * }
	 */
	public static function parse( $tiles ) {
		$segments = preg_split( '/[:|]/', is_string( $tiles ) ? $tiles : '' );

		// The notation ends with a separator, so the split always leaves an
		// empty tail. Anything else empty in the middle is a typo, not a tile.
		$segments = array_values(
			array_filter(
				$segments,
				function ( $segment ) {
					return '' !== trim( $segment );
				}
			)
		);

		$columns = empty( $segments ) ? 0 : (int) array_shift( $segments );
		$columns = max( 1, min( self::MAX_COLUMNS, $columns ) );

		$parsed = array();

		foreach ( array_slice( $segments, 0, self::MAX_TILES ) as $segment ) {
			$size = explode( ',', $segment );

			// A tile wider than the grid used to simply overflow it. Grid has a
			// place to put the overflow - the implicit columns - and putting it
			// there would silently widen every row, so the tile is clamped.
			$width  = min( $columns, max( 1, (int) round( self::to_float( isset( $size[0] ) ? $size[0] : '', 1 ) ) ) );
			$height = self::to_float( isset( $size[1] ) ? $size[1] : '', 1 );

			$parsed[] = array(
				'width'  => $width,
				'height' => $height,
			);
		}

		// A string that names only its columns is a grid of squares.
		if ( empty( $parsed ) ) {
			$parsed[] = array(
				'width'  => 1,
				'height' => 1.0,
			);
		}

		return array(
			'columns' => $columns,
			'tiles'   => self::add_row_spans( $parsed ),
		);
	}

	/**
	 * CSS of a tiles pattern.
	 *
	 * One rule per tile, selected by position in the repeating pattern. The
	 * pattern length is the nth-child period, so item 7 of a six tile pattern is
	 * matched by the same rule as item 1 - which is what makes the notation
	 * describe a pattern rather than a fixed number of items.
	 *
	 * The columns of the pattern are not here: they are the layout's columns,
	 * they change with the viewport, and they live where every other layout
	 * keeps them - in `--vp-layout-columns` on the list.
	 *
	 * @param string $tiles    - tiles notation.
	 * @param string $selector - selector of the list the rules are scoped to.
	 *
	 * @return string
	 */
	public static function to_css( $tiles, $selector ) {
		$parsed = self::parse( $tiles );
		$period = count( $parsed['tiles'] );
		$rules  = array();

		foreach ( $parsed['tiles'] as $index => $tile ) {
			$declarations = array(
				sprintf( 'grid-column:span %d', $tile['width'] ),
				sprintf( 'grid-row:span %d', $tile['row_span'] ),

				// How tall the tile is, counted in columns - `height` times its
				// own width, whether it spans one column or three. The
				// stylesheet turns it into a height, which is what makes a tile
				// the size its notation says however tall the blocks inside it
				// are.
				//
				// Not an `aspect-ratio`, which is what the notation reads like:
				// a grid item with a ratio and a resolved height takes its width
				// from the ratio too, and a half height tile would come out a
				// column short of the cells it was placed in.
				sprintf( '--vp-tile-rows:%s', self::to_css_number( $tile['height'] * $tile['width'] ) ),
			);

			$rules[] = sprintf(
				'%1$s>%2$s{%3$s;}',
				$selector,
				// A pattern of one tile describes every item, and nth-child
				// would only make the rule harder to read.
				$period > 1 ? sprintf( ':nth-child(%1$dn+%2$d)', $period, $index + 1 ) : '*',
				implode( ';', $declarations )
			);
		}

		return implode( '', $rules );
	}

	/**
	 * Class that scopes the rules of a tiles pattern.
	 *
	 * Derived from what the notation means rather than from how it was typed, so
	 * two galleries that describe the same pattern share one rule set.
	 *
	 * @param string $tiles - tiles notation.
	 *
	 * @return string
	 */
	public static function get_class( $tiles ) {
		$parsed = self::parse( $tiles );

		return 'vp-tiles-' . substr( md5( wp_json_encode( $parsed ) ), 0, 10 );
	}

	/**
	 * Place every tile on a row grid.
	 *
	 * Heights in the notation are arbitrary multiples, and grid rows are whole
	 * tracks, so the pattern needs a unit. The shortest tile is that unit: it
	 * makes at least one tile exact, keeps every other span small, and never
	 * turns a pattern into hundreds of tracks. Rounding a span never changes how
	 * tall a tile looks - `aspect-ratio` decides that - only which cells it
	 * claims, so a rounded span shows up as neighbours packing differently.
	 *
	 * @param array $tiles - parsed tiles.
	 *
	 * @return array
	 */
	private static function add_row_spans( $tiles ) {
		$unit = self::get_row_unit( $tiles );

		foreach ( $tiles as $index => $tile ) {
			$span = $unit > 0 ? (int) round( ( $tile['height'] * $tile['width'] ) / $unit ) : 1;

			$tiles[ $index ]['row_span'] = max( 1, min( self::MAX_ROW_SPAN, $span ) );
		}

		return $tiles;
	}

	/**
	 * Height of one row of a pattern, in column widths.
	 *
	 * A tile is `width` columns wide and `height` times that tall, so the
	 * shortest tile of the pattern is the finest row every other tile is a whole
	 * number of.
	 *
	 * @param array $tiles - parsed tiles.
	 *
	 * @return float
	 */
	private static function get_row_unit( $tiles ) {
		$heights = array();

		foreach ( $tiles as $tile ) {
			$heights[] = $tile['height'] * $tile['width'];
		}

		return min( $heights );
	}

	/**
	 * Positive number out of a notation segment.
	 *
	 * @param string $value    - raw segment.
	 * @param float  $fallback - value for a segment that names no number.
	 *
	 * @return float
	 */
	private static function to_float( $value, $fallback ) {
		$value = is_numeric( trim( (string) $value ) ) ? (float) $value : 0;

		return $value > 0 ? $value : (float) $fallback;
	}

	/**
	 * Number as CSS spells it.
	 *
	 * `number_format` is used rather than string casting because the locale
	 * decides what a cast makes of a float, and a comma would break the rule.
	 *
	 * @param float $value - number.
	 *
	 * @return string
	 */
	private static function to_css_number( $value ) {
		$formatted = number_format( (float) $value, 4, '.', '' );

		// Trailing zeros are noise in a stylesheet, and 1.0000 is 1.
		$formatted = rtrim( $formatted, '0' );

		return rtrim( $formatted, '.' );
	}
}
