import apiFetch from '@wordpress/api-fetch';
import { store as blockEditorStore } from '@wordpress/block-editor';
import {
	Button,
	ExternalLink,
	Spinner,
	ToggleControl,
} from '@wordpress/components';
import { useCopyToClipboard } from '@wordpress/compose';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import {
	store as editorStore,
	PluginDocumentSettingPanel,
} from '@wordpress/editor';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { store as noticesStore } from '@wordpress/notices';
import { registerPlugin } from '@wordpress/plugins';

import { LAYOUT_POST_TYPE, LOCK_META } from './saved-layout-sync/controller';
import {
	createSyncKey,
	flatten,
	getSyncKey,
	LOOP_BLOCK,
	TEMPLATE_BLOCK,
} from './saved-layout-sync/utils';

/**
 * Give every block of the item templates a unique sync key, as blocks are
 * added and copied, so the pages synced with this layout can find them.
 */
function useSyncKeys() {
	const registry = useRegistry();
	const {
		updateBlockAttributes,
		__unstableMarkNextChangeAsNotPersistent: markNotPersistent,
	} = useDispatch(blockEditorStore);

	useEffect(() => {
		const check = () => {
			const { getBlocks } = registry.select(blockEditorStore);
			const seen = new Set();

			flatten(getBlocks())
				.filter((block) => block.name === TEMPLATE_BLOCK)
				.forEach((template) => {
					[template, ...flatten(template.innerBlocks)].forEach(
						(block) => {
							const key = getSyncKey(block);

							if (key && !seen.has(key)) {
								seen.add(key);
								return;
							}

							const fresh = createSyncKey();

							seen.add(fresh);
							// Not an undo step: undoing it would only bring it back.
							markNotPersistent();
							updateBlockAttributes(block.clientId, {
								metadata: {
									...block.attributes.metadata,
									vpSyncKey: fresh,
								},
							});
						}
					);
				});
		};

		check();

		return registry.subscribe(check, blockEditorStore);
	}, [registry, updateBlockAttributes, markNotPersistent]);
}

/**
 * Posts that use the layout, fetched again after each save.
 *
 * @param {number}  postId   - layout id.
 * @param {boolean} isSaving - whether the layout is being saved.
 * @return {Array|null} usage, null while loading.
 */
function useUsage(postId, isSaving) {
	const [usage, setUsage] = useState(null);

	useEffect(() => {
		if (!postId || isSaving) {
			return undefined;
		}

		let cancelled = false;

		apiFetch({
			path: `/visual-portfolio/v1/saved-layouts/${postId}/usage`,
		})
			.then((result) => {
				if (!cancelled) {
					setUsage(result);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setUsage({ total: 0, items: [] });
				}
			});

		return () => {
			cancelled = true;
		};
	}, [postId, isSaving]);

	return usage;
}

/**
 * Line describing how a post uses the layout.
 *
 * @param {Object} item - usage item.
 * @return {string} label.
 */
function getUsageLabel(item) {
	if (!item.synced) {
		return __('Inserted', 'visual-portfolio');
	}

	if (!item.changes) {
		return __('Synced', 'visual-portfolio');
	}

	return sprintf(
		// translators: %d - number of settings.
		_n(
			'Synced · %d change',
			'Synced · %d changes',
			item.changes,
			'visual-portfolio'
		),
		item.changes
	);
}

/**
 * Sidebar of a block-based Saved Layout.
 *
 * @return {Element|null} component.
 */
function SavedLayoutEditor() {
	const { postId, postType, isBlockLayout, isSaving, locked } = useSelect(
		(select) => {
			const editor = select(editorStore);

			return {
				postId: editor.getCurrentPostId(),
				postType: editor.getCurrentPostType(),
				isBlockLayout: select(blockEditorStore)
					.getBlocks()
					.some((block) => block.name === LOOP_BLOCK),
				isSaving: editor.isSavingPost() && !editor.isAutosavingPost(),
				locked: !!editor.getEditedPostAttribute('meta')?.[LOCK_META],
			};
		},
		[]
	);

	if (postType !== LAYOUT_POST_TYPE || !isBlockLayout) {
		return null;
	}

	return (
		<SavedLayoutPanels
			postId={postId}
			isSaving={isSaving}
			locked={locked}
		/>
	);
}

/**
 * Insert, Used on and Syncing panels.
 *
 * @param {Object}  props          - component props.
 * @param {number}  props.postId   - layout id.
 * @param {boolean} props.isSaving - whether the layout is being saved.
 * @param {boolean} props.locked   - whether the layout locks its settings.
 * @return {Element} component.
 */
function SavedLayoutPanels({ postId, isSaving, locked }) {
	const { editPost } = useDispatch(editorStore);
	const { createSuccessNotice } = useDispatch(noticesStore);
	const shortcode = `[visual_portfolio id="${postId}"]`;
	const copyRef = useCopyToClipboard(shortcode, () =>
		createSuccessNotice(__('Shortcode copied.', 'visual-portfolio'), {
			type: 'snackbar',
		})
	);
	const usage = useUsage(postId, isSaving);
	const items = usage?.items || [];
	const synced = items.filter((item) => item.synced).length;

	useSyncKeys();

	const wasSaving = useRef(false);

	useEffect(() => {
		if (wasSaving.current && !isSaving && synced) {
			createSuccessNotice(
				sprintf(
					// translators: %d - number of pages.
					_n(
						'Saved. The synced gallery on %d page uses the new settings.',
						'Saved. The synced galleries on %d pages use the new settings.',
						synced,
						'visual-portfolio'
					),
					synced
				),
				{ type: 'snackbar' }
			);
		}

		wasSaving.current = isSaving;
	}, [isSaving, synced, createSuccessNotice]);

	return (
		<>
			<PluginDocumentSettingPanel
				name="vpf-saved-layout-insert"
				title={__('Insert', 'visual-portfolio')}
				className="vpf-saved-layout-insert"
			>
				<div className="vpf-saved-layout-shortcode">
					<code>{shortcode}</code>
					<Button size="small" variant="tertiary" ref={copyRef}>
						{__('Copy', 'visual-portfolio')}
					</Button>
				</div>
				<p className="vpf-saved-layout-panel__help">
					{__(
						'Or add the Saved Layout block to a page, or pick this layout in a Gallery Loop to sync its settings.',
						'visual-portfolio'
					)}
				</p>
			</PluginDocumentSettingPanel>

			<PluginDocumentSettingPanel
				name="vpf-saved-layout-usage"
				title={__('Used on', 'visual-portfolio')}
				className="vpf-saved-layout-usage"
			>
				{usage === null && <Spinner />}
				{usage?.total === 0 && (
					<p className="vpf-saved-layout-panel__help">
						{__('Not used on any page yet.', 'visual-portfolio')}
					</p>
				)}
				{usage?.total > 0 && (
					<>
						{synced > 0 && (
							<p className="vpf-saved-layout-usage__note">
								{sprintf(
									// translators: %d - number of pages.
									_n(
										'Saving updates the synced gallery on %d page.',
										'Saving updates the synced galleries on %d pages.',
										synced,
										'visual-portfolio'
									),
									synced
								)}
							</p>
						)}
						<ul className="vpf-saved-layout-usage__list">
							{items.map((item) => (
								<li key={item.id}>
									{item.editUrl ? (
										<ExternalLink href={item.editUrl}>
											{item.title ||
												__(
													'(no title)',
													'visual-portfolio'
												)}
										</ExternalLink>
									) : (
										<span>
											{item.title ||
												__(
													'(no title)',
													'visual-portfolio'
												)}
										</span>
									)}
									<span className="vpf-saved-layout-usage__kind">
										{getUsageLabel(item)}
									</span>
								</li>
							))}
						</ul>
					</>
				)}
				<p className="vpf-saved-layout-panel__help">
					{__(
						'Shortcodes inside page builders are not counted.',
						'visual-portfolio'
					)}
				</p>
			</PluginDocumentSettingPanel>

			<PluginDocumentSettingPanel
				name="vpf-saved-layout-syncing"
				title={__('Syncing', 'visual-portfolio')}
			>
				<ToggleControl
					__nextHasNoMarginBottom
					label={__(
						'Galleries can change settings',
						'visual-portfolio'
					)}
					help={
						locked
							? __(
									'Synced galleries always match this layout. Their settings are locked.',
									'visual-portfolio'
								)
							: __(
									'A synced gallery can change any setting. Settings it did not change follow this layout.',
									'visual-portfolio'
								)
					}
					checked={!locked}
					onChange={(value) =>
						editPost({ meta: { [LOCK_META]: !value } })
					}
				/>
			</PluginDocumentSettingPanel>
		</>
	);
}

registerPlugin('vpf-saved-layout-editor', { render: SavedLayoutEditor });
