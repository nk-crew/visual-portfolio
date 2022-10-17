/**
 * Internal dependencies
 */
import conditionCheck from '../../utils/control-condition-check';
import controlGetValue from '../../utils/control-get-value';
import getParseBlocks from '../../utils/get-parse-blocks';

export function get() {
  return {
    conditionCheck,
    controlGetValue,
    getParseBlocks,
  };
}
