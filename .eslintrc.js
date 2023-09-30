module.exports = {
	extends: ['plugin:@wordpress/eslint-plugin/recommended'],
	rules: {
		'@wordpress/no-unsafe-wp-apis': 0,
		'@wordpress/i18n-translator-comments': 0,
		'jsdoc/no-undefined-types': 0,
		'jsdoc/require-param-type': 0,
		'jsdoc/require-returns-description': 0,
		'react-hooks/rules-of-hooks': 0,
		'jsdoc/check-param-names': 0,
	},
};
