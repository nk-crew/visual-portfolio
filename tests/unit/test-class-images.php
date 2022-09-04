<?php
/**
 * Tests for ClassImages
 *
 * @package Visual Portfolio
 */

use \WP_Mock\Tools\TestCase;

/**
 * Sample test case.
 */
class ClassImages extends TestCase {
    /**
     * Set up our mocked WP functions. Rather than setting up a database we can mock the returns of core WordPress functions.
     *
     * @return void
     */
    public function setUp(): void {
        \WP_Mock::setUp();
    }

    /**
     * Tear down WP Mock.
     *
     * @return void
     */
    public function tearDown(): void {
        \WP_Mock::tearDown();
    }

    /**
     * Different sizes for base64 placeholder.
     */
    public function test_get_image_placeholder() {
        // False if no width or height provided.
        $this->assertFalse( Visual_Portfolio_Images::get_image_placeholder( 0, 0 ) );
        $this->assertFalse( Visual_Portfolio_Images::get_image_placeholder( 20, 0 ) );
        $this->assertFalse( Visual_Portfolio_Images::get_image_placeholder( 0, 20 ) );

        // Expected svg like this but in base64:
        // <svg width="100" height="200" viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg"></svg>.
        $this->assertEquals( 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDEwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PC9zdmc+', Visual_Portfolio_Images::get_image_placeholder( 100, 200 ) );
    }

    /**
     * Simple lazy loading.
     */
    public function test_lazy_loading() {
        // Enable lazy load in settings.
        Visual_Portfolio_Images::$allow_vp_lazyload = true;
        Visual_Portfolio_Images::$allow_wp_lazyload = true;

        $placeholder  = Visual_Portfolio_Images::get_image_placeholder( 10, 10 );
        $image_string = '<img src="image.jpg" alt="Test Image" width="10" height="10">';
        $lazy_string  = '<img src="' . $placeholder . '" alt="Test Image" width="10" height="10" data-src="image.jpg" data-sizes="auto" loading="eager" class="vp-lazyload">';

        $this->mock_wp_kses_hair( $image_string, 2 );
        $this->assertEquals(
            '<noscript>' . $image_string . '</noscript>' . $lazy_string,
            Visual_Portfolio_Images::add_image_placeholders(
                $image_string
            )
        );

        // With tags.
        $this->assertEquals(
            '<p>Hello</p>
                <div><noscript>' . $image_string . '</noscript>' . $lazy_string . '</div>
                <p>test image</p>',
            Visual_Portfolio_Images::add_image_placeholders(
                '<p>Hello</p>
                <div>' . $image_string . '</div>
                <p>test image</p>'
            )
        );
    }

    /**
     * Lazy loading with standard lazy attribute.
     */
    public function test_lazy_loading_standard_lazy_attribute() {
        // Enable lazy load in settings.
        Visual_Portfolio_Images::$allow_vp_lazyload = true;
        Visual_Portfolio_Images::$allow_wp_lazyload = true;

        $placeholder  = Visual_Portfolio_Images::get_image_placeholder( 10, 10 );
        $image_string = '<img loading="lazy" src="image.jpg" alt="Test Image" width="10" height="10">';
        $lazy_string  = '<img loading="eager" src="' . $placeholder . '" alt="Test Image" width="10" height="10" data-src="image.jpg" data-sizes="auto" class="vp-lazyload">';

        $this->mock_wp_kses_hair( $image_string, 1 );
        $this->assertEquals(
            '<noscript>' . $image_string . '</noscript>' . $lazy_string,
            Visual_Portfolio_Images::add_image_placeholders(
                $image_string
            )
        );
    }

    /**
     * Lazy loading with srcset and sizes attributes.
     */
    public function test_lazy_loading_srcset_sizes_attributes() {
        // Enable lazy load in settings.
        Visual_Portfolio_Images::$allow_vp_lazyload = true;
        Visual_Portfolio_Images::$allow_wp_lazyload = true;

        $placeholder  = Visual_Portfolio_Images::get_image_placeholder( 10, 10 );
        $image_string = '<img loading="lazy" src="image.jpg" srcset="image.jpg 2x" sizes="100vw" alt="Test Image" width="10" height="10">';
        $lazy_string  = '<img loading="eager" src="image.jpg" srcset="' . $placeholder . '" alt="Test Image" width="10" height="10" data-src="image.jpg" data-srcset="image.jpg 2x" data-sizes="auto" class="vp-lazyload">';

        $this->mock_wp_kses_hair( $image_string, 1 );
        $this->assertEquals(
            '<noscript>' . $image_string . '</noscript>' . $lazy_string,
            Visual_Portfolio_Images::add_image_placeholders(
                $image_string
            )
        );
    }

    /**
     * Settings to disable/enable lazy loading.
     */
    public function test_lazy_loading_settings() {
        // Disable lazy loading.
        Visual_Portfolio_Images::$allow_vp_lazyload = false;
        Visual_Portfolio_Images::$allow_wp_lazyload = false;

        $image_string = '<img src="image.jpg" alt="Test Image" width="10" height="10">';
        $this->mock_wp_kses_hair( $image_string, 1 );
        $this->assertEquals(
            $image_string,
            Visual_Portfolio_Images::add_image_placeholders(
                $image_string
            )
        );

        // Enabled lazy loading in the visual portfolio blocks only.
        Visual_Portfolio_Images::$allow_vp_lazyload = true;

        // Images in content.
        $image_string = '<img src="image.jpg" alt="Test Image" width="10" height="10">';
        $this->mock_wp_kses_hair( $image_string, 1 );
        $this->assertEquals(
            $image_string,
            Visual_Portfolio_Images::add_image_placeholders(
                $image_string
            )
        );

        // Visual Portfolio image.
        $placeholder  = Visual_Portfolio_Images::get_image_placeholder( 10, 10 );
        $image_string = '<img src="image.jpg" alt="Test Image" width="10" height="10" class="wp-image-9999">';
        $lazy_string  = '<img src="' . $placeholder . '" alt="Test Image" width="10" height="10" class="wp-image-9999 vp-lazyload" data-src="image.jpg" data-sizes="auto" loading="eager">';

        $this->mock_wp_kses_hair( $image_string, 1 );
        \WP_Mock::userFunction(
            'get_post_mime_type',
            array(
                'times'  => 1,
                'return' => 'image/jpg',
            )
        );
        \WP_Mock::userFunction(
            'wp_get_attachment_image',
            array(
                'times'  => 1,
                'return' => $image_string,
            )
        );
        $this->assertEquals(
            '<noscript>' . $image_string . '</noscript>' . $lazy_string,
            Visual_Portfolio_Images::get_attachment_image( 9999 )
        );
    }

    /**
     * Skip lazy loading attributes.
     */
    public function test_lazy_loading_skip_attribute() {
        // Enable lazy load in settings.
        Visual_Portfolio_Images::$allow_wp_lazyload = true;
        Visual_Portfolio_Images::$allow_vp_lazyload = true;

        // Skip `data-no-lazy` attribute.
        $image_string = '<img src="image.jpg" alt="Test Image" width="10" height="10" data-no-lazy="true">';
        $this->mock_wp_kses_hair( $image_string, 1 );
        $this->assertEquals(
            $image_string,
            Visual_Portfolio_Images::add_image_placeholders(
                $image_string
            )
        );

        // Skip `vp-lazyload` class name. Means - already lazy loaded.
        $image_string = '<img src="image.jpg" alt="Test Image" width="10" height="10" class="vp-lazyload">';
        $this->mock_wp_kses_hair( $image_string, 1 );
        $this->assertEquals(
            $image_string,
            Visual_Portfolio_Images::add_image_placeholders(
                $image_string
            )
        );

        // Skip `no-lazy` class name.
        $image_string = '<img src="image.jpg" alt="Test Image" width="10" height="10" class="no-lazy">';
        $this->mock_wp_kses_hair( $image_string, 1 );
        $this->assertEquals(
            $image_string,
            Visual_Portfolio_Images::add_image_placeholders(
                $image_string
            )
        );

        // Skip Contact Form 7 captcha image URL.
        $image_string = '<img src="https://example.com/wp-content/wpcf7_captcha/image.jpg" width="10" height="10">';
        $this->mock_wp_kses_hair( $image_string, 1 );
        $this->assertEquals(
            $image_string,
            Visual_Portfolio_Images::add_image_placeholders(
                $image_string
            )
        );

        // Skip when inside <noscript> tag.
        $image_string = '<noscript><img src="image.jpg" width="10" height="10"></noscript>';
        $this->assertEquals(
            $image_string,
            Visual_Portfolio_Images::add_image_placeholders(
                $image_string
            )
        );
    }

    /**
     * Prepare mock of wp_kses_hair function, which is used in Lazy Loading calls.
     *
     * @param string $image_string - image string.
     * @param int    $times - times to mock the function.
     */
    public function mock_wp_kses_hair( $image_string, $times ) {
        \WP_Mock::userFunction(
            'wp_kses_hair',
            array(
                'times'  => $times,
                'return' => $this->img_to_wp_kses_hair( $image_string ),
            )
        );
    }

    /**
     * Convert image string to the `wp_kses_hair` schema array.
     * !Pretty limited! Use it for a single <img> tag only and with attributes with values only.
     *
     * @param string $image_string - image string.
     *
     * @return array
     */
    public function img_to_wp_kses_hair( $image_string ) {
        $attrs = array();

        preg_match_all( '/(\S+)=["\']?((?:.(?!["\']?\s+(?:\S+)=|[>"\']))+.)["\']?/', $image_string, $match );

        if ( ! empty( $match[1] ) && ! empty( $match[2] ) ) {
            foreach ( $match[1] as $k => $name ) {
                $attrs[ $name ] = array(
                    'value' => $match[2][ $k ],
                );
            }
        }

        return $attrs;
    }
}
