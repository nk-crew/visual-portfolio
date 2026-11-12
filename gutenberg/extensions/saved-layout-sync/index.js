import './style.scss';

import {
	store as blockEditorStore,
	InspectorControls,
} from '@wordpress/block-editor';
import { createHigherOrderComponent } from '@wordpress/compose';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { useCallback, useMemo } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { store as noticesStore } from '@wordpress/notices';

import { getCapture, getResetNames, isResetting, SyncContext } from './context';
import SyncController from './controller';
import SavedLayoutPanel from './panel';
import { useLayout } from './source';
import {
	getChangedNames,
	getClearedKeys,
	getOverrides,
	getSyncKey,
	LOOP_BLOCK,
	LOOP_KEY,
	LOOP_SYNCED_ATTRIBUTES,
	parseOverride,
	TEMPLATE_BLOCK,
	withOverrides,
	withoutOverrides,
	withoutUnchanged,
} from './utils';

const isLoopSetting = (name) => LOOP_SYNCED_ATTRIBUTES.includes(name);
const getAttributes = (names) => [
	...new Set(names.map((name) => parseOverride(name).attribute)),
];
const isAnySetting = () => true;

/**
 * The synced loop a block belongs to: the loop itself, or a block inside its
 * item template.
 *
 * @param {string} clientId - client id.
 * @param {string} name     - block name.
 * @return {string} client id of the loop, empty when there is none.
 */
function useSyncedLoopId(clientId, name) {
	return useSelect(
		(select) => {
			const { getBlockParentsByBlockName, getBlockAttributes } =
				select(blockEditorStore);

			if (name === LOOP_BLOCK) {
				return getBlockAttributes(clientId)?.savedLayout?.id
					? clientId
					: '';
			}

			if (
				name !== TEMPLATE_BLOCK &&
				!getBlockParentsByBlockName(clientId, TEMPLATE_BLOCK).length
			) {
				return '';
			}

			const loops = getBlockParentsByBlockName(clientId, LOOP_BLOCK);
			const loop = loops[loops.length - 1];

			return loop && getBlockAttributes(loop)?.savedLayout?.id
				? loop
				: '';
		},
		[clientId, name]
	);
}

/**
 * A block of a synced loop: records what it changes as overrides, offers to
 * reset them, and drops changes a locked layout does not allow.
 *
 * @param {Object}   props           - component props.
 * @param {Function} props.BlockEdit - wrapped edit component.
 * @param {string}   props.loopId    - client id of the loop.
 * @param {Object}   props.editProps - props of the block edit.
 * @return {Element} component.
 */
function SyncedBlockEdit({ BlockEdit, loopId, editProps }) {
	const { name, attributes, setAttributes } = editProps;
	const registry = useRegistry();
	const { updateBlockAttributes } = useDispatch(blockEditorStore);
	const { createWarningNotice } = useDispatch(noticesStore);
	const reference = useSelect(
		(select) =>
			select(blockEditorStore).getBlockAttributes(loopId)?.savedLayout,
		[loopId]
	);
	const { locked } = useLayout(reference?.id);

	const isLoop = name === LOOP_BLOCK;
	const key = isLoop ? LOOP_KEY : getSyncKey({ attributes });
	const isSynced = isLoop ? isLoopSetting : isAnySetting;
	const overrides = getOverrides(reference?.overrides);
	const ownOverrides = key ? overrides[key] || [] : [];
	const overridesKey = ownOverrides.join(',');

	const syncedSetAttributes = useCallback(
		(next) => {
			const capture = getCapture();

			// A handler that writes an object as it is drops a key the page
			// cleared, so it owns those keys.
			const withCleared = (list) =>
				list.flatMap((name) => [
					name,
					...getClearedKeys(
						getOverrides(reference?.overrides)[key] || [],
						name,
						attributes
					),
				]);

			if (capture) {
				capture.push(...withCleared(getChangedNames(next, attributes)));
				return;
			}

			const names = getChangedNames(next, attributes).filter(isSynced);

			if (!names.length || !key) {
				setAttributes(next);
				return;
			}

			if (isResetting()) {
				const value =
					typeof next === 'function' ? next(attributes) : { ...next };
				const resetNames = [
					...names,
					...getResetNames().filter(isSynced),
				];
				const attributeNames = getAttributes(resetNames);

				attributeNames.forEach((attribute) => {
					delete value[attribute];
				});
				registry.batch(() => {
					updateBlockAttributes(loopId, {
						savedLayout: {
							...reference,
							overrides: withoutOverrides(
								reference?.overrides,
								key,
								[...resetNames, ...attributeNames]
							),
						},
					});

					if (Object.keys(value).length) {
						setAttributes(value);
					}
				});

				return;
			}

			const changed = withoutUnchanged(names);

			if (!changed.length) {
				setAttributes(next);
				return;
			}

			if (locked) {
				const value =
					typeof next === 'function' ? next(attributes) : { ...next };

				getAttributes(changed).forEach((attribute) => {
					delete value[attribute];
				});
				createWarningNotice(
					__(
						'The Saved Layout locks this setting. Edit the Saved Layout to change it.',
						'visual-portfolio'
					),
					{ type: 'snackbar', id: 'vpf-saved-layout-locked' }
				);

				if (Object.keys(value).length) {
					setAttributes(value);
				}

				return;
			}

			// One undo step for the change and its override.
			registry.batch(() => {
				updateBlockAttributes(loopId, {
					savedLayout: {
						...reference,
						overrides: withOverrides(
							reference?.overrides,
							key,
							changed
						),
					},
				});
				setAttributes(next);
			});
		},
		[
			registry,
			attributes,
			createWarningNotice,
			isSynced,
			key,
			locked,
			loopId,
			reference,
			setAttributes,
			updateBlockAttributes,
		]
	);

	const context = useMemo(
		() => ({
			overrides: overridesKey ? overridesKey.split(',') : [],
			isSynced,
			locked,
		}),
		[overridesKey, isSynced, locked]
	);

	return (
		<SyncContext.Provider value={context}>
			<BlockEdit {...editProps} setAttributes={syncedSetAttributes} />
		</SyncContext.Provider>
	);
}

const withSavedLayoutSync = createHigherOrderComponent(
	(BlockEdit) => (props) => {
		const { clientId, name, attributes, isSelected } = props;
		const loopId = useSyncedLoopId(clientId, name);
		const isLoop = name === LOOP_BLOCK;

		return (
			<>
				{isLoop && isSelected && (
					<InspectorControls>
						<SavedLayoutPanel
							clientId={clientId}
							attributes={attributes}
						/>
					</InspectorControls>
				)}
				{isLoop && loopId && <SyncController clientId={clientId} />}
				{loopId ? (
					<SyncedBlockEdit
						BlockEdit={BlockEdit}
						loopId={loopId}
						editProps={props}
					/>
				) : (
					<BlockEdit {...props} />
				)}
			</>
		);
	},
	'withSavedLayoutSync'
);

// After the block supports, so their panels write through the synced setter.
addFilter(
	'editor.BlockEdit',
	'visual-portfolio/saved-layout-sync',
	withSavedLayoutSync,
	20
);
