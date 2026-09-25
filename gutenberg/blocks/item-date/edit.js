/**
 * WordPress dependencies
 */
import {
	__experimentalDateFormatPicker as DateFormatPicker,
	InspectorControls,
	useBlockEditingMode,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import {
	dateI18n,
	getSettings as getDateSettings,
	humanTimeDiff,
} from '@wordpress/date';
import { __ } from '@wordpress/i18n';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';

export default function ItemDateEdit({
	attributes: { format, displayType, isLink },
	setAttributes,
	context: {
		'vp/itemPublishedTime': itemPublishedTime,
		'vp/itemModifiedTime': itemModifiedTime,
		'vp/itemUrl': itemUrl,
	},
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const blockProps = useBlockProps();
	const blockEditingMode = useBlockEditingMode();

	const siteFormat = getDateSettings().formats.date;
	const isModified = 'modified' === displayType;
	// Sources without a publish date still need something to lay out against.
	const date =
		(isModified && itemModifiedTime) || itemPublishedTime || new Date();

	const dateElement = (
		<time dateTime={dateI18n('c', date)}>
			{'human-diff' === format
				? humanTimeDiff(date)
				: dateI18n(format || siteFormat, date)}
		</time>
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
									format: undefined,
									displayType: 'date',
									isLink: false,
								})
							)
						}
					>
						<ToolsPanelItem
							label={__('Date format', 'visual-portfolio')}
							isShownByDefault
							hasValue={() => !!format}
							onDeselect={() =>
								setAttributes({ format: undefined })
							}
						>
							<DateFormatPicker
								format={format}
								defaultFormat={siteFormat}
								onChange={(nextFormat) =>
									setAttributes({ format: nextFormat })
								}
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={__(
								'Display last modified date',
								'visual-portfolio'
							)}
							hasValue={() => isModified}
							onDeselect={() =>
								setAttributes({ displayType: 'date' })
							}
						>
							<ToggleControl
								label={__(
									'Display last modified date',
									'visual-portfolio'
								)}
								help={__(
									'An item never edited after it was published, and an image, shows its publish date.',
									'visual-portfolio'
								)}
								checked={isModified}
								onChange={() =>
									setAttributes({
										displayType: isModified
											? 'date'
											: 'modified',
									})
								}
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={__('Link to item', 'visual-portfolio')}
							isShownByDefault
							hasValue={() => isLink}
							onDeselect={() => setAttributes({ isLink: false })}
						>
							<ToggleControl
								label={__('Link to item', 'visual-portfolio')}
								checked={isLink}
								onChange={() =>
									setAttributes({ isLink: !isLink })
								}
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				</InspectorControls>
			)}
			<div {...blockProps}>
				{isLink ? (
					// Inert in the editor - it only carries the link styling.
					<a
						href={itemUrl || '#'}
						onClick={(event) => event.preventDefault()}
					>
						{dateElement}
					</a>
				) : (
					dateElement
				)}
			</div>
		</>
	);
}
