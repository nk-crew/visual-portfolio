<?php
/**
 * Tests for Visual_Portfolio_Tiles_Parser
 *
 * @package Visual Portfolio
 */

/**
 * Tiles parser test case.
 */
class ClassTilesParser extends WP_UnitTestCase {
	/**
	 * Every tiles preset the legacy layout ships.
	 *
	 * Copied out of the `tiles_selector` control in `classes/class-admin.php`.
	 * The block layout and the legacy layout have to read the same notation the
	 * same way, and a preset that stops parsing is a gallery that stops looking
	 * like the picture the user picked it from.
	 *
	 * @return array
	 */
	private function get_legacy_presets() {
		return array(
			'1|1,0.5|',
			'2|1,1|',
			'2|1,0.8|',
			'2|1,1.34|',
			'2|1,1.2|1,1.2|1,0.67|1,0.67|',
			'2|1,1.2|1,0.67|1,1.2|1,0.67|',
			'2|1,0.67|1,1|1,1|1,1|1,1|1,0.67|',
			'3|1,1|',
			'3|1,0.8|',
			'3|1,1.3|',
			'3|1,1|1,1|1,1|1,1.3|1,1.3|1,1.3|',
			'3|1,1|1,1|1,2|1,1|1,1|1,1|1,1|1,1|',
			'3|1,2|1,1|1,1|1,1|1,1|1,1|1,1|1,1|',
			'3|1,1|1,2|1,1|1,1|1,1|1,1|1,1|1,1|',
			'3|1,1|1,2|1,1|1,1|1,1|1,1|2,0.5|',
			'3|1,0.8|1,1.6|1,0.8|1,0.8|1,1.6|1,0.8|1,0.8|1,0.8|1,0.8|1,0.8|',
			'3|1,0.8|1,1.6|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|1,0.8|1,0.8|',
			'3|1,0.8|1,0.8|1,1.6|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|1,0.8|',
			'3|1,0.8|1,0.8|1,1.6|1,0.8|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|',
			'3|1,1|2,1|1,1|2,0.5|1,1|',
			'3|1,1|2,1|1,1|1,1|1,1|1,1|2,0.5|1,1|',
			'3|1,2|2,0.5|1,1|1,2|2,0.5|',
			'4|1,1|',
			'4|1,1|1,1.34|1,1|1,1.34|1,1.34|1,1.34|1,1|1,1|',
			'4|1,0.8|1,1|1,0.8|1,1|1,1|1,1|1,0.8|1,0.8|',
			'4|1,1|1,1|2,1|1,1|1,1|2,1|1,1|1,1|1,1|1,1|',
			'4|2,1|2,0.5|2,0.5|2,0.5|2,1|2,0.5|',
		);
	}

	/**
	 * The notation as the legacy front end reads it.
	 *
	 * A second implementation of the same string, written from the legacy
	 * JavaScript rather than from the parser, so the assertion below compares
	 * two readings instead of the parser with itself.
	 *
	 * @param string $tiles - tiles notation.
	 *
	 * @return array `[ columns, [ [ width, height ], ... ] ]`.
	 */
	private function read_like_legacy( $tiles ) {
		$parts = preg_split( '/[:|]/', $tiles );

		if ( '' === end( $parts ) ) {
			array_pop( $parts );
		}

		$columns = (int) array_shift( $parts );
		$sizes   = array();

		foreach ( $parts as $part ) {
			$size = explode( ',', $part );

			$sizes[] = array(
				(float) $size[0] ? (float) $size[0] : 1.0,
				(float) $size[1] ? (float) $size[1] : 1.0,
			);
		}

		return array( $columns ? $columns : 1, $sizes );
	}

	/**
	 * Every preset survives the trip, with the columns and sizes it was written with.
	 *
	 * @return void
	 */
	public function test_parses_every_legacy_preset() {
		foreach ( $this->get_legacy_presets() as $preset ) {
			list( $columns, $sizes ) = $this->read_like_legacy( $preset );

			$parsed = Visual_Portfolio_Tiles_Parser::parse( $preset );

			$this->assertSame( $columns, $parsed['columns'], "Columns of $preset" );
			$this->assertCount( count( $sizes ), $parsed['tiles'], "Tile count of $preset" );

			foreach ( $sizes as $index => $size ) {
				$this->assertSame(
					(int) $size[0],
					$parsed['tiles'][ $index ]['width'],
					"Width of tile $index in $preset"
				);
				$this->assertSame(
					$size[1],
					$parsed['tiles'][ $index ]['height'],
					"Height of tile $index in $preset"
				);
			}
		}
	}

	/**
	 * No preset needs a row grid finer than the packing is worth.
	 *
	 * The row unit is the shortest tile of the pattern, so a preset that mixes
	 * heights with no common measure would show up here as a tall span.
	 *
	 * @return void
	 */
	public function test_legacy_presets_keep_small_row_spans() {
		foreach ( $this->get_legacy_presets() as $preset ) {
			$parsed = Visual_Portfolio_Tiles_Parser::parse( $preset );

			foreach ( $parsed['tiles'] as $index => $tile ) {
				$this->assertLessThanOrEqual(
					2,
					$tile['row_span'],
					"Row span of tile $index in $preset"
				);
			}
		}
	}

	/**
	 * Every preset produces a rule per tile, and one selector per gallery.
	 *
	 * @return void
	 */
	public function test_every_legacy_preset_produces_css() {
		foreach ( $this->get_legacy_presets() as $preset ) {
			$parsed = Visual_Portfolio_Tiles_Parser::parse( $preset );
			$css    = Visual_Portfolio_Tiles_Parser::to_css( $preset, '.vp-test' );
			$period = count( $parsed['tiles'] );

			$this->assertSame(
				$period,
				substr_count( $css, '.vp-test' ),
				"Rule count of $preset"
			);
			$this->assertStringNotContainsString( ',', $css, "Decimal separator of $preset" );

			foreach ( $parsed['tiles'] as $index => $tile ) {
				$selector = $period > 1
					? sprintf( '.vp-test>:nth-child(%1$dn+%2$d)', $period, $index + 1 )
					: '.vp-test>*';

				$this->assertStringContainsString(
					sprintf(
						'%1$s{grid-column:span %2$d;grid-row:span %3$d;',
						$selector,
						$tile['width'],
						$tile['row_span']
					),
					$css,
					"Rule of tile $index in $preset"
				);
			}
		}
	}

	/**
	 * A number reaches CSS the way CSS spells one.
	 *
	 * @return void
	 */
	public function test_numbers_are_written_the_way_css_reads_them() {
		$css = Visual_Portfolio_Tiles_Parser::to_css( '3|1,0.5|2,1.34|', '.vp-test' );

		$this->assertStringContainsString( '--vp-tile-rows:0.5;', $css );
		$this->assertStringContainsString( '--vp-tile-rows:2.68;', $css );

		// A whole number stays whole - `1.0000` is noise in a stylesheet.
		$this->assertStringContainsString(
			'--vp-tile-rows:1;',
			Visual_Portfolio_Tiles_Parser::to_css( '3|1,1|', '.vp-test' )
		);
	}

	/**
	 * A tile twice as tall as the shortest one claims two rows.
	 *
	 * @return void
	 */
	public function test_row_spans_follow_the_shortest_tile() {
		$parsed = Visual_Portfolio_Tiles_Parser::parse( '3|1,0.8|1,1.6|1,0.8|' );

		$this->assertSame(
			array( 1, 2, 1 ),
			wp_list_pluck( $parsed['tiles'], 'row_span' )
		);

		// Width counts too: a two column tile of the same height is twice the box.
		$parsed = Visual_Portfolio_Tiles_Parser::parse( '3|1,1|2,1|' );

		$this->assertSame(
			array( 1, 2 ),
			wp_list_pluck( $parsed['tiles'], 'row_span' )
		);
	}

	/**
	 * A single tile describes every item, without an nth-child period.
	 *
	 * @return void
	 */
	public function test_single_tile_pattern_matches_every_item() {
		$css = Visual_Portfolio_Tiles_Parser::to_css( '4|1,1|', '.vp-test' );

		$this->assertStringContainsString( '.vp-test>*{grid-column:span 1', $css );
		$this->assertStringNotContainsString( 'nth-child', $css );
	}

	/**
	 * The columns of the pattern belong to the layout, not to the pattern rules.
	 *
	 * They are what `--vp-layout-columns` carries for every other layout, and
	 * they are the value the viewport overrides act on.
	 *
	 * @return void
	 */
	public function test_columns_stay_out_of_the_pattern_rules() {
		$this->assertStringNotContainsString(
			'columns',
			Visual_Portfolio_Tiles_Parser::to_css( '4|1,1|1,2|', '.vp-test' )
		);
		$this->assertSame( 4, Visual_Portfolio_Tiles_Parser::parse( '4|1,1|1,2|' )['columns'] );
	}

	/**
	 * Every tile says how tall it is, counted in columns.
	 *
	 * It is what the stylesheet turns into a height, so a tile is the size its
	 * notation describes whatever the blocks inside it would have made of it.
	 *
	 * @return void
	 */
	public function test_tile_height_reaches_the_stylesheet() {
		$css = Visual_Portfolio_Tiles_Parser::to_css( '3|1,1|1,2|2,0.5|', '.vp-test' );

		$this->assertStringContainsString( '--vp-tile-rows:1;', $css );
		$this->assertStringContainsString( '--vp-tile-rows:2;', $css );

		// Width counts: two columns at half height is one column tall.
		$this->assertSame( 2, substr_count( $css, '--vp-tile-rows:1;' ) );
	}

	/**
	 * Legacy accepted a colon between the segments.
	 *
	 * @return void
	 */
	public function test_colon_separator_is_read_like_a_pipe() {
		$this->assertSame(
			Visual_Portfolio_Tiles_Parser::parse( '3|1,1|2,0.5|' ),
			Visual_Portfolio_Tiles_Parser::parse( '3:1,1:2,0.5:' )
		);
	}

	/**
	 * Nonsense falls back rather than failing.
	 *
	 * @return void
	 */
	public function test_unusable_notation_falls_back() {
		$expected = array(
			'columns' => 1,
			'tiles'   => array(
				array(
					'width'    => 1,
					'height'   => 1.0,
					'row_span' => 1,
				),
			),
		);

		$this->assertSame( $expected, Visual_Portfolio_Tiles_Parser::parse( '' ) );
		$this->assertSame( $expected, Visual_Portfolio_Tiles_Parser::parse( 'nonsense' ) );
		$this->assertSame( $expected, Visual_Portfolio_Tiles_Parser::parse( null ) );

		// A tile with no numbers in it is a square, not a hole in the pattern.
		$parsed = Visual_Portfolio_Tiles_Parser::parse( '2|a,b|' );

		$this->assertSame( 2, $parsed['columns'] );
		$this->assertSame( 1, $parsed['tiles'][0]['width'] );
		$this->assertSame( 1.0, $parsed['tiles'][0]['height'] );
	}

	/**
	 * A tile can never be wider than the grid it sits in.
	 *
	 * @return void
	 */
	public function test_tile_is_clamped_to_the_grid() {
		$parsed = Visual_Portfolio_Tiles_Parser::parse( '2|5,1|' );

		$this->assertSame( 2, $parsed['tiles'][0]['width'] );
	}

	/**
	 * A pattern cannot grow into a stylesheet of its own.
	 *
	 * @return void
	 */
	public function test_pattern_length_and_columns_are_capped() {
		$parsed = Visual_Portfolio_Tiles_Parser::parse( '99|' . str_repeat( '1,1|', 60 ) );

		$this->assertSame( Visual_Portfolio_Tiles_Parser::MAX_COLUMNS, $parsed['columns'] );
		$this->assertCount( Visual_Portfolio_Tiles_Parser::MAX_TILES, $parsed['tiles'] );
	}

	/**
	 * Two galleries that describe the same pattern share one rule set.
	 *
	 * @return void
	 */
	public function test_class_follows_the_meaning_not_the_spelling() {
		$this->assertSame(
			Visual_Portfolio_Tiles_Parser::get_class( '3|1,1|2,0.5|' ),
			Visual_Portfolio_Tiles_Parser::get_class( '3:1,1:2,0.5:' )
		);

		$this->assertNotSame(
			Visual_Portfolio_Tiles_Parser::get_class( '3|1,1|' ),
			Visual_Portfolio_Tiles_Parser::get_class( '4|1,1|' )
		);

		$this->assertMatchesRegularExpression(
			'/^vp-tiles-[0-9a-f]{10}$/',
			Visual_Portfolio_Tiles_Parser::get_class( '3|1,1|' )
		);
	}
}
