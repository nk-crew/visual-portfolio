import apiFetch from '@wordpress/api-fetch';

export function API_FETCH({ request }) {
	return apiFetch(request)
		.catch((fetchedData) => {
			if (
				fetchedData &&
				fetchedData.error &&
				fetchedData.error_code === 'no_layouts_found'
			) {
				return {
					response: [],
					error: false,
					success: true,
				};
			}

			return false;
		})
		.then((fetchedData) => {
			if (fetchedData && fetchedData.success && fetchedData.response) {
				return fetchedData.response;
			}
			return false;
		});
}
