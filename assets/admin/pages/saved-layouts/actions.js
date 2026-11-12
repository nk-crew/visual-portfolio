import apiFetch from '@wordpress/api-fetch';
import {
	Button,
	__experimentalHStack as HStack,
	Spinner,
	__experimentalText as Text,
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useDispatch } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { backup, copy, download, pencil, trash } from '@wordpress/icons';
import { store as noticesStore } from '@wordpress/notices';
import { addQueryArgs } from '@wordpress/url';

import { getTitle } from './fields';

export const POST_TYPE = 'vp_lists';

/**
 * Save an export file.
 *
 * @param {Object[]} items - layouts.
 */
async function exportLayouts(items) {
	const file = await apiFetch({
		path: addQueryArgs('/visual-portfolio/v1/saved-layouts/export', {
			ids: items.map((item) => item.id),
		}),
	});
	const name =
		items.length === 1
			? getTitle(items[0])
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/(^-|-$)/g, '') || 'saved-layout'
			: 'saved-layouts';
	const url = URL.createObjectURL(
		new Blob([JSON.stringify(file, null, '\t')], {
			type: 'application/json',
		})
	);
	const link = document.createElement('a');

	link.href = url;
	link.download = `${name}.json`;
	link.click();
	URL.revokeObjectURL(url);
}

/**
 * Pages that use one layout.
 *
 * @param {number} id - layout id.
 * @return {Array|null} usage, null while loading.
 */
function useUsage(id) {
	const [usage, setUsage] = useState(null);

	useEffect(() => {
		let cancelled = false;

		apiFetch({ path: `/visual-portfolio/v1/saved-layouts/${id}/usage` })
			.then((result) => !cancelled && setUsage(result))
			.catch(() => !cancelled && setUsage({ total: 0, items: [] }));

		return () => {
			cancelled = true;
		};
	}, [id]);

	return usage;
}

/**
 * Pages a layout is used on, as the delete dialogs list them.
 *
 * @param {Object}  props       - component props.
 * @param {Object}  props.item  - layout.
 * @param {boolean} props.final - whether the layout is deleted for good.
 * @return {Element} component.
 */
function UsageList({ item, final }) {
	const usage = useUsage(item.id);

	if (usage === null) {
		return <Spinner />;
	}

	if (!usage.total) {
		return (
			<Text>
				{item.vpf_layout?.kind === 'legacy'
					? __(
							'It is not used on any page. Shortcodes inside page builders are not counted, and they will show nothing.',
							'visual-portfolio'
						)
					: __('It is not used on any page.', 'visual-portfolio')}
			</Text>
		);
	}

	const synced = usage.items.some((page) => page.synced);
	const inserted = usage.items.some((page) => page.inserted);
	const more = usage.total - usage.items.length;

	return (
		<VStack spacing={3}>
			<Text>
				{sprintf(
					// translators: %d - number of pages.
					_n(
						'It is used on %d page:',
						'It is used on %d pages:',
						usage.total,
						'visual-portfolio'
					),
					usage.total
				)}
			</Text>
			<ul className="vpf-library-usage">
				{usage.items.map((page) => (
					<li key={page.id}>
						<span>
							{page.title || __('(no title)', 'visual-portfolio')}
						</span>
						<span className="vpf-library-muted">
							{page.synced
								? __('Synced', 'visual-portfolio')
								: __('Inserted', 'visual-portfolio')}
						</span>
					</li>
				))}
			</ul>
			{more > 0 && (
				<Text variant="muted">
					{sprintf(
						// translators: %d - number of pages not listed.
						_n(
							'And %d more.',
							'And %d more.',
							more,
							'visual-portfolio'
						),
						more
					)}
				</Text>
			)}
			{inserted && (
				<Text>
					{__(
						'Inserted copies stop showing on these pages.',
						'visual-portfolio'
					)}
				</Text>
			)}
			{synced && (
				<Text>
					{final
						? __(
								'Synced galleries keep their current look and stop syncing.',
								'visual-portfolio'
							)
						: __(
								'Synced galleries keep following it until it is deleted for good.',
								'visual-portfolio'
							)}
				</Text>
			)}
		</VStack>
	);
}

/**
 * Confirmation of a trash or a permanent delete.
 *
 * @param {Object}   props                    - component props.
 * @param {Object[]} props.items              - layouts.
 * @param {Function} props.closeModal         - close the modal.
 * @param {Function} props.onActionPerformed  - report the action.
 * @param {boolean}  props.final              - whether to delete for good.
 * @return {Element} component.
 */
function DeleteModal({ items, closeModal, onActionPerformed, final }) {
	const [isBusy, setIsBusy] = useState(false);
	const { deleteEntityRecord } = useDispatch(coreStore);
	const { createSuccessNotice, createErrorNotice } =
		useDispatch(noticesStore);
	const single = items.length === 1;

	const onConfirm = async () => {
		setIsBusy(true);

		const results = await Promise.allSettled(
			items.map((item) =>
				deleteEntityRecord(
					'postType',
					POST_TYPE,
					item.id,
					final ? { force: true } : {},
					{ throwOnError: true }
				)
			)
		);
		const failed = results.filter((result) => result.status === 'rejected');

		if (failed.length) {
			createErrorNotice(
				failed[0].reason?.message ||
					__(
						'Some layouts could not be deleted.',
						'visual-portfolio'
					),
				{ type: 'snackbar' }
			);
		} else {
			createSuccessNotice(
				single
					? sprintf(
							// translators: %s - layout title.
							final
								? __('“%s” deleted.', 'visual-portfolio')
								: __(
										'“%s” moved to the trash.',
										'visual-portfolio'
									),
							getTitle(items[0])
						)
					: sprintf(
							// translators: %d - number of layouts.
							final
								? _n(
										'%d layout deleted.',
										'%d layouts deleted.',
										items.length,
										'visual-portfolio'
									)
								: _n(
										'%d layout moved to the trash.',
										'%d layouts moved to the trash.',
										items.length,
										'visual-portfolio'
									),
							items.length
						),
				{ type: 'snackbar' }
			);
		}

		setIsBusy(false);
		onActionPerformed?.(items);
		closeModal?.();
	};

	return (
		<VStack spacing={5}>
			{single ? (
				<UsageList item={items[0]} final={final} />
			) : (
				<Text>
					{sprintf(
						// translators: %d - number of layouts.
						_n(
							'%d layout is selected. Galleries synced with them keep their look.',
							'%d layouts are selected. Galleries synced with them keep their look.',
							items.length,
							'visual-portfolio'
						),
						items.length
					)}
				</Text>
			)}
			<HStack justify="flex-end">
				<Button
					__next40pxDefaultSize
					variant="tertiary"
					onClick={closeModal}
					disabled={isBusy}
				>
					{__('Cancel', 'visual-portfolio')}
				</Button>
				<Button
					__next40pxDefaultSize
					variant="primary"
					isDestructive
					isBusy={isBusy}
					disabled={isBusy}
					onClick={onConfirm}
				>
					{final
						? __('Delete', 'visual-portfolio')
						: __('Move to trash', 'visual-portfolio')}
				</Button>
			</HStack>
		</VStack>
	);
}

/**
 * Actions of the library.
 *
 * @param {Object}   options            - options.
 * @param {boolean}  options.isTrash    - whether the trash is shown.
 * @param {Function} options.onChange   - refresh the list after a change.
 * @param {Function} options.notify     - show a snackbar.
 * @param {Function} options.notifyError - show an error snackbar.
 * @param {Function} options.restore    - restore a layout from the trash.
 * @return {Object[]} actions.
 */
export function getActions({
	isTrash,
	onChange,
	notify,
	notifyError,
	restore,
}) {
	if (isTrash) {
		return [
			{
				id: 'restore',
				label: __('Restore', 'visual-portfolio'),
				icon: backup,
				isPrimary: true,
				supportsBulk: true,
				callback: async (items) => {
					await Promise.all(items.map(restore));
					notify(
						sprintf(
							// translators: %d - number of layouts.
							_n(
								'%d layout restored.',
								'%d layouts restored.',
								items.length,
								'visual-portfolio'
							),
							items.length
						)
					);
					onChange();
				},
			},
			{
				id: 'delete',
				label: __('Delete permanently', 'visual-portfolio'),
				icon: trash,
				isDestructive: true,
				supportsBulk: true,
				modalHeader: (items) =>
					items.length === 1
						? sprintf(
								// translators: %s - layout title.
								__(
									'Delete “%s” permanently?',
									'visual-portfolio'
								),
								getTitle(items[0])
							)
						: __('Delete layouts permanently?', 'visual-portfolio'),
				RenderModal: (props) => <DeleteModal {...props} final />,
			},
		];
	}

	return [
		{
			id: 'edit',
			label: __('Edit', 'visual-portfolio'),
			icon: pencil,
			isPrimary: true,
			callback: ([item]) => {
				window.location.href = item.vpf_layout.editUrl;
			},
		},
		{
			id: 'duplicate',
			label: __('Duplicate', 'visual-portfolio'),
			callback: async ([item]) => {
				try {
					await apiFetch({
						path: `/visual-portfolio/v1/saved-layouts/${item.id}/duplicate`,
						method: 'POST',
					});
					notify(
						sprintf(
							// translators: %s - layout title.
							__('“%s” duplicated.', 'visual-portfolio'),
							getTitle(item)
						)
					);
					onChange();
				} catch (error) {
					notifyError(error.message);
				}
			},
		},
		{
			id: 'copy-shortcode',
			label: __('Copy shortcode', 'visual-portfolio'),
			icon: copy,
			callback: async ([item]) => {
				try {
					await window.navigator.clipboard.writeText(
						item.vpf_layout.shortcode
					);
					notify(__('Shortcode copied.', 'visual-portfolio'));
				} catch {
					notifyError(item.vpf_layout.shortcode);
				}
			},
		},
		{
			id: 'export',
			label: __('Export as JSON', 'visual-portfolio'),
			icon: download,
			supportsBulk: true,
			callback: async (items) => {
				try {
					await exportLayouts(items);
				} catch (error) {
					notifyError(error.message);
				}
			},
		},
		{
			id: 'trash',
			label: __('Move to trash', 'visual-portfolio'),
			icon: trash,
			isDestructive: true,
			supportsBulk: true,
			modalHeader: (items) =>
				items.length === 1
					? sprintf(
							// translators: %s - layout title.
							__('Move “%s” to the trash?', 'visual-portfolio'),
							getTitle(items[0])
						)
					: __('Move layouts to the trash?', 'visual-portfolio'),
			RenderModal: (props) => <DeleteModal {...props} final={false} />,
		},
	];
}
