import {
	Button,
	__experimentalToolsPanel as CoreToolsPanel,
	__experimentalToolsPanelItem as CoreToolsPanelItem,
} from '@wordpress/components';
import { useContext } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { rotateLeft } from '@wordpress/icons';

import {
	captureAttributeNames,
	runAsReset,
	SyncContext,
} from '../../extensions/saved-layout-sync/context';

/**
 * Core's `ToolsPanel`, whose *Reset all* returns the settings of a block
 * synced with a Saved Layout to the layout's values.
 *
 * @param {Object} props - `ToolsPanel` props.
 * @return {Element} component.
 */
export function ToolsPanel({ resetAll, ...props }) {
	const sync = useContext(SyncContext);
	let onResetAll = resetAll;

	if (sync && resetAll) {
		onResetAll = (filters) => runAsReset(() => resetAll(filters));
	}

	return <CoreToolsPanel {...props} resetAll={onResetAll} />;
}

/**
 * Core's `ToolsPanelItem`. In a block synced with a Saved Layout, a setting
 * the block changed is marked, and its reset returns it to the layout's value.
 *
 * The attributes a setting owns are the ones its `onDeselect` writes.
 *
 * @param {Object} props - `ToolsPanelItem` props.
 * @return {Element} component.
 */
export function ToolsPanelItem({
	hasValue,
	onDeselect,
	isShownByDefault,
	children,
	...props
}) {
	const sync = useContext(SyncContext);
	const names = sync
		? captureAttributeNames(onDeselect).filter(sync.isSynced)
		: [];

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

	const changed = names.some((name) => sync.overrides.includes(name));
	const reset = () => runAsReset(onDeselect);

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
