import { PanelBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import ProNote from '../components/pro-note';
import { SocialIcon, TaxonomiesIcon } from './icons';
import { registerLoopSource } from './registry';

const { pro: isProPlugin } = window.VPGutenbergVariables;

/**
 * Sources Pro owns.
 *
 * A static list, the same one the legacy inspector shows. It is registered on
 * every install, for two different reasons:
 *
 * - without Pro, so the picker can advertise them;
 * - with Pro, so a loop already set to one of them keeps a name, an icon and a
 *   place in the picker. Pro re-registers these names in Phase 7 with a real
 *   `SettingsPanel`, which merges into the slot held here - the title and the
 *   icon of both sources are the ones declared below.
 */
const PRO_SOURCES = [
	{
		name: 'taxonomies',
		title: __('Taxonomies', 'visual-portfolio'),
		icon: <TaxonomiesIcon />,
		category: 'core',
		teaser: __(
			'Display taxonomy archives such as categories, tags, and custom taxonomies.',
			'visual-portfolio'
		),
	},
	{
		name: 'social-stream',
		title: __('Social', 'visual-portfolio'),
		icon: <SocialIcon />,
		category: 'social',
		teaser: __(
			'Display social feeds such as Instagram, YouTube, Flickr, X, etc…',
			'visual-portfolio'
		),
	},
];

function UpsellPanel({ title, teaser, name }) {
	return (
		<PanelBody title={title}>
			<ProNote
				features={[{ label: title, description: teaser }]}
				campaign={`loop_source_${name}`}
			/>
		</PanelBody>
	);
}

PRO_SOURCES.forEach(({ teaser, ...source }) => {
	registerLoopSource({
		...source,
		isPro: true,

		// With Pro installed the source is real, it is only not editable yet -
		// the inspector says so on its own. Without Pro there is something to
		// sell instead.
		SettingsPanel: isProPlugin
			? undefined
			: () => (
					<UpsellPanel
						title={source.title}
						teaser={teaser}
						name={source.name}
					/>
				),
	});
});
