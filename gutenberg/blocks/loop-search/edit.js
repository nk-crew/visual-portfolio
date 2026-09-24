/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	Disabled,
	TextControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ProLine } from '../../components/pro-teaser';
import { useLoopOrphanWarning } from '../../utils/loop-orphan-warning';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';

// Sources with no text of their items to match, where the page renders no
// search either.
const UNSEARCHABLE_SOURCES = ['social-stream', 'taxonomies'];

export default function LoopSearchEdit({ attributes, setAttributes, context }) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const { placeholder, label } = attributes;

	useLoopOrphanWarning('visual-portfolio/loop-search', context);

	const isUnsearchable = UNSEARCHABLE_SOURCES.includes(
		context?.['vp/queryType']
	);

	let notice = null;

	if (isUnsearchable) {
		notice = __(
			'Search is not available for this source, so the page shows no search field.',
			'visual-portfolio'
		);
	} else if (!window.VPGutenbergVariables?.pro) {
		// The page renders nothing without Pro, which is where the search runs.
		notice = (
			<ProLine campaign="teaser_loop_search">
				{__('Let visitors search the gallery.', 'visual-portfolio')}
			</ProLine>
		);
	}

	return (
		<>
			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'visual-portfolio')}
					resetAll={(filters) =>
						setAttributes(
							getResetAllValues(filters, {
								placeholder: '',
								label: '',
							})
						)
					}
					dropdownMenuProps={dropdownMenuProps}
				>
					{notice && (
						<p style={{ gridColumn: '1 / -1', margin: 0 }}>
							{notice}
						</p>
					)}
					<ToolsPanelItem
						label={__('Placeholder', 'visual-portfolio')}
						isShownByDefault
						hasValue={() => !!placeholder}
						onDeselect={() => setAttributes({ placeholder: '' })}
					>
						<TextControl
							label={__('Placeholder', 'visual-portfolio')}
							placeholder={__('Search…', 'visual-portfolio')}
							value={placeholder}
							onChange={(value) =>
								setAttributes({ placeholder: value })
							}
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={__('Label', 'visual-portfolio')}
						isShownByDefault
						hasValue={() => !!label}
						onDeselect={() => setAttributes({ label: '' })}
					>
						<TextControl
							label={__('Label', 'visual-portfolio')}
							help={__(
								'Read by screen readers, not shown.',
								'visual-portfolio'
							)}
							placeholder={__('Search', 'visual-portfolio')}
							value={label}
							onChange={(value) =>
								setAttributes({ label: value })
							}
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>
			<div {...useBlockProps({ className: 'vp-block-loop-search' })}>
				<Disabled>
					<input
						type="search"
						className="vp-block-loop-search__input"
						aria-label={
							label.trim() || __('Search', 'visual-portfolio')
						}
						placeholder={
							placeholder.trim() ||
							__('Search…', 'visual-portfolio')
						}
						readOnly
					/>
				</Disabled>
			</div>
		</>
	);
}
