/**
 * Internal dependencies
 */
import conditionCheck from '../../utils/control-condition-check';
import controlGetValue from '../../utils/control-get-value';
import getDynamicCSS, {
  prepareStylesFromParams,
  hasDynamicCSS,
} from '../../utils/controls-dynamic-css';
import { maybeEncode, maybeDecode } from '../../utils/encode-decode';

export function get() {
  return {
    conditionCheck,
    controlGetValue,
    prepareStylesFromParams,
    hasDynamicCSS,
    getDynamicCSS,
    maybeEncode,
    maybeDecode,
  };
}
