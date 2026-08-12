import {
	CheckboxControl,
	FormTokenField,
	__experimentalNumberControl as NumberControl,
	PanelBody,
	SelectControl,
	TextareaControl,
	ToggleControl,
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

function PostsSettingsPanel({ attributes, setAttributes }) {
	const { postsQuery } = attributes;
	const {
		source,
		postTypesSet = [],
		ids = [],
		excludeIds = [],
		taxonomies = [],
		taxonomiesRelation,
		order,
		orderBy,
		offset,
		avoidDuplicates,
		customQuery,
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
		<PanelBody title={__('Posts Settings', 'visual-portfolio')}>
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

			{SOURCE_POST_TYPES_SET === source ? (
				<fieldset className="vpf-loop-source-fieldset">
					<legend>{__('Post Types', 'visual-portfolio')}</legend>
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
				</fieldset>
			) : null}

			{isIds ? (
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
			) : null}

			{isCustomQuery ? (
				<TextareaControl
					label={__('Custom Query', 'visual-portfolio')}
					help={__(
						'Build a custom query the same way `WP_Query` arguments are written.',
						'visual-portfolio'
					)}
					value={customQuery || ''}
					rows={4}
					onChange={(value) => update({ customQuery: value })}
					__nextHasNoMarginBottom
				/>
			) : null}

			{isFiltered ? (
				<>
					<FormTokenField
						label={__('Excluded Posts', 'visual-portfolio')}
						value={excludeSearch.tokens}
						suggestions={excludeSearch.suggestions}
						onInputChange={excludeSearch.search}
						onChange={(tokens) =>
							update({ excludeIds: excludeSearch.toIds(tokens) })
						}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						__experimentalShowHowTo={false}
					/>

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

					{taxonomies.length > 1 ? (
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
					) : null}
				</>
			) : null}

			{isOrdered ? (
				<>
					<SelectControl
						label={__('Order By', 'visual-portfolio')}
						value={orderBy}
						options={ORDER_BY_OPTIONS}
						onChange={(value) => update({ orderBy: value })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>

					<SelectControl
						label={__('Order Direction', 'visual-portfolio')}
						value={order}
						options={ORDER_OPTIONS}
						onChange={(value) => update({ order: value })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</>
			) : null}

			{isFiltered ? (
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
			) : null}

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
		</PanelBody>
	);
}

registerLoopSource({
	name: 'posts',
	title: __('Posts', 'visual-portfolio'),
	icon: <PostsIcon />,
	category: 'core',
	SettingsPanel: PostsSettingsPanel,
});
