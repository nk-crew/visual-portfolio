<?php
/**
 * Tests for the gallery abilities AI agents call.
 *
 * @package Visual Portfolio
 */

require_once dirname( __DIR__ ) . '/trait-loop-blocks.php';

/**
 * Test case for Visual_Portfolio_Abilities.
 */
class Test_Class_Abilities extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Users by role.
	 *
	 * @var array
	 */
	private static $users = array();

	/**
	 * Image attachments.
	 *
	 * @var array
	 */
	private static $image_ids = array();

	/**
	 * Content around a gallery that a write must leave alone.
	 *
	 * @var string
	 */
	const SURROUNDINGS = "<!-- wp:paragraph -->\n<p>Before &amp; <em>after</em></p>\n<!-- /wp:paragraph -->\n\n<!-- wp:group {\"style\":{},\"layout\":{\"type\":\"constrained\"}} -->\n<div class=\"wp-block-group\"><!-- wp:heading -->\n<h2 class=\"wp-block-heading\">Work</h2>\n<!-- /wp:heading --></div>\n<!-- /wp:group -->";

	/**
	 * Create users and images once.
	 *
	 * @param WP_UnitTest_Factory $factory - factory.
	 */
	public static function wpSetUpBeforeClass( $factory ) {
		foreach ( array( 'administrator', 'author', 'contributor', 'subscriber' ) as $role ) {
			self::$users[ $role ] = $factory->user->create( array( 'role' => $role ) );
		}

		for ( $i = 0; $i < 3; $i++ ) {
			self::$image_ids[] = $factory->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' );
		}
	}

	/**
	 * Skip without the loop family.
	 */
	public function set_up() {
		parent::set_up();
		$this->skip_without_loop_blocks();
	}

	/**
	 * Run an ability as a user.
	 *
	 * @param string $name - ability name without the namespace.
	 * @param array  $input - input.
	 * @param string $role - role of the user.
	 *
	 * @return mixed
	 */
	private function run_ability( $name, $input = null, $role = 'administrator' ) {
		wp_set_current_user( self::$users[ $role ] );

		return wp_get_ability( 'visual-portfolio/' . $name )->execute( $input );
	}

	/**
	 * A post holding exactly the content given.
	 *
	 * Saved through the database, because a save without `unfiltered_html`
	 * runs every block through kses, which writes `{}` as `[]`.
	 *
	 * @param string $content - post content.
	 * @param array  $args - other post fields.
	 *
	 * @return int post id.
	 */
	private function create_post( $content, $args = array() ) {
		global $wpdb;

		$post_id = self::factory()->post->create( $args );

		$wpdb->update( $wpdb->posts, array( 'post_content' => $content ), array( 'ID' => $post_id ) );
		clean_post_cache( $post_id );

		return $post_id;
	}

	/**
	 * An images source of the images given by index.
	 *
	 * @param array $indexes - indexes into the images.
	 *
	 * @return array
	 */
	private function images_source( $indexes ) {
		return array(
			'type'   => 'images',
			'images' => array_map(
				function ( $index ) {
					return array( 'id' => self::$image_ids[ $index ] );
				},
				$indexes
			),
		);
	}

	/**
	 * Every ability is registered, public to clients and the MCP Adapter,
	 * and in the plugin's category.
	 */
	public function test_abilities_are_public() {
		foreach ( array( 'get-gallery-options', 'list-galleries', 'find-images', 'find-posts', 'find-terms', 'get-gallery', 'create-gallery', 'update-gallery' ) as $name ) {
			$ability = wp_get_ability( 'visual-portfolio/' . $name );

			$this->assertNotNull( $ability, $name );
			$this->assertSame( 'visual-portfolio', $ability->get_category(), $name );
			$this->assertTrue( $ability->get_meta_item( 'public' ), $name );
			$this->assertTrue( $ability->get_meta_item( 'show_in_rest' ), $name );
			$this->assertSame( array( 'public' => true ), $ability->get_meta_item( 'mcp' ), $name );
		}

		$this->assertTrue( wp_get_ability( 'visual-portfolio/get-gallery' )->get_meta_item( 'annotations' )['readonly'] );
		$this->assertTrue( wp_get_ability( 'visual-portfolio/update-gallery' )->get_meta_item( 'annotations' )['idempotent'] );
	}

	/**
	 * A gallery added to a post lands after its content, which stays as it
	 * was, and reads back in the vocabulary it was written in.
	 */
	public function test_create_gallery_in_a_post() {
		$post_id = $this->create_post( self::SURROUNDINGS );
		$gallery = $this->run_ability(
			'create-gallery',
			array(
				'post_id'  => $post_id,
				'layout'   => 'visual-portfolio/gallery-masonry-classic',
				'source'   => $this->images_source( array( 2, 0 ) ),
				'settings' => array( 'columns' => 2 ),
			)
		);

		$this->assertIsArray( $gallery );
		$this->assertSame( $post_id, $gallery['post_id'] );
		$this->assertSame( 'masonry', $gallery['layout_type'] );
		$this->assertSame( array( self::$image_ids[2], self::$image_ids[0] ), array_column( $gallery['source']['images'], 'id' ) );
		$this->assertSame( 2, $gallery['settings']['columns'] );
		$this->assertTrue( $gallery['settings']['lightbox'] );

		$content = get_post( $post_id )->post_content;
		$this->assertStringStartsWith( self::SURROUNDINGS . "\n\n<!-- wp:visual-portfolio/loop ", $content );
		$this->assertSame( $gallery, $this->run_ability( 'get-gallery', array( 'post_id' => $post_id, 'gallery_id' => $gallery['gallery_id'] ) ) );
	}

	/**
	 * Without a post, the gallery goes into a new draft page, or a draft post
	 * for a user who may not create pages.
	 */
	public function test_create_gallery_makes_a_draft_page() {
		$input = array(
			'title'  => 'Lisbon',
			'layout' => 'visual-portfolio/gallery-grid-classic',
			'source' => $this->images_source( array( 0 ) ),
		);

		// An author, who may not create pages, gets a draft post instead.
		$drafted = $this->run_ability( 'create-gallery', $input, 'author' );

		$this->assertSame( 'post', $drafted['post_type'] );
		$this->assertSame( 'draft', $drafted['post_status'] );
		$this->assertWPError( $this->run_ability( 'create-gallery', $input, 'subscriber' ) );

		$gallery = $this->run_ability( 'create-gallery', $input );

		$this->assertIsArray( $gallery );
		$this->assertSame( 'page', $gallery['post_type'] );
		$this->assertSame( 'draft', $gallery['post_status'] );
		$this->assertSame( 'Lisbon', $gallery['post_title'] );
	}

	/**
	 * A contributor may not put a gallery into someone else's post, and the
	 * post is left as it was.
	 */
	public function test_create_gallery_respects_edit_rights() {
		$post_id = $this->create_post( self::SURROUNDINGS, array( 'post_author' => self::$users['administrator'] ) );
		$result  = $this->run_ability(
			'create-gallery',
			array(
				'post_id' => $post_id,
				'layout'  => 'visual-portfolio/gallery-grid-classic',
				'source'  => $this->images_source( array( 0 ) ),
			),
			'contributor'
		);

		$this->assertWPError( $result );
		$this->assertSame( self::SURROUNDINGS, get_post( $post_id )->post_content );
	}

	/**
	 * An image the user cannot read, or an attachment that is not an image,
	 * is refused, and the post is left as it was.
	 */
	public function test_create_gallery_refuses_images_the_user_cannot_read() {
		$private_post = self::factory()->post->create(
			array(
				'post_author' => self::$users['administrator'],
				'post_status' => 'private',
			)
		);
		$hidden       = self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png', $private_post );
		$document     = self::factory()->attachment->create_object(
			array(
				'file'           => 'notes.pdf',
				'post_mime_type' => 'application/pdf',
			)
		);
		$post_id      = $this->create_post( self::SURROUNDINGS, array( 'post_author' => self::$users['author'] ) );

		foreach ( array( $hidden, $document, 999999 ) as $id ) {
			$result = $this->run_ability(
				'create-gallery',
				array(
					'post_id' => $post_id,
					'layout'  => 'visual-portfolio/gallery-grid-classic',
					'source'  => array(
						'type'   => 'images',
						'images' => array( array( 'id' => $id ) ),
					),
				),
				'author'
			);

			$this->assertWPError( $result, (string) $id );
			$this->assertSame( 'vpf_invalid_image', $result->get_error_code(), (string) $id );
		}

		$this->assertSame( self::SURROUNDINGS, get_post( $post_id )->post_content );
	}

	/**
	 * A subscriber sees no options; an unknown layout is named in the error.
	 */
	public function test_errors_an_agent_can_act_on() {
		$this->assertWPError( $this->run_ability( 'get-gallery-options', null, 'subscriber' ) );

		$post_id = self::factory()->post->create();
		$result  = Visual_Portfolio_Loop_Gallery::create( 'visual-portfolio/nope', array(), array() );

		$this->assertSame( 'vpf_unknown_layout', $result->get_error_code() );
		$this->assertStringContainsString( 'visual-portfolio/gallery-grid-classic', $result->get_error_message() );

		$result = $this->run_ability(
			'get-gallery',
			array(
				'post_id'    => $post_id,
				'gallery_id' => 'nope',
			)
		);

		$this->assertSame( 'vpf_gallery_not_found', $result->get_error_code() );
	}

	/**
	 * Without Pro, the options list its sources as requiring it.
	 */
	public function test_options_mark_pro_sources() {
		if ( visual_portfolio()->is_pro() ) {
			$this->markTestSkipped( 'Pro describes its own sources.' );
		}

		$options = $this->run_ability( 'get-gallery-options', null, 'author' );
		$sources = array_column( $options['sources'], null, 'type' );

		$this->assertTrue( $sources['taxonomies']['requires_pro'] );
		$this->assertStringContainsString( 'utm_medium=abilities', $sources['taxonomies']['pro_url'] );
		$this->assertTrue( $sources['images']['available'] );
		$this->assertContains( 'visual-portfolio/gallery-tiles-mosaic', array_column( $options['layouts'], 'slug' ) );
	}

	/**
	 * The list holds galleries nested in other blocks, and only of posts the
	 * user can edit.
	 */
	public function test_list_galleries_follows_edit_rights() {
		$loop   = serialize_block( Visual_Portfolio_Loop_Gallery::create( 'visual-portfolio/gallery-grid-classic', array( 'source' => $this->images_source( array( 0, 1 ) ) ), array() ) );
		$own    = self::factory()->post->create(
			array(
				'post_author'  => self::$users['contributor'],
				'post_status'  => 'draft',
				'post_title'   => 'Own gallery',
				'post_content' => '<!-- wp:group --><div class="wp-block-group">' . $loop . '</div><!-- /wp:group -->',
			)
		);
		$others = self::factory()->post->create(
			array(
				'post_author'  => self::$users['administrator'],
				'post_title'   => 'Admin gallery',
				'post_content' => $loop,
			)
		);

		$listed = $this->run_ability( 'list-galleries', array(), 'contributor' );

		$this->assertSame( array( $own ), array_column( $listed['galleries'], 'post_id' ) );
		$this->assertSame( 2, $listed['galleries'][0]['image_count'] );

		$listed = $this->run_ability( 'list-galleries', array( 'search' => 'Admin' ) );

		$this->assertSame( array( $others ), array_column( $listed['galleries'], 'post_id' ) );
	}

	/**
	 * An update changes the addressed gallery only; the same update a second
	 * time saves nothing.
	 */
	public function test_update_gallery_is_repeatable_and_local() {
		$other   = '<!-- wp:visual-portfolio/loop {"block_id":"other","queryType":"posts","queryId":1} --><div class="vp-block-loop"></div><!-- /wp:visual-portfolio/loop -->';
		$post_id = $this->create_post( self::SURROUNDINGS . "\n\n" . $other );
		$gallery = $this->run_ability(
			'create-gallery',
			array(
				'post_id'  => $post_id,
				'position' => 'start',
				'layout'   => 'visual-portfolio/gallery-grid-classic',
				'source'   => $this->images_source( array( 0, 1 ) ),
			)
		);
		$input   = array(
			'post_id'    => $post_id,
			'gallery_id' => $gallery['gallery_id'],
			'add_images' => array( array( 'id' => self::$image_ids[2] ) ),
			'order'      => array( self::$image_ids[2] ),
		);

		$updated   = $this->run_ability( 'update-gallery', $input );
		$content   = get_post( $post_id )->post_content;
		$revisions = count( wp_get_post_revisions( $post_id ) );

		$this->assertSame( array( self::$image_ids[2], self::$image_ids[0], self::$image_ids[1] ), array_column( $updated['source']['images'], 'id' ) );
		$this->assertStringEndsWith( self::SURROUNDINGS . "\n\n" . $other, $content );

		$this->run_ability( 'update-gallery', $input );

		$this->assertSame( $content, get_post( $post_id )->post_content );
		$this->assertSame( $revisions, count( wp_get_post_revisions( $post_id ) ) );
	}

	/**
	 * A gallery saved without an id is reached by its position and gets an
	 * id with its first change.
	 */
	public function test_update_gives_an_unnamed_gallery_an_id() {
		$post_id = self::factory()->post->create( array( 'post_content' => '<!-- wp:visual-portfolio/loop {"queryType":"posts"} --><div class="vp-block-loop"></div><!-- /wp:visual-portfolio/loop -->' ) );
		$updated = $this->run_ability(
			'update-gallery',
			array(
				'post_id'    => $post_id,
				'gallery_id' => 'loop-1',
				'layout'     => 'visual-portfolio/gallery-posts-classic',
			)
		);

		$this->assertIsArray( $updated );
		$this->assertNotSame( 'loop-1', $updated['gallery_id'] );
		$this->assertSame( 'grid', $updated['layout_type'] );

		// The position no longer names it, and the error lists its new id.
		$retry = $this->run_ability(
			'update-gallery',
			array(
				'post_id'    => $post_id,
				'gallery_id' => 'loop-1',
				'layout'     => 'visual-portfolio/gallery-posts-classic',
			)
		);

		$this->assertSame( 'vpf_gallery_not_found', $retry->get_error_code() );
		$this->assertStringContainsString( $updated['gallery_id'], $retry->get_error_message() );
	}

	/**
	 * A posts source read from a gallery is accepted back unchanged.
	 */
	public function test_posts_source_round_trips() {
		$post_id = self::factory()->post->create();
		$gallery = $this->run_ability(
			'create-gallery',
			array(
				'post_id' => $post_id,
				'layout'  => 'visual-portfolio/gallery-posts-classic',
				'source'  => array(
					'type' => 'posts',
					'ids'  => array( $post_id ),
				),
			)
		);
		$again   = $this->run_ability(
			'update-gallery',
			array(
				'post_id'    => $post_id,
				'gallery_id' => $gallery['gallery_id'],
				'source'     => $gallery['source'],
				'settings'   => $gallery['settings'],
			)
		);

		$this->assertSame( $gallery, $again );
	}

	/**
	 * Zero items per page, which no gallery can render, is refused.
	 */
	public function test_per_page_zero_is_refused() {
		$post_id = $this->create_post( self::SURROUNDINGS );
		$result  = $this->run_ability(
			'create-gallery',
			array(
				'post_id'  => $post_id,
				'layout'   => 'visual-portfolio/gallery-grid-classic',
				'source'   => $this->images_source( array( 0 ) ),
				'settings' => array( 'per_page' => 0 ),
			)
		);

		$this->assertWPError( $result );
		$this->assertSame( 'vpf_invalid_per_page', $result->get_error_code() );
		$this->assertSame( self::SURROUNDINGS, get_post( $post_id )->post_content );
	}

	/**
	 * A post another user has open in the editor is not written.
	 */
	public function test_post_open_by_another_user_is_refused() {
		$post_id = $this->create_post( self::SURROUNDINGS );

		update_post_meta( $post_id, '_edit_lock', time() . ':' . self::$users['author'] );

		$result = $this->run_ability(
			'create-gallery',
			array(
				'post_id' => $post_id,
				'layout'  => 'visual-portfolio/gallery-grid-classic',
				'source'  => $this->images_source( array( 0 ) ),
			)
		);

		$this->assertWPError( $result );
		$this->assertSame( 'vpf_post_locked', $result->get_error_code() );
		$this->assertSame( self::SURROUNDINGS, get_post( $post_id )->post_content );

		// The caller's own open editor is written past, with a warning.
		update_post_meta( $post_id, '_edit_lock', time() . ':' . self::$users['administrator'] );

		$gallery = $this->run_ability(
			'create-gallery',
			array(
				'post_id' => $post_id,
				'layout'  => 'visual-portfolio/gallery-grid-classic',
				'source'  => $this->images_source( array( 0 ) ),
			)
		);

		$this->assertCount( 1, $gallery['warnings'] );
	}

	/**
	 * Images are found by their words and upload date, only those the user
	 * may read, and not by a user who cannot browse the Media Library.
	 */
	public function test_find_images() {
		$private_post = self::factory()->post->create(
			array(
				'post_author' => self::$users['administrator'],
				'post_status' => 'private',
			)
		);
		$hidden       = self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png', $private_post );
		$named        = self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' );

		wp_update_post(
			array(
				'ID'         => $named,
				'post_title' => 'Lisbon tram at dusk',
			)
		);

		$found = $this->run_ability( 'find-images', array( 'search' => 'Lisbon tram' ), 'author' );

		$this->assertSame( array( $named ), array_column( $found['images'], 'id' ) );
		$this->assertSame( 'Lisbon tram at dusk', $found['images'][0]['title'] );
		$this->assertSame( 'image.png', preg_replace( '/-\d+(\.png)$/', '$1', $found['images'][0]['filename'] ) );

		$all = $this->run_ability( 'find-images', array( 'per_page' => 50 ), 'author' );
		$this->assertNotContains( $hidden, array_column( $all['images'], 'id' ) );
		$this->assertContains( $hidden, array_column( $this->run_ability( 'find-images', array( 'per_page' => 50 ) )['images'], 'id' ) );

		$this->assertSame( array(), $this->run_ability( 'find-images', array( 'uploaded_after' => gmdate( 'Y-m-d', time() + DAY_IN_SECONDS * 2 ) ), 'author' )['images'] );
		$this->assertWPError( $this->run_ability( 'find-images', array(), 'contributor' ) );
	}

	/**
	 * Posts are found by type, words and terms; drafts are not shown in a
	 * gallery, so they are not found.
	 */
	public function test_find_posts_and_terms() {
		$term      = self::factory()->category->create( array( 'name' => 'Portugal trips' ) );
		$in_term   = self::factory()->post->create(
			array(
				'post_title'    => 'Porto in spring',
				'post_category' => array( $term ),
			)
		);
		$elsewhere = self::factory()->post->create( array( 'post_title' => 'Porto at night' ) );
		$draft     = self::factory()->post->create(
			array(
				'post_title'    => 'Porto draft',
				'post_status'   => 'draft',
				'post_category' => array( $term ),
			)
		);

		$terms = $this->run_ability(
			'find-terms',
			array(
				'taxonomy' => 'category',
				'search'   => 'Portugal',
			),
			'author'
		);
		$this->assertSame( array( $term ), array_column( $terms['terms'], 'id' ) );

		$posts = $this->run_ability( 'find-posts', array( 'terms' => array( $term ) ), 'author' );
		$this->assertSame( array( $in_term ), array_column( $posts['posts'], 'id' ) );

		$searched = $this->run_ability( 'find-posts', array( 'search' => 'Porto' ), 'author' );
		$this->assertEqualsCanonicalizing( array( $in_term, $elsewhere ), array_column( $searched['posts'], 'id' ) );
		$this->assertNotContains( $draft, array_column( $searched['posts'], 'id' ) );

		$this->assertSame( 'vpf_invalid_post_type', $this->run_ability( 'find-posts', array( 'post_type' => 'nope' ), 'author' )->get_error_code() );
		$this->assertSame( 'vpf_invalid_taxonomy', $this->run_ability( 'find-terms', array( 'taxonomy' => 'nope' ), 'author' )->get_error_code() );
	}
}
