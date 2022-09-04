<?php
/**
 * Tests for SampleTest
 *
 * @package Visual Portfolio
 */

use \WP_Mock\Tools\TestCase;

/**
 * Sample test case.
 */
class SampleTest extends TestCase {
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
     * A single example test.
     */
    public function test_sample() {
        // Replace this with some actual testing code.
        $this->assertTrue( true );
    }
}
