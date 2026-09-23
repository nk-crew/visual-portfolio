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
	SelectControl,
	TextControl,
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { createInterpolateElement } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __, sprintf } from '@wordpress/i18n';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';
import { useIsPreview } from '../../utils/use-is-preview';

const DEFAULT_PREFIX = __('by ', 'visual-portfolio');

// The sizes WordPress serves avatars at, as core's Author block offers them.
const AVATAR_SIZES = [24, 48, 96].map((size) => ({
	value: size,
	// translators: %d: avatar size in pixels.
	label: sprintf(__('%dpx', 'visual-portfolio'), size),
}));

export default function ItemAuthorEdit({
	attributes: { prefix, showAvatar, avatarSize, isLink, rel, linkTarget },
	setAttributes,
	context: {
		'vp/itemAuthor': itemAuthor,
		'vp/itemAuthorUrl': itemAuthorUrl,
		'vp/itemAuthorAvatar': itemAuthorAvatar,
	},
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	// An untouched block carries no prefix of its own and shows the default.
	const prefixValue = prefix ?? DEFAULT_PREFIX;

	// The avatar the item carries, the same one the page draws.
	const hasAvatar = showAvatar && !!itemAuthorAvatar;

	const blockProps = useBlockProps({
		className: hasAvatar ? 'has-avatar' : undefined,
	});
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

	const name = (
		<>
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
		</>
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
									prefix: DEFAULT_PREFIX,
									showAvatar: false,
									avatarSize: 24,
									isLink: false,
									rel: '',
									linkTarget: '_self',
								})
							)
						}
					>
						<ToolsPanelItem
							label={__('Show avatar', 'visual-portfolio')}
							isShownByDefault
							hasValue={() => showAvatar}
							onDeselect={() =>
								setAttributes({ showAvatar: false })
							}
						>
							<ToggleControl
								label={__('Show avatar', 'visual-portfolio')}
								help={__(
									'Shown where the item has one: the author of a post, or the channel of a social feed.',
									'visual-portfolio'
								)}
								checked={showAvatar}
								onChange={(value) =>
									setAttributes({ showAvatar: value })
								}
							/>
						</ToolsPanelItem>
						{showAvatar && (
							<ToolsPanelItem
								label={__('Avatar size', 'visual-portfolio')}
								isShownByDefault
								hasValue={() => 24 !== avatarSize}
								onDeselect={() =>
									setAttributes({ avatarSize: 24 })
								}
							>
								<SelectControl
									label={__(
										'Avatar size',
										'visual-portfolio'
									)}
									value={avatarSize}
									options={AVATAR_SIZES}
									onChange={(value) =>
										setAttributes({
											avatarSize: parseInt(value, 10),
										})
									}
								/>
							</ToolsPanelItem>
						)}
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
				{hasAvatar ? (
					<>
						<img
							className="wp-block-visual-portfolio-item-author__avatar"
							src={itemAuthorAvatar}
							width={avatarSize}
							height={avatarSize}
							alt=""
						/>
						<span className="wp-block-visual-portfolio-item-author__name">
							{name}
						</span>
					</>
				) : (
					name
				)}
			</div>
		</>
	);
}
