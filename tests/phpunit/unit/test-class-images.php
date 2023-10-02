<?php
/**
 * Tests for ClassImages
 *
 * @package Visual Portfolio
 */

/**
 * Sample test case.
 */
class ClassImages extends WP_UnitTestCase {
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

        $this->assertEquals(
            $this->get_noscript_image( $image_string ) . $lazy_string,
            Visual_Portfolio_Images::add_image_placeholders(
                $image_string
            )
        );

        // With tags.
        $this->assertEquals(
            '<p>Hello</p>
                <div>' . $this->get_noscript_image( $image_string ) . $lazy_string . '</div>
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

        $this->assertEquals(
            $this->get_noscript_image( $image_string ) . $lazy_string,
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

        $this->assertEquals(
            $this->get_noscript_image( $image_string ) . $lazy_string,
            Visual_Portfolio_Images::add_image_placeholders(
                $image_string
            )
        );

		// When srcset exists, but it is empty.
        $image_string = '<img loading="lazy" src="image.jpg" srcset alt="Test Image" width="10" height="10">';
        $lazy_string  = '<img loading="eager" src="' . $placeholder . '" srcset alt="Test Image" width="10" height="10" data-src="image.jpg" data-sizes="auto" class="vp-lazyload">';

        $this->assertEquals(
            $this->get_noscript_image( $image_string ) . $lazy_string,
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
        $this->assertEquals(
            $image_string,
            Visual_Portfolio_Images::add_image_placeholders(
                $image_string
            )
        );

        // Visual Portfolio image.
        $placeholder  = Visual_Portfolio_Images::get_image_placeholder( 150, 150 );

        // Added Real Image to WordPress.
        $image_url = dirname( dirname( __FILE__ ) ) . '/fixtures/image.png';
        $attach_id = $this->wp_insert_attachment( $image_url );

        // Image is added to WordPress.
        $this->assertTrue( is_int( $attach_id ) );

        $image_string = '<img width="150" height="150" src="' . esc_url( wp_get_attachment_image_url( $attach_id ) ) . '" class="wp-image-' . esc_attr( $attach_id ) . '" alt="" decoding="async" loading="lazy" />';
        $lazy_string  = '<img width="150" height="150" src="' . $placeholder . '" class="wp-image-' . $attach_id  . ' vp-lazyload" alt decoding="async" loading="eager" data-src="' . esc_url( wp_get_attachment_image_url( $attach_id ) ) . '" data-sizes="auto">';

        $this->assertEquals(
            $this->get_noscript_image( $image_string ) . $lazy_string,
            Visual_Portfolio_Images::get_attachment_image( $attach_id )
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
        $this->assertEquals(
            $image_string,
            Visual_Portfolio_Images::add_image_placeholders(
                $image_string
            )
        );

        // Skip `vp-lazyload` class name. Means - already lazy loaded.
        $image_string = '<img src="image.jpg" alt="Test Image" width="10" height="10" class="vp-lazyload">';
        $this->assertEquals(
            $image_string,
            Visual_Portfolio_Images::add_image_placeholders(
                $image_string
            )
        );

        // Skip `no-lazy` class name.
        $image_string = '<img src="image.jpg" alt="Test Image" width="10" height="10" class="no-lazy">';
        $this->assertEquals(
            $image_string,
            Visual_Portfolio_Images::add_image_placeholders(
                $image_string
            )
        );

        // Skip Contact Form 7 captcha image URL.
        $image_string = '<img src="https://example.com/wp-content/wpcf7_captcha/image.jpg" width="10" height="10">';
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
     * Prepare noscript image string.
     *
     * @param string $image_string - image string.
     */
    public function get_noscript_image( $image_string ) {
        // Skip 3rd-party lazy loading from noscript img tag.
        $image_string = str_replace( ' src="', ' data-skip-lazy src="', $image_string );

        return '<noscript>' . $image_string . '</noscript>';
    }

    /**
     * Added Image to WordPress.
     *
     * @param string $image_url - Absolutely path to Image.
     * @return bool|int
     */
    public function wp_insert_attachment( $image_url ) {
        $upload_dir = wp_upload_dir();

        $image_data = file_get_contents( $image_url );

        $filename = basename( $image_url );

        if ( wp_mkdir_p( $upload_dir['path'] ) ) {
        $file = $upload_dir['path'] . '/' . $filename;
        }
        else {
        $file = $upload_dir['basedir'] . '/' . $filename;
        }

        file_put_contents( $file, $image_data );

        $wp_filetype = wp_check_filetype( $filename, null );

        $attachment = array(
        'post_mime_type' => $wp_filetype['type'],
        'post_title' => sanitize_file_name( $filename ),
        'post_content' => '',
        'post_status' => 'inherit'
        );

        $attach_id = wp_insert_attachment( $attachment, $file );

        if ( ! is_wp_error( $attach_id ) ) {
            require_once( ABSPATH . 'wp-admin/includes/image.php' );

            $attach_data = wp_generate_attachment_metadata( $attach_id, $file );

            wp_update_attachment_metadata( $attach_id, $attach_data );
        }

        return is_wp_error( $attach_id ) ? false : $attach_id;
    }
}
