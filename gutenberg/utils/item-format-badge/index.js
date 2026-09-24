/**
 * WordPress dependencies
 */
import {
	SelectControl,
	ToggleControl,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

// The icons of `templates/icons/`, the ones the render callback prints.
const BADGES = {
	video: {
		label: __('Video', 'visual-portfolio'),
		icon: (
			<path
				d="M18.0148 9.60849L18.0156 9.60899C18.0933 9.65614 18.1527 9.71825 18.192 9.78626C18.231 9.85396 18.25 9.9269 18.25 9.99878C18.25 10.0707 18.231 10.1436 18.192 10.2113C18.1527 10.2793 18.0933 10.3414 18.0156 10.3886L18.0147 10.3891L3.60097 19.1652C3.60095 19.1652 3.60092 19.1652 3.6009 19.1653C3.5176 19.2159 3.41818 19.2461 3.31321 19.2497C3.2082 19.2532 3.10598 19.2297 3.01788 19.1842C2.93 19.1388 2.86196 19.0746 2.81681 19.0027C2.77201 18.9313 2.75023 18.8534 2.75 18.7768V18.7752V1.22319C2.75023 1.14655 2.77201 1.06867 2.81681 0.99731C2.86196 0.925405 2.93 0.86122 3.01788 0.815814C3.10597 0.770298 3.20819 0.746811 3.31321 0.750348C3.41815 0.753884 3.51754 0.78411 3.60081 0.834682C3.60086 0.834714 3.60092 0.834746 3.60097 0.834778L18.0148 9.60849Z"
				stroke="currentColor"
				strokeWidth="1.5"
				fill="transparent"
			/>
		),
	},
	audio: {
		label: __('Audio', 'visual-portfolio'),
		icon: (
			<>
				<path
					d="M7 16V3L19 1V14"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					fill="transparent"
				/>
				<path
					d="M4 19C5.65685 19 7 17.6569 7 16C7 14.3431 5.65685 13 4 13C2.34315 13 1 14.3431 1 16C1 17.6569 2.34315 19 4 19Z"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					fill="transparent"
				/>
				<path
					d="M16 17C17.6569 17 19 15.6569 19 14C19 12.3431 17.6569 11 16 11C14.3431 11 13 12.3431 13 14C13 15.6569 14.3431 17 16 17Z"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					fill="transparent"
				/>
			</>
		),
	},
	gallery: {
		label: __('Gallery', 'visual-portfolio'),
		icon: (
			<>
				<path
					d="M16.0428 14.3315V1.71123C16.0428 0.748663 15.2941 0 14.3315 0H1.71123C0.748663 0 0 0.748663 0 1.71123V14.3315C0 15.2941 0.748663 16.0428 1.71123 16.0428H14.3315C15.2941 16.0428 16.0428 15.2941 16.0428 14.3315ZM1.60428 1.71123C1.60428 1.60428 1.71123 1.60428 1.71123 1.60428H14.3315C14.4385 1.60428 14.4385 1.71123 14.4385 1.71123V9.62567L11.9786 7.80749C11.6578 7.59358 11.3369 7.59358 11.016 7.80749L7.91444 10.0535L5.34759 8.87701C5.13369 8.77005 4.81283 8.77005 4.59893 8.87701L1.49733 10.4813V1.71123H1.60428ZM1.60428 14.3315V12.4064L5.02674 10.5882L7.59358 11.8717C7.80749 11.9786 8.12834 11.9786 8.4492 11.7647L11.4438 9.62567L14.4385 11.7647V14.4385C14.4385 14.5455 14.3315 14.5455 14.3315 14.5455H1.71123C1.71123 14.4385 1.60428 14.3315 1.60428 14.3315Z"
					fill="currentColor"
				/>
				<path
					fillRule="evenodd"
					clipRule="evenodd"
					d="M19.25 5.75C19.6642 5.75 20 6.08579 20 6.5C20 6.91421 20 17.25 20 17.25C20 18.7688 18.7688 20 17.25 20H4.27C3.85579 20 3.52 19.6642 3.52 19.25C3.52 18.8358 3.85579 18.5 4.27 18.5H17.25C17.9404 18.5 18.5 17.9404 18.5 17.25C18.5 17.25 18.5 6.91421 18.5 6.5C18.5 6.08579 18.8358 5.75 19.25 5.75Z"
					fill="currentColor"
				/>
			</>
		),
	},
};

export const FORMAT_BADGE_DEFAULTS = {
	showFormatBadge: false,
	formatBadgePosition: 'top-right',
};

const POSITIONS = [
	{ value: 'top-left', label: __('Top left', 'visual-portfolio') },
	{ value: 'top-right', label: __('Top right', 'visual-portfolio') },
	{ value: 'bottom-left', label: __('Bottom left', 'visual-portfolio') },
	{ value: 'bottom-right', label: __('Bottom right', 'visual-portfolio') },
];

/**
 * The badge of an item that is not a still picture, as the page prints it.
 *
 * @param {Object} props          - component props.
 * @param {string} props.format   - item format.
 * @param {string} props.position - corner of the picture.
 * @return {Element|null} badge.
 */
export function ItemFormatBadge({ format, position }) {
	const badge = BADGES[format];

	if (!badge) {
		return null;
	}

	return (
		<span
			className={`vp-item-format-badge is-position-${position}`}
			role="img"
			aria-label={badge.label}
		>
			<svg
				className="vp-svg-icon"
				width="20"
				height="20"
				viewBox="0 0 20 20"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				{badge.icon}
			</svg>
		</span>
	);
}

/**
 * The badge switch and its corner, for the Settings panel of an item block.
 *
 * @param {Object}   props               - component props.
 * @param {Object}   props.attributes    - block attributes.
 * @param {Function} props.setAttributes - block attribute setter.
 * @param {string}   props.panelId       - tools panel id.
 * @return {Element} panel items.
 */
export function FormatBadgeSettings({ attributes, setAttributes, panelId }) {
	const { showFormatBadge, formatBadgePosition } = attributes;

	return (
		<ToolsPanelItem
			label={__('Format badge', 'visual-portfolio')}
			hasValue={() => !!showFormatBadge}
			onDeselect={() => setAttributes(FORMAT_BADGE_DEFAULTS)}
			panelId={panelId}
		>
			<ToggleControl
				label={__('Format badge', 'visual-portfolio')}
				help={__(
					'Marks video, audio and gallery items with an icon.',
					'visual-portfolio'
				)}
				checked={!!showFormatBadge}
				onChange={(value) => setAttributes({ showFormatBadge: value })}
			/>
			{showFormatBadge && (
				<SelectControl
					label={__('Badge position', 'visual-portfolio')}
					value={formatBadgePosition}
					options={POSITIONS}
					onChange={(value) =>
						setAttributes({ formatBadgePosition: value })
					}
				/>
			)}
		</ToolsPanelItem>
	);
}
