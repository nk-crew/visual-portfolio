import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';

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
	const { attributes, clientId, setAttributes } = props;

	const {
		preview_image_example: previewExample,
		layout,
		content_source: contentSource,
		posts_source: postsSource,
	} = attributes;

	// Get inner blocks
	const { innerBlocks } = useSelect(
		(select) => ({
			innerBlocks: select('core/block-editor').getBlocks(clientId),
		}),
		[clientId]
	);

	const { replaceInnerBlocks } = useDispatch('core/block-editor');

	// Initialize blocks when the loop block is first added
	useEffect(() => {
		if (innerBlocks.length === 0) {
			const filterBlock = createBlock('visual-portfolio/filter', {}, [
				createBlock('visual-portfolio/filter-item', {
					text: 'All',
					isAll: true,
					url: '#',
					isActive: true,
				}),
			]);

			const galleryBlock = createBlock('visual-portfolio/block', {});

			replaceInnerBlocks(clientId, [filterBlock, galleryBlock], false);
		}
	}, [
		clientId,
		innerBlocks.length,
		replaceInnerBlocks,
		contentSource,
		setAttributes,
		postsSource,
	]);

	// Set default contentSource
	useEffect(() => {
		if (!contentSource || contentSource === '') {
			setAttributes({
				content_source: 'post-based',
				posts_source: 'portfolio',
			});
		}
	}, [contentSource, postsSource, setAttributes, clientId]);

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

	const innerBlocksProps = useInnerBlocksProps(
		{
			className: 'vp-loop-content',
		},
		{
			template: [
				[
					'visual-portfolio/filter',
					{},
					[
						[
							'visual-portfolio/filter-item',
							{
								text: 'All',
								isAll: true,
								url: '#',
								isActive: true,
							},
						],
					],
				],
				['visual-portfolio/block', {}],
			],
		}
	);

	return (
		<div {...blockProps}>
			<>
				<InspectorControls>{renderControls(props)}</InspectorControls>
				<div {...innerBlocksProps} />
			</>
		</div>
	);
}
