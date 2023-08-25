export function apiFetch(request) {
	return {
		type: 'API_FETCH',
		request,
	};
}

export function setBlockData(data) {
	return {
		type: 'SET_BLOCK_DATA',
		data,
	};
}

export function updateBlockData(data) {
	return {
		type: 'UPDATE_BLOCK_DATA',
		data,
	};
}
