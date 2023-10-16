export default {
	from: [
		{
			type: 'shortcode',
			tag: 'visual_portfolio',
			attributes: {
				id: {
					type: 'string',
					shortcode: (data) => data.named.id,
				},
				className: {
					type: 'string',
					shortcode: (data) => data.named.class,
				},
			},
		},
	],
};
