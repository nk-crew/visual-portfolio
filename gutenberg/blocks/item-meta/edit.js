/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	useBlockEditingMode,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	TextControl,
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';

/**
 * Internal dependencies
 */
import { getMetaTypes } from './meta-types';

export default function ItemMetaEdit({
	attributes: { metaType, showIcon, showZero, prefix, suffix, isLink },
	setAttributes,
	context,
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const blockProps = useBlockProps();
	const blockEditingMode = useBlockEditingMode();

	const metaTypes = getMetaTypes();
	const meta = metaTypes[metaType];
	const value = meta ? context[meta.contextKey] : undefined;

	// An item without the value still needs something to lay out against, and
	// the block would otherwise vanish from the item it was just dropped into.
	const previewValue =
		value === undefined || value === '' ? meta?.sample : value;

	const Icon = meta?.icon;
	const inner = meta ? (
		<>
			{showIcon && <Icon aria-hidden="true" focusable="false" />}
			<span>
				{prefix}
				{meta.getText(previewValue)}
				{suffix}
			</span>
		</>
	) : (
		// A type this install lacks, which the page prints nothing for: still
		// something to select, and not a value it does not show.
		<span className="vp-item-meta-unavailable" style={{ opacity: 0.6 }}>
			{sprintf(
				/* translators: %s: name of a meta type this site does not offer. */
				__('Unavailable meta: %s', 'visual-portfolio'),
				metaType
			)}
		</span>
	);

	return (
		<>
			{blockEditingMode === 'default' && (
				<InspectorControls>
					<ToolsPanel
						label={__('Settings', 'visual-portfolio')}
						dropdownMenuProps={dropdownMenuProps}
						resetAll={(filters) =>
							setAttributes(
								getResetAllValues(filters, {
									showIcon: true,
									showZero: false,
									prefix: '',
									suffix: '',
									isLink: false,
								})
							)
						}
					>
						<ToolsPanelItem
							label={__('Show icon', 'visual-portfolio')}
							isShownByDefault
							hasValue={() => !showIcon}
							onDeselect={() => setAttributes({ showIcon: true })}
						>
							<ToggleControl
								label={__('Show icon', 'visual-portfolio')}
								checked={showIcon}
								onChange={() =>
									setAttributes({ showIcon: !showIcon })
								}
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={__('Show empty value', 'visual-portfolio')}
							isShownByDefault
							hasValue={() => showZero}
							onDeselect={() =>
								setAttributes({ showZero: false })
							}
						>
							<ToggleControl
								label={__(
									'Show empty value',
									'visual-portfolio'
								)}
								help={__(
									'Items with nothing to show here are skipped unless this is on.',
									'visual-portfolio'
								)}
								checked={showZero}
								onChange={() =>
									setAttributes({ showZero: !showZero })
								}
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={__('Prefix text', 'visual-portfolio')}
							isShownByDefault
							hasValue={() => !!prefix}
							onDeselect={() => setAttributes({ prefix: '' })}
						>
							<TextControl
								label={__('Prefix text', 'visual-portfolio')}
								value={prefix}
								onChange={(nextPrefix) =>
									setAttributes({ prefix: nextPrefix })
								}
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={__('Suffix text', 'visual-portfolio')}
							isShownByDefault
							hasValue={() => !!suffix}
							onDeselect={() => setAttributes({ suffix: '' })}
						>
							<TextControl
								label={__('Suffix text', 'visual-portfolio')}
								value={suffix}
								onChange={(nextSuffix) =>
									setAttributes({ suffix: nextSuffix })
								}
							/>
						</ToolsPanelItem>
						{metaType === 'comments' && (
							<ToolsPanelItem
								label={__(
									'Link to comments',
									'visual-portfolio'
								)}
								isShownByDefault
								hasValue={() => isLink}
								onDeselect={() =>
									setAttributes({ isLink: false })
								}
							>
								<ToggleControl
									label={__(
										'Link to comments',
										'visual-portfolio'
									)}
									checked={isLink}
									onChange={() =>
										setAttributes({ isLink: !isLink })
									}
								/>
							</ToolsPanelItem>
						)}
					</ToolsPanel>
				</InspectorControls>
			)}
			<div {...blockProps}>
				{isLink && metaType === 'comments' ? (
					// Inert in the editor - it only carries the link styling.
					<a
						href={context['vp/itemCommentsUrl'] || '#'}
						onClick={(event) => event.preventDefault()}
					>
						{inner}
					</a>
				) : (
					<span>{inner}</span>
				)}
			</div>
		</>
	);
}
