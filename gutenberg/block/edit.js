import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { useEffect } from '@wordpress/element';

import ControlsRender from '../components/controls-render';
import IframePreview from '../components/iframe-preview';
import SetupWizard from '../components/setup-wizard';

const {
	plugin_url: pluginUrl,
	controls_categories: registeredControlsCategories,
} = window.VPGutenbergVariables;

function filterControlCategories(categories, isChildOfLoop) {
	if (!isChildOfLoop) {
		return categories;
	}

	// Categories to remove when block is child of Loop
	const categoriesToRemove = [
		'content-source',
		'content-source-general',
		'content-source-images',
		'content-source-post-based',
		'content-source-social-stream',
	];

	// Create a new object with filtered categories
	return Object.fromEntries(
		Object.entries(categories).filter(
			([key]) => !categoriesToRemove.includes(key)
		)
	);
}

function renderControls(props, isChildOfLoop) {
	const { attributes, context } = props;

	let { content_source: contentSource } = attributes;

	// Saved layouts by default displaying Portfolio source.
	if (contentSource === 'portfolio') {
		contentSource = '';
	}

	// Use context value if available, otherwise use contentSource from attributes
	contentSource =
		(context && context['visual-portfolio/queryType']) || contentSource;

	const filteredCategories = filterControlCategories(
		registeredControlsCategories,
		isChildOfLoop
	);

	return (
		<>
			{!isChildOfLoop && (
				<ControlsRender category="content-source" {...props} />
			)}

			{/* Display all settings once selected Content Source */}
			{contentSource ? (
				<>
					{Object.keys(filteredCategories).map((name) => {
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
	const { attributes, setAttributes, context } = props;

	const {
		block_id: blockIdFromAttributes,
		content_source: contentSourceFromAttributes,
		setup_wizard: setupWizard,
		preview_image_example: previewExample,
		layout,
	} = attributes;

	const {
		'visual-portfolio/blockId': blockIdFromContext,
		'visual-portfolio/queryType': contentSourceFromContext,
	} = context || {};

	// Use context values if they exist, otherwise fall back to attributes
	const blockId = blockIdFromContext || blockIdFromAttributes;
	const contentSource =
		contentSourceFromContext || contentSourceFromAttributes;

	const isChildOfLoop = !!blockIdFromContext;

	// Display setup wizard on mount.
	useEffect(() => {
		if (!setupWizard && (!blockId || !contentSource) && !isChildOfLoop) {
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
						{renderControls(props, isChildOfLoop)}
					</InspectorControls>
					<IframePreview {...props} />
				</>
			)}
		</div>
	);
}
