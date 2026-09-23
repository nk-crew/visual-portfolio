/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	useBlockEditingMode,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	__experimentalNumberControl as NumberControl,
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
import { useIsPreview } from '../../utils/use-is-preview';

const DEFAULT_SEPARATOR = ', ';

export default function ItemCategoriesEdit({
	attributes: { separator, limit },
	setAttributes,
	context: { 'vp/itemCategories': itemCategories },
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const blockProps = useBlockProps();
	const blockEditingMode = useBlockEditingMode();

	const categories = (itemCategories || [])
		.filter((category) => category?.label)
		.slice(0, limit > 0 ? limit : undefined);

	// The placeholder stands in on the item being edited and nowhere else.
	const isPreview = useIsPreview();
	const placeholder = isPreview
		? null
		: __('Gallery item categories', 'visual-portfolio');

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
									limit: 0,
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
						<ToolsPanelItem
							label={__('Maximum categories', 'visual-portfolio')}
							hasValue={() => limit > 0}
							onDeselect={() => setAttributes({ limit: 0 })}
						>
							<NumberControl
								label={__(
									'Maximum categories',
									'visual-portfolio'
								)}
								help={__(
									'How many categories an item shows. Zero shows them all.',
									'visual-portfolio'
								)}
								min={0}
								value={limit}
								onChange={(value) =>
									setAttributes({
										limit: Math.max(
											0,
											parseInt(value, 10) || 0
										),
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
					: placeholder}
			</div>
		</>
	);
}
