import { debounce } from '@wordpress/compose';
import rafSchd from 'raf-schd';

const { ajaxurl, VPAdminVariables } = window;
const settingsForm = '.vpf-settings-form';
const initialStates = new WeakMap();

function getForm(form) {
	return form instanceof HTMLFormElement ? form : form?.[0];
}

function serializeSettingsForm(form) {
	const fields = [];
	for (const [name, value] of new FormData(form)) {
		if (typeof value === 'string') {
			fields.push({ name, value: value.replace(/\r?\n/g, '\r\n') });
		}
	}
	return JSON.stringify(fields);
}

function updateSettingsSubmitState(form) {
	const initialState = initialStates.get(form);
	if (initialState === undefined) {
		return;
	}
	const disabled = serializeSettingsForm(form) === initialState;
	for (const button of form.querySelectorAll('.vpf-settings-submit')) {
		button.disabled = disabled;
	}
}

window.VPAdminSettingsForms = {
	getInitialState(form) {
		return JSON.parse(initialStates.get(getForm(form)) || '[]');
	},
	setInitialState(input, state) {
		const form = getForm(input);
		if (form) {
			initialStates.set(form, JSON.stringify(state));
			updateSettingsSubmitState(form);
		}
	},
	refresh(form) {
		updateSettingsSubmitState(getForm(form));
	},
	persist(input) {
		const form = getForm(input);
		if (form) {
			initialStates.set(form, serializeSettingsForm(form));
			updateSettingsSubmitState(form);
		}
	},
};

const screenOptions = document.querySelector(
	'body.vpf-admin-list-screen #screen-meta-links'
);
const header = document.querySelector('.vpf-admin-page__header');
const actions = header?.querySelector('.vpf-admin-page__actions');
if (screenOptions) {
	if (actions) {
		actions.prepend(screenOptions);
	} else {
		header?.append(screenOptions);
	}
}

for (const form of document.querySelectorAll(settingsForm)) {
	window.VPAdminSettingsForms.persist(form);
}

for (const event of ['input', 'change', 'vpf_settings_form_updated']) {
	document.body.addEventListener(event, ({ target }) => {
		updateSettingsSubmitState(target.closest?.(settingsForm));
	});
}

document.body.addEventListener('vpf_settings_form_persisted', ({ target }) => {
	window.VPAdminSettingsForms.persist(target.closest?.(settingsForm));
});

// Older Pro releases emit synthetic form events through jQuery.
window
	.jQuery?.(document.body)
	.on('input change', `${settingsForm} :input`, function (event) {
		if (!event.originalEvent)
			updateSettingsSubmitState(this.closest(settingsForm));
	})
	.on('vpf_settings_form_updated', settingsForm, function (event) {
		if (!event.originalEvent) updateSettingsSubmitState(this);
	})
	.on('vpf_settings_form_persisted', settingsForm, function (event) {
		if (!event.originalEvent) window.VPAdminSettingsForms.persist(this);
	});

const shortcode =
	'[name="vp_list_shortcode"], [name="vp_filter_shortcode"], [name="vp_sort_shortcode"]';
const selectable = '.vp-onclick-selection';
document.body.addEventListener('focusin', ({ target }) => {
	target.closest?.(shortcode)?.select();
});
document.body.addEventListener('click', ({ target }) => {
	const field = target.closest?.(selectable);
	if (field) window.getSelection().selectAllChildren(field);
});
for (const type of ['copy', 'cut']) {
	document.body.addEventListener(type, (event) => {
		if (!event.target.closest?.(selectable)) return;
		const text = window
			.getSelection()
			.toString()
			.replace(/[\n\r]+/g, '');
		event.clipboardData.setData('text/plain', text);
		event.preventDefault();
	});
}

const videoMetabox = document.querySelector('#vp_format_video');
const videoFormat = document.querySelector('#post-format-video');
function updateVideoMetabox() {
	videoMetabox.style.display = videoFormat.checked ? '' : 'none';
}
if (videoMetabox && videoFormat) updateVideoMetabox();

let embedRequest;
const requestEmbed = debounce(
	300,
	rafSchd(async (field, preview, request) => {
		const data = await fetch(ajaxurl, {
			method: 'POST',
			body: new URLSearchParams({
				action: 'vp_find_oembed',
				q: field.value,
				nonce: VPAdminVariables.nonce,
			}),
			signal: request.signal,
		})
			.then((response) => response.json())
			.catch(() => null);

		if (request === embedRequest && typeof data?.html === 'string') {
			preview.innerHTML = data.html;
		}
	})
);

for (const event of ['change', 'input']) {
	document.body.addEventListener(event, ({ target }) => {
		if (!target.matches?.('.vp-input[name="_vp_format_video_url"]')) return;
		const preview = target.nextElementSibling;
		if (!preview?.matches('.vp-oembed-preview')) return;
		embedRequest?.abort();
		embedRequest = new AbortController();
		preview.replaceChildren();
		if (target.value) requestEmbed(target, preview, embedRequest);
	});
}

document.body.addEventListener('change', ({ target }) => {
	if (
		videoMetabox &&
		videoFormat &&
		target.matches?.('[name="post_format"]')
	) {
		updateVideoMetabox();
	}
	if (
		target.matches?.(
			'input[name="vp_general[register_portfolio_post_type]"]'
		) &&
		!target.checked &&
		!window.confirm(
			"Are you sure you want to turn off the Portfolio custom post type and related taxonomies? Make sure you don't use this post type on your site, otherwise you might see errors on the frontend."
		)
	) {
		target.checked = true;
	}
});
