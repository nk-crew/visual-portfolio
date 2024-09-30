<?php
/**
 * Fancybox script.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Fancybox
 */
class Visual_Portfolio_Fancybox {
	/**
	 * Visual_Portfolio_Fancybox constructor.
	 */
	public function __construct() {
		add_action( 'wp_enqueue_scripts', array( $this, 'wp_enqueue_scripts' ), 20 );
	}

	/**
	 * A temporary fix for possible XSS reported by Wordfence.
	 * CVE ID: CVE-2024-5020
	 */
	public function wp_enqueue_scripts() {
		$wp_scripts       = wp_scripts();
		$fancybox_handler = 'fancybox';

		if ( ! isset( $wp_scripts->registered[ $fancybox_handler ] ) ) {
			return;
		}

		wp_add_inline_script(
			$fancybox_handler,
			'(function($){
                if (!$) {
                    return;
                }

				function escAttr(text) {
					return text.replace(/&/g, "&amp;")
						.replace(/</g, "&lt;")
						.replace(/>/g, "&gt;")
						.replace(/"/g, "&quot;")
						.replace(/"/g, "&#039;");
				}

				$(document).on("click", "[data-fancybox]", function (e) {
					const $this = $(this);
					const caption = $this.attr("data-caption");

					if (caption) {
						$this.attr("data-caption", escAttr(caption));
					}
				});
            }(window.jQuery));',
			'before'
		);
	}
}

new Visual_Portfolio_Fancybox();
