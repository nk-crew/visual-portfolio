import {
	BlockSettingsMenuControls,
	store as blockEditorStore,
	InspectorControls,
} from '@wordpress/block-editor';
import { cloneBlock, serialize } from '@wordpress/blocks';
import {
	Button,
	DropdownMenu,
	Flex,
	FlexItem,
	MenuGroup,
	MenuItem,
	Modal,
	Notice,
	SelectControl,
	TextControl,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';
import { useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { Icon, moreVertical, symbol } from '@wordpress/icons';
import { store as noticesStore } from '@wordpress/notices';

import { getStartingOverrides, LAYOUT_POST_TYPE } from './controller';
import { fetchLayout, useChoices, useLayout } from './source';
import { countOverrides, getChangedFromDefaults } from './utils';

/**
 * Buttons that close a modal or confirm it.
 *
 * @param {Object}   props           - component props.
 * @param {Function} props.onClose   - close without acting.
 * @param {string}   props.label     - label of the confirming button.
 * @param {boolean}  props.isBusy    - whether the action runs.
 * @param {boolean}  props.disabled  - whether the action is unavailable.
 * @return {Element} component.
 */
function ModalActions({ onClose, label, isBusy, disabled }) {
	return (
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
					disabled={disabled || isBusy}
				>
					{label}
				</Button>
			</FlexItem>
		</Flex>
	);
}

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
				<ModalActions
					onClose={onClose}
					label={__('Save', 'visual-portfolio')}
					isBusy={isBusy}
					disabled={!title.trim()}
				/>
			</form>
		</Modal>
	);
}

/**
 * Modal that picks the layout a gallery syncs with.
 *
 * @param {Object}   props          - component props.
 * @param {number}   props.current  - id of the layout synced now, if any.
 * @param {Function} props.onClose  - close without syncing.
 * @param {Function} props.onSync   - sync with the layout id picked.
 * @return {Element} component.
 */
function SyncModal({ current, onClose, onSync }) {
	const [layouts] = useChoices();
	const [value, setValue] = useState('');
	const [isBusy, setIsBusy] = useState(false);
	const options = (layouts || [])
		.filter((layout) => layout.id !== current)
		.map((layout) => ({
			label:
				layout.title ||
				sprintf(
					// translators: %d - layout id.
					__('Untitled (#%d)', 'visual-portfolio'),
					layout.id
				),
			value: `${layout.id}`,
		}));
	const selected = value || options[0]?.value || '';

	return (
		<Modal
			title={__('Sync with Saved Layout', 'visual-portfolio')}
			onRequestClose={onClose}
			size="small"
		>
			<form
				onSubmit={async (event) => {
					event.preventDefault();
					setIsBusy(true);
					await onSync(parseInt(selected, 10));
					setIsBusy(false);
				}}
			>
				{layouts && !options.length ? (
					<p>
						{__(
							'There is no other Saved Layout to sync with yet.',
							'visual-portfolio'
						)}
					</p>
				) : (
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={__('Saved Layout', 'visual-portfolio')}
						help={__(
							'The gallery takes its layout, item blocks and lightbox from the Saved Layout. Its images, and settings changed here, stay its own.',
							'visual-portfolio'
						)}
						value={selected}
						options={options}
						disabled={!layouts}
						onChange={setValue}
					/>
				)}
				<ModalActions
					onClose={onClose}
					label={__('Sync', 'visual-portfolio')}
					isBusy={isBusy}
					disabled={!selected}
				/>
			</form>
		</Modal>
	);
}

/**
 * What a synced gallery's status line says.
 *
 * @param {boolean} locked  - whether the layout locks its settings.
 * @param {number}  changes - settings changed on the gallery.
 * @return {string} text.
 */
function getStatus(locked, changes) {
	if (locked) {
		return __('Locked by the layout', 'visual-portfolio');
	}

	if (changes) {
		return sprintf(
			// translators: %d - number of settings.
			_n(
				'%d setting changed here',
				'%d settings changed here',
				changes,
				'visual-portfolio'
			),
			changes
		);
	}

	return __('Follows the layout', 'visual-portfolio');
}

/**
 * Saved Layout controls of a Gallery Loop: syncing and saving from the
 * block's menu, and a status line at the top of the inspector while the
 * gallery is synced.
 *
 * @param {Object} props            - component props.
 * @param {string} props.clientId   - client id of the loop.
 * @param {Object} props.attributes - loop attributes.
 * @return {Element|null} component.
 */
export default function SavedLayoutPanel({ clientId, attributes }) {
	const registry = useRegistry();
	const [modal, setModal] = useState(null);
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
	const [, refreshLayouts] = useChoices();
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

		setModal(null);

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

			setModal(null);
			refreshLayouts();
			await link(created.id, { keepChanges: false });
		} catch (requestError) {
			createErrorNotice(
				requestError?.message ||
					__(
						'The Saved Layout could not be created.',
						'visual-portfolio'
					),
				{ type: 'snackbar' }
			);
		}
	};

	const isTrashed = record?.status === 'trash';
	let notice = null;

	if ('forbidden' === error) {
		notice = __(
			'This Saved Layout is not published, so its settings cannot be shown here. The page still follows it.',
			'visual-portfolio'
		);
	} else if ('missing' === error) {
		notice = __('This Saved Layout no longer exists.', 'visual-portfolio');
	} else if (isTrashed) {
		notice = __(
			'This Saved Layout is in the trash. The gallery still follows it until it is deleted for good.',
			'visual-portfolio'
		);
	}

	return (
		<>
			{!id && (
				<BlockSettingsMenuControls>
					{({ selectedClientIds, onClose }) =>
						1 === selectedClientIds.length &&
						clientId === selectedClientIds[0] && (
							<>
								<MenuItem
									onClick={() => {
										onClose();
										setModal('sync');
									}}
								>
									{__(
										'Sync with Saved Layout…',
										'visual-portfolio'
									)}
								</MenuItem>
								{canCreate && (
									<MenuItem
										onClick={() => {
											onClose();
											setModal('save');
										}}
									>
										{__(
											'Save as Saved Layout…',
											'visual-portfolio'
										)}
									</MenuItem>
								)}
							</>
						)
					}
				</BlockSettingsMenuControls>
			)}

			{!!id && (
				<InspectorControls>
					<div className="vpf-saved-layout-status">
						<Icon
							icon={symbol}
							className="vpf-saved-layout-status__icon"
						/>
						<div className="vpf-saved-layout-status__text">
							<strong>
								{record?.title ||
									sprintf(
										// translators: %d - layout id.
										__(
											'Saved Layout #%d',
											'visual-portfolio'
										),
										id
									)}
							</strong>
							{!error && record && (
								<span>
									{getStatus(locked, changes)}
									{changes > 0 && !locked && (
										<>
											{' · '}
											<Button
												variant="link"
												onClick={() =>
													updateBlockAttributes(
														clientId,
														{
															savedLayout: {
																id,
																overrides: {},
															},
														}
													)
												}
											>
												{__(
													'Reset',
													'visual-portfolio'
												)}
											</Button>
										</>
									)}
								</span>
							)}
						</div>
						<DropdownMenu
							icon={moreVertical}
							label={__(
								'Saved Layout options',
								'visual-portfolio'
							)}
							toggleProps={{ size: 'small' }}
							popoverProps={{ placement: 'bottom-end' }}
						>
							{({ onClose }) => (
								<MenuGroup>
									{record?.editUrl && (
										<MenuItem
											href={record.editUrl}
											target="_blank"
											onClick={onClose}
										>
											{__(
												'Edit Saved Layout',
												'visual-portfolio'
											)}
										</MenuItem>
									)}
									<MenuItem
										onClick={() => {
											onClose();
											setModal('sync');
										}}
									>
										{__(
											'Sync with another…',
											'visual-portfolio'
										)}
									</MenuItem>
									<MenuItem
										onClick={() => {
											onClose();
											detach();
										}}
									>
										{__(
											'Detach from Saved Layout',
											'visual-portfolio'
										)}
									</MenuItem>
								</MenuGroup>
							)}
						</DropdownMenu>
						{notice && (
							<Notice
								status={
									'forbidden' === error ? 'info' : 'warning'
								}
								isDismissible={false}
								className="vpf-saved-layout-status__notice"
							>
								{notice}
							</Notice>
						)}
					</div>
				</InspectorControls>
			)}

			{'sync' === modal && (
				<SyncModal
					current={id}
					onClose={() => setModal(null)}
					onSync={(layoutId) => link(layoutId)}
				/>
			)}
			{'save' === modal && (
				<SaveAsModal
					onClose={() => setModal(null)}
					onCreate={createFromBlock}
				/>
			)}
		</>
	);
}
