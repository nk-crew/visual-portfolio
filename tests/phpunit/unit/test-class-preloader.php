<?php
/**
 * Tests the gallery loading logo.
 *
 * @package Visual Portfolio
 */

class Test_Class_Preloader extends WP_UnitTestCase {

	/**
	 * Render two gallery wrappers in the same document.
	 */
	public function test_loading_logos_are_decorative_and_have_distinct_gradients() {
		ob_start();
		for ( $i = 0; $i < 2; $i++ ) {
			visual_portfolio()->include_template(
				'items-list/wrapper-start',
				array(
					'class'      => 'vp-portfolio',
					'data_attrs' => array(),
				)
			);
			visual_portfolio()->include_template( 'items-list/wrapper-end' );
		}
		$html = ob_get_clean();

		$this->assertStringNotContainsString( 'Visual Portfolio, Posts &amp; Image Gallery for WordPress', $html );
		preg_match_all( '/<svg\b[^>]*>.*?<\/svg>/s', $html, $logos );
		$this->assertCount( 2, $logos[0] );
		$gradient_ids = array();
		foreach ( $logos[0] as $logo ) {
			$tags = new WP_HTML_Tag_Processor( $logo );
			$this->assertTrue( $tags->next_tag( 'SVG' ) );
			$this->assertSame( 'true', $tags->get_attribute( 'aria-hidden' ) );
			$this->assertSame( 'false', $tags->get_attribute( 'focusable' ) );
			$this->assertSame( '', trim( strip_tags( $logo ) ) );
			$this->assertTrue( $tags->next_tag( 'LINEARGRADIENT' ) );
			$gradient_id = $tags->get_attribute( 'id' );
			$this->assertNotEmpty( $gradient_id );
			$this->assertStringContainsString( 'fill="url(#' . $gradient_id . ')"', $logo );
			$gradient_ids[] = $gradient_id;
		}
		$this->assertNotSame( $gradient_ids[0], $gradient_ids[1] );
	}
}
