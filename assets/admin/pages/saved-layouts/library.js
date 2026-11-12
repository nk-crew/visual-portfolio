import '@wordpress/dataviews/build-style/style.css';
import './style.scss';

import apiFetch from '@wordpress/api-fetch';
import {
	Button,
	DropdownMenu,
	__experimentalHStack as HStack,
	MenuGroup,
	MenuItem,
	SnackbarList,
	__experimentalText as Text,
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { useViewportMatch } from '@wordpress/compose';
import { store as coreStore, useEntityRecords } from '@wordpress/core-data';
import { useDispatch, useSelect } from '@wordpress/data';
import { DataViews, filterSortAndPaginate } from '@wordpress/dataviews';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { chevronDown, upload } from '@wordpress/icons';
import { store as noticesStore } from '@wordpress/notices';

import { Page, PageSections } from '../components/page';
import { getActions, POST_TYPE } from './actions';
import { fields } from './fields';

const NEW_URL = 'post-new.php?post_type=vp_lists';
const NEW_LEGACY_URL = 'post-new.php?post_type=vp_lists&vp_layout=legacy';
const VIEW_STORAGE_KEY = 'vpf-saved-layouts-view-v1';
const LIVE_STATUSES = ['publish', 'future', 'draft', 'pending', 'private'];

const DEFAULT_VIEW = {
	type: 'grid',
	perPage: 24,
	page: 1,
	sort: { field: 'date', direction: 'desc' },
	search: '',
	filters: [],
	titleField: 'title',
	mediaField: 'preview',
	descriptionField: 'summary',
	fields: ['usage'],
};

const DEFAULT_LAYOUTS = {
	grid: {
		titleField: 'title',
		mediaField: 'preview',
		descriptionField: 'summary',
		fields: ['usage'],
	},
	table: {
		titleField: 'title',
		mediaField: 'preview',
		fields: ['source', 'layout', 'usage', 'shortcode', 'date'],
		layout: { density: 'balanced' },
	},
	list: {
		titleField: 'title',
		mediaField: 'preview',
		descriptionField: 'summary',
		fields: ['usage'],
	},
};

/**
 * The view a user left the library in, kept in this browser.
 *
 * @return {Array} `[ view, setView ]`.
 */
function useStoredView() {
	const [view, setView] = useState(() => {
		try {
			const stored = JSON.parse(
				window.localStorage.getItem(VIEW_STORAGE_KEY)
			);

			return stored?.type
				? { ...DEFAULT_VIEW, ...stored, page: 1 }
				: DEFAULT_VIEW;
		} catch {
			return DEFAULT_VIEW;
		}
	});

	const update = (next) => {
		setView(next);

		try {
			window.localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(next));
		} catch {
			// Storage can be blocked; the view then lasts for this visit.
		}
	};

	return [view, update];
}

/**
 * Snackbars of the library.
 *
 * @return {Element} component.
 */
function Snackbars() {
	const notices = useSelect(
		(select) =>
			select(noticesStore)
				.getNotices()
				.filter((notice) => notice.type === 'snackbar'),
		[]
	);
	const { removeNotice } = useDispatch(noticesStore);

	return (
		<SnackbarList
			className="vpf-library-snackbars"
			notices={notices}
			onRemove={removeNotice}
		/>
	);
}

/**
 * Split button that adds a layout, with the legacy editor behind its menu.
 *
 * @return {Element} component.
 */
function AddNewButton() {
	const isSmall = useViewportMatch('medium', '<');

	return (
		<HStack spacing={0} className="vpf-library-add">
			<Button __next40pxDefaultSize variant="primary" href={NEW_URL}>
				{isSmall
					? __('Add New', 'visual-portfolio')
					: __('Add New Saved Layout', 'visual-portfolio')}
			</Button>
			<DropdownMenu
				icon={chevronDown}
				label={__('More ways to add', 'visual-portfolio')}
				popoverProps={{ placement: 'bottom-end' }}
				toggleProps={{
					__next40pxDefaultSize: true,
					variant: 'primary',
					className: 'vpf-library-add__toggle',
				}}
			>
				{() => (
					<MenuGroup>
						<MenuItem
							href={NEW_URL}
							info={__(
								'Gallery Loop blocks. Insert it on pages or sync galleries with it.',
								'visual-portfolio'
							)}
						>
							{__('Saved Layout', 'visual-portfolio')}
						</MenuItem>
						<MenuItem
							href={NEW_LEGACY_URL}
							info={__(
								'Classic settings editor, for page builders and shortcodes.',
								'visual-portfolio'
							)}
						>
							{__('Legacy Saved Layout', 'visual-portfolio')}
						</MenuItem>
					</MenuGroup>
				)}
			</DropdownMenu>
		</HStack>
	);
}

/**
 * Import button that reads export files.
 *
 * @param {Object}   props          - component props.
 * @param {Function} props.onImport - called after the files are imported.
 * @return {Element} component.
 */
function ImportButton({ onImport }) {
	const input = useRef();
	const isSmall = useViewportMatch('medium', '<');
	const [isBusy, setIsBusy] = useState(false);
	const { createSuccessNotice, createErrorNotice } =
		useDispatch(noticesStore);

	const onChange = async (event) => {
		const files = [...event.target.files];

		event.target.value = '';

		if (!files.length) {
			return;
		}

		setIsBusy(true);

		let created = 0;
		let dropped = 0;

		for (const file of files) {
			try {
				const result = await apiFetch({
					path: '/visual-portfolio/v1/saved-layouts/import',
					method: 'POST',
					data: { file: JSON.parse(await file.text()) },
				});

				created += result.created.length;
				dropped += result.droppedImages;
			} catch (error) {
				createErrorNotice(
					sprintf(
						// translators: %1$s - file name, %2$s - error.
						__('%1$s was not imported: %2$s', 'visual-portfolio'),
						file.name,
						error.message ||
							__('the file cannot be read.', 'visual-portfolio')
					),
					{ type: 'snackbar' }
				);
			}
		}

		setIsBusy(false);

		if (created) {
			createSuccessNotice(
				[
					sprintf(
						// translators: %d - number of layouts.
						_n(
							'%d layout imported.',
							'%d layouts imported.',
							created,
							'visual-portfolio'
						),
						created
					),
					dropped
						? sprintf(
								// translators: %d - number of images.
								_n(
									'%d image is not on this site and was left out.',
									'%d images are not on this site and were left out.',
									dropped,
									'visual-portfolio'
								),
								dropped
							)
						: '',
				]
					.filter(Boolean)
					.join(' '),
				{ type: 'snackbar' }
			);
			onImport();
		}
	};

	return (
		<>
			<Button
				__next40pxDefaultSize
				variant="secondary"
				icon={isSmall ? upload : undefined}
				label={isSmall ? __('Import', 'visual-portfolio') : undefined}
				isBusy={isBusy}
				disabled={isBusy}
				onClick={() => input.current?.click()}
			>
				{isSmall ? null : __('Import', 'visual-portfolio')}
			</Button>
			<input
				ref={input}
				type="file"
				accept=".json,application/json"
				multiple
				hidden
				onChange={onChange}
			/>
		</>
	);
}

/**
 * What an empty library offers.
 *
 * @return {Element} component.
 */
function EmptyLibrary() {
	return (
		<VStack spacing={4} alignment="center" className="vpf-library-empty">
			<Text as="h2" size="title" weight={500}>
				{__('No Saved Layouts yet', 'visual-portfolio')}
			</Text>
			<Text variant="muted" align="center">
				{__(
					'A Saved Layout is a gallery you build once. Insert it on any page, or sync the settings of Gallery Loop blocks with it, so changing it here changes them all.',
					'visual-portfolio'
				)}
			</Text>
			<AddNewButton />
		</VStack>
	);
}

/**
 * Which list the page shows, kept in the `status` parameter of its URL.
 *
 * @return {Array} `[ isTrash, setIsTrash ]`.
 */
function useTrashParam() {
	const read = () =>
		'trash' === new URLSearchParams(window.location.search).get('status');
	const [isTrash, setIsTrash] = useState(read);

	useEffect(() => {
		const onPopState = () => setIsTrash(read());

		window.addEventListener('popstate', onPopState);

		return () => window.removeEventListener('popstate', onPopState);
	}, []);

	const update = (next) => {
		const url = new URL(window.location.href);

		if (next) {
			url.searchParams.set('status', 'trash');
		} else {
			url.searchParams.delete('status');
		}

		window.history.pushState(null, '', url);
		setIsTrash(next);
	};

	return [isTrash, update];
}

/**
 * Where the grid's select-all bar goes: a slot in the toolbar row. The bar is
 * part of DataViews' grid, with the selection's bulk actions, and would take
 * a row of its own above the cards; the stylesheet places it over the slot.
 *
 * @return {Function} ref callback of the slot.
 */
function useBulkSlot() {
	const cleanup = useRef();

	return useCallback((element) => {
		cleanup.current?.();
		cleanup.current = null;

		const wrapper = element?.closest('.dataviews-wrapper');

		if (!wrapper) {
			return;
		}

		const place = () => {
			const box = element.getBoundingClientRect();
			const frame = wrapper.getBoundingClientRect();

			wrapper.style.setProperty(
				'--vpf-bulk-top',
				`${box.top - frame.top}px`
			);
			wrapper.style.setProperty(
				'--vpf-bulk-left',
				`${box.left - frame.left}px`
			);
			wrapper.style.setProperty('--vpf-bulk-width', `${box.width}px`);
		};

		const observer = new window.ResizeObserver(place);

		observer.observe(wrapper);
		observer.observe(element);
		place();

		cleanup.current = () => observer.disconnect();
	}, []);
}

/**
 * The Saved Layouts library.
 *
 * @return {Element} component.
 */
function SavedLayoutsLibrary() {
	const [isTrash, setIsTrash] = useTrashParam();
	const bulkSlot = useBulkSlot();
	const [view, setView] = useStoredView();
	const [selection, setSelection] = useState([]);
	const { invalidateResolutionForStoreSelector } = useDispatch(coreStore);
	const { createSuccessNotice, createErrorNotice } =
		useDispatch(noticesStore);

	const { records, isResolving } = useEntityRecords('postType', POST_TYPE, {
		per_page: -1,
		status: isTrash ? ['trash'] : LIVE_STATUSES,
		context: 'edit',
		_fields: 'id,title,status,modified,vpf_layout',
	});
	const { totalItems: liveCount } = useEntityRecords('postType', POST_TYPE, {
		per_page: 1,
		status: LIVE_STATUSES,
		_fields: 'id',
	});
	const { totalItems: trashCount } = useEntityRecords('postType', POST_TYPE, {
		per_page: 1,
		status: ['trash'],
		_fields: 'id',
	});

	const refresh = () =>
		invalidateResolutionForStoreSelector('getEntityRecords');

	const actions = getActions({
		isTrash,
		onChange: refresh,
		notify: (message) => createSuccessNotice(message, { type: 'snackbar' }),
		notifyError: (message) =>
			createErrorNotice(message, { type: 'snackbar' }),
		restore: (item) =>
			apiFetch({
				path: `/visual-portfolio/v1/saved-layouts/${item.id}/restore`,
				method: 'POST',
			}),
	});

	const { data, paginationInfo } = useMemo(
		() => filterSortAndPaginate(records || [], view, fields),
		[records, view]
	);

	const isEmpty = !isTrash && !isResolving && records && !records.length;

	return (
		<Page
			className="vpf-library"
			title={__('Saved Layouts', 'visual-portfolio')}
			description={__(
				'Galleries you build once. Insert one on a page, or sync a Gallery Loop with it.',
				'visual-portfolio'
			)}
			actions={
				<>
					<ImportButton onImport={refresh} />
					<AddNewButton />
				</>
			}
			sections={
				<PageSections
					label={__('Saved Layouts', 'visual-portfolio')}
					current={isTrash ? 'trash' : 'all'}
					onSelect={(id) => {
						setSelection([]);
						setIsTrash('trash' === id);
					}}
					items={[
						{
							id: 'all',
							label: __('All', 'visual-portfolio'),
							href: '?page=vpf-saved-layouts',
							count: liveCount,
						},
						{
							id: 'trash',
							label: __('Trash', 'visual-portfolio'),
							href: '?page=vpf-saved-layouts&status=trash',
							count: trashCount,
						},
					]}
				/>
			}
		>
			{isEmpty ? (
				<EmptyLibrary />
			) : (
				<DataViews
					key={isTrash ? 'trash' : 'all'}
					data={data}
					fields={fields}
					view={view}
					onChangeView={setView}
					actions={actions}
					isLoading={isResolving && !records}
					paginationInfo={paginationInfo}
					defaultLayouts={DEFAULT_LAYOUTS}
					getItemId={(item) => `${item.id}`}
					selection={selection}
					onChangeSelection={setSelection}
					isItemClickable={() => !isTrash}
					onClickItem={(item) => {
						window.location.href = item.vpf_layout.editUrl;
					}}
					empty={
						<Text variant="muted">
							{isTrash
								? __('The trash is empty.', 'visual-portfolio')
								: __('No layouts match.', 'visual-portfolio')}
						</Text>
					}
				>
					<div className="vpf-library-toolbar">
						<DataViews.Search
							label={__('Search layouts', 'visual-portfolio')}
						/>
						<DataViews.FiltersToggle />
						<div
							ref={bulkSlot}
							className="vpf-library-toolbar__bulk"
						/>
						<div className="vpf-library-toolbar__end">
							<DataViews.LayoutSwitcher />
							<DataViews.ViewConfig />
						</div>
					</div>
					<DataViews.FiltersToggled />
					<DataViews.Layout />
					<DataViews.Footer />
				</DataViews>
			)}
			<Snackbars />
		</Page>
	);
}

export default SavedLayoutsLibrary;
