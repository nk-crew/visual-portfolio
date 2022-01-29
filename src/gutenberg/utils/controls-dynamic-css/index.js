/* eslint-disable no-param-reassign */
/**
 * Internal dependencies
 */
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
 * @param {String} selector CSS selector.
 * @param {Mixed}  value Property value.
 * @param {Array}  params Output params.
 *
 * @returns {String}
 */
export function prepareStylesFromParams(selector, value, params) {
  let result = '';

  if (
    !selector ||
    typeof value === 'undefined' ||
    value === '' ||
    value === null ||
    typeof params.property === 'undefined'
  ) {
    return result;
  }

  // Value mask.
  if (typeof params.mask !== 'undefined') {
    value = params.mask.replace('$', value);
  }

  // Custom selector mask.
  if (typeof params.element !== 'undefined' && /\$/g.test(params.element)) {
    selector = params.element.replace('$', selector);
  } else {
    selector += typeof params.element !== 'undefined' ? ` ${params.element}` : '';
  }

  // Prepare CSS.
  result = `${selector} { ${params.property}: ${value}; } `;

  return result;
}

/**
 * Check if these control has dynamic CSS.
 *
 * @param {String} controlName control name.
 *
 * @returns {Boolean}
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
 * @returns {String}
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

  // Controls styles.
  Object.keys(registeredControls).forEach((k) => {
    const control = registeredControls[k];
    let allow = typeof control.style !== 'undefined' && control.style;

    // Check condition.
    if (allow && typeof control.condition !== 'undefined' && control.condition.length) {
      allow = conditionCheck(control.condition, options);
    }

    // Prepare styles.
    if (allow) {
      control.style.forEach((data) => {
        let val = options[control.name];

        // Prepare Aspect Ratio control value.
        if (control.type && control.type === 'aspect_ratio' && val) {
          const ratioArray = val.split(':');

          if (ratioArray[0] && ratioArray[1]) {
            val = `${100 * (ratioArray[1] / ratioArray[0])}%`;
          }
        }

        result += prepareStylesFromParams(selector, val, data);
      });
    }
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
