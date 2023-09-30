<?php
/**
 * Enfold Theme.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_3rd_Enfold
 */
class Visual_Portfolio_3rd_Enfold {
	/**
	 * Cache for lazy loading option
	 *
	 * @var string
	 */
	public $lazy_loading_option_cache = null;

	/**
	 * Visual_Portfolio_3rd_Enfold constructor.
	 */
	public function __construct() {
		if ( is_admin() ) {
			return;
		}

		if ( 'enfold' !== get_template() ) {
			return;
		}

		// Disable Enfold lightbox by adding classname.
		add_filter( 'vpf_extend_portfolio_class', array( $this, 'disable_lightbox_class' ) );

		// Disable our lazyload if Enfold lazyload enabled.
		add_filter( 'vpf_images_lazyload', array( $this, 'disable_lazy_load' ) );
	}

	/**
	 * Disable Enfold lightbox by adding classname.
	 *
	 * @param string $class - portfolio block classname.
	 *
	 * @return string
	 */
	public function disable_lightbox_class( $class ) {
		$class .= ' noLightbox';
		return $class;
	}

	/**
	 * Disable VPF lazy load if Enfold uses their own.
	 *
	 * @param boolean $return - portfolio block classname.
	 *
	 * @return boolean
	 */
	public function disable_lazy_load( $return ) {
		$enfold_option = '';

		if ( null !== $this->lazy_loading_option_cache ) {
			$enfold_option = $this->lazy_loading_option_cache;
		} elseif ( function_exists( 'avia_get_option' ) ) {
			$enfold_option = avia_get_option( 'lazy_loading', '' );
		}

		if ( null === $this->lazy_loading_option_cache ) {
			$this->lazy_loading_option_cache = $enfold_option;
		}

		if ( '' === $enfold_option ) {
			return false;
		}

		return $return;
	}
}

new Visual_Portfolio_3rd_Enfold();
