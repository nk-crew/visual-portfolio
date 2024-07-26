/**
 * async version of Array.find()
 * returns the first element in the provided array that satisfies the provided testin function
 *
 * @param {Array}    array         your test array
 * @param {Function} asyncCallback callback
 * @return {Promise.<any | undefined>} first element that passed the test
 */
export async function findAsyncSequential(array, asyncCallback) {
	for (const element of array) {
		if (await asyncCallback(element)) {
			return element;
		}
	}
}
