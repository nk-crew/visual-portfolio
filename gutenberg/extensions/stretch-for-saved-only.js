import { addFilter } from '@wordpress/hooks';

// Allow Stretch control on Saved Layouts editor only.
addFilter(
	'vpf.editor.controls-render-data',
	'vpf/editor/controls-render-data/customize-controls',
	(data) => {
		if (data.name === 'stretch' && !window.VPSavedLayoutVariables) {
			data = {
				...data,
				skip: true,
			};
		}

		return data;
	}
);
