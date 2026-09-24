/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	PlainText,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	TextControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * External dependencies
 */

/**
 * Internal dependencies
 */
import { ProTeaserPanel } from '../../components/pro-teaser';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';

// The infinite scroll settings Pro adds, for an install without them.
const INFINITE_TEASERS = [
	{
		name: 'startupLoadMore',
		label: __('Load More on startup', 'visual-portfolio'),
		line: __(
			'Load the next page as soon as the gallery is shown.',
			'visual-portfolio'
		),
		campaign: 'teaser_infinite_startup',
	},
	{
		name: 'everyPage',
		label: __('Pause every', 'visual-portfolio'),
		line: __(
			'Stop after a few pages and wait for a click.',
			'visual-portfolio'
		),
		campaign: 'teaser_infinite_pause',
	},
	{
		name: 'threshold',
		label: __('Threshold Distance', 'visual-portfolio'),
		line: __(
			'How far from the end of the gallery the next page starts to load.',
			'visual-portfolio'
		),
		campaign: 'teaser_infinite_threshold',
	},
];

export default function Edit({ attributes, setAttributes }) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const { triggerType, label, loadingLabel } = attributes;

	const isInfinite = 'infinite' === triggerType;

	return (
		<>
			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'visual-portfolio')}
					resetAll={(filters) =>
						setAttributes(
							getResetAllValues(filters, {
								loadingLabel: undefined,
							})
						)
					}
					dropdownMenuProps={dropdownMenuProps}
				>
					<ToolsPanelItem
						label={__('Loading text', 'visual-portfolio')}
						isShownByDefault
						hasValue={() => !!loadingLabel}
						onDeselect={() =>
							setAttributes({ loadingLabel: undefined })
						}
						resetAllFilter={() => ({ loadingLabel: undefined })}
					>
						<TextControl
							label={__('Loading text', 'visual-portfolio')}
							help={__(
								'Announced to screen readers while the next items are loading.',
								'visual-portfolio'
							)}
							value={loadingLabel || ''}
							placeholder={__('Loading...', 'visual-portfolio')}
							onChange={(newLabel) =>
								setAttributes({ loadingLabel: newLabel })
							}
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>
			{isInfinite && (
				<ProTeaserPanel
					label={__('Infinite Scroll', 'visual-portfolio')}
					items={INFINITE_TEASERS}
				/>
			)}

			<a
				href="#pagination-trigger-pseudo-link"
				onClick={(event) => event.preventDefault()}
				{...useBlockProps({
					className: 'vp-block-loop-pagination-trigger',
				})}
			>
				<PlainText
					__experimentalVersion={2}
					tagName="span"
					aria-label={
						isInfinite
							? __('Infinite scroll trigger', 'visual-portfolio')
							: __('Load more link', 'visual-portfolio')
					}
					placeholder={__('Load More', 'visual-portfolio')}
					value={label}
					onChange={(newLabel) => setAttributes({ label: newLabel })}
				/>
			</a>
		</>
	);
}
