/**
 * A Pro setting's place in the free editor: one line on what it does, and a
 * link to where it can be had. Pro registers the real setting under the same
 * name, and the teaser steps aside.
 */

/**
 * WordPress dependencies
 */
import { InspectorControls } from '@wordpress/block-editor';
import {
	ExternalLink,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

const { plugin_version: pluginVersion, pro: isProPlugin } =
	window.VPGutenbergVariables;

/**
 * The pricing page, told which teaser sent the visitor.
 *
 * @param {string} campaign - UTM campaign of the teaser.
 *
 * @return {string} URL.
 */
export function getProUrl(campaign) {
	return `https://www.visualportfolio.com/pricing/?utm_source=plugin&utm_medium=block_settings&utm_campaign=${campaign}&utm_content=${pluginVersion}`;
}

/**
 * The name of a Pro setting, marked as one.
 *
 * @param {string} label - setting name.
 *
 * @return {string} label.
 */
export function getProLabel(label) {
	/* translators: %s: name of a setting that comes with Pro. */
	return sprintf(__('%s (Pro)', 'visual-portfolio'), label);
}

/**
 * One line on what Pro adds, and the link.
 *
 * @param {Object} props          - component props.
 * @param {string} props.children - the line.
 * @param {string} props.campaign - UTM campaign.
 *
 * @return {Element} component.
 */
export function ProLine({ children, campaign }) {
	return (
		<>
			{children}{' '}
			<ExternalLink href={getProUrl(campaign)}>
				{__('Go Pro', 'visual-portfolio')}
			</ExternalLink>
		</>
	);
}

/**
 * An item of a panel's menu for a setting Pro adds there. Picked, it shows
 * the line; it never holds a value.
 *
 * @param {Object} props          - component props.
 * @param {string} props.label    - name of the setting.
 * @param {string} props.campaign - UTM campaign.
 * @param {string} props.children - the line.
 * @param {string} props.panelId  - panel the item belongs to, where the
 *                                panel names one.
 *
 * @return {Element} component.
 */
export function ProTeaserItem({ label, campaign, children, panelId }) {
	return (
		<ToolsPanelItem
			label={getProLabel(label)}
			hasValue={() => false}
			panelId={panelId}
		>
			<p className="vpf-pro-teaser">
				<ProLine campaign={campaign}>{children}</ProLine>
			</p>
		</ToolsPanelItem>
	);
}

/**
 * Teasers for the Pro items a `{ name, Item }` list lacks.
 *
 * @param {Array}  items   - the list after its filter has run.
 * @param {Array}  teasers - `{ name, label, line, campaign }` of the Pro items.
 * @param {string} panelId - the panel's id, where the panel names one.
 *
 * @return {Array} `{ name, Item }` of the missing ones.
 */
export function getMissingTeasers(items, teasers, panelId) {
	return teasers
		.filter(({ name }) => !items.some((item) => item.name === name))
		.map(({ name, label, line, campaign }) => ({
			name,
			Item: () => (
				<ProTeaserItem
					label={label}
					campaign={campaign}
					panelId={panelId}
				>
					{line}
				</ProTeaserItem>
			),
		}));
}

/**
 * A panel Pro adds to a block, for an install without Pro: its settings as
 * items of the panel's menu. With Pro the panel is Pro's own.
 *
 * @param {Object} props       - component props.
 * @param {string} props.label - name of the panel.
 * @param {Array}  props.items - `{ name, label, line, campaign }` of its settings.
 *
 * @return {Element|null} component.
 */
export function ProTeaserPanel({ label, items }) {
	if (isProPlugin) {
		return null;
	}

	return (
		<InspectorControls>
			<ToolsPanel label={label} resetAll={() => {}}>
				{items.map((item) => (
					<ProTeaserItem
						key={item.name}
						label={item.label}
						campaign={item.campaign}
					>
						{item.line}
					</ProTeaserItem>
				))}
			</ToolsPanel>
		</InspectorControls>
	);
}
