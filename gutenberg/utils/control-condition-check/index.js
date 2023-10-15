import controlGetValue from '../control-get-value';

/**
 * Compare 2 values
 *
 * @param {mixed}  left     Left value.
 * @param {string} operator Operator.
 * @param {mixed}  right    Right value.
 *
 * @return {boolean}
 */
function compare(left, operator, right) {
	let checkResult = true;

	switch (operator) {
		case '==':
			// eslint-disable-next-line eqeqeq
			checkResult = left == right;
			break;
		case '===':
			checkResult = left === right;
			break;
		case '!=':
			// eslint-disable-next-line eqeqeq
			checkResult = left != right;
			break;
		case '!==':
			checkResult = left !== right;
			break;
		case '*=':
			checkResult = left.indexOf(right) !== -1;
			break;
		case '>=':
			checkResult = left >= right;
			break;
		case '<=':
			checkResult = left <= right;
			break;
		case '>':
			checkResult = left > right;
			break;
		case '<':
			checkResult = left < right;
			break;
		case '&&':
		case 'AND':
			checkResult = left && right;
			break;
		case '||':
		case 'OR':
			checkResult = left || right;
			break;
		default:
			checkResult = left;
			break;
	}

	return checkResult;
}

/**
 * Conditions check for controls.
 *
 * @param {Object} condition  - condition params.
 * @param {Object} attributes - block attributes.
 * @param {string} relation   - Can be one of 'AND' or 'OR'.
 *
 * @return {boolean} is check pass.
 */
export default function conditionCheck(
	condition,
	attributes,
	relation = 'AND'
) {
	// by default result will be TRUE for relation AND
	// and FALSE for relation OR.
	let result = relation === 'AND';

	const childRelation = result ? 'OR' : 'AND';

	condition.forEach((data) => {
		if (Array.isArray(data) && !data.control) {
			result = compare(
				result,
				relation,
				conditionCheck(data, attributes, childRelation)
			);
		} else if (data.control) {
			let left = controlGetValue(data.control, attributes);
			const operator = data.operator || '==';
			let right = typeof data.value !== 'undefined' ? data.value : 'true';

			if (left === 'true') {
				left = true;
			} else if (left === 'false') {
				left = false;
			}

			if (right === 'true') {
				right = true;
			} else if (right === 'false') {
				right = false;
			}

			result = compare(result, relation, compare(left, operator, right));
		}
	});

	return result;
}
