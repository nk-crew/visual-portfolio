<?php
/**
 * Tests gallery alt sanitization.
 *
 * @package Visual Portfolio
 */

/**
 * Test case for gallery alt sanitization.
 */
class Test_Class_Security_Gallery_Alt extends WP_UnitTestCase {
	/**
	 * Ensure gallery alt strips HTML.
	 */
	public function test_sanitize_gallery_strips_html_from_alt() {
		$result = Visual_Portfolio_Security::sanitize_gallery(
			array(
				array(
					'alt' => '<strong>Custom</strong> <script>alert(1)</script>',
				),
			)
		);

		$this->assertSame( 'Custom', $result[0]['alt'] );
	}

	/**
	 * Ensure empty alt is preserved to keep runtime fallback behavior.
	 */
	public function test_sanitize_gallery_preserves_empty_alt() {
		$result = Visual_Portfolio_Security::sanitize_gallery(
			array(
				array(
					'alt' => '',
				),
			)
		);

		$this->assertArrayHasKey( 'alt', $result[0] );
		$this->assertSame( '', $result[0]['alt'] );
	}
}