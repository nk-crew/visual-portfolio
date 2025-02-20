import {
	InnerBlocks,
	InspectorControls,
	useBlockProps,
} from '@wordpress/block-editor';

import ControlsRender from '../../components/controls-render';

const {
	plugin_url: pluginUrl,
	controls_categories: registeredControlsCategories,
} = window.VPGutenbergVariables;

function filterControlCategories(categories) {
	const allowedKeys = [
		'content-source',
		'content-source-general',
		'content-source-images',
		'content-source-post-based',
		'content-source-social-stream',
		'custom_css',
	];

	return Object.fromEntries(
		Object.entries(categories).filter(([key]) => allowedKeys.includes(key))
	);
}

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
					{Object.keys(
						filterControlCategories(registeredControlsCategories)
					).map((name) => {
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
	const { attributes } = props;

	const { preview_image_example: previewExample, layout } = attributes;

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
			<>
				<InspectorControls>{renderControls(props)}</InspectorControls>
				<div {...props}>
					<InnerBlocks />
				</div>
			</>
		</div>
	);
}
