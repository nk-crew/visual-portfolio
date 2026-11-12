import {
	Button,
	__experimentalToolsPanel as CoreToolsPanel,
	__experimentalToolsPanelItem as CoreToolsPanelItem,
} from '@wordpress/components';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
} from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { rotateLeft } from '@wordpress/icons';

import {
	captureAttributeNames,
	runAsReset,
	SyncContext,
} from '../../extensions/saved-layout-sync/context';
import { isOverridden } from '../../extensions/saved-layout-sync/utils';

const PanelContext = createContext(null);

/**
 * Core's `ToolsPanel`, whose *Reset all* returns the settings of a block
 * synced with a Saved Layout to the layout's values: the settings its own
 * items own, so another panel's stay as the page set them.
 *
 * @param {Object} props - `ToolsPanel` props.
 * @return {Element} component.
 */
export function ToolsPanel({ resetAll, children, ...props }) {
	const sync = useContext(SyncContext);
	const items = useRef(new Set());
	const register = useCallback((names) => {
		items.current.add(names);

		return () => items.current.delete(names);
	}, []);
	let onResetAll = resetAll;

	if (sync && resetAll) {
		onResetAll = (filters) =>
			runAsReset(() => resetAll(filters), [...items.current].flat());
	}

	return (
		<CoreToolsPanel {...props} resetAll={onResetAll}>
			<PanelContext.Provider value={register}>
				{children}
			</PanelContext.Provider>
		</CoreToolsPanel>
	);
}

/**
 * Core's `ToolsPanelItem`. In a block synced with a Saved Layout, a setting
 * the block changed is marked, and its reset returns it to the layout's value.
 *
 * The attributes a setting owns are the ones its `onDeselect` writes, or the
 * `attributeKeys` given when that handler does more than write them. Of
 * `extensions` it owns the keys that handler changes, as `extensions.<key>`.
 *
 * @param {Object} props - `ToolsPanelItem` props.
 * @return {Element} component.
 */
export function ToolsPanelItem({
	hasValue,
	onDeselect,
	isShownByDefault,
	attributeKeys,
	children,
	...props
}) {
	const sync = useContext(SyncContext);
	const register = useContext(PanelContext);
	let names = [];

	if (sync) {
		names = (attributeKeys || captureAttributeNames(onDeselect)).filter(
			sync.isSynced
		);
	}

	const namesKey = names.join(',');

	useEffect(
		() => register?.(namesKey ? namesKey.split(',') : []),
		[register, namesKey]
	);

	if (!names.length) {
		return (
			<CoreToolsPanelItem
				{...props}
				hasValue={hasValue}
				onDeselect={onDeselect}
				isShownByDefault={isShownByDefault}
			>
				{children}
			</CoreToolsPanelItem>
		);
	}

	const changed = names.some((name) => isOverridden(sync.overrides, name));
	const reset = () => runAsReset(onDeselect, names);

	return (
		<CoreToolsPanelItem
			{...props}
			hasValue={() => changed}
			onDeselect={reset}
			isShownByDefault={isShownByDefault || changed || !!hasValue?.()}
		>
			{changed && !sync.locked && (
				<div className="vpf-synced-setting">
					<span>
						{__('Changed on this gallery', 'visual-portfolio')}
					</span>
					<Button
						size="small"
						icon={rotateLeft}
						label={__('Reset to Saved Layout', 'visual-portfolio')}
						showTooltip
						onClick={reset}
					/>
				</div>
			)}
			{children}
		</CoreToolsPanelItem>
	);
}
