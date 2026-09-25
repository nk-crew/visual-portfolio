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
	SelectControl,
	TextControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { Fragment } from '@wordpress/element';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';
import { useIsPreview } from '../../utils/use-is-preview';

const DEFAULT_SEPARATOR = ', ';

// Sources that do not name the post types they query.
const ANY_POST_TYPE_SOURCES = ['ids', 'custom_query', 'current_query'];

/**
 * Post types a posts loop queries.
 *
 * @param {Object} postsQuery - `postsQuery` of the loop.
 * @return {Array|null} post type slugs, or null for any post type.
 */
function getLoopPostTypes(postsQuery) {
	const source = postsQuery?.source || 'portfolio';

	if (ANY_POST_TYPE_SOURCES.includes(source)) {
		return null;
	}

	return 'post_types_set' === source
		? postsQuery.postTypesSet || []
		: [source];
}

export default function ItemCategoriesEdit({
	attributes: { taxonomy, separator, limit },
	setAttributes,
	context: {
		'vp/itemCategories': itemCategories,
		'vp/itemPostId': itemPostId,
		'vp/queryType': queryType,
		'vp/postsQuery': postsQuery,
	},
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const blockProps = useBlockProps();
	const blockEditingMode = useBlockEditingMode();

	const isPosts = 'posts' === queryType;
	const postTypes = getLoopPostTypes(postsQuery);

	// Only the posts of a loop have taxonomies; an image has typed categories.
	const allTaxonomies = useSelect(
		(select) =>
			isPosts
				? select(coreStore).getTaxonomies({
						per_page: -1,
						context: 'view',
					})
				: null,
		[isPosts]
	);
	const taxonomies = (allTaxonomies || []).filter(
		({ types, visibility }) =>
			visibility?.publicly_queryable &&
			(!postTypes || types?.some((type) => postTypes.includes(type)))
	);

	const terms = useSelect(
		(select) =>
			isPosts && taxonomy && itemPostId
				? select(coreStore).getEntityRecords('taxonomy', taxonomy, {
						post: itemPostId,
						per_page: -1,
						_fields: 'id,name',
						context: 'view',
					})
				: null,
		[isPosts, taxonomy, itemPostId]
	);

	const categories = (
		isPosts && taxonomy && itemPostId
			? (terms || []).map(({ id, name }) => ({ slug: id, label: name }))
			: itemCategories || []
	)
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
									taxonomy: '',
									separator: DEFAULT_SEPARATOR,
									limit: 0,
								})
							)
						}
					>
						{isPosts && (
							<ToolsPanelItem
								label={__('Taxonomy', 'visual-portfolio')}
								isShownByDefault
								hasValue={() => !!taxonomy}
								onDeselect={() =>
									setAttributes({ taxonomy: '' })
								}
							>
								<SelectControl
									label={__('Taxonomy', 'visual-portfolio')}
									value={taxonomy}
									options={[
										{
											value: '',
											label: __(
												'All filter taxonomies',
												'visual-portfolio'
											),
										},
										...taxonomies.map(({ slug, name }) => ({
											value: slug,
											label: name,
										})),
									]}
									onChange={(value) =>
										setAttributes({ taxonomy: value })
									}
								/>
							</ToolsPanelItem>
						)}
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
