<?php
/**
 * Tests for ClassFriendlyUrls
 *
 * @package Visual Portfolio
 */

/**
 * Sample test case.
 */
class ClassFriendlyUrls extends WP_UnitTestCase {
    /**
     * Testing Visual_Portfolio_Archive_Mapping class.
     *
     * @var Visual_Portfolio_Archive_Mapping
     */
    public $mapping_object;

    /**
     * Set up our mocked WP functions. Rather than setting up a database we can mock the returns of core WordPress functions.
     *
     * @return void
     */
    public function set_up() {
		parent::set_up();
        $this->mapping_object = new Visual_Portfolio_Archive_Mapping();
    }

    /**
     * Tear down WP Mock.
     *
     * @return void
     */
    public function tear_down() {
        parent::tear_down();
    }

    /**
     * Get predefined options for Archive.
     *
     * @return string
     */
    public function get_predefined_options() {
        global $wp_query;
        $wp_query->query      = array(
            'vp_page_archive' => true,
        );
        $wp_query->query_vars = array(
            'original_archive_id' => 'portfolio',
        );

        $block_options = array(
            'content_source' => 'post-based',
            'posts_source'   => 'current_query',
        );
		update_option( 'permalink_structure', '/%postname%/' );

        return $block_options;
    }

    /**
     * Test converting and remove page url part from url.
     * For example url next seeing https://example.com/portfolio/page/3/
     * Will be cleared and converted to https://example.com/portfolio/
     *
     * @return void
     */
    public function test_remove_page_url_from_sort_item_url() {
        $block_options = $this->get_predefined_options();

        $url = 'https://example.com/portfolio/page/3/';

        $cleared_url = $this->mapping_object->remove_page_url_from_sort_item_url( $url, '', $block_options );
        $this->assertEquals( 'https://example.com/portfolio/', $cleared_url );
    }

    /**
     * Test is archive for predefined archive options.
     *
     * @return void
     */
    public function test_is_archive() {
        $block_options = $this->get_predefined_options();
        $is_archive    = $this->mapping_object::is_archive( $block_options );
        $this->assertTrue( $is_archive );
    }

    /**
     * Test converting load more and infinite paginate next page to friendly url.
     * For example https://example.com/portfolio/?vp_page=3 will be converted
     * To https://example.com/portfolio/page/3/
     *
     * @return void
     */
    public function test_converting_load_more_and_infinite_paginate_next_page_to_friendly_url() {
        global $wp_query;
        $block_options = $this->get_predefined_options();
        $block_options = array_merge(
            $block_options,
            array(
                'pagination' => 'load-more',
                'max_pages'  => 4,
            )
        );
        $args          = array(
            'next_page_url' => 'https://example.com/portfolio/?vp_page=3',
        );

        $wp_query->query['paged'] = 2;

        $new_args = $this->mapping_object->converting_load_more_and_infinite_paginate_next_page_to_friendly_url( $args, $block_options );

        $this->assertEquals(
            $new_args,
            array(
                'next_page_url' => 'https://example.com/portfolio/page/3/',
            )
        );
    }

    /**
     * Test converting paginate links to friendly url.
     * For example https://example.com/?vp_filter=portfolio_category:test&vp_page=2 will be converted
     * To https://example.com/portfolio-category/test/page/2/
     *
     * @return void
     */
    public function test_converting_paginate_links_to_friendly_url() {
        $paginate_arguments = array(
            'url' => 'https://example.com/?vp_filter=portfolio_category:test&vp_page=2',
        );
        $block_options      = $this->get_predefined_options();
        $this->mapping_object->init();
        $converted_url = $this->mapping_object->converting_paginate_links_to_friendly_url( $paginate_arguments, array(), $block_options );
        $this->assertEquals(
            $converted_url,
            array(
                'url' => 'https://example.com/portfolio-category/test/page/2/',
            )
        );
    }

    /**
     * Test converting data next page to friendly url.
     * For example https://example.com/portfolio/?vp_page=3 will be converted
     * To https://example.com/portfolio/page/3/
     *
     * @return void
     */
    public function test_converting_data_next_page_to_friendly_url() {
        global $wp_query;
        $block_options = $this->get_predefined_options();
        $block_options = array_merge(
            $block_options,
            array(
                'max_pages'  => 4,
            )
        );
        $data_attrs    = array(
            'data-vp-next-page-url' => 'https://example.com/portfolio/?vp_page=3',
        );

        $wp_query->query['paged'] = 2;

        $new_data_attrs = $this->mapping_object->converting_data_next_page_to_friendly_url( $data_attrs, $block_options, array() );

        $this->assertEquals(
            $new_data_attrs,
            array(
                'data-vp-next-page-url' => 'https://example.com/portfolio/page/3/',
            )
        );
    }
}
