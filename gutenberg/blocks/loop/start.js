/**
 * WordPress dependencies
 */
import {
	store as blockEditorStore,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	Button,
	DropdownMenu,
	DropZone,
	FormFileUpload,
	MenuGroup,
	MenuItem,
	Placeholder,
} from '@wordpress/components';
import { useRegistry, useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { applyFilters } from '@wordpress/hooks';
import { __, sprintf } from '@wordpress/i18n';
import { chevronDown, gallery } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { getProUrl } from '../../components/pro-teaser';
import {
	ALLOWED_MEDIA_TYPES,
	prepareImage,
} from '../../loop-sources/gallery-manager/prepare-images';
import { useLoopSources } from '../../loop-sources/registry';
import SourcePicker from '../../loop-sources/source-picker';
import PatternSetup, { LayoutList, useLayouts } from './pattern-setup';

const { pro: isProPlugin } = window.VPGutenbergVariables;

// The layouts the step itself shows; the rest are behind "All layouts".
const LEAD_COUNT = 6;

// A line for each source the plugin ships, under its name in the menu.
const SOURCE_LINES = {
	posts: __(
		'Posts, pages, portfolio items or any other post type.',
		'visual-portfolio'
	),
	taxonomies: __(
		'Categories, tags or other terms, each with its image.',
		'visual-portfolio'
	),
	'social-stream': __(
		'A feed from Instagram, YouTube, Flickr and more.',
		'visual-portfolio'
	),
};

// Heights of the masonry shapes, column by column.
const SHAPES = [
	[300, 200, 240],
	[210, 280, 220],
	[250, 190, 290],
];

/**
 * The shapes of a gallery, fading out, behind the first step.
 *
 * @return {Element} component.
 */
function Shapes() {
	return (
		<div className="vpf-loop-start__shapes" aria-hidden="true">
			{SHAPES.map((column, c) => (
				<div key={c}>
					{column.map((height, t) => (
						<span key={t} style={{ height }} />
					))}
				</div>
			))}
		</div>
	);
}

/**
 * The sources a loop may start from, as the source picker offers them.
 *
 * @param {string} value - the loop's current source.
 * @return {Array} sources.
 */
function useSources(value) {
	return applyFilters('vpf.loopSources', useLoopSources(), { value });
}

/**
 * A Pro source, offered without Pro.
 *
 * @param {Object}   props        - component props.
 * @param {Object}   props.source - the source.
 * @param {Function} props.onBack - returns to the images.
 * @return {Element} component.
 */
function ProSource({ source, onBack }) {
	return (
		<Placeholder
			icon={source.icon}
			label={source.title}
			instructions={sprintf(
				// translators: %s - what the source shows.
				__('%s Comes with Visual Portfolio Pro.', 'visual-portfolio'),
				SOURCE_LINES[source.name] || ''
			).trim()}
		>
			<div className="vpf-loop-start__actions">
				<Button
					variant="primary"
					href={getProUrl(`loop_source_${source.name}`)}
					target="_blank"
					__next40pxDefaultSize
				>
					{__('Get Pro', 'visual-portfolio')}
				</Button>
				<Button
					variant="tertiary"
					onClick={onBack}
					__next40pxDefaultSize
				>
					{__('Back', 'visual-portfolio')}
				</Button>
			</div>
		</Placeholder>
	);
}

/**
 * The first step of an empty loop: its images, or another source.
 *
 * Images lead, because a gallery is most often a gallery of images - adding
 * them is one click, and every other source is one menu away.
 *
 * @param {Object}   props               - component props.
 * @param {Object}   props.attributes    - block attributes.
 * @param {Function} props.setAttributes - block attribute setter.
 * @param {string}   props.clientId      - block client id.
 * @param {Function} props.onSource      - called once the source has its items.
 * @return {Element} component.
 */
export function SourceStart({ attributes, setAttributes, clientId, onSource }) {
	const [proSource, setProSource] = useState(null);
	const registry = useRegistry();
	const sources = useSources(attributes.queryType);
	const mediaUpload = useSelect(
		(select) => select(blockEditorStore).getSettings().mediaUpload,
		[]
	);

	// An upload reports each file on its own, the last ones after this step
	// has given way to the next, so the gallery is read when a file arrives.
	const addImages = (media) => {
		const { getBlockAttributes } = registry.select(blockEditorStore);
		const { imagesQuery } = getBlockAttributes(clientId);
		const current = imagesQuery?.images || [];
		const added = media
			.filter(
				(item) =>
					item?.id &&
					item.url &&
					!current.some((image) => image.id === item.id)
			)
			.map(prepareImage);

		if (added.length) {
			registry
				.dispatch(blockEditorStore)
				.updateBlockAttributes(clientId, {
					queryType: 'images',
					imagesQuery: {
						...imagesQuery,
						images: [...current, ...added],
					},
				});
			onSource();
		}
	};

	// A file is reported as a blob preview first, without an id, then as the
	// saved attachment - only that one is added.
	const upload = (filesList) =>
		mediaUpload({
			filesList,
			allowedTypes: ALLOWED_MEDIA_TYPES,
			onFileChange: addImages,
		});

	const choose = (source) => {
		if (source.isPro && !isProPlugin) {
			setProSource(source);
			return;
		}

		setAttributes({ queryType: source.name });
		onSource();
	};

	let card;

	if (proSource) {
		card = (
			<ProSource source={proSource} onBack={() => setProSource(null)} />
		);
	} else if (!sources.some(({ name }) => 'images' === name)) {
		// A loop narrowed to other sources has no images to lead with.
		card = (
			<Placeholder
				label={__('Gallery Loop', 'visual-portfolio')}
				instructions={__(
					'Choose where the gallery takes its items from.',
					'visual-portfolio'
				)}
			>
				<SourcePicker
					value={attributes.queryType}
					onChange={(name) =>
						choose(sources.find((source) => source.name === name))
					}
				/>
			</Placeholder>
		);
	} else {
		const others = sources.filter(({ name }) => 'images' !== name);

		card = (
			<Placeholder
				icon={gallery}
				label={__('Add images', 'visual-portfolio')}
				instructions={__(
					'Upload images, choose them from the Media Library, or drop them here.',
					'visual-portfolio'
				)}
			>
				<div className="vpf-loop-start__actions">
					<FormFileUpload
						variant="primary"
						accept={ALLOWED_MEDIA_TYPES.map(
							(type) => `${type}/*`
						).join(',')}
						multiple
						onChange={(event) => upload(event.currentTarget.files)}
						__next40pxDefaultSize
					>
						{__('Upload', 'visual-portfolio')}
					</FormFileUpload>
					<MediaUploadCheck>
						<MediaUpload
							multiple="add"
							allowedTypes={ALLOWED_MEDIA_TYPES}
							onSelect={addImages}
							render={({ open }) => (
								<Button
									variant="secondary"
									onClick={open}
									__next40pxDefaultSize
								>
									{__('Media Library', 'visual-portfolio')}
								</Button>
							)}
						/>
					</MediaUploadCheck>
					{others.length ? (
						<DropdownMenu
							icon={chevronDown}
							label={__('Other sources', 'visual-portfolio')}
							toggleProps={{
								children: __(
									'Other sources',
									'visual-portfolio'
								),
								variant: 'tertiary',
								iconPosition: 'right',
								__next40pxDefaultSize: true,
							}}
							popoverProps={{ placement: 'bottom-start' }}
						>
							{({ onClose }) => (
								<MenuGroup
									label={__(
										'Show instead',
										'visual-portfolio'
									)}
								>
									{others.map((source) => (
										<MenuItem
											key={source.name}
											icon={source.icon}
											iconPosition="left"
											info={SOURCE_LINES[source.name]}
											suffix={
												source.isPro && !isProPlugin ? (
													<span className="vpf-loop-start__badge">
														{__(
															'Pro',
															'visual-portfolio'
														)}
													</span>
												) : null
											}
											onClick={() => {
												onClose();
												choose(source);
											}}
										>
											{source.title}
										</MenuItem>
									))}
								</MenuGroup>
							)}
						</DropdownMenu>
					) : null}
				</div>
			</Placeholder>
		);
	}

	return (
		<div className="vpf-loop-start">
			<DropZone
				label={__('Drop images to add them', 'visual-portfolio')}
				onFilesDrop={upload}
			/>
			<Shapes />
			<div className="vpf-loop-start__card">{card}</div>
		</div>
	);
}

/**
 * The second step: the gallery's layout, picked from its own content.
 *
 * @param {Object}   props            - component props.
 * @param {Object}   props.attributes - block attributes.
 * @param {string}   props.clientId   - block client id.
 * @param {Function} props.onChoose   - called with the chosen layout.
 * @return {Element} component.
 */
export function LayoutStart({ attributes, clientId, onChoose }) {
	const [isAllOpen, setIsAllOpen] = useState(false);
	const { layouts, context } = useLayouts(clientId, attributes);
	const count = attributes.imagesQuery?.images?.length || 0;

	return (
		<div className="vpf-loop-layouts">
			<div className="vpf-loop-layouts__head">
				<div>
					<h2>{__('Choose a layout', 'visual-portfolio')}</h2>
					<p>
						{'images' === attributes.queryType
							? sprintf(
									// translators: %d - number of images.
									__(
										'Your %d images in each layout. You can change it later.',
										'visual-portfolio'
									),
									count
								)
							: __(
									'Your items in each layout. You can change it later.',
									'visual-portfolio'
								)}
					</p>
				</div>
				<Button
					variant="tertiary"
					onClick={() => setIsAllOpen(true)}
					__next40pxDefaultSize
				>
					{__('All layouts', 'visual-portfolio')}
				</Button>
			</div>

			<LayoutList
				layouts={layouts.slice(0, LEAD_COUNT)}
				context={context}
				onChoose={onChoose}
			/>

			{isAllOpen ? (
				<PatternSetup
					attributes={attributes}
					clientId={clientId}
					onChoose={(layout) => {
						setIsAllOpen(false);
						onChoose(layout);
					}}
					onCancel={() => setIsAllOpen(false)}
				/>
			) : null}
		</div>
	);
}
