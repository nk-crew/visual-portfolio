import { InspectorControls } from '@wordpress/block-editor';
import { registerBlockType } from '@wordpress/blocks';
import { Button, PanelBody } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { applyFilters } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

import { ReactComponent as BlockIcon } from '../../block-icons/saved-layouts.svg';

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
							variant="link"
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
	title: __('Saved Layout', 'visual-portfolio'),
	icon: {
		foreground: '#2540CC',
		src: <BlockIcon width="20" height="20" />,
	},
	edit: LayoutsEditorBlock,
	save() {
		return null;
	},
});
