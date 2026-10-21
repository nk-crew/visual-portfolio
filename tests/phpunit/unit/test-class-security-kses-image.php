<?php
/**
 * Tests for escaping an item image with its `<noscript>` fallback.
 *
 * @package Visual Portfolio
 */

/**
 * Test case for Visual_Portfolio_Security::kses_image().
 */
class Test_Class_Security_Kses_Image extends WP_UnitTestCase {
	/**
	 * A lazy image keeps both its fallback and itself.
	 *
	 * WordPress 7.2 `wp_kses()` returns nothing for this markup, since it
	 * starts with a `<noscript>`.
	 *
	 * @return void
	 */
	public function test_keeps_noscript_fallback_and_lazy_image() {
		$html = '<noscript><img src="http://example.org/a.jpg" class="wp-image-5" alt="" data-skip-lazy></noscript>'
			. '<img src="http://example.org/a.jpg" class="wp-image-5 vp-lazyload" alt="" data-src="http://example.org/a.jpg" data-sizes="auto">';

		$output = Visual_Portfolio_Security::kses_image( $html );

		$this->assertStringStartsWith( '<noscript><img ', $output );
		$this->assertStringContainsString( '</noscript><img ', $output );
		$this->assertSame( 2, substr_count( $output, 'wp-image-5' ) );
		$this->assertStringContainsString( 'data-src="http://example.org/a.jpg"', $output );
	}

	/**
	 * Both the fallback and the image are still escaped.
	 *
	 * @return void
	 */
	public function test_escapes_inside_and_outside_noscript() {
		$html = '<noscript><img src="http://example.org/a.jpg" onerror="alert(1)"><script>alert(2)</script></noscript>'
			. '<img src="http://example.org/a.jpg" onload="alert(3)">';

		$output = Visual_Portfolio_Security::kses_image( $html );

		$this->assertStringNotContainsString( 'onerror', $output );
		$this->assertStringNotContainsString( 'onload', $output );
		$this->assertStringNotContainsString( '<script', $output );
		$this->assertSame( 2, substr_count( $output, '<img ' ) );
	}
}
