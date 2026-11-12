<?php
/**
 * Tests for the framed list screens of Visual_Portfolio_Admin.
 *
 * @package Visual Portfolio
 */

/**
 * The `vpf_admin_list_screens` filter and the header it prints.
 */
class Test_Visual_Portfolio_Admin_List_Screens extends WP_UnitTestCase {
	/**
	 * Whether set_up() registered the plugin's post type and taxonomies.
	 *
	 * @var bool
	 */
	protected $registered_portfolio = false;

	/**
	 * Register the plugin's post type and taxonomies, and a post type and a
	 * taxonomy an extension would frame, as an admin.
	 */
	public function set_up() {
		parent::set_up();

		if ( ! post_type_exists( 'portfolio' ) ) {
			update_option( 'vp_general', array( 'register_portfolio_post_type' => 'on' ) );
			( new Visual_Portfolio_Custom_Post_Type() )->add_custom_post_type();
			$this->registered_portfolio = true;
		}

		register_post_type( 'vpf_test_item', array( 'label' => 'Test Items' ) );
		register_taxonomy( 'vpf_test_group', 'vpf_test_item', array( 'label' => 'Test Groups' ) );
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
	}

	/**
	 * Remove what set_up() registered.
	 */
	public function tear_down() {
		remove_all_filters( 'vpf_admin_list_screens' );
		unregister_taxonomy( 'vpf_test_group' );
		unregister_post_type( 'vpf_test_item' );
		set_current_screen( 'front' );

		if ( $this->registered_portfolio ) {
			unregister_taxonomy( 'portfolio_category' );
			unregister_taxonomy( 'portfolio_tag' );
			unregister_post_type( 'portfolio' );
		}

		parent::tear_down();
	}

	/**
	 * The header printed on a screen.
	 *
	 * @param string $screen - screen id.
	 *
	 * @return string
	 */
	private function header_on( $screen ) {
		set_current_screen( $screen );

		$admin = ( new ReflectionClass( 'Visual_Portfolio_Admin' ) )->newInstanceWithoutConstructor();

		ob_start();
		$admin->print_list_header();

		return preg_replace( '/\s+/', ' ', ob_get_clean() );
	}

	/**
	 * Body classes of a screen.
	 *
	 * @param string $screen - screen id.
	 *
	 * @return string
	 */
	private function body_class_on( $screen ) {
		set_current_screen( $screen );

		return ( new ReflectionClass( 'Visual_Portfolio_Admin' ) )->newInstanceWithoutConstructor()->admin_body_class( '' );
	}

	/**
	 * Sections of the test post type and taxonomy.
	 *
	 * @return array
	 */
	private function test_sections() {
		return array(
			array(
				'label'     => 'Items',
				'url'       => 'http://example.org/wp-admin/edit.php?post_type=vpf_test_item',
				'post_type' => 'vpf_test_item',
			),
			array(
				'label'    => 'Groups',
				'url'      => 'http://example.org/wp-admin/edit-tags.php?taxonomy=vpf_test_group',
				'taxonomy' => 'vpf_test_group',
			),
		);
	}

	/**
	 * A taxonomy of the plugin keeps its header: the name label as title, no
	 * action, and the Projects tabs with its own marked.
	 */
	public function test_free_category_screen_keeps_its_header() {
		$html = $this->header_on( 'edit-portfolio_category' );

		$this->assertStringContainsString( '<h1>Portfolio Categories</h1>', $html );
		$this->assertStringContainsString( '<p>Group projects, so a gallery can show or filter by them.</p>', $html );
		$this->assertStringNotContainsString( 'vpf-admin-page__actions', $html );
		$this->assertStringContainsString( '<nav class="vpf-admin-page__sections" aria-label="Projects">', $html );
		$this->assertStringContainsString( 'taxonomy=portfolio_category&#038;post_type=portfolio" aria-current="page">Categories</a>', $html );
		$this->assertSame( 1, substr_count( $html, 'aria-current' ) );
	}

	/**
	 * Pro's Proofing list keeps its frame with no Pro entry: the name label,
	 * Add New, and no description or sections.
	 */
	public function test_proofing_list_keeps_its_frame_without_an_entry_from_pro() {
		register_post_type(
			'vp_proofing',
			array(
				'labels' => array(
					'name'         => 'Proofing',
					'add_new_item' => 'Add New Proofing Gallery',
				),
			)
		);

		$html = $this->header_on( 'edit-vp_proofing' );

		unregister_post_type( 'vp_proofing' );

		$this->assertStringContainsString( '<h1>Proofing</h1> </div>', $html );
		$this->assertStringContainsString( 'post-new.php?post_type=vp_proofing">Add New Proofing Gallery</a>', $html );
		$this->assertStringNotContainsString( 'vpf-admin-page__sections', $html );
	}

	/**
	 * A post type and a taxonomy an extension adds share one header: tabs
	 * named after the first section's screen, Add New on the post type only.
	 */
	public function test_extension_frames_a_post_type_and_its_taxonomy() {
		add_filter(
			'vpf_admin_list_screens',
			function ( $screens ) {
				$screens[] = array(
					'post_type'   => 'vpf_test_item',
					'description' => 'What the items are for.',
					'sections'    => $this->test_sections(),
				);
				$screens[] = array(
					'taxonomy'    => 'vpf_test_group',
					'title'       => 'Groups of items',
					'description' => 'What the groups are for.',
					'sections'    => $this->test_sections(),
				);

				return $screens;
			}
		);

		$items  = $this->header_on( 'edit-vpf_test_item' );
		$groups = $this->header_on( 'edit-vpf_test_group' );

		$this->assertStringContainsString( '<h1>Test Items</h1> <p>What the items are for.</p>', $items );
		$this->assertStringContainsString( 'href="' . admin_url( 'post-new.php?post_type=vpf_test_item' ) . '">Add Post</a>', $items );
		$this->assertStringContainsString( 'edit.php?post_type=vpf_test_item" aria-current="page">Items</a>', $items );

		$this->assertStringContainsString( '<h1>Groups of items</h1> <p>What the groups are for.</p>', $groups );
		$this->assertStringNotContainsString( 'vpf-admin-page__actions', $groups );
		$this->assertStringContainsString( 'aria-label="Test Items"', $groups );
		$this->assertStringContainsString( 'taxonomy=vpf_test_group" aria-current="page">Groups</a>', $groups );
		$this->assertSame( ' vpf-admin-list-screen', $this->body_class_on( 'edit-vpf_test_group' ) );
	}

	/**
	 * An entry or a section naming a taxonomy and its post type, as the
	 * taxonomy's list URL does, stands for the taxonomy's list.
	 */
	public function test_taxonomy_wins_over_post_type_in_one_entry() {
		add_filter(
			'vpf_admin_list_screens',
			function ( $screens ) {
				$sections                = $this->test_sections();
				$sections[1]['post_type'] = 'vpf_test_item';

				$screens[] = array(
					'post_type'   => 'vpf_test_item',
					'description' => 'Items line.',
					'sections'    => $sections,
				);
				$screens[] = array(
					'taxonomy'    => 'vpf_test_group',
					'post_type'   => 'vpf_test_item',
					'description' => 'Groups line.',
					'sections'    => $sections,
				);

				return $screens;
			}
		);

		$items  = $this->header_on( 'edit-vpf_test_item' );
		$groups = $this->header_on( 'edit-vpf_test_group' );

		$this->assertStringContainsString( '<p>Items line.</p>', $items );
		$this->assertSame( 1, substr_count( $items, 'aria-current' ) );
		$this->assertStringContainsString( '<p>Groups line.</p>', $groups );
		$this->assertStringContainsString( 'taxonomy=vpf_test_group" aria-current="page">Groups</a>', $groups );
	}

	/**
	 * A later entry replaces an earlier one, and its actions replace Add New:
	 * the first primary, the rest secondary, none for an empty list.
	 */
	public function test_later_entry_replaces_earlier_and_sets_actions() {
		add_filter(
			'vpf_admin_list_screens',
			function ( $screens ) {
				$screens[] = array(
					'post_type'   => 'vpf_test_item',
					'description' => 'First.',
				);
				$screens[] = array(
					'post_type'   => 'vpf_test_item',
					'description' => 'Second.',
					'actions'     => array(
						array(
							'label' => 'Import',
							'url'   => 'http://example.org/import',
						),
						array(
							'label' => 'Export',
							'url'   => 'http://example.org/export',
						),
					),
				);
				$screens[] = array(
					'post_type' => 'portfolio',
					'actions'   => array(),
				);

				return $screens;
			}
		);

		$items     = $this->header_on( 'edit-vpf_test_item' );
		$portfolio = $this->header_on( 'edit-portfolio' );

		$this->assertStringContainsString( '<p>Second.</p>', $items );
		$this->assertStringNotContainsString( 'First.', $items );
		$this->assertStringContainsString( '<a class="components-button is-primary is-next-40px-default-size" href="http://example.org/import">Import</a><a class="components-button is-secondary is-next-40px-default-size" href="http://example.org/export">Export</a>', $items );
		$this->assertStringNotContainsString( 'Add New', $items );

		$this->assertStringContainsString( '<h1>Portfolio</h1>', $portfolio );
		$this->assertStringNotContainsString( 'vpf-admin-page__actions', $portfolio );
		$this->assertStringNotContainsString( 'vpf-admin-page__sections', $portfolio );
	}

	/**
	 * Entries, sections and actions that do not fit the shape are left out
	 * without a notice, `actions` that is not a list keeps Add New, and a
	 * screen no entry names gets no frame.
	 */
	public function test_malformed_entries_are_left_out() {
		add_filter(
			'vpf_admin_list_screens',
			function () {
				return array(
					'not a screen',
					(object) array( 'post_type' => 'vpf_test_item' ),
					array( 'description' => 'No post type.' ),
					array( 'post_type' => 'vpf_unregistered' ),
					array(
						'post_type'   => 'vpf_test_item',
						'title'       => array( 'not a string' ),
						'description' => 42,
						'sections'    => array(
							'not a section',
							(object) array(
								'label'     => 'An object',
								'url'       => 'http://example.org/object',
								'post_type' => 'vpf_test_item',
							),
							array( 'label' => 'No target' ),
							array(
								'label'     => 'No url',
								'post_type' => 'vpf_test_item',
							),
						),
						'actions'     => 'not a list',
					),
					array(
						'taxonomy' => 'vpf_test_group',
						'actions'  => array(
							(object) array(
								'label' => 'An object',
								'url'   => 'http://example.org/object',
							),
						),
					),
				);
			}
		);

		$items  = $this->header_on( 'edit-vpf_test_item' );
		$groups = $this->header_on( 'edit-vpf_test_group' );

		$this->assertStringContainsString( '<h1>Test Items</h1>', $items );
		$this->assertStringNotContainsString( '<p>', $items );
		$this->assertStringNotContainsString( 'vpf-admin-page__sections', $items );
		$this->assertStringContainsString( '">Add Post</a>', $items );

		$this->assertStringContainsString( '<h1>Test Groups</h1>', $groups );
		$this->assertStringNotContainsString( 'vpf-admin-page__actions', $groups );

		$this->assertSame( '', $this->header_on( 'edit-portfolio_category' ) );
		$this->assertSame( '', $this->body_class_on( 'edit-portfolio_category' ) );
	}
}
