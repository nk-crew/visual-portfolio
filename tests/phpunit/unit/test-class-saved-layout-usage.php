<?php
/**
 * Tests for the Saved Layout usage index and the detach on delete.
 *
 * @package Visual Portfolio
 */

/**
 * Saved Layout usage test case.
 */
class ClassSavedLayoutUsage extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Images of the page loops.
	 *
	 * @var array
	 */
	private static $images = array();

	/**
	 * Create the attachments once for the whole case.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass() {
		for ( $i = 1; $i <= 2; $i++ ) {
			self::$images[] = array(
				'id'    => self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' ),
				'title' => 'Image ' . $i,
			);
		}
	}

	/**
	 * Every test needs the loop family, the post type and an editor.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		$this->skip_without_loop_blocks();

		if ( ! post_type_exists( 'vp_lists' ) ) {
			register_post_type( 'vp_lists', array( 'map_meta_cap' => true ) );
		}

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
	}

	/**
	 * Serialized loop.
	 *
	 * @param array $loop - loop attributes.
	 * @param array $template - item template attributes.
	 *
	 * @return string
	 */
	private function loop_markup( $loop, $template ) {
		return sprintf(
			'<!-- wp:visual-portfolio/loop %1$s --><div class="wp-block-visual-portfolio-loop vp-block-loop"><!-- wp:visual-portfolio/item-template %2$s --><!-- wp:visual-portfolio/item-title {"metadata":{"vpSyncKey":"title"}} /--><!-- /wp:visual-portfolio/item-template --></div><!-- /wp:visual-portfolio/loop -->',
			wp_json_encode( (object) $loop ),
			wp_json_encode( (object) $template )
		);
	}

	/**
	 * A published layout: masonry with four columns.
	 *
	 * @return int
	 */
	private function create_layout() {
		return self::factory()->post->create(
			array(
				'post_type'    => 'vp_lists',
				'post_status'  => 'publish',
				'post_content' => $this->loop_markup(
					array(
						'block_id'  => 'layout',
						'queryType' => 'images',
					),
					array(
						'layoutType'        => 'masonry',
						'layoutColumnsMode' => 'manual',
						'layoutColumnCount' => 4,
						'metadata'          => array( 'vpSyncKey' => 'template' ),
					)
				),
			)
		);
	}

	/**
	 * A page whose loop syncs with a layout.
	 *
	 * @param int   $layout - layout id.
	 * @param array $overrides - overrides by sync key.
	 * @param array $template - the page's own item template attributes.
	 *
	 * @return int
	 */
	private function create_synced_page( $layout, $overrides = array(), $template = array() ) {
		return self::factory()->post->create(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_content' => '<!-- wp:paragraph --><p>Intro</p><!-- /wp:paragraph -->' . $this->loop_markup(
					array(
						'block_id'    => 'page',
						'queryId'     => 1,
						'queryType'   => 'images',
						'baseQuery'   => array( 'perPage' => 10 ),
						'imagesQuery' => array( 'images' => self::$images ),
						'savedLayout' => array(
							'id'        => $layout,
							'overrides' => $overrides,
						),
					),
					array_merge( array( 'metadata' => array( 'vpSyncKey' => 'template' ) ), $template )
				),
			)
		);
	}

	/**
	 * Synced loops, Saved Layout blocks and shortcodes are each indexed once,
	 * and a second save leaves the same rows.
	 */
	public function test_index_records_each_kind_once() {
		$synced   = $this->create_layout();
		$inserted = $this->create_layout();
		$short    = $this->create_layout();

		$page = self::factory()->post->create(
			array(
				'post_content' => $this->loop_markup( array( 'savedLayout' => array( 'id' => $synced ) ), array() )
					. $this->loop_markup( array( 'savedLayout' => array( 'id' => $synced ) ), array() )
					. '<!-- wp:visual-portfolio/saved {"id":"' . $inserted . '"} /-->'
					. '<!-- wp:shortcode -->[visual_portfolio id="' . $short . '"]<!-- /wp:shortcode -->',
			)
		);

		wp_update_post(
			array(
				'ID'         => $page,
				'post_title' => 'Saved again',
			)
		);

		$this->assertSame( array( (string) $synced ), get_post_meta( $page, Visual_Portfolio_Saved_Layout_Usage::SYNCED_META ) );
		$this->assertEqualsCanonicalizing(
			array( (string) $inserted, (string) $short ),
			get_post_meta( $page, Visual_Portfolio_Saved_Layout_Usage::INSERTED_META )
		);
	}

	/**
	 * Counts and the usage list leave out trashed posts and count changes.
	 */
	public function test_counts_and_usage() {
		$layout = $this->create_layout();
		$first  = $this->create_synced_page( $layout, array( 'template' => array( 'layoutColumnCount', 'layoutType' ) ) );
		$second = self::factory()->post->create( array( 'post_content' => '<!-- wp:visual-portfolio/saved {"id":"' . $layout . '"} /-->' ) );
		$gone   = $this->create_synced_page( $layout );

		wp_trash_post( $gone );

		$this->assertSame(
			array(
				$layout => array(
					'posts'  => 2,
					'synced' => 1,
				),
			),
			Visual_Portfolio_Saved_Layout_Usage::get_counts( array( $layout ) )
		);

		$usage = wp_list_pluck( Visual_Portfolio_Saved_Layout_Usage::get_usage( $layout ), 'changes', 'id' );

		$this->assertSame(
			array(
				$first  => 2,
				$second => 0,
			),
			$usage
		);
	}

	/**
	 * The backfill indexes content saved without the index and is safe to
	 * run again.
	 */
	public function test_backfill_indexes_old_content() {
		$layout = $this->create_layout();
		$page   = $this->create_synced_page( $layout );

		delete_post_meta( $page, Visual_Portfolio_Saved_Layout_Usage::SYNCED_META );
		delete_option( Visual_Portfolio_Saved_Layout_Usage::INDEXED_OPTION );

		$usage = new Visual_Portfolio_Saved_Layout_Usage();

		$this->assertFalse( $usage->run_backfill() );
		$this->assertFalse( $usage->run_backfill() );
		$this->assertSame( array( (string) $layout ), get_post_meta( $page, Visual_Portfolio_Saved_Layout_Usage::SYNCED_META ) );
		$this->assertTrue( (bool) get_option( Visual_Portfolio_Saved_Layout_Usage::INDEXED_OPTION ) );
	}

	/**
	 * Deleting a layout for good detaches its loops, and the page renders
	 * exactly as it did while synced.
	 */
	public function test_permanent_delete_detaches_with_the_same_markup() {
		$layout = $this->create_layout();
		$page   = $this->create_synced_page( $layout, array( 'template' => array( 'layoutColumnCount' ) ), array( 'layoutColumnCount' => 2 ) );

		$before = do_blocks( get_post( $page )->post_content );

		wp_delete_post( $layout, true );

		$usage = new Visual_Portfolio_Saved_Layout_Usage();

		$this->assertFalse( $usage->run_detach( $layout ) );
		$this->assertFalse( $usage->run_detach( $layout ) );

		$content = get_post( $page )->post_content;

		$this->assertStringNotContainsString( 'savedLayout', $content );
		$this->assertStringContainsString( '<p>Intro</p>', $content );
		$this->assertSame( $before, do_blocks( $content ) );
		$this->assertSame( array(), get_post_meta( $page, Visual_Portfolio_Saved_Layout_Usage::SYNCED_META ) );
	}
}
