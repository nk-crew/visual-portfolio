import {
	CheckboxControl,
	FormTokenField,
	SelectControl,
	TextareaControl,
	TextControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useToolsPanelDropdownMenuProps } from '../utils/tools-panel';
import { PostsIcon } from './icons';
import { registerLoopSource } from './registry';
import useAuthorSearch from './use-author-search';
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
	excludeCurrent: false,
	authors: [],
	keyword: '',
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
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

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
			label={__('Settings', 'visual-portfolio')}
			dropdownMenuProps={dropdownMenuProps}
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
								update({
									taxonomies: termSearch.toIds(tokens),
								})
							}
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
								help={__(
									'AND keeps items that match every taxonomy, OR keeps items that match any of them.',
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
						/>
					</ToolsPanelItem>
				</>
			) : null}
		</ToolsPanel>
	);
}

/**
 * What narrows the query, in its own panel below Display.
 *
 * The split is the core Query block's, and it is a real distinction rather
 * than tidiness: Settings decide the shape of the query and every one of them
 * has a sensible value, while a filter is a set that is normally empty - so
 * none of these is shown until it is asked for.
 *
 * @param {Object}   props               - component props.
 * @param {Object}   props.attributes    - loop attributes.
 * @param {Function} props.setAttributes - loop attribute setter.
 * @return {Element|null} component.
 */
function PostsFiltersPanel({ attributes, setAttributes }) {
	const { postsQuery } = attributes;
	const {
		source = DEFAULTS.source,
		avoidDuplicates = DEFAULTS.avoidDuplicates,
		excludeCurrent = DEFAULTS.excludeCurrent,
		authors = DEFAULTS.authors,
		keyword = DEFAULTS.keyword,
	} = postsQuery || {};

	const update = (values) =>
		setAttributes({ postsQuery: { ...postsQuery, ...values } });

	const authorSearch = useAuthorSearch(authors);
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	// A hand-written query is already narrowed, and a manual selection is a
	// list rather than a query.
	if (SOURCE_IDS === source || SOURCE_CUSTOM_QUERY === source) {
		return null;
	}

	return (
		<ToolsPanel
			label={__('Filters', 'visual-portfolio')}
			dropdownMenuProps={dropdownMenuProps}
			resetAll={() =>
				update({
					authors: DEFAULTS.authors,
					keyword: DEFAULTS.keyword,
					avoidDuplicates: DEFAULTS.avoidDuplicates,
					excludeCurrent: DEFAULTS.excludeCurrent,
				})
			}
		>
			<ToolsPanelItem
				label={__('Authors', 'visual-portfolio')}
				hasValue={() => 0 < authors.length}
				onDeselect={() => update({ authors: DEFAULTS.authors })}
			>
				<FormTokenField
					label={__('Authors', 'visual-portfolio')}
					help={__(
						'Only posts written by the authors you list.',
						'visual-portfolio'
					)}
					value={authorSearch.tokens}
					suggestions={authorSearch.suggestions}
					onInputChange={authorSearch.search}
					onChange={(tokens) =>
						update({ authors: authorSearch.toIds(tokens) })
					}
					__experimentalShowHowTo={false}
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				label={__('Keyword', 'visual-portfolio')}
				hasValue={() => !!keyword}
				onDeselect={() => update({ keyword: DEFAULTS.keyword })}
			>
				<TextControl
					label={__('Keyword', 'visual-portfolio')}
					help={__(
						'Show only the items whose text contains this.',
						'visual-portfolio'
					)}
					value={keyword}
					onChange={(value) => update({ keyword: value })}
				/>
			</ToolsPanelItem>

			{/* One item, because both answer the same question - what
				    this gallery must not repeat - and a reader looking for
				    one will look where the other is. */}
			<ToolsPanelItem
				label={__('Exclusions', 'visual-portfolio')}
				hasValue={() => avoidDuplicates || excludeCurrent}
				onDeselect={() =>
					update({
						avoidDuplicates: DEFAULTS.avoidDuplicates,
						excludeCurrent: DEFAULTS.excludeCurrent,
					})
				}
			>
				<VStack spacing={4}>
					<CheckboxControl
						label={__('Avoid duplicates', 'visual-portfolio')}
						help={__(
							'Hide items already shown by another gallery on the same page.',
							'visual-portfolio'
						)}
						checked={!!avoidDuplicates}
						onChange={(value) => update({ avoidDuplicates: value })}
					/>
					<CheckboxControl
						label={__(
							'Exclude the current post',
							'visual-portfolio'
						)}
						help={__(
							'Keeps a post out of a gallery placed on its own page.',
							'visual-portfolio'
						)}
						checked={!!excludeCurrent}
						onChange={(value) => update({ excludeCurrent: value })}
					/>
				</VStack>
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
	FiltersPanel: PostsFiltersPanel,
});
