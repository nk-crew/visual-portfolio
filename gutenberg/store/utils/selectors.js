import conditionCheck from '../../utils/control-condition-check';
import controlGetValue from '../../utils/control-get-value';
import getDynamicCSS, {
	hasDynamicCSS,
	prepareStylesFromParams,
} from '../../utils/controls-dynamic-css';
import { maybeDecode, maybeEncode } from '../../utils/encode-decode';
import getControlNameClassName from '../../utils/get-control-name-class-name';

export function get() {
	return {
		conditionCheck,
		controlGetValue,
		getControlNameClassName,
		prepareStylesFromParams,
		hasDynamicCSS,
		getDynamicCSS,
		maybeEncode,
		maybeDecode,
	};
}
