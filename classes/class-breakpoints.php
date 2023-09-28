<?php
/**
 * Breakpoints.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Breakpoints
 */
class Visual_Portfolio_Breakpoints {
	/**
	 * Extra Small Default Breakpoint.
	 *
	 * @var int
	 */
	private static $default_xs = 320;

	/**
	 * Mobile Default Breakpoint.
	 *
	 * @var int
	 */
	private static $default_sm = 576;

	/**
	 * Tablet Breakpoint.
	 *
	 * @var int
	 */
	private static $default_md = 768;

	/**
	 * Desktop Breakpoint.
	 *
	 * @var int
	 */
	private static $default_lg = 992;

	/**
	 * Large Desktop Breakpoint.
	 *
	 * @var int
	 */
	private static $default_xl = 1200;

	/**
	 * Get Breakpoints.
	 */
	public static function get_breakpoints() {
		$xs = self::get_breakpoint_xs();
		$xs = ( ! empty( $xs ) && $xs ) ? $xs : self::$default_xs;

		$sm = self::get_breakpoint_sm();
		$sm = ( ! empty( $sm ) && $sm ) ? $sm : self::$default_sm;

		$md = self::get_breakpoint_md();
		$md = ( ! empty( $md ) && $md ) ? $md : self::$default_md;

		$lg = self::get_breakpoint_lg();
		$lg = ( ! empty( $lg ) && $lg ) ? $lg : self::$default_lg;

		$xl = self::get_breakpoint_xl();
		$xl = ( ! empty( $xl ) && $xl ) ? $xl : self::$default_xl;

		return array(
			$xs,
			$sm,
			$md,
			$lg,
			$xl,
		);
	}

	/**
	 * Get default breakpoints.
	 *
	 * @return array
	 */
	public static function get_default_breakpoints() {
		return array(
			'xs' => self::get_default_breakpoint_xs(),
			'sm' => self::get_default_breakpoint_sm(),
			'md' => self::get_default_breakpoint_md(),
			'lg' => self::get_default_breakpoint_lg(),
			'xl' => self::get_default_breakpoint_xl(),
		);
	}

	/**
	 * Get Default Extra Small Breakpoint.
	 *
	 * @return int
	 */
	public static function get_default_breakpoint_xs() {
		return apply_filters( 'vpf_default_breakpoint_xs', self::$default_xs );
	}

	/**
	 * Get Extra Small Breakpoint.
	 *
	 * @return int
	 */
	public static function get_breakpoint_xs() {
		return apply_filters( 'vpf_breakpoint_xs', self::get_default_breakpoint_xs() );
	}

	/**
	 * Get Default Mobile Breakpoint.
	 *
	 * @return int
	 */
	public static function get_default_breakpoint_sm() {
		return apply_filters( 'vpf_default_breakpoint_sm', self::$default_sm );
	}

	/**
	 * Get Mobile Breakpoint.
	 *
	 * @return int
	 */
	public static function get_breakpoint_sm() {
		return apply_filters( 'vpf_breakpoint_sm', self::get_default_breakpoint_sm() );
	}

	/**
	 * Get Default Tablet Breakpoint.
	 *
	 * @return int
	 */
	public static function get_default_breakpoint_md() {
		return apply_filters( 'vpf_default_breakpoint_md', self::$default_md );
	}

	/**
	 * Get Tablet Breakpoint.
	 *
	 * @return int
	 */
	public static function get_breakpoint_md() {
		return apply_filters( 'vpf_breakpoint_md', self::get_default_breakpoint_md() );
	}

	/**
	 * Get Default Desktop Breakpoint.
	 *
	 * @return int
	 */
	public static function get_default_breakpoint_lg() {
		return apply_filters( 'vpf_default_breakpoint_lg', self::$default_lg );
	}

	/**
	 * Get Desktop Breakpoint.
	 *
	 * @return int
	 */
	public static function get_breakpoint_lg() {
		return apply_filters( 'vpf_breakpoint_lg', self::get_default_breakpoint_lg() );
	}

	/**
	 * Get Default Large Desktop Breakpoint.
	 *
	 * @return int
	 */
	public static function get_default_breakpoint_xl() {
		return apply_filters( 'vpf_default_breakpoint_xl', self::$default_xl );
	}

	/**
	 * Get Large Desktop Breakpoint.
	 *
	 * @return int
	 */
	public static function get_breakpoint_xl() {
		return apply_filters( 'vpf_breakpoint_xl', self::get_default_breakpoint_xl() );
	}
}
