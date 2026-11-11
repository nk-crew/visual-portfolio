import { dateI18n, getSettings, humanTimeDiff } from '@wordpress/date';
import { decodeEntities } from '@wordpress/html-entities';
import { __, _n, sprintf } from '@wordpress/i18n';

import LayoutPreview from './preview';

const SOURCES = [
	{ value: 'posts', label: __('Posts', 'visual-portfolio') },
	{ value: 'images', label: __('Images', 'visual-portfolio') },
	{ value: 'social', label: __('Social Feeds', 'visual-portfolio') },
	{ value: 'taxonomies', label: __('Taxonomies', 'visual-portfolio') },
];

const LAYOUTS = [
	{ value: 'grid', label: __('Grid', 'visual-portfolio') },
	{ value: 'masonry', label: __('Masonry', 'visual-portfolio') },
	{ value: 'justified', label: __('Justified', 'visual-portfolio') },
	{ value: 'tiles', label: __('Tiles', 'visual-portfolio') },
	{ value: 'carousel', label: __('Carousel', 'visual-portfolio') },
	{ value: 'slider', label: __('Slider', 'visual-portfolio') },
];

const KINDS = [
	{ value: 'blocks', label: __('Blocks', 'visual-portfolio') },
	{ value: 'legacy', label: __('Legacy', 'visual-portfolio') },
];

const USAGE = [
	{ value: 'used', label: __('Used', 'visual-portfolio') },
	{ value: 'unused', label: __('Not used', 'visual-portfolio') },
];

const STATUSES = [
	{ value: 'publish', label: __('Published', 'visual-portfolio') },
	{ value: 'draft', label: __('Draft', 'visual-portfolio') },
	{ value: 'pending', label: __('Pending', 'visual-portfolio') },
	{ value: 'private', label: __('Private', 'visual-portfolio') },
	{ value: 'future', label: __('Scheduled', 'visual-portfolio') },
	{ value: 'trash', label: __('Trash', 'visual-portfolio') },
];

/**
 * Title of a layout as text.
 *
 * @param {Object} item - layout record.
 * @return {string} title.
 */
export function getTitle(item) {
	return decodeEntities(item.title?.raw ?? item.title?.rendered ?? '');
}

/**
 * Label of a value from a list of elements.
 *
 * @param {Object[]} elements - elements.
 * @param {string}   value    - value.
 * @return {string} label.
 */
function getLabel(elements, value) {
	return (
		elements.find((element) => element.value === value)?.label ||
		value ||
		''
	);
}

/**
 * How a layout is used, in words.
 *
 * @param {Object} layout - `vpf_layout` field.
 * @return {string} usage.
 */
function getUsageText(layout) {
	if (!layout?.usageReady && !layout?.usage?.posts) {
		return __('Counting…', 'visual-portfolio');
	}

	const { posts = 0, synced = 0 } = layout?.usage || {};

	if (!posts) {
		return __('Not used yet', 'visual-portfolio');
	}

	const pages = sprintf(
		// translators: %d - number of pages.
		_n('%d page', '%d pages', posts, 'visual-portfolio'),
		posts
	);

	return synced
		? sprintf(
				// translators: %1$s - number of pages, %2$d - number of synced pages.
				__('%1$s · %2$d synced', 'visual-portfolio'),
				pages,
				synced
			)
		: pages;
}

/**
 * Title with the marks that change what the layout is.
 *
 * @param {Object} props      - component props.
 * @param {Object} props.item - layout record.
 * @return {Element} component.
 */
function TitleField({ item }) {
	const title = getTitle(item) || __('(no title)', 'visual-portfolio');
	const status =
		item.status !== 'publish' &&
		item.status !== 'trash' &&
		getLabel(STATUSES, item.status);

	return (
		<span className="vpf-library-title">
			<a
				href={item.vpf_layout?.editUrl}
				className="vpf-library-title__link"
			>
				{title}
			</a>
			{item.vpf_layout?.kind === 'legacy' && (
				<span className="vpf-library-badge is-legacy">
					{__('Legacy', 'visual-portfolio')}
				</span>
			)}
			{status && <span className="vpf-library-badge">{status}</span>}
		</span>
	);
}

export const fields = [
	{
		id: 'preview',
		label: __('Preview', 'visual-portfolio'),
		render: ({ item }) => (
			<LayoutPreview preview={item.vpf_layout?.preview} />
		),
		enableSorting: false,
		enableHiding: false,
	},
	{
		id: 'title',
		label: __('Title', 'visual-portfolio'),
		getValue: ({ item }) => getTitle(item),
		render: TitleField,
		enableHiding: false,
		enableGlobalSearch: true,
	},
	{
		id: 'kind',
		label: __('Editor', 'visual-portfolio'),
		getValue: ({ item }) => item.vpf_layout?.kind,
		elements: KINDS,
		filterBy: { operators: ['is'] },
		enableSorting: false,
	},
	{
		id: 'summary',
		label: __('Summary', 'visual-portfolio'),
		getValue: ({ item }) =>
			[
				getLabel(SOURCES, item.vpf_layout?.source),
				getLabel(LAYOUTS, item.vpf_layout?.preview?.type),
			]
				.filter(Boolean)
				.join(' · '),
		enableSorting: false,
		enableHiding: false,
	},
	{
		id: 'source',
		label: __('Source', 'visual-portfolio'),
		getValue: ({ item }) => item.vpf_layout?.source,
		render: ({ item }) => getLabel(SOURCES, item.vpf_layout?.source) || '—',
		elements: SOURCES,
		filterBy: { operators: ['isAny'] },
	},
	{
		id: 'layout',
		label: __('Layout', 'visual-portfolio'),
		getValue: ({ item }) => item.vpf_layout?.preview?.type,
		render: ({ item }) => getLabel(LAYOUTS, item.vpf_layout?.preview?.type),
		elements: LAYOUTS,
		filterBy: { operators: ['isAny'] },
	},
	{
		id: 'usage',
		label: __('Used on', 'visual-portfolio'),
		getValue: ({ item }) =>
			item.vpf_layout?.usage?.posts ? 'used' : 'unused',
		render: ({ item }) => (
			<span
				className={
					item.vpf_layout?.usage?.posts
						? undefined
						: 'vpf-library-muted'
				}
			>
				{getUsageText(item.vpf_layout)}
			</span>
		),
		elements: USAGE,
		filterBy: { operators: ['is'] },
		enableSorting: false,
	},
	{
		id: 'shortcode',
		label: __('Shortcode', 'visual-portfolio'),
		getValue: ({ item }) => item.vpf_layout?.shortcode,
		render: ({ item }) => (
			<code className="vpf-library-code">
				{item.vpf_layout?.shortcode}
			</code>
		),
		enableSorting: false,
	},
	{
		id: 'date',
		label: __('Modified', 'visual-portfolio'),
		type: 'datetime',
		getValue: ({ item }) => item.modified,
		render: ({ item }) => (
			<time
				dateTime={item.modified}
				title={dateI18n(getSettings().formats.datetime, item.modified)}
			>
				{humanTimeDiff(item.modified)}
			</time>
		),
	},
];
