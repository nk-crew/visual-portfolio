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
import { applyFilters } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { getMissingTeasers } from '../components/pro-teaser';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../utils/tools-panel';
import { PostsIcon } from './icons';
import { registerLoopSource } from './registry';
import useEntitySearch from './use-entity-search';

// The filters Pro adds to a posts query, for an install without them, shown
// where Pro draws them.
const PRO_FILTERS = [
	{
		name: 'date',
		label: __('Date', 'visual-portfolio'),
		line: __(
			'Only posts published in the past day, week, month, quarter or year, or between two dates.',
			'visual-portfolio'
		),
		campaign: 'teaser_filter_date',
		shows: (attributes) =>
			'current_query' !== attributes.postsQuery?.source,
	},
	{
		name: 'exclude-no-thumb',
		label: __('Thumbnail', 'visual-portfolio'),
		line: __(
			'Keep out the posts that have no featured image to show.',
			'visual-portfolio'
		),
		campaign: 'teaser_filter_thumbnail',
		shows: (attributes) =>
			'current_query' !== attributes.postsQuery?.source,
	},
];

// The choices of the core Query block, under the values it stores them as.
const STICKY_OPTIONS = [
	{ value: '', label: __('Include', 'visual-portfolio') },
	{ value: 'ignore', label: __('Ignore', 'visual-portfolio') },
	{ value: 'exclude', label: __('Exclude', 'visual-portfolio') },
	{ value: 'only', label: __('Only', 'visual-portfolio') },
];

// The formats WordPress knows, as the core Query block lists them.
const POST_FORMATS = [
	{ value: 'aside', label: __('Aside', 'visual-portfolio') },
	{ value: 'audio', label: __('Audio', 'visual-portfolio') },
	{ value: 'chat', label: __('Chat', 'visual-portfolio') },
	{ value: 'gallery', label: __('Gallery', 'visual-portfolio') },
	{ value: 'image', label: __('Image', 'visual-portfolio') },
	{ value: 'link', label: __('Link', 'visual-portfolio') },
	{ value: 'quote', label: __('Quote', 'visual-portfolio') },
	{ value: 'standard', label: __('Standard', 'visual-portfolio') },
	{ value: 'status', label: __('Status', 'visual-portfolio') },
	{ value: 'video', label: __('Video', 'visual-portfolio') },
];

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
	keyword: '',
	sticky: '',
	authors: [],
	formats: [],
	excludeTaxonomies: [],
	customQuery: '',
};

/**
 * Post types the loop can query.
 *
 * Mirrors the legacy control: everything public, minus attachments, which the
 * images source covers.
 *
 * @return {Array} `{ slug, label, formats }`, where `formats` says whether the
 *                 post type supports post formats.
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
				.map(({ slug, labels, name, supports }) => ({
					slug,
					label: labels?.singular_name || name || slug,
					formats: !!supports?.['post-formats'],
				})),
		[postTypes]
	);
}

/**
 * Formats the loop can filter by: the ones the theme declares, and none
 * unless it declares one beside `standard`, which is how the core Query block
 * decides to offer the filter at all.
 *
 * @param {string} source       - selected source.
 * @param {Array}  postTypesSet - post types of a set.
 * @param {Array}  postTypes    - from `usePostTypes()`.
 * @return {Array} `{ value, label }` pairs, empty where the filter is not offered.
 */
function usePostFormats(source, postTypesSet, postTypes) {
	const themeFormats = useSelect(
		(select) => select(coreStore).getThemeSupports()?.formats,
		[]
	);

	const slugs = SOURCE_POST_TYPES_SET === source ? postTypesSet : [source];
	const supported = postTypes.some(
		({ slug, formats }) => formats && slugs.includes(slug)
	);

	if (
		!supported ||
		!Array.isArray(themeFormats) ||
		!themeFormats.some((format) => 'standard' !== format)
	) {
		return [];
	}

	return POST_FORMATS.filter(({ value }) => themeFormats.includes(value));
}

/**
 * Authors of the site, as a token field needs them.
 *
 * The whole list is fetched rather than searched: a token field has to render a
 * label for every id the block was saved with, and a search only knows what was
 * typed into it.
 *
 * @param {Array} selected - author ids the block carries.
 * @return {{tokens: Array, suggestions: Array, toIds: Function}} token helpers.
 */
function useAuthors(selected) {
	const authors = useSelect(
		(select) =>
			select(coreStore).getUsers({
				who: 'authors',
				per_page: -1,
				_fields: 'id,name',
				context: 'view',
			}),
		[]
	);

	const list = authors || [];
	const counts = {};

	list.forEach(({ name }) => {
		counts[name] = (counts[name] || 0) + 1;
	});

	// Two people may share a display name, and a token has to name one of them.
	const label = ({ id, name }) =>
		1 < counts[name] ? `${name} (#${id})` : name;

	return {
		tokens: selected.map((id) => {
			const author = list.find((item) => item.id === parseInt(id, 10));

			return author ? label(author) : String(id);
		}),
		suggestions: list.map(label),
		toIds: (tokens) =>
			tokens
				.map((token) => {
					const author = list.find((item) => label(item) === token);

					return author ? author.id : parseInt(token, 10);
				})
				.filter((id) => !Number.isNaN(id)),
	};
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
		excludeTaxonomies = DEFAULTS.excludeTaxonomies,
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
	const excludeTermSearch = useEntitySearch({
		type: 'term',
		selected: excludeTaxonomies,
	});
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
			resetAll={(filters) =>
				update(
					getResetAllValues(filters, {
						source: DEFAULTS.source,
						postTypesSet: DEFAULTS.postTypesSet,
						ids: DEFAULTS.ids,
						excludeIds: DEFAULTS.excludeIds,
						taxonomies: DEFAULTS.taxonomies,
						excludeTaxonomies: DEFAULTS.excludeTaxonomies,
						taxonomiesRelation: DEFAULTS.taxonomiesRelation,
						order: DEFAULTS.order,
						orderBy: DEFAULTS.orderBy,
						customQuery: DEFAULTS.customQuery,
					})
				)
			}
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
					onChange={(value) =>
						update({
							source: value,
							// As the core Query block does when its post type
							// changes: only posts are sticky, and a post type
							// without formats would match none of them.
							...('post' !== value
								? { sticky: DEFAULTS.sticky }
								: {}),
							...(postTypes.some(
								({ slug, formats }) =>
									slug === value && !formats
							)
								? { formats: DEFAULTS.formats }
								: {}),
						})
					}
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

					<ToolsPanelItem
						label={__('Excluded Taxonomies', 'visual-portfolio')}
						hasValue={() => 0 < excludeTaxonomies.length}
						onDeselect={() =>
							update({
								excludeTaxonomies: DEFAULTS.excludeTaxonomies,
							})
						}
						panelId={clientId}
					>
						<FormTokenField
							label={__(
								'Excluded Taxonomies',
								'visual-portfolio'
							)}
							help={__(
								'Leave out the items in any of these, whatever the taxonomies above let in.',
								'visual-portfolio'
							)}
							value={excludeTermSearch.tokens}
							suggestions={excludeTermSearch.suggestions}
							onInputChange={excludeTermSearch.search}
							onChange={(tokens) =>
								update({
									excludeTaxonomies:
										excludeTermSearch.toIds(tokens),
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
				// One item: a direction on its own says nothing without the
				// field it sorts, so the menu offers them together.
				<ToolsPanelItem
					label={__('Order', 'visual-portfolio')}
					hasValue={() =>
						DEFAULTS.orderBy !== orderBy || DEFAULTS.order !== order
					}
					onDeselect={() =>
						update({
							orderBy: DEFAULTS.orderBy,
							order: DEFAULTS.order,
						})
					}
					panelId={clientId}
				>
					<VStack spacing={4}>
						<SelectControl
							label={__('Order By', 'visual-portfolio')}
							value={orderBy}
							options={ORDER_BY_OPTIONS}
							onChange={(value) => update({ orderBy: value })}
						/>

						<SelectControl
							label={__('Order Direction', 'visual-portfolio')}
							value={order}
							options={ORDER_OPTIONS}
							onChange={(value) => update({ order: value })}
						/>
					</VStack>
				</ToolsPanelItem>
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
function PostsFiltersPanel(props) {
	const { attributes, setAttributes } = props;
	const { postsQuery } = attributes;
	const {
		source = DEFAULTS.source,
		postTypesSet = DEFAULTS.postTypesSet,
		avoidDuplicates = DEFAULTS.avoidDuplicates,
		excludeCurrent = DEFAULTS.excludeCurrent,
		keyword = DEFAULTS.keyword,
		sticky = DEFAULTS.sticky,
		authors = DEFAULTS.authors,
		formats = DEFAULTS.formats,
	} = postsQuery || {};

	const update = (values) =>
		setAttributes({ postsQuery: { ...postsQuery, ...values } });

	const dropdownMenuProps = useToolsPanelDropdownMenuProps();
	const authorSearch = useAuthors(authors);
	const postFormats = usePostFormats(source, postTypesSet, usePostTypes());

	// A hand-written query is already narrowed, and a manual selection is a
	// list rather than a query.
	if (SOURCE_IDS === source || SOURCE_CUSTOM_QUERY === source) {
		return null;
	}

	// Anything else this install can narrow a posts query by. A `ToolsPanelItem`
	// returned here is an ordinary child of the panel below, so it registers
	// with the panel the way the built-in ones do. Pro adds the Date filter
	// through this; its `resetAllFilter` is what "Reset all" writes back for it,
	// in the same `postsQuery` the built-in filters live in.
	const extraItems = applyFilters('vpf.loopPostsFilterItems', [], props);
	const teasers = getMissingTeasers(extraItems, PRO_FILTERS, {
		attributes: props.attributes,
	});

	return (
		<ToolsPanel
			label={__('Filters', 'visual-portfolio')}
			dropdownMenuProps={dropdownMenuProps}
			resetAll={(filters) =>
				update(
					getResetAllValues(filters, {
						keyword: DEFAULTS.keyword,
						authors: DEFAULTS.authors,
						formats: DEFAULTS.formats,
						sticky: DEFAULTS.sticky,
						avoidDuplicates: DEFAULTS.avoidDuplicates,
						excludeCurrent: DEFAULTS.excludeCurrent,
					})
				)
			}
		>
			{extraItems.map(({ name, Item }) => (
				<Item key={name} {...props} />
			))}

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

			{/* The current query is the page's own, so it is narrowed by
				    author and keyword alone, as it was before. */}
			{SOURCE_CURRENT_QUERY !== source && postFormats.length ? (
				<ToolsPanelItem
					label={__('Formats', 'visual-portfolio')}
					hasValue={() => 0 < formats.length}
					onDeselect={() => update({ formats: DEFAULTS.formats })}
				>
					<FormTokenField
						label={__('Formats', 'visual-portfolio')}
						value={postFormats
							.filter(({ value }) => formats.includes(value))
							.map(({ label }) => label)}
						suggestions={postFormats
							.filter(({ value }) => !formats.includes(value))
							.map(({ label }) => label)}
						onChange={(tokens) =>
							update({
								formats: postFormats
									.filter(({ label }) =>
										tokens.includes(label)
									)
									.map(({ value }) => value),
							})
						}
						__experimentalExpandOnFocus
						__experimentalShowHowTo={false}
					/>
				</ToolsPanelItem>
			) : null}

			{/* WordPress pins only posts. */}
			{'post' === source ? (
				<ToolsPanelItem
					label={__('Sticky posts', 'visual-portfolio')}
					hasValue={() => !!sticky}
					onDeselect={() => update({ sticky: DEFAULTS.sticky })}
				>
					<SelectControl
						label={__('Sticky posts', 'visual-portfolio')}
						help={__(
							'Sticky posts always appear first, regardless of their publish date.',
							'visual-portfolio'
						)}
						value={sticky}
						options={STICKY_OPTIONS}
						onChange={(value) => update({ sticky: value })}
					/>
				</ToolsPanelItem>
			) : null}

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
							'Hide posts another gallery on the page has already shown, or that a listing page already lists.',
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
							'Keep the post being viewed out of a gallery placed on its own page.',
							'visual-portfolio'
						)}
						checked={!!excludeCurrent}
						onChange={(value) => update({ excludeCurrent: value })}
					/>
				</VStack>
			</ToolsPanelItem>

			{/* After the filters there are, so the menu leads with those. */}
			{teasers.map(({ name, Item }) => (
				<Item key={name} {...props} />
			))}
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
