import { buildQueryString } from '@wordpress/url';

export default function requestDynamicControl(
	controlName,
	attributes,
	additionalData,
	signal
) {
	const { ajaxurl, VPGutenbergVariables } = window;
	const body = new URLSearchParams(
		buildQueryString({
			action: 'vp_dynamic_control_callback',
			nonce: VPGutenbergVariables.nonce,
			vp_control_name: controlName,
			vp_attributes: attributes,
			...additionalData,
		})
	);

	return fetch(ajaxurl, { method: 'POST', body, signal })
		.then((response) => response.json())
		.then((data) => data?.response)
		.catch(() => null);
}
