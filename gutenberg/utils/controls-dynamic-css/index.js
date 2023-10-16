import { merge } from 'lodash';

import { applyFilters } from '@wordpress/hooks';

import conditionCheck from '../control-condition-check';
import { maybeDecode } from '../encode-decode';

const { controls: registeredControls } = window.VPGutenbergVariables;

/**
 * Prepare styles from params
 * Params example:
  array(
  'element'  => '$ .inner-selector',
  'property' => 'height',
  'mask'     => '$px',
  )
 *
 * @param {string} selector CSS selector.
 * @param {Mixed}  value    Property value.
 * @param {Array}  params   Output params.
 *
 * @return {string}
 */
export function prepareStylesFromParams(selector, value, params) {
	if (
		!selector ||
		typeof value === 'undefined' ||
		value === '' ||
		value === null ||
		typeof params.property === 'undefined'
	) {
		return false;
	}

	// Value mask.
	if (typeof params.mask !== 'undefined') {
		value = params.mask.replace('$', value);
	}

	// Custom selector mask.
	if (typeof params.element !== 'undefined' && /\$/g.test(params.element)) {
		selector = params.element.replace('$', selector);
	} else {
		selector +=
			typeof params.element !== 'undefined' ? ` ${params.element}` : '';
	}

	return {
		[selector]: {
			[params.property]: value,
		},
	};
}

/**
 * Check if these control has dynamic CSS.
 *
 * @param {string} controlName control name.
 *
 * @return {boolean}
 */
export function hasDynamicCSS(controlName) {
	return (
		typeof registeredControls[controlName] !== 'undefined' &&
		typeof registeredControls[controlName].style !== 'undefined' &&
		registeredControls[controlName].style.length
	);
}

/**
 * Get dynamic CSS from options.
 *
 * @param {Array} options block options.
 *
 * @return {string}
 */
export default function getDynamicCSS(options) {
	let result = '';
	let selector = '';

	if (typeof options.block_id !== 'undefined' && options.block_id) {
		selector = options.block_id;
	} else if (typeof options.id !== 'undefined' && options.id) {
		selector = options.id;
	}
	if (!selector) {
		return result;
	}

	selector = `.vp-id-${selector}`;
	let controlStylesObject = {};

	// Controls styles.
	Object.keys(registeredControls).forEach((k) => {
		const control = registeredControls[k];
		let allow = typeof control.style !== 'undefined' && control.style;

		// Check condition.
		if (
			allow &&
			typeof control.condition !== 'undefined' &&
			control.condition.length
		) {
			allow = conditionCheck(control.condition, options);
		}

		// Prepare styles.
		if (allow) {
			control.style.forEach((data) => {
				let val = options[control.name];
				val = applyFilters(
					'vpf.editor.controls-dynamic-css-value',
					val,
					options,
					control,
					selector,
					data
				);

				// Prepare Aspect Ratio control value.
				if (control.type && control.type === 'aspect_ratio' && val) {
					const ratioArray = val.split(':');

					if (ratioArray[0] && ratioArray[1]) {
						val = `${100 * (ratioArray[1] / ratioArray[0])}%`;
					}
				}

				let stylesObject = prepareStylesFromParams(selector, val, data);
				stylesObject = applyFilters(
					'vpf.editor.controls-dynamic-css-styles-object',
					stylesObject,
					selector,
					val,
					data,
					options,
					control
				);

				if (stylesObject) {
					controlStylesObject = merge(
						controlStylesObject,
						stylesObject
					);
				}
			});
		}
	});

	// Prepare CSS of controls.
	Object.keys(controlStylesObject).forEach((sel) => {
		result += `${sel} {\n`;

		Object.keys(controlStylesObject[sel]).forEach((prop) => {
			result += `  ${prop}: ${controlStylesObject[sel][prop]};\n`;
		});

		result += `}\n`;
	});

	// Custom CSS.
	if (typeof options.custom_css !== 'undefined' && options.custom_css) {
		let customCss = options.custom_css;

		// Decode.
		customCss = maybeDecode(customCss);

		// replace 'selector' to actual css selector.
		customCss = customCss.replace(/selector/g, selector);

		// a little security fix.
		customCss = customCss.replace(/<\//g, '&lt;/');

		result += customCss;
	}

	return result;
}
