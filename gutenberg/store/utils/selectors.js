import conditionCheck from '../../utils/control-condition-check';
import controlGetValue from '../../utils/control-get-value';
import getDynamicCSS, {
	hasDynamicCSS,
	prepareStylesFromParams,
} from '../../utils/controls-dynamic-css';
import { maybeDecode, maybeEncode } from '../../utils/encode-decode';

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
