import {
	CheckboxControl,
	FormTokenField,
	__experimentalNumberControl as NumberControl,
	SelectControl,
	TextareaControl,
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import { PostsIcon } from './icons';
import { registerLoopSource } from './registry';
import useEntitySearch from './use-entity-search';

// Sources that describe how to build the query rather than which post type to
// query, so most of the panel does not apply to them.
const SOURCE_POST_TYPES_SET = 'post_types_set';
const SOURCE_IDS = 'ids';
const SOURCE_CUSTOM_QUERY = 'custom_query';
const SOURCE_CURRENT_QUERY = 'current_query';

const ORDER_BY_OPTIONS = [
	{ value: 'post_date', label: __('Date', 'visual-portfolio') },
	{ value: 'title', label: __('Title', 'visual-portfolio') },
	{ value: 'id', label: __('ID', 'visual-portfolio') },
	{ value: 'comment_count', label: __('Comments Count', 'visual-portfolio') },
	{ value: 'modified', label: __('Modified', 'visual-portfolio') },
	{ value: 'menu_order', label: __('Menu Order', 'visual-portfolio') },
	{ value: 'post__in', label: __('Manual Selection', 'visual-portfolio') },
	{ value: 'rand', label: __('Random', 'visual-portfolio') },
];

const ORDER_OPTIONS = [
	{ value: 'desc', label: __('Descending', 'visual-portfolio') },
	{ value: 'asc', label: __('Ascending', 'visual-portfolio') },
];

// Defaults of `postsQuery`, from `blocks/loop/block.json`.
const DEFAULTS = {
	source: 'portfolio',
	postTypesSet: ['post'],
	ids: [],
	excludeIds: [],
	order: 'desc',
	orderBy: 'post_date',
	offset: 0,
	taxonomies: [],
	taxonomiesRelation: 'or',
	avoidDuplicates: false,
	customQuery: '',
};

/**
 * Post types the loop can query.
 *
 * Mirrors the legacy control: everything public, minus attachments, which the
 * images source covers.
 *
 * @return {Array} `{ slug, label }` pairs.
 */
function usePostTypes() {
	const postTypes = useSelect((select) => {
		return select(coreStore).getPostTypes({ per_page: -1 });
	}, []);

	return useMemo(
		() =>
			(postTypes || [])
				.filter(
					({ viewable, slug }) => viewable && 'attachment' !== slug
				)
				.map(({ slug, labels, name }) => ({
					slug,
					label: labels?.singular_name || name || slug,
				})),
		[postTypes]
	);
}

/**
 * Settings of the posts source.
 *
 * @param {Object}   props               - component props.
 * @param {Object}   props.attributes    - loop attributes.
 * @param {Function} props.setAttributes - loop attribute setter.
 * @param {string}   props.clientId      - loop client id.
 * @return {Element} component.
 */
function PostsSettingsPanel({ attributes, setAttributes, clientId }) {
	const { postsQuery } = attributes;
	const {
		source = DEFAULTS.source,
		postTypesSet = DEFAULTS.postTypesSet,
		ids = DEFAULTS.ids,
		excludeIds = DEFAULTS.excludeIds,
		taxonomies = DEFAULTS.taxonomies,
		taxonomiesRelation = DEFAULTS.taxonomiesRelation,
		order = DEFAULTS.order,
		orderBy = DEFAULTS.orderBy,
		offset = DEFAULTS.offset,
		avoidDuplicates = DEFAULTS.avoidDuplicates,
		customQuery = DEFAULTS.customQuery,
	} = postsQuery || {};

	const postTypes = usePostTypes();

	// The legacy query searches every post type unless the source names one.
	const searchSubtype = [
		SOURCE_POST_TYPES_SET,
		SOURCE_IDS,
		SOURCE_CUSTOM_QUERY,
		SOURCE_CURRENT_QUERY,
	].includes(source)
		? 'any'
		: source;

	const postSearch = useEntitySearch({
		subtype: searchSubtype,
		selected: ids,
	});
	const excludeSearch = useEntitySearch({
		subtype: searchSubtype,
		selected: excludeIds,
	});
	const termSearch = useEntitySearch({ type: 'term', selected: taxonomies });

	const update = (values) =>
		setAttributes({ postsQuery: { ...postsQuery, ...values } });

	const isIds = SOURCE_IDS === source;
	const isCustomQuery = SOURCE_CUSTOM_QUERY === source;
	const isCurrentQuery = SOURCE_CURRENT_QUERY === source;

	// The query is already built when the source is a raw query, and narrowing
	// a manual selection any further makes no sense.
	const isFiltered = !isIds && !isCustomQuery && !isCurrentQuery;
	const isOrdered = !isCustomQuery && !isCurrentQuery;

	return (
		<ToolsPanel
			label={__('Posts Settings', 'visual-portfolio')}
			panelId={clientId}
			resetAll={() => update(DEFAULTS)}
		>
			<ToolsPanelItem
				label={__('Source', 'visual-portfolio')}
				isShownByDefault
				hasValue={() => DEFAULTS.source !== source}
				onDeselect={() => update({ source: DEFAULTS.source })}
				panelId={clientId}
			>
				<SelectControl
					label={__('Source', 'visual-portfolio')}
					value={source}
					options={[
						...postTypes.map(({ slug, label }) => ({
							value: slug,
							label,
						})),
						{
							value: SOURCE_POST_TYPES_SET,
							label: __('Post Types Set', 'visual-portfolio'),
						},
						{
							value: SOURCE_IDS,
							label: __('Manual Selection', 'visual-portfolio'),
						},
						{
							value: SOURCE_CUSTOM_QUERY,
							label: __('Custom Query', 'visual-portfolio'),
						},
						{
							value: SOURCE_CURRENT_QUERY,
							label: __('Current Query', 'visual-portfolio'),
						},
					]}
					onChange={(value) => update({ source: value })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			</ToolsPanelItem>

			{SOURCE_POST_TYPES_SET === source ? (
				<ToolsPanelItem
					label={__('Post Types', 'visual-portfolio')}
					isShownByDefault
					hasValue={() =>
						JSON.stringify(DEFAULTS.postTypesSet) !==
						JSON.stringify(postTypesSet)
					}
					onDeselect={() =>
						update({ postTypesSet: DEFAULTS.postTypesSet })
					}
					panelId={clientId}
				>
					<fieldset className="vpf-loop-source-fieldset">
						<legend>{__('Post Types', 'visual-portfolio')}</legend>
						<VStack spacing={4}>
							{postTypes.map(({ slug, label }) => (
								<CheckboxControl
									key={slug}
									label={label}
									checked={postTypesSet.includes(slug)}
									onChange={(checked) =>
										update({
											postTypesSet: checked
												? [...postTypesSet, slug]
												: postTypesSet.filter(
														(name) => name !== slug
													),
										})
									}
									__nextHasNoMarginBottom
								/>
							))}
						</VStack>
					</fieldset>
				</ToolsPanelItem>
			) : null}

			{isIds ? (
				<ToolsPanelItem
					// The source is the manual selection, so the selection is
					// not an extra: without it the source shows nothing.
					isShownByDefault
					label={__('Specific Posts', 'visual-portfolio')}
					hasValue={() => 0 < ids.length}
					onDeselect={() => update({ ids: DEFAULTS.ids })}
					panelId={clientId}
				>
					<FormTokenField
						label={__('Specific Posts', 'visual-portfolio')}
						value={postSearch.tokens}
						suggestions={postSearch.suggestions}
						onInputChange={postSearch.search}
						onChange={(tokens) =>
							update({ ids: postSearch.toIds(tokens) })
						}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						__experimentalShowHowTo={false}
					/>
				</ToolsPanelItem>
			) : null}

			{isCustomQuery ? (
				<ToolsPanelItem
					// As above: the query is the source, not a refinement of it.
					isShownByDefault
					label={__('Custom Query', 'visual-portfolio')}
					hasValue={() => DEFAULTS.customQuery !== customQuery}
					onDeselect={() =>
						update({ customQuery: DEFAULTS.customQuery })
					}
					panelId={clientId}
				>
					<TextareaControl
						label={__('Custom Query', 'visual-portfolio')}
						help={__(
							'Build a custom query the same way `WP_Query` arguments are written.',
							'visual-portfolio'
						)}
						value={customQuery}
						rows={4}
						onChange={(value) => update({ customQuery: value })}
						__nextHasNoMarginBottom
					/>
				</ToolsPanelItem>
			) : null}

			{isFiltered ? (
				<>
					<ToolsPanelItem
						label={__('Excluded Posts', 'visual-portfolio')}
						hasValue={() => 0 < excludeIds.length}
						onDeselect={() =>
							update({ excludeIds: DEFAULTS.excludeIds })
						}
						panelId={clientId}
					>
						<FormTokenField
							label={__('Excluded Posts', 'visual-portfolio')}
							value={excludeSearch.tokens}
							suggestions={excludeSearch.suggestions}
							onInputChange={excludeSearch.search}
							onChange={(tokens) =>
								update({
									excludeIds: excludeSearch.toIds(tokens),
								})
							}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							__experimentalShowHowTo={false}
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={__('Taxonomies', 'visual-portfolio')}
						hasValue={() => 0 < taxonomies.length}
						onDeselect={() =>
							update({ taxonomies: DEFAULTS.taxonomies })
						}
						panelId={clientId}
					>
						<FormTokenField
							label={__('Taxonomies', 'visual-portfolio')}
							value={termSearch.tokens}
							suggestions={termSearch.suggestions}
							onInputChange={termSearch.search}
							onChange={(tokens) =>
								update({ taxonomies: termSearch.toIds(tokens) })
							}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							__experimentalShowHowTo={false}
						/>
					</ToolsPanelItem>

					{taxonomies.length > 1 ? (
						<ToolsPanelItem
							label={__(
								'Taxonomies Relation',
								'visual-portfolio'
							)}
							hasValue={() =>
								DEFAULTS.taxonomiesRelation !==
								taxonomiesRelation
							}
							onDeselect={() =>
								update({
									taxonomiesRelation:
										DEFAULTS.taxonomiesRelation,
								})
							}
							panelId={clientId}
						>
							<SelectControl
								label={__(
									'Taxonomies Relation',
									'visual-portfolio'
								)}
								value={taxonomiesRelation}
								options={[
									{
										value: 'or',
										label: __(
											'Any of the selected',
											'visual-portfolio'
										),
									},
									{
										value: 'and',
										label: __(
											'All of the selected',
											'visual-portfolio'
										),
									},
								]}
								onChange={(value) =>
									update({ taxonomiesRelation: value })
								}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
					) : null}
				</>
			) : null}

			{isOrdered ? (
				<>
					<ToolsPanelItem
						label={__('Order By', 'visual-portfolio')}
						hasValue={() => DEFAULTS.orderBy !== orderBy}
						onDeselect={() => update({ orderBy: DEFAULTS.orderBy })}
						panelId={clientId}
					>
						<SelectControl
							label={__('Order By', 'visual-portfolio')}
							value={orderBy}
							options={ORDER_BY_OPTIONS}
							onChange={(value) => update({ orderBy: value })}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={__('Order Direction', 'visual-portfolio')}
						hasValue={() => DEFAULTS.order !== order}
						onDeselect={() => update({ order: DEFAULTS.order })}
						panelId={clientId}
					>
						<SelectControl
							label={__('Order Direction', 'visual-portfolio')}
							value={order}
							options={ORDER_OPTIONS}
							onChange={(value) => update({ order: value })}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
				</>
			) : null}

			{isFiltered ? (
				<ToolsPanelItem
					label={__('Offset', 'visual-portfolio')}
					hasValue={() => DEFAULTS.offset !== offset}
					onDeselect={() => update({ offset: DEFAULTS.offset })}
					panelId={clientId}
				>
					<NumberControl
						label={__('Offset', 'visual-portfolio')}
						help={__(
							'Skip over the first items of the query.',
							'visual-portfolio'
						)}
						min={0}
						value={offset}
						onChange={(value) =>
							update({ offset: parseInt(value, 10) || 0 })
						}
						__next40pxDefaultSize
					/>
				</ToolsPanelItem>
			) : null}

			<ToolsPanelItem
				label={__('Avoid Duplicates', 'visual-portfolio')}
				hasValue={() => avoidDuplicates}
				onDeselect={() =>
					update({ avoidDuplicates: DEFAULTS.avoidDuplicates })
				}
				panelId={clientId}
			>
				<ToggleControl
					label={__('Avoid Duplicates', 'visual-portfolio')}
					help={__(
						'Hide items already displayed by another gallery on the same page. Affects the front end only.',
						'visual-portfolio'
					)}
					checked={!!avoidDuplicates}
					onChange={(value) => update({ avoidDuplicates: value })}
					__nextHasNoMarginBottom
				/>
			</ToolsPanelItem>
		</ToolsPanel>
	);
}

registerLoopSource({
	name: 'posts',
	title: __('Posts', 'visual-portfolio'),
	icon: <PostsIcon />,
	category: 'core',
	SettingsPanel: PostsSettingsPanel,
});
