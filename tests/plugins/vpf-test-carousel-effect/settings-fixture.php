<?php
add_filter(
	'vpf_settings_fields',
	function ( $fields ) {
		$condition = array(
			array(
				'control' => '[type="checkbox"][name="vp_general[register_portfolio_post_type]"]',
			),
		);
		foreach ( array( 'extension_text', 'extension_callback', 'extension_custom' ) as $name ) {
			$field = array(
				'name'      => $name,
				'label'     => $name,
				'type'      => 'text',
				'condition' => $condition,
			);
			if ( 'extension_callback' === $name ) {
				$field['callback'] = function ( $args ) {
					$value = get_option( $args['section'], array() )[ $args['id'] ] ?? '';
					printf( '<input id="vp_general[extension_callback]" name="vp_general[extension_callback]" value="%s">', esc_attr( $value ) );
				};
			}
			if ( 'extension_custom' === $name ) {
				$field['class'] = 'extension-custom-row';
			}
			$fields['vp_general'][] = $field;
		}
		$fields['vp_images'][0]['label'] = esc_html( "L'image & loading" );
		$fields['vp_images'][0]['options']['full'] = esc_html( 'Images & backgrounds' );
		return $fields;
	}
);

add_action(
	'admin_init',
	function () {
		add_settings_field(
			'extension_direct',
			'Extension direct',
			function () {
				$value = get_option( 'vp_general', array() )['extension_direct'] ?? '';
				printf( '<input id="extension_direct" name="vp_general[extension_direct]" value="%s">', esc_attr( $value ) );
			},
			'vp_general',
			'vp_general',
			array( 'label_for' => 'extension_direct' )
		);
	},
	100
);

add_filter( 'pre_option_vp_popup_gallery', function () { return array( 'loop' => 'on' ); } );
add_filter(
	'vpf_settings_fields',
	function ( $fields ) {
		$fields['vp_general'][] = array(
			'name' => 'extension_pro_condition',
			'label' => 'Pro-dependent extension field',
			'type' => 'text',
			'condition' => array( array( 'control' => '[type="checkbox"][name="vp_popup_gallery[loop]"]' ) ),
		);
		return $fields;
	}
);
