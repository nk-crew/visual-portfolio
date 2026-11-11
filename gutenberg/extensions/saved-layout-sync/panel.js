import { store as blockEditorStore } from '@wordpress/block-editor';
import { cloneBlock, serialize } from '@wordpress/blocks';
import {
	Button,
	Flex,
	FlexItem,
	Modal,
	Notice,
	PanelBody,
	SelectControl,
	TextControl,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';
import { useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { store as noticesStore } from '@wordpress/notices';

import { getStartingOverrides, LAYOUT_POST_TYPE } from './controller';
import { fetchLayout, useChoices, useLayout } from './source';
import { countOverrides, getChangedFromDefaults } from './utils';

/**
 * Modal that names a new layout made from the block.
 *
 * @param {Object}   props          - component props.
 * @param {Function} props.onClose  - close without saving.
 * @param {Function} props.onCreate - save under the name given.
 * @return {Element} component.
 */
function SaveAsModal({ onClose, onCreate }) {
	const [title, setTitle] = useState('');
	const [isBusy, setIsBusy] = useState(false);

	return (
		<Modal
			title={__('Save as Saved Layout', 'visual-portfolio')}
			onRequestClose={onClose}
			size="small"
		>
			<form
				onSubmit={async (event) => {
					event.preventDefault();
					setIsBusy(true);
					await onCreate(title.trim());
					setIsBusy(false);
				}}
			>
				<TextControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={__('Name', 'visual-portfolio')}
					help={__(
						'This gallery keeps its images and starts syncing its settings with the new layout.',
						'visual-portfolio'
					)}
					value={title}
					onChange={setTitle}
					autoFocus
				/>
				<Flex justify="flex-end" style={{ marginTop: 24 }}>
					<FlexItem>
						<Button
							__next40pxDefaultSize
							variant="tertiary"
							onClick={onClose}
						>
							{__('Cancel', 'visual-portfolio')}
						</Button>
					</FlexItem>
					<FlexItem>
						<Button
							__next40pxDefaultSize
							variant="primary"
							type="submit"
							isBusy={isBusy}
							disabled={!title.trim() || isBusy}
						>
							{__('Save', 'visual-portfolio')}
						</Button>
					</FlexItem>
				</Flex>
			</form>
		</Modal>
	);
}

/**
 * The Saved Layout panel of a Gallery Loop.
 *
 * @param {Object} props            - component props.
 * @param {string} props.clientId   - client id of the loop.
 * @param {Object} props.attributes - loop attributes.
 * @return {Element|null} component.
 */
export default function SavedLayoutPanel({ clientId, attributes }) {
	const registry = useRegistry();
	const [isSavingAs, setIsSavingAs] = useState(false);
	const { updateBlockAttributes } = useDispatch(blockEditorStore);
	const { saveEntityRecord } = useDispatch(coreStore);
	const { createSuccessNotice, createErrorNotice } =
		useDispatch(noticesStore);

	const { currentPostType, canCreate } = useSelect(
		(select) => ({
			currentPostType: select(editorStore)?.getCurrentPostType?.(),
			canCreate: select(coreStore).canUser('create', {
				kind: 'postType',
				name: LAYOUT_POST_TYPE,
			}),
		}),
		[]
	);
	const [layouts, refreshLayouts] = useChoices();
	const reference = attributes.savedLayout;
	const id = reference?.id || 0;
	const { record, locked, error } = useLayout(id);
	const changes = countOverrides(reference?.overrides);

	if (currentPostType === LAYOUT_POST_TYPE) {
		return null;
	}

	const detach = () => {
		updateBlockAttributes(clientId, { savedLayout: undefined });
		createSuccessNotice(
			__(
				'Detached. The gallery keeps its current settings.',
				'visual-portfolio'
			),
			{ type: 'snackbar' }
		);
	};

	const link = async (layoutId, { keepChanges = true } = {}) => {
		const { record: layoutRecord, layout } = await fetchLayout(layoutId);
		const loop = registry.select(blockEditorStore).getBlock(clientId);

		if (!layout || !loop) {
			createErrorNotice(
				__('This Saved Layout cannot be synced.', 'visual-portfolio'),
				{ type: 'snackbar' }
			);
			return;
		}

		const { overrides, keys } = getStartingOverrides(
			loop,
			layout,
			getChangedFromDefaults
		);
		const kept = keepChanges ? overrides : {};

		// One undo step for the keys and the link.
		registry.batch(() => {
			keys.forEach(([blockClientId, key]) => {
				const { metadata } = registry
					.select(blockEditorStore)
					.getBlockAttributes(blockClientId);

				updateBlockAttributes(blockClientId, {
					metadata: { ...metadata, vpSyncKey: key },
				});
			});

			updateBlockAttributes(clientId, {
				savedLayout: { id: layoutId, overrides: kept },
			});
		});

		const count = countOverrides(kept);
		const name = layoutRecord.title || '';

		createSuccessNotice(
			count
				? sprintf(
						// translators: %1$s - layout name, %2$d - number of settings.
						_n(
							'Synced with “%1$s”. %2$d setting changed on this gallery stays.',
							'Synced with “%1$s”. %2$d settings changed on this gallery stay.',
							count,
							'visual-portfolio'
						),
						name,
						count
					)
				: sprintf(
						// translators: %s - layout name.
						__('Synced with “%s”.', 'visual-portfolio'),
						name
					),
			{ type: 'snackbar' }
		);
	};

	const createFromBlock = async (title) => {
		const loop = registry.select(blockEditorStore).getBlock(clientId);
		const copy = cloneBlock(loop, {
			savedLayout: undefined,
			block_id: Math.random().toString(36).slice(2, 10),
		});

		try {
			const created = await saveEntityRecord(
				'postType',
				LAYOUT_POST_TYPE,
				{ title, status: 'publish', content: serialize([copy]) },
				{ throwOnError: true }
			);

			setIsSavingAs(false);
			refreshLayouts();
			await link(created.id, { keepChanges: false });
		} catch (error) {
			createErrorNotice(
				error?.message ||
					__(
						'The Saved Layout could not be created.',
						'visual-portfolio'
					),
				{ type: 'snackbar' }
			);
		}
	};

	const options = [
		{ label: __('None', 'visual-portfolio'), value: '' },
		...(layouts || []).map((layout) => ({
			label: layout.title
				? layout.title
				: sprintf(
						// translators: %d - layout id.
						__('Untitled (#%d)', 'visual-portfolio'),
						layout.id
					),
			value: `${layout.id}`,
		})),
	];

	if (id && !options.some((option) => option.value === `${id}`)) {
		options.push({ label: `#${id}`, value: `${id}` });
	}

	const isMissing = error === 'missing';
	const isTrashed = record?.status === 'trash';
	let status = null;

	if (id && record) {
		if (locked) {
			status = __(
				'Synced. The layout locks its settings.',
				'visual-portfolio'
			);
		} else if (changes) {
			status = sprintf(
				// translators: %d - number of settings.
				_n(
					'Synced. %d setting changed on this gallery.',
					'Synced. %d settings changed on this gallery.',
					changes,
					'visual-portfolio'
				),
				changes
			);
		} else {
			status = __(
				'Synced. Every setting follows the layout.',
				'visual-portfolio'
			);
		}
	}

	return (
		<PanelBody
			title={__('Saved Layout', 'visual-portfolio')}
			className="vpf-saved-layout-panel"
		>
			<SelectControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={__('Sync settings with', 'visual-portfolio')}
				value={id ? `${id}` : ''}
				options={options}
				disabled={!layouts}
				onChange={(value) =>
					value ? link(parseInt(value, 10)) : detach()
				}
			/>

			{!id && (
				<>
					<p className="vpf-saved-layout-panel__help">
						{__(
							'Take the layout, item blocks and lightbox from a Saved Layout. Settings changed here stay this gallery’s own, and the images always do.',
							'visual-portfolio'
						)}
					</p>
					{canCreate && (
						<Button
							__next40pxDefaultSize
							variant="secondary"
							onClick={() => setIsSavingAs(true)}
						>
							{__('Save as Saved Layout', 'visual-portfolio')}
						</Button>
					)}
				</>
			)}

			{error === 'forbidden' && (
				<Notice status="info" isDismissible={false}>
					{__(
						'This Saved Layout is not published, so its settings cannot be shown here. The page still follows it.',
						'visual-portfolio'
					)}
				</Notice>
			)}

			{(isMissing || isTrashed) && (
				<Notice status="warning" isDismissible={false}>
					{isTrashed
						? __(
								'This Saved Layout is in the trash. The gallery still follows it until it is deleted for good.',
								'visual-portfolio'
							)
						: __(
								'This Saved Layout no longer exists.',
								'visual-portfolio'
							)}{' '}
					<Button variant="link" onClick={detach}>
						{__('Detach', 'visual-portfolio')}
					</Button>
				</Notice>
			)}

			{status && !isTrashed && (
				<div className="vpf-saved-layout-panel__status">
					<p>{status}</p>
					<Flex justify="flex-start" gap={4}>
						{record?.editUrl && (
							<Button
								variant="link"
								href={record.editUrl}
								target="_blank"
							>
								{__('Edit Saved Layout', 'visual-portfolio')}
							</Button>
						)}
						{changes > 0 && !locked && (
							<Button
								variant="link"
								onClick={() =>
									updateBlockAttributes(clientId, {
										savedLayout: { id, overrides: {} },
									})
								}
							>
								{__('Reset all', 'visual-portfolio')}
							</Button>
						)}
					</Flex>
					<p className="vpf-saved-layout-panel__help">
						{__(
							'Images and the query stay this gallery’s own. To add or remove blocks in the items, edit the Saved Layout or pick None.',
							'visual-portfolio'
						)}
					</p>
				</div>
			)}

			{isSavingAs && (
				<SaveAsModal
					onClose={() => setIsSavingAs(false)}
					onCreate={createFromBlock}
				/>
			)}
		</PanelBody>
	);
}
