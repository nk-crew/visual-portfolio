/**
 * WordPress dependencies
 */
const { apiFetch } = wp;

export function API_FETCH( { request } ) {
    return apiFetch( request )
        .catch( ( fetchedData ) => {
            if ( fetchedData && fetchedData.error && 'no_layouts_found' === fetchedData.error_code ) {
                return {
                    response: [],
                    error: false,
                    success: true,
                };
            }

            return false;
        } )
        .then( ( fetchedData ) => {
            if ( fetchedData && fetchedData.success && fetchedData.response ) {
                return fetchedData.response;
            }
            return false;
        } );
}
