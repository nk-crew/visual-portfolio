import { InspectorControls } from '@wordpress/block-editor';
import { registerBlockType } from '@wordpress/blocks';
import { Button, PanelBody } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { applyFilters } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

const { navigator } = window;

let copiedTimeout;

function ShortcodeRender(props) {
	const [copied, setCopied] = useState(false);

	return (
		<div className="vpf-layout-shortcode-copy">
			<strong>{props.label}:</strong>
			<div>
				<pre>{props.content}</pre>
				<Button
					isSmall
					onClick={() => {
						navigator.clipboard
							.writeText(props.content)
							.then(() => {
								setCopied(true);

								clearTimeout(copiedTimeout);

								copiedTimeout = setTimeout(() => {
									setCopied(false);
								}, 450);
							});
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						fill="currentColor"
						viewBox="0 0 16 16"
					>
						<path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
						<path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" />
					</svg>
					{copied ? (
						<div className="vpf-layout-shortcode-copied">
							{__('Copied!', 'visual-portfolio')}
						</div>
					) : null}
				</Button>
			</div>
		</div>
	);
}

/**
 * Layouts Editor block
 *
 * @param props
 */
function LayoutsEditorBlock(props) {
	const { clientId } = props;

	const [additionalShortcodes, setAdditionalShortcodes] = useState(false);

	const { postId, blockData, VisualPortfolioBlockEdit } = useSelect(
		(select) => {
			const { getBlockData } = select(
				'visual-portfolio/saved-layout-data'
			);
			const { getCurrentPostId } = select('core/editor');
			const { getBlockType } = select('core/blocks');

			return {
				postId: getCurrentPostId(),
				blockData: getBlockData(),
				VisualPortfolioBlockEdit:
					getBlockType('visual-portfolio/block')?.edit ||
					(() => null),
			};
		}
	);

	const { updateBlockData } = useDispatch(
		'visual-portfolio/saved-layout-data'
	);

	let shortcodes = [
		{
			label: __('This Saved Layout', 'visual-portfolio'),
			content: `[visual_portfolio id="${postId}"]`,
		},
		{
			label: __('Filter', 'visual-portfolio'),
			content: `[visual_portfolio_filter id="${postId}" type="minimal" align="center" show_count="false" text_all="All"]`,
			isOptional: true,
		},
		{
			label: __('Sort', 'visual-portfolio'),
			content: `[visual_portfolio_sort id="${postId}" type="minimal" align="center"]`,
			isOptional: true,
		},
	];

	shortcodes = applyFilters(
		'vpf.layouts-editor.shortcodes-list',
		shortcodes,
		{ props, postId, blockData, updateBlockData, VisualPortfolioBlockEdit }
	);

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={__('Shortcodes', 'visual-portfolio')}
					scrollAfterOpen
				>
					<p>
						{__(
							'To output this saved layout and its components you can use the following shortcodes:'
						)}
					</p>
					{shortcodes.map((data) => {
						if (data.isOptional) {
							return null;
						}

						return (
							<ShortcodeRender
								key={`shortcode-${data.label}`}
								{...data}
							/>
						);
					})}
					{additionalShortcodes ? (
						<>
							{shortcodes.map((data) => {
								if (!data.isOptional) {
									return null;
								}

								return (
									<ShortcodeRender
										key={`shortcode-${data.label}`}
										{...data}
									/>
								);
							})}
							{applyFilters(
								'vpf.layouts-editor.shortcodes',
								'',
								this
							)}
						</>
					) : (
						<Button
							isLink
							onClick={() => {
								setAdditionalShortcodes(!additionalShortcodes);
							}}
						>
							{__(
								'Show Additional Shortcodes',
								'visual-portfolio'
							)}
						</Button>
					)}
				</PanelBody>
			</InspectorControls>
			<VisualPortfolioBlockEdit
				attributes={{
					...blockData,
					block_id: blockData.id || clientId,
				}}
				setAttributes={(data) => {
					updateBlockData(data);
				}}
				clientId={clientId}
			/>
		</>
	);
}

registerBlockType('visual-portfolio/saved-editor', {
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
	edit: LayoutsEditorBlock,
	save() {
		return null;
	},
});
