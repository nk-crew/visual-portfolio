import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { useEffect } from '@wordpress/element';

import ControlsRender from '../components/controls-render';
import IframePreview from '../components/iframe-preview';
import SetupWizard from '../components/setup-wizard';

const {
	plugin_url: pluginUrl,
	controls_categories: registeredControlsCategories,
} = window.VPGutenbergVariables;

function renderControls(props) {
	const { attributes } = props;

	let { content_source: contentSource } = attributes;

	// Saved layouts by default displaying Portfolio source.
	if (contentSource === 'portfolio') {
		contentSource = '';
	}

	return (
		<>
			<ControlsRender category="content-source" {...props} />

			{/* Display all settings once selected Content Source */}
			{contentSource ? (
				<>
					{Object.keys(registeredControlsCategories).map((name) => {
						if (name === 'content-source') {
							return null;
						}

						return (
							<ControlsRender
								key={name}
								category={name}
								{...props}
							/>
						);
					})}
				</>
			) : null}
		</>
	);
}

/**
 * Block Edit Class.
 *
 * @param props
 */
export default function BlockEdit(props) {
	const { attributes, setAttributes } = props;

	const {
		block_id: blockId,
		content_source: contentSource,
		setup_wizard: setupWizard,
		preview_image_example: previewExample,
		layout,
	} = attributes;

	// Display setup wizard on mount.
	useEffect(() => {
		if (!setupWizard && (!blockId || !contentSource)) {
			setAttributes({
				setup_wizard: 'true',
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Display block preview.
	if (previewExample === 'true') {
		return (
			<div className="vpf-example-preview">
				<img
					src={`${pluginUrl}/assets/admin/images/example-${layout}.png`}
					alt={`Preview of ${layout} layout`}
				/>
			</div>
		);
	}

	const blockProps = useBlockProps();

	return (
		<div {...blockProps}>
			{setupWizard === 'true' ? (
				<SetupWizard {...props} />
			) : (
				<>
					<InspectorControls>
						{renderControls(props)}
					</InspectorControls>
					<IframePreview {...props} />
				</>
			)}
		</div>
	);
}
