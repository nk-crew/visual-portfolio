import { addFilter } from '@wordpress/hooks';

const NOOPENER_DEFAULT = 'noopener noreferrer';

addFilter(
	'vpf.editor.controls-on-change',
	'vpf/editor/controls-on-change/link-rel',
	(newAttributes, control, val, attributes) => {
		if (control.name === 'items_click_action_url_target') {
			if (val === '_blank' && !attributes.items_click_action_url_rel) {
				newAttributes.items_click_action_url_rel = NOOPENER_DEFAULT;
			}
			if (
				val !== '_blank' &&
				NOOPENER_DEFAULT === attributes.items_click_action_url_rel
			) {
				newAttributes.items_click_action_url_rel = '';
			}
		}

		return newAttributes;
	}
);
