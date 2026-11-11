import './style.scss';

import { store as blockEditorStore } from '@wordpress/block-editor';
import {
	Button,
	DropdownMenu,
	MenuGroup,
	MenuItem,
	ProgressBar,
} from '@wordpress/components';
import { useRegistry, useSelect } from '@wordpress/data';
import {
	useCallback,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from '@wordpress/element';
import { applyFilters } from '@wordpress/hooks';
import { __, _n, sprintf } from '@wordpress/i18n';
import { upload } from '@wordpress/icons';

import { ALLOWED_MEDIA_TYPES } from '../gallery-manager/prepare-images';
import {
	collectFromEntries,
	collectFromFiles,
	getDroppedEntries,
} from './collect';
import {
	cancelImport,
	canRetry,
	dismissImport,
	getImport,
	importItems,
	isActive,
	retryImport,
	subscribe,
} from './queue';

// Must cover every type in ALLOWED_MEDIA_TYPES, or a video cannot start an
// empty gallery.
export const ACCEPTED_FILES = [
	...ALLOWED_MEDIA_TYPES.map((type) => `${type}/*`),
	'.zip',
	'application/zip',
].join(',');

const ERROR_MESSAGES = {
	archive: __(
		'This is not a ZIP archive, or it is damaged.',
		'visual-portfolio'
	),
	encrypted: __('Encrypted files are not supported.', 'visual-portfolio'),
	compression: __(
		'This file is compressed in a way the browser cannot unpack.',
		'visual-portfolio'
	),
};

/**
 * The import of a loop, and what starts one.
 *
 * @param {string} clientId - loop client id.
 * @return {Object} `{ state, importItems, importFiles, importEntries, cancel, retry, dismiss }`.
 */
export function useGalleryImport(clientId) {
	const registry = useRegistry();
	const { mediaUpload, allowedMimeTypes } = useSelect((select) => {
		const settings = select(blockEditorStore).getSettings();

		return {
			mediaUpload: settings.mediaUpload,
			allowedMimeTypes: settings.allowedMimeTypes,
		};
	}, []);
	const state = useSyncExternalStore(subscribe, () => getImport(clientId));

	const start = useCallback(
		(items) =>
			importItems(clientId, items, {
				registry,
				mediaUpload,
				allowedMimeTypes,
			}),
		[clientId, registry, mediaUpload, allowedMimeTypes]
	);

	return useMemo(
		() => ({
			state,
			importItems: start,
			importFiles: (files) => start(collectFromFiles(files)),
			importEntries: (entries) => start(collectFromEntries(entries)),
			cancel: () => cancelImport(clientId),
			retry: () => retryImport(clientId),
			dismiss: () => dismissImport(clientId),
		}),
		[state, mediaUpload, start, clientId]
	);
}

/**
 * Drops of files and folders alike.
 *
 * A drop zone hands over `dataTransfer.files`, where a folder is a file with
 * nothing in it. The folders are taken from the same drop before the zone
 * sees it, while its `dataTransfer` is still readable.
 *
 * @param {Object} galleryImport - from `useGalleryImport()`.
 * @return {Object} `{ onDropCapture, onFilesDrop }`.
 */
export function useDropImport({ importFiles, importEntries }) {
	const entries = useRef([]);

	return {
		onDropCapture: (event) => {
			entries.current = getDroppedEntries(event.dataTransfer);
		},
		onFilesDrop: (files) => {
			const dropped = entries.current;

			entries.current = [];

			if (dropped.length) {
				importEntries(dropped);
			} else {
				importFiles(files);
			}
		},
	};
}

/**
 * Open the browser's file picker.
 *
 * @param {Object}   options           - picker options.
 * @param {boolean}  options.directory - pick a folder.
 * @param {Function} onFiles           - called with the files picked.
 */
function pickFiles({ directory }, onFiles) {
	const input = document.createElement('input');

	input.type = 'file';
	input.hidden = true;
	input.multiple = true;

	if (directory) {
		input.webkitdirectory = true;
	} else {
		input.accept = ACCEPTED_FILES;
	}

	input.addEventListener('change', () => {
		const files = Array.from(input.files || []);

		input.remove();

		if (files.length) {
			onFiles(files);
		}
	});
	input.addEventListener('cancel', () => input.remove());

	document.body.append(input);
	input.click();
}

/**
 * The Import menu: files and archives, a folder, and the sources other
 * plugins add through the `vpf.galleryImportSources` filter.
 *
 * A source is `{ name, label, icon, render }`. `render` is a component the
 * menu mounts once the source is picked, with `{ clientId, importItems,
 * onClose }`; `importItems` takes the items described in `./queue.js`.
 *
 * @param {Object}  props               - component props.
 * @param {string}  props.clientId      - loop client id.
 * @param {Object}  props.galleryImport - from `useGalleryImport()`.
 * @param {boolean} props.withFiles     - offer files and archives too.
 * @param {Object}  props.toggleProps   - props of the menu's toggle.
 * @param {?Object} props.icon          - icon of the toggle.
 * @return {Element} component.
 */
export function ImportMenu({
	clientId,
	galleryImport,
	withFiles = true,
	toggleProps,
	icon = upload,
}) {
	const [source, setSource] = useState(null);
	const sources = applyFilters('vpf.galleryImportSources', [], {
		clientId,
	});
	const Source = source?.render;

	return (
		<>
			<DropdownMenu
				className="vpf-gallery-import__menu"
				icon={icon}
				label={__('Import', 'visual-portfolio')}
				toggleProps={{ showTooltip: false, ...toggleProps }}
				popoverProps={{ placement: 'bottom-start' }}
			>
				{({ onClose }) => (
					<MenuGroup>
						{withFiles ? (
							<MenuItem
								onClick={() => {
									onClose();
									pickFiles({}, galleryImport.importFiles);
								}}
							>
								{__('Upload files or ZIP', 'visual-portfolio')}
							</MenuItem>
						) : null}
						<MenuItem
							onClick={() => {
								onClose();
								pickFiles(
									{ directory: true },
									galleryImport.importFiles
								);
							}}
						>
							{__('Upload folder', 'visual-portfolio')}
						</MenuItem>
						{sources.map((item) => (
							<MenuItem
								key={item.name}
								icon={item.icon}
								iconPosition="left"
								onClick={() => {
									onClose();
									setSource(item);
								}}
							>
								{item.label}
							</MenuItem>
						))}
					</MenuGroup>
				)}
			</DropdownMenu>

			{Source ? (
				<Source
					clientId={clientId}
					importItems={galleryImport.importItems}
					onClose={() => setSource(null)}
				/>
			) : null}
		</>
	);
}

function countBy(items) {
	const counts = {
		queued: 0,
		uploading: 0,
		done: 0,
		failed: 0,
		canceled: 0,
	};

	items.forEach(({ status }) => {
		counts[status]++;
	});

	return counts;
}

/**
 * Progress of an import while it runs, and what it left out once it is done.
 *
 * @param {Object} props               - component props.
 * @param {Object} props.galleryImport - from `useGalleryImport()`.
 * @return {Element|null} component.
 */
export function ImportProgress({ galleryImport }) {
	const { state, cancel, retry, dismiss } = galleryImport;

	if (!state) {
		return null;
	}

	const counts = countBy(state.items);
	const total = state.items.length - counts.canceled;

	if (isActive(state)) {
		const finished = counts.done + counts.failed;

		return (
			<div className="vpf-gallery-import">
				<p className="vpf-gallery-import__line">
					{total
						? sprintf(
								// translators: %1$d: files uploaded, %2$d: files in the import.
								__('Uploaded %1$d of %2$d', 'visual-portfolio'),
								finished,
								total
							)
						: __('Reading files…', 'visual-portfolio')}
				</p>
				<ProgressBar
					className="vpf-gallery-import__bar"
					value={total ? (finished / total) * 100 : undefined}
				/>
				{counts.queued ? (
					<Button variant="link" onClick={cancel}>
						{__('Cancel', 'visual-portfolio')}
					</Button>
				) : null}
			</div>
		);
	}

	const failed = state.items.filter(({ status }) => 'failed' === status);
	const notes = [
		state.duplicates &&
			sprintf(
				// translators: %d: number of files.
				_n(
					'%d duplicate skipped.',
					'%d duplicates skipped.',
					state.duplicates,
					'visual-portfolio'
				),
				state.duplicates
			),
		state.unsupported &&
			sprintf(
				// translators: %d: number of files.
				_n(
					'%d unsupported file skipped.',
					'%d unsupported files skipped.',
					state.unsupported,
					'visual-portfolio'
				),
				state.unsupported
			),
		counts.canceled &&
			sprintf(
				// translators: %d: number of files.
				_n(
					'%d file canceled.',
					'%d files canceled.',
					counts.canceled,
					'visual-portfolio'
				),
				counts.canceled
			),
	].filter(Boolean);

	if (!notes.length && !failed.length) {
		return state.items.length ? null : (
			<div className="vpf-gallery-import" role="status">
				<p className="vpf-gallery-import__line">
					{__('No images or videos found.', 'visual-portfolio')}
				</p>
				<div className="vpf-gallery-import__actions">
					<Button variant="tertiary" size="small" onClick={dismiss}>
						{__('Dismiss', 'visual-portfolio')}
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="vpf-gallery-import" role="status">
			<p className="vpf-gallery-import__line">
				{[
					sprintf(
						// translators: %d: number of images.
						_n(
							'%d file added.',
							'%d files added.',
							counts.done,
							'visual-portfolio'
						),
						counts.done
					),
					...notes,
				].join(' ')}
			</p>
			{failed.length ? (
				<>
					<p className="vpf-gallery-import__line">
						{sprintf(
							// translators: %d: number of files.
							_n(
								'%d file failed:',
								'%d files failed:',
								failed.length,
								'visual-portfolio'
							),
							failed.length
						)}
					</p>
					<ul className="vpf-gallery-import__failed">
						{failed.map((item) => (
							<li key={item.key}>
								<strong>{item.path}</strong>
								{item.error ? (
									<span>
										{ERROR_MESSAGES[item.error] ||
											item.error}
									</span>
								) : null}
							</li>
						))}
					</ul>
				</>
			) : null}
			<div className="vpf-gallery-import__actions">
				{failed.some(canRetry) ? (
					<Button variant="secondary" size="small" onClick={retry}>
						{__('Retry failed', 'visual-portfolio')}
					</Button>
				) : null}
				<Button variant="tertiary" size="small" onClick={dismiss}>
					{__('Dismiss', 'visual-portfolio')}
				</Button>
			</div>
		</div>
	);
}
