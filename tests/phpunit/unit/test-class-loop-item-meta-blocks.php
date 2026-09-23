<?php
/**
 * Tests for the settings of the item meta blocks: date, author, categories,
 * and the autoplay delay of the carousel.
 *
 * Rendered through `do_blocks()`, like the other item block tests: the blocks
 * read their data out of the per-item context the item template provides.
 *
 * @package Visual Portfolio
 */

/**
 * Item meta blocks test case.
 */
class ClassLoopItemMetaBlocks extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Skip where the family is not registered.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		$this->skip_without_loop_blocks();
	}

	/**
	 * Clean up the per-request state the pipeline keeps.
	 *
	 * @return void
	 */
	public function tear_down() {
		$this->reset_loop_state();

		parent::tear_down();
	}

	/**
	 * Forget what the pipeline memoized, as a new request would.
	 *
	 * @return void
	 */
	private function reset_loop_state() {
		foreach ( array( 'loop_items_cache' => array(), 'used_posts' => array(), 'check_main_query' => true ) as $name => $value ) {
			$property = new ReflectionProperty( 'Visual_Portfolio_Get', $name );

			if ( method_exists( $property, 'setAccessible' ) ) {
				$property->setAccessible( true );
			}

			$property->setValue( null, $value );
		}
	}

	/**
	 * Render a loop around the given item blocks.
	 *
	 * @param array  $loop        - loop attributes.
	 * @param string $item_blocks - serialized blocks inside the item template.
	 * @param array  $layout      - item template attributes.
	 *
	 * @return string
	 */
	private function render_loop( $loop, $item_blocks, $layout = array() ) {
		$loop = array_merge(
			array(
				'block_id'  => 'meta-test',
				'queryId'   => 1,
				'baseQuery' => array( 'perPage' => 10 ),
			),
			$loop
		);

		return do_blocks(
			sprintf(
				'<!-- wp:visual-portfolio/loop %1$s --><div class="wp-block-visual-portfolio-loop vp-block-loop"><!-- wp:visual-portfolio/item-template %2$s -->%3$s<!-- /wp:visual-portfolio/item-template --></div><!-- /wp:visual-portfolio/loop -->',
				wp_json_encode( $loop ),
				wp_json_encode( (object) $layout ),
				$item_blocks
			)
		);
	}

	/**
	 * A loop of the given posts.
	 *
	 * @param array $ids - post ids.
	 *
	 * @return array
	 */
	private function posts_loop( $ids ) {
		return array(
			'queryType'  => 'posts',
			'postsQuery' => array(
				'source' => 'ids',
				'ids'    => $ids,
			),
		);
	}

	/**
	 * A loop of one image, with a typed author.
	 *
	 * @return array
	 */
	private function images_loop() {
		$image = self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' );

		return array(
			'queryType'   => 'images',
			'imagesQuery' => array(
				'images' => array(
					array(
						'id'     => $image,
						'title'  => 'Image',
						'author' => 'Typed author',
					),
				),
			),
		);
	}

	/**
	 * The relative format core's date picker offers reads as a time ago.
	 *
	 * @return void
	 */
	public function test_a_relative_date_reads_as_time_ago() {
		// A site far from UTC. The publish time is in site time, and reading it
		// as UTC would put the post hours into the future.
		update_option( 'timezone_string', 'Asia/Tokyo' );

		$post = self::factory()->post->create(
			array(
				'post_date' => wp_date( 'Y-m-d H:i:s', time() - 2 * HOUR_IN_SECONDS ),
			)
		);

		$output = $this->render_loop(
			$this->posts_loop( array( $post ) ),
			'<!-- wp:visual-portfolio/item-date {"format":"human-diff"} /-->'
		);

		$this->assertStringContainsString( '>2 hours ago</time>', $output );
	}

	/**
	 * A date the relative format cannot read shows nothing, as any format does.
	 *
	 * @return void
	 */
	public function test_an_unreadable_date_shows_nothing() {
		$post = self::factory()->post->create();

		$set_date = function ( $context ) {
			$context['vp/itemPublishedTime'] = '23/09/2026';

			return $context;
		};

		add_filter( 'vpf_loop_item_context', $set_date );

		$output = $this->render_loop(
			$this->posts_loop( array( $post ) ),
			'<!-- wp:visual-portfolio/item-date {"format":"human-diff"} /-->'
		);

		remove_filter( 'vpf_loop_item_context', $set_date );

		$this->assertStringNotContainsString( '<time', $output );
	}

	/**
	 * A date format still reaches PHP's formatter.
	 *
	 * @return void
	 */
	public function test_a_date_format_is_still_applied() {
		$post = self::factory()->post->create( array( 'post_date' => '2024-03-05 10:00:00' ) );

		$output = $this->render_loop(
			$this->posts_loop( array( $post ) ),
			'<!-- wp:visual-portfolio/item-date {"format":"Y/m/d"} /-->'
		);

		$this->assertStringContainsString( '>2024/03/05</time>', $output );
	}

	/**
	 * A post shows the avatar of its author, at the chosen size.
	 *
	 * @return void
	 */
	public function test_a_post_shows_the_avatar_of_its_author() {
		$user = self::factory()->user->create( array( 'display_name' => 'Jane Doe' ) );
		$post = self::factory()->post->create( array( 'post_author' => $user ) );

		$output = $this->render_loop(
			$this->posts_loop( array( $post ) ),
			'<!-- wp:visual-portfolio/item-author {"showAvatar":true,"avatarSize":48} /-->'
		);

		$this->assertStringContainsString( 'has-avatar', $output );
		$this->assertMatchesRegularExpression( '/<img[^>]+class=[\'"][^\'"]*avatar-48[^\'"]*wp-block-visual-portfolio-item-author__avatar/', $output );
		$this->assertStringContainsString( 'Jane Doe', $output );
	}

	/**
	 * Without the setting the author is printed as it always was.
	 *
	 * @return void
	 */
	public function test_the_avatar_is_off_by_default() {
		$user = self::factory()->user->create( array( 'display_name' => 'Jane Doe' ) );
		$post = self::factory()->post->create( array( 'post_author' => $user ) );

		$output = $this->render_loop(
			$this->posts_loop( array( $post ) ),
			'<!-- wp:visual-portfolio/item-author /-->'
		);

		$this->assertStringNotContainsString( 'has-avatar', $output );
		$this->assertStringNotContainsString( '__avatar', $output );
		$this->assertStringContainsString( 'by Jane Doe', $output );
	}

	/**
	 * Settings > Discussion > Show Avatars turned off hides them here too.
	 *
	 * @return void
	 */
	public function test_avatars_follow_the_discussion_setting() {
		update_option( 'show_avatars', 0 );

		// An avatar an extension hands over is held to the setting as well.
		$set_avatar = function ( $context ) {
			$context['vp/itemAuthorAvatar'] = 'https://example.org/channel.png';

			return $context;
		};

		add_filter( 'vpf_loop_item_context', $set_avatar );

		$output = $this->render_loop(
			$this->images_loop(),
			'<!-- wp:visual-portfolio/item-author {"showAvatar":true} /-->'
		);

		remove_filter( 'vpf_loop_item_context', $set_avatar );

		$this->assertStringContainsString( 'Typed author', $output );
		$this->assertStringNotContainsString( 'channel.png', $output );
		$this->assertStringNotContainsString( 'has-avatar', $output );
	}

	/**
	 * An item without a user behind it shows the avatar it carries, the way a
	 * social source hands over the avatar of its channel.
	 *
	 * @return void
	 */
	public function test_an_item_shows_the_avatar_it_carries() {
		$set_avatar = function ( $context ) {
			$context['vp/itemAuthorAvatar'] = 'https://example.org/channel.png';

			return $context;
		};

		add_filter( 'vpf_loop_item_context', $set_avatar );

		$output = $this->render_loop(
			$this->images_loop(),
			'<!-- wp:visual-portfolio/item-author {"showAvatar":true,"avatarSize":48} /-->'
		);

		remove_filter( 'vpf_loop_item_context', $set_avatar );

		$this->assertStringContainsString( '<img src="https://example.org/channel.png" width="48" height="48"', $output );
	}

	/**
	 * An alt of nothing but spaces is no alt, and the media library's stays.
	 *
	 * @return void
	 */
	public function test_an_alt_of_spaces_keeps_the_library_alt() {
		$image = self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' );

		update_post_meta( $image, '_wp_attachment_image_alt', 'Library alt' );

		$output = $this->render_loop(
			array(
				'queryType'   => 'images',
				'imagesQuery' => array(
					'images' => array(
						array(
							'id'  => $image,
							'alt' => '   ',
						),
					),
				),
			),
			'<!-- wp:visual-portfolio/item-image /--><!-- wp:visual-portfolio/item-cover /-->'
		);

		// Both the image and the cover, each with its lazy-loading copy or not.
		$this->assertGreaterThanOrEqual( 2, substr_count( $output, 'alt="Library alt"' ) );
		$this->assertStringNotContainsString( 'alt="   "', $output );
	}

	/**
	 * An image has no user behind its author, so it has no avatar.
	 *
	 * @return void
	 */
	public function test_an_image_has_no_avatar() {
		$output = $this->render_loop(
			$this->images_loop(),
			'<!-- wp:visual-portfolio/item-author {"showAvatar":true} /-->'
		);

		$this->assertStringContainsString( 'Typed author', $output );
		$this->assertStringNotContainsString( 'has-avatar', $output );
		$this->assertStringNotContainsString( '<img', $output );
	}

	/**
	 * The categories of an item can be capped.
	 *
	 * @return void
	 */
	public function test_the_categories_can_be_capped() {
		$post = self::factory()->post->create();

		wp_set_post_categories(
			$post,
			array(
				self::factory()->category->create( array( 'name' => 'Alpha' ) ),
				self::factory()->category->create( array( 'name' => 'Beta' ) ),
				self::factory()->category->create( array( 'name' => 'Gamma' ) ),
			)
		);

		$capped = $this->render_loop(
			$this->posts_loop( array( $post ) ),
			'<!-- wp:visual-portfolio/item-categories {"limit":2} /-->'
		);

		$this->reset_loop_state();

		$all = $this->render_loop(
			$this->posts_loop( array( $post ) ),
			'<!-- wp:visual-portfolio/item-categories /-->'
		);

		$this->assertSame( 2, substr_count( $capped, '</a>' ) );
		$this->assertSame( 3, substr_count( $all, '</a>' ) );
	}

	/**
	 * The autoplay delay is kept between two seconds and a minute.
	 *
	 * @return void
	 */
	public function test_the_autoplay_delay_is_kept_between_two_seconds_and_a_minute() {
		$loop = $this->images_loop();

		foreach ( array( 30 => '30', 90 => '60', 1 => '2' ) as $delay => $expected ) {
			$this->reset_loop_state();

			$output = $this->render_loop(
				$loop,
				'<!-- wp:visual-portfolio/item-image /-->',
				array(
					'layoutType'            => 'carousel',
					'carouselAutoplay'      => true,
					'carouselAutoplayDelay' => $delay,
				)
			);

			$this->assertStringContainsString( 'data-vp-carousel-autoplay="' . $expected . '"', $output, "A delay of $delay seconds should be written as $expected." );
		}
	}
}
