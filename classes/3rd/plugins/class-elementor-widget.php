<?php
/**
 * Widget for Elementor
 *
 * @package visual-portfolio/elementor
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_3rd_Elementor_Widget
 */
class Visual_Portfolio_3rd_Elementor_Widget extends \Elementor\Widget_Base {
	/**
	 * Constructor of Visual_Portfolio_3rd_Elementor_Widget class.
	 *
	 * @param array      $data default widget data.
	 * @param null|array $args default widget args.
	 */
	public function __construct( $data = array(), $args = null ) {
		// Migrate from old 'id' control to new 'saved_id'.
		if ( isset( $data['settings']['id'] ) ) {
			if ( $data['settings']['id'] && ( ! isset( $data['settings']['saved_id'] ) || ! $data['settings']['saved_id'] ) ) {
				$data['settings']['saved_id'] = $data['settings']['id'];
			}

			unset( $data['settings']['id'] );
		}

		parent::__construct( $data, $args );

		if ( $this->is_preview_mode() ) {
			Visual_Portfolio_Assets::register_script( 'iframe-resizer', 'build/assets/vendor/iframe-resizer/js/iframeResizer', array(), '4.2.11' );
			Visual_Portfolio_Assets::register_script( 'visual-portfolio-elementor', 'build/assets/admin/js/elementor', array( 'elementor-frontend', 'iframe-resizer' ) );

			Visual_Portfolio_Assets::register_style( 'visual-portfolio-elementor', 'build/assets/admin/css/elementor' );
			wp_style_add_data( 'visual-portfolio-elementor', 'rtl', 'replace' );
			wp_style_add_data( 'visual-portfolio-elementor', 'suffix', '.min' );
		}
	}

	/**
	 * Is edit mode check.
	 *
	 * @return boolean
	 */
	public function is_preview_mode() {
		return \Elementor\Plugin::$instance->preview->is_preview_mode() || \Elementor\Plugin::$instance->editor->is_edit_mode();
	}

	/**
	 * Get widget name.
	 *
	 * @return string Widget name.
	 */
	public function get_name() {
		return 'visual-portfolio';
	}

	/**
	 * Get widget title.
	 *
	 * @return string Widget title.
	 */
	public function get_title() {
		return visual_portfolio()->plugin_name;
	}

	/**
	 * Get widget icon.
	 *
	 * @return string Widget icon.
	 */
	public function get_icon() {
		return 'eicon-gallery-grid';
	}

	/**
	 * Get widget categories.
	 *
	 * @return array Widget categories.
	 */
	public function get_categories() {
		return array( 'general' );
	}

	/**
	 * Get widget keywords.
	 *
	 * @return array Widget keywords.
	 */
	public function get_keywords() {
		return array( 'portfolio', 'gallery', 'images', 'visual portfolio', 'vpf' );
	}

	/**
	 * Get script dependencies.
	 *
	 * @return array Widget script dependencies.
	 */
	public function get_script_depends() {
		if ( $this->is_preview_mode() ) {
			return array( 'visual-portfolio-elementor' );
		}

		return array();
	}

	/**
	 * We should add the prefix to all options, because Select2 conflicts with the Safari for some reason.
	 *
	 * @param String $option - option value.
	 *
	 * @return String
	 */
	public function set_option_prefix( $option ) {
		return 'post-id-' . $option;
	}

	/**
	 * Remove prefix from the option.
	 *
	 * @param String $option - prefixed option value.
	 *
	 * @return String
	 */
	public function unset_option_prefix( $option ) {
		return str_replace( 'post-id-', '', $option );
	}

	/**
	 * Get style dependencies.
	 *
	 * @return array Widget style dependencies.
	 */
	public function get_style_depends() {
		if ( $this->is_preview_mode() ) {
			return array( 'visual-portfolio-elementor' );
		}

		return array();
	}

	/**
	 * Adds different input fields to allow the user to change and customize the widget settings.
	 *
	 * @return void
	 */
	protected function register_controls() {
		// get all visual-portfolio post types.
		// Don't use WP_Query on the admin side https://core.trac.wordpress.org/ticket/18408 .
		$vp_query = get_posts(
			array(
				'post_type'              => 'vp_lists',
				'posts_per_page'         => -1,
				'paged'                  => -1,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			)
		);

		$options = array(
			'' => esc_html__( '-- Select Layout --', 'visual-portfolio' ),
		);
		foreach ( $vp_query as $post ) {
			$options[ $this->set_option_prefix( $post->ID ) ] = '#' . $post->ID . ' - ' . $post->post_title;
		}

		$this->start_controls_section(
			'content_section',
			array(
				'label' => __( 'General', 'visual-portfolio' ),
				'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
			)
		);

		$this->add_control(
			'saved_id',
			array(
				'label'   => esc_html__( 'Saved Layout', 'visual-portfolio' ),
				'type'    => \Elementor\Controls_Manager::SELECT2,
				'options' => $options,
				'dynamic' => array(
					'active' => true,
				),
			)
		);

		$this->end_controls_section();
	}

	/**
	 * Render widget output on the frontend.
	 */
	protected function render() {
		$settings = array_merge(
			array(
				'saved_id' => '',
				'class'    => '',
			),
			$this->get_settings_for_display()
		);

		// No saved layout selected.
		if ( ! $settings['saved_id'] ) {
			return;
		}

		if ( $this->is_preview_mode() ) {
			$this->add_render_attribute(
				'wrapper',
				array(
					'class'   => 'visual-portfolio-elementor-preview',
					'data-id' => $this->unset_option_prefix( $settings['saved_id'] ),
				)
			);
		}

		?>
		<div
			<?php
                // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				echo $this->get_render_attribute_string( 'wrapper' );
			?>
		>
			<?php if ( $this->is_preview_mode() ) : ?>
				<iframe allowtransparency="true"></iframe>
			<?php else : ?>
				<?php echo do_shortcode( '[visual_portfolio id="' . esc_attr( $this->unset_option_prefix( $settings['saved_id'] ) ) . '"]' ); ?>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * Render shortcode widget output in the editor.
	 *
	 * Written as a Backbone JavaScript template and used to generate the live preview.
	 *
	 * @since 1.0.0
	 * @access protected
	 */
	protected function content_template() {}

	/**
	 * Render Plain Content
	 *
	 * @param array $instance instance data.
	 */
	// phpcs:ignore
	public function render_plain_content( $instance = array() ) {}
}
