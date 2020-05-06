/**
 * Internal dependencies
 */
import controlGetValue from '../control-get-value';

/**
 * Compare 2 values
 *
 * @param {mixed} left Left value.
 * @param {string} operator Operator.
 * @param {mixed} right Right value.
 *
 * @returns {boolean}
 */
function compare( left, operator, right ) {
    let checkResult = true;

    switch ( operator ) {
    case '==':
        // eslint-disable-next-line
        checkResult = left == right;
        break;
    case '===':
        checkResult = left === right;
        break;
    case '!=':
        // eslint-disable-next-line
        checkResult = left != right;
        break;
    case '!==':
        checkResult = left !== right;
        break;
    case '*=':
        checkResult = -1 !== left.indexOf( right );
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
 * @param {Object} condition - condition params.
 * @param {Object} attributes - block attributes.
 * @param {String} relation - Can be one of 'AND' or 'OR'.
 *
 * @returns {Boolean} is check pass.
 */
export default function conditionCheck( condition, attributes, relation = 'AND' ) {
    // by default result will be TRUE for relation AND
    // and FALSE for relation OR.
    let result = 'AND' === relation;

    const childRelation = result ? 'OR' : 'AND';

    condition.forEach( ( data ) => {
        if ( Array.isArray( data ) && ! data.control ) {
            result = compare( result, relation, conditionCheck( data, attributes, childRelation ) );
        } else if ( data.control ) {
            let left = controlGetValue( data.control, attributes );
            const operator = data.operator || '==';
            let right = 'undefined' !== typeof data.value ? data.value : 'true';

            if ( 'true' === left ) {
                left = true;
            } else if ( 'false' === left ) {
                left = false;
            }

            if ( 'true' === right ) {
                right = true;
            } else if ( 'false' === right ) {
                right = false;
            }

            result = compare( result, relation, compare( left, operator, right ) );
        }
    } );

    return result;
}
