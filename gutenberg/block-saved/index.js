import './style.scss';

import { createBlock, registerBlockType } from '@wordpress/blocks';
import { useDispatch } from '@wordpress/data';

import metadata from './block.json';
import edit from './edit';
import save from './save';
import transforms from './transforms';

const { name, title } = metadata;

const settings = {
	icon: {
		foreground: '#2540CC',
		src: (
			<svg
				width="20"
				height="20"
				viewBox="0 0 20 20"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<mask
					id="mask0"
					// eslint-disable-next-line react/no-unknown-property
					mask-type="alpha"
					maskUnits="userSpaceOnUse"
					x="9"
					y="8"
					width="5"
					height="6"
				>
					<path
						d="M11.1409 14L13.0565 8.49994H11.2789L9.55397 14H11.1409Z"
						fill="url(#paint0_linear)"
					/>
				</mask>
				<g mask="url(#mask0)">
					<path
						d="M11.1409 14L13.0565 8.49994H11.2789L9.55397 14H11.1409Z"
						fill="currentColor"
					/>
				</g>
				<path
					d="M8.90795 14L6.9923 8.49994H8.76989L10.4948 14H8.90795Z"
					fill="currentColor"
				/>
				<path
					d="M19 16.2222C19 16.6937 18.8104 17.1459 18.4728 17.4793C18.1352 17.8127 17.6774 18 17.2 18H2.8C2.32261 18 1.86477 17.8127 1.52721 17.4793C1.18964 17.1459 1 16.6937 1 16.2222V3.77778C1 3.30628 1.18964 2.8541 1.52721 2.5207C1.86477 2.1873 2.32261 2 2.8 2H7.3L9.1 4.66667H17.2C17.6774 4.66667 18.1352 4.85397 18.4728 5.18737C18.8104 5.52076 19 5.97295 19 6.44444V16.2222Z"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					fill="transparent"
				/>
				<defs>
					<linearGradient
						id="paint0_linear"
						x1="12.191"
						y1="8.49994"
						x2="7.44436"
						y2="15.1301"
						gradientUnits="userSpaceOnUse"
					>
						<stop />
						<stop offset="1" stopOpacity="0" />
					</linearGradient>
				</defs>
			</svg>
		),
	},
	edit,
	save,
	transforms,
};

registerBlockType(name, settings);

// Fallback.
registerBlockType('nk/visual-portfolio', {
	...settings,
	title,
	name: 'nk/visual-portfolio',
	attributes: {
		id: {
			type: 'string',
		},
		align: {
			type: 'string',
		},
		className: {
			type: 'string',
		},
		anchor: {
			type: 'string',
		},
	},
	edit: (props) => {
		const { replaceBlocks } = useDispatch('core/block-editor');

		replaceBlocks(
			[props.clientId],
			createBlock('visual-portfolio/saved', props.attributes || {})
		);

		return null;
	},
	supports: {
		...metadata.supports,
		inserter: false,
	},
});
