import { RawHTML } from '@wordpress/element';

const { controls: registeredControls } = window.VPGutenbergVariables;

export default Object.keys(registeredControls.layout.options).map((name) => {
	const data = registeredControls.layout.options[name];

	return {
		// If we don't set the isDefault, our main block will be visible in inserter.
		// Sometimes users requested this as they are confused it first start.
		// isDefault: registeredControls.layout.default === data.value,
		name: data.value,
		attributes: { layout: data.value },
		title: data.title,
		icon: data.icon
			? {
					foreground: '#2540CC',
					src: <RawHTML>{data.icon}</RawHTML>,
			  }
			: null,
	};
}) || [];
