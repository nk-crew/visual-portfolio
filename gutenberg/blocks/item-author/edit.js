/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	useBlockEditingMode,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	ExternalLink,
	TextControl,
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { createInterpolateElement } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';
import { useIsPreview } from '../../utils/use-is-preview';

const DEFAULT_PREFIX = __('by ', 'visual-portfolio');

export default function ItemAuthorEdit({
	attributes: { prefix, isLink, rel, linkTarget },
	setAttributes,
	context: { 'vp/itemAuthor': itemAuthor, 'vp/itemAuthorUrl': itemAuthorUrl },
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	// An untouched block carries no prefix of its own and shows the default.
	const prefixValue = prefix ?? DEFAULT_PREFIX;

	const blockProps = useBlockProps();
	const blockEditingMode = useBlockEditingMode();

	// The placeholder stands in on the item being edited and nowhere else:
	// the read-only copies of the item, and every other preview, show what
	// the page will show - and an item without a author shows nothing.
	const isPreview = useIsPreview();
	const author = itemAuthor
		? decodeEntities(itemAuthor)
		: isPreview
			? ''
			: __('Gallery item author', 'visual-portfolio');

	if (!author) {
		return null;
	}

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
									prefix: DEFAULT_PREFIX,
									isLink: false,
									rel: '',
									linkTarget: '_self',
								})
							)
						}
					>
						<ToolsPanelItem
							label={__('Prefix text', 'visual-portfolio')}
							isShownByDefault
							hasValue={() => prefixValue !== DEFAULT_PREFIX}
							onDeselect={() =>
								setAttributes({ prefix: DEFAULT_PREFIX })
							}
						>
							<TextControl
								label={__('Prefix text', 'visual-portfolio')}
								value={prefixValue}
								onChange={(newPrefix) =>
									setAttributes({ prefix: newPrefix })
								}
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={__('Link to author', 'visual-portfolio')}
							isShownByDefault
							hasValue={() => isLink}
							onDeselect={() => setAttributes({ isLink: false })}
						>
							<ToggleControl
								label={__('Link to author', 'visual-portfolio')}
								checked={isLink}
								onChange={() =>
									setAttributes({ isLink: !isLink })
								}
							/>
						</ToolsPanelItem>
						{isLink && (
							<>
								<ToolsPanelItem
									label={__(
										'Open in new tab',
										'visual-portfolio'
									)}
									isShownByDefault
									hasValue={() => linkTarget === '_blank'}
									onDeselect={() =>
										setAttributes({
											linkTarget: '_self',
										})
									}
								>
									<ToggleControl
										label={__(
											'Open in new tab',
											'visual-portfolio'
										)}
										checked={linkTarget === '_blank'}
										onChange={(value) =>
											setAttributes({
												linkTarget: value
													? '_blank'
													: '_self',
											})
										}
									/>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={__(
										'Link relation',
										'visual-portfolio'
									)}
									isShownByDefault
									hasValue={() => !!rel}
									onDeselect={() =>
										setAttributes({ rel: '' })
									}
								>
									<TextControl
										label={__(
											'Link relation',
											'visual-portfolio'
										)}
										help={createInterpolateElement(
											__(
												'The <a>Link Relation</a> attribute defines the relationship between a linked resource and the current document.',
												'visual-portfolio'
											),
											{
												a: (
													<ExternalLink href="https://developer.mozilla.org/docs/Web/HTML/Attributes/rel" />
												),
											}
										)}
										value={rel}
										onChange={(newRel) =>
											setAttributes({ rel: newRel })
										}
									/>
								</ToolsPanelItem>
							</>
						)}
					</ToolsPanel>
				</InspectorControls>
			)}
			<div {...blockProps}>
				{prefixValue}
				{isLink ? (
					// Inert in the editor - it only carries the link styling.
					<a
						href={itemAuthorUrl || '#'}
						target={linkTarget}
						rel={rel}
						onClick={(event) => event.preventDefault()}
					>
						{author}
					</a>
				) : (
					author
				)}
			</div>
		</>
	);
}
