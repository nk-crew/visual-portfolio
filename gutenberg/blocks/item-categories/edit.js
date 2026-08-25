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
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { Fragment } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';

const DEFAULT_SEPARATOR = ', ';

export default function ItemCategoriesEdit({
	attributes: { separator },
	setAttributes,
	context: { 'vp/itemCategories': itemCategories },
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const blockProps = useBlockProps();
	const blockEditingMode = useBlockEditingMode();

	const categories = (itemCategories || []).filter(
		(category) => category?.label
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
									separator: DEFAULT_SEPARATOR,
								})
							)
						}
					>
						<ToolsPanelItem
							label={__('Separator', 'visual-portfolio')}
							isShownByDefault
							hasValue={() => separator !== DEFAULT_SEPARATOR}
							onDeselect={() =>
								setAttributes({
									separator: DEFAULT_SEPARATOR,
								})
							}
						>
							<TextControl
								label={__('Separator', 'visual-portfolio')}
								help={__(
									'Character(s) placed between the categories.',
									'visual-portfolio'
								)}
								value={separator}
								onChange={(newSeparator) =>
									setAttributes({
										separator: newSeparator,
									})
								}
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				</InspectorControls>
			)}
			<div {...blockProps}>
				{categories.length
					? categories.map((category, index) => (
							<Fragment key={category.slug || index}>
								{index > 0 && separator}
								{/* Inert in the editor - the url filters the loop on the front end. */}
								<a
									href={category.url || '#'}
									onClick={(event) => event.preventDefault()}
								>
									{decodeEntities(category.label)}
								</a>
							</Fragment>
						))
					: __('Gallery item categories', 'visual-portfolio')}
			</div>
		</>
	);
}
