import apiFetch from '@wordpress/api-fetch';
import { store as blockEditorStore } from '@wordpress/block-editor';

import {
	ALLOWED_MEDIA_TYPES,
	prepareImage,
} from '../gallery-manager/prepare-images';
import { isSystemPath } from './collect';

/**
 * The editor's `mediaUpload` sends every file of a selection at once, which a
 * shared host answers with 429 or 503 past a few dozen files; here it is given
 * one file per call, a few at a time.
 */

const MAX_IN_FLIGHT = 3;
const PLACE_INTERVAL = 1000;

const compare = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: 'base',
}).compare;

// Replaced on every change: `useSyncExternalStore` compares snapshots by reference.
const imports = new Map();
const jobs = new Map();
const contexts = new Map();
const finished = new Map();
const timers = new Map();
const listeners = new Set();
let sequence = 0;

export function subscribe(listener) {
	listeners.add(listener);

	return () => listeners.delete(listener);
}

/**
 * The import of a loop.
 *
 * @param {string} clientId - loop client id.
 * @return {Object|null} `{ items, preparing, duplicates, unsupported }`, each
 *                       item `{ key, name, path, status, error }`, status one
 *                       of `queued`, `uploading`, `done`, `failed`, `canceled`.
 */
export function getImport(clientId) {
	return imports.get(clientId) || null;
}

export function isActive(state) {
	return (
		!!state &&
		(state.preparing > 0 ||
			state.items.some(({ status }) =>
				['queued', 'uploading'].includes(status)
			))
	);
}

function onBeforeUnload(event) {
	event.preventDefault();
	// Chrome below 119 asks only when `returnValue` is set.
	event.returnValue = '';
}

let isGuarded = false;

function guardUnload() {
	const shouldGuard = Array.from(imports.values()).some(isActive);

	if (shouldGuard !== isGuarded) {
		isGuarded = shouldGuard;
		window[shouldGuard ? 'addEventListener' : 'removeEventListener'](
			'beforeunload',
			onBeforeUnload
		);
	}
}

function setImport(clientId, state) {
	if (state) {
		imports.set(clientId, state);
	} else {
		imports.delete(clientId);
		contexts.delete(clientId);
	}

	guardUnload();
	for (const listener of listeners) {
		listener();
	}
}

function updateItems(clientId, update) {
	const state = imports.get(clientId);

	if (state) {
		setImport(clientId, {
			...state,
			items: state.items.map((item) => update(item) || item),
		});
	}
}

/**
 * The MIME type the site gives a file of this name.
 *
 * @param {string} name             - file name.
 * @param {Object} allowedMimeTypes - `{ 'jpg|jpeg|jpe': 'image/jpeg' }`.
 * @return {string} MIME type, or an empty string.
 */
function getMimeType(name, allowedMimeTypes) {
	const extension = name.split('.').pop().toLowerCase();
	const match = Object.entries(allowedMimeTypes || {}).find(([extensions]) =>
		extensions.split('|').includes(extension)
	);

	return match ? match[1] : '';
}

function getGallery(registry, clientId) {
	return (
		registry.select(blockEditorStore).getBlockAttributes(clientId)
			?.imagesQuery?.images || []
	);
}

/**
 * Indexes of the files the gallery already holds, by their name and size.
 *
 * @param {Array} ids   - attachment ids of the gallery.
 * @param {Array} files - candidate items.
 * @return {Promise<Set>} indexes into `files`.
 */
async function findInGallery(ids, files) {
	if (!ids.length || !files.length) {
		return new Set();
	}

	try {
		const { response } = await apiFetch({
			path: '/visual-portfolio/v1/gallery_file_matches',
			method: 'POST',
			data: {
				ids,
				files: files.map(({ name, size }) => ({ name, size })),
			},
		});

		return new Set(response?.matches || []);
	} catch {
		return new Set();
	}
}

/**
 * Put the finished images into the gallery, in the order of the import.
 *
 * Each goes after the nearest earlier item of the import already in the
 * gallery, or else before the nearest later one. They are put in together, at
 * most once a second: every change of a gallery of a thousand images keeps
 * the editor busy for most of a second.
 *
 * @param {string} clientId - loop client id.
 */
function placeImages(clientId) {
	clearTimeout(timers.get(clientId));
	timers.delete(clientId);

	const batch = (finished.get(clientId) || []).sort(
		(a, b) => a.job.seq - b.job.seq
	);

	finished.delete(clientId);

	const state = imports.get(clientId);

	if (!batch.length || !state) {
		return;
	}

	const { registry } = contexts.get(clientId);
	const attributes = registry
		.select(blockEditorStore)
		.getBlockAttributes(clientId);

	if (!attributes) {
		setImport(clientId, null);
		return;
	}

	const original = attributes.imagesQuery?.images || [];
	const images = [...original];
	const placed = state.items.map(({ key }) => jobs.get(key));

	batch.forEach(({ job, media }) => {
		if (images.some((image) => image.id === media.id)) {
			return;
		}

		const others = placed
			.filter((other) => other !== job && other.id)
			.map((other) => ({
				seq: other.seq,
				index: images.findIndex((image) => image.id === other.id),
			}))
			.filter(({ index }) => -1 !== index);
		const before = others
			.filter(({ seq }) => seq < job.seq)
			.sort((a, b) => b.seq - a.seq)[0];
		const after = others
			.filter(({ seq }) => seq > job.seq)
			.sort((a, b) => a.seq - b.seq)[0];
		let at = images.length;

		if (before) {
			at = before.index + 1;
		} else if (after) {
			at = after.index;
		}

		images.splice(
			at,
			0,
			// A record of the REST API names its address `source_url`.
			prepareImage({ ...media, url: media.url || media.source_url })
		);
	});

	registry.dispatch(blockEditorStore).updateBlockAttributes(clientId, {
		...(original.length ? {} : { queryType: 'images' }),
		imagesQuery: { ...attributes.imagesQuery, images },
	});
}

function queueImage(clientId, job, media) {
	job.id = media.id;

	if (!finished.has(clientId)) {
		finished.set(clientId, []);
	}

	finished.get(clientId).push({ job, media });

	if (!timers.has(clientId)) {
		timers.set(
			clientId,
			setTimeout(() => placeImages(clientId), PLACE_INTERVAL)
		);
	}
}

/**
 * Upload one file through the editor, one per call.
 *
 * A file is reported as a blob preview first, without an id, then as the saved
 * attachment. Only that one settles the upload.
 *
 * @param {Function} mediaUpload - the editor's upload setting.
 * @param {File}     file        - file.
 * @return {Promise<Object>} attachment.
 */
function uploadFile(mediaUpload, file) {
	return new Promise((resolve, reject) =>
		mediaUpload({
			filesList: [file],
			allowedTypes: ALLOWED_MEDIA_TYPES,
			onFileChange: ([media]) => {
				if (media?.id && media.url) {
					resolve(media);
				}
			},
			onError: reject,
		})
	);
}

async function run(clientId, key) {
	const job = jobs.get(key);

	updateItems(clientId, (item) =>
		item.key === key ? { ...item, status: 'uploading' } : null
	);

	let change;

	try {
		const media = job.run
			? await job.run()
			: await uploadFile(
					contexts.get(clientId).mediaUpload,
					new File([await job.getFile()], job.name, {
						type: job.type,
					})
				);

		if (!imports.has(clientId)) {
			return;
		}

		queueImage(clientId, job, media);
		change = { status: 'done' };
	} catch (error) {
		change = { status: 'failed', error: error?.message || '' };
	}

	updateItems(clientId, (item) =>
		item.key === key ? { ...item, ...change } : null
	);
	pump(clientId);

	if (!isActive(imports.get(clientId))) {
		placeImages(clientId);
	}
}

function pump(clientId) {
	const state = imports.get(clientId);

	if (!state) {
		return;
	}

	const inFlight = state.items.filter(
		({ status }) => 'uploading' === status
	).length;

	state.items
		.filter(({ status }) => 'queued' === status)
		.slice(0, Math.max(0, MAX_IN_FLIGHT - inFlight))
		.forEach(({ key }) => {
			run(clientId, key);
		});
}

/**
 * Add files to the gallery of a loop.
 *
 * An item is `{ name, size, path, type, getFile, run, error }`:
 *
 * - `name` and `size` tell a duplicate apart; `path` orders the items, and
 *   defaults to the name.
 * - `getFile()` resolves to the file's data, uploaded through the editor; or
 *   `run()` resolves to an attachment record the item made itself, the way
 *   the REST API answers one.
 * - `error` marks an item that cannot be imported, listed as failed.
 *
 * System files are dropped, files of a type the site or the gallery does not
 * take and files the gallery already holds are counted and skipped, and the
 * rest are uploaded in the natural order of their paths.
 *
 * @param {string}        clientId - loop client id.
 * @param {Array|Promise} items    - items, or a promise of them.
 * @param {Object}        context  - `{ registry, mediaUpload, allowedMimeTypes }`.
 */
export async function importItems(clientId, items, context) {
	contexts.set(clientId, context);

	const previous = imports.get(clientId);

	if (previous && !isActive(previous)) {
		for (const { key } of previous.items) {
			jobs.delete(key);
		}
	}

	setImport(
		clientId,
		isActive(previous)
			? { ...previous, preparing: previous.preparing + 1 }
			: { items: [], preparing: 1, duplicates: 0, unsupported: 0 }
	);

	let collected = [];

	try {
		collected = await items;
	} catch {}

	if (!imports.has(clientId)) {
		return;
	}

	const signatures = new Set(
		imports
			.get(clientId)
			.items.filter(({ status }) => 'canceled' !== status)
			.map(({ key }) => jobs.get(key).signature)
	);
	const failed = [];
	const candidates = [];
	let duplicates = 0;
	let unsupported = 0;

	[...collected]
		.map((item) => ({ ...item, path: item.path || item.name }))
		.filter(({ path }) => !isSystemPath(path))
		.sort((a, b) => compare(a.path, b.path))
		.forEach((item) => {
			const type =
				getMimeType(item.name, context.allowedMimeTypes) ||
				item.type ||
				'';
			const signature = `${item.name}|${item.size}`;

			if (item.error) {
				failed.push(item);
			} else if (!ALLOWED_MEDIA_TYPES.includes(type.split('/')[0])) {
				unsupported++;
			} else if (signatures.has(signature)) {
				duplicates++;
			} else {
				signatures.add(signature);
				candidates.push({ ...item, type, signature });
			}
		});

	const ids = getGallery(context.registry, clientId)
		.filter(({ id }) => id)
		.map(({ id }) => id);
	const held = await findInGallery(ids, candidates);
	const added = [...failed, ...candidates.filter((_, i) => !held.has(i))]
		.sort((a, b) => compare(a.path, b.path))
		.map((item) => {
			const key = `${clientId}:${++sequence}`;

			jobs.set(key, { ...item, seq: sequence });

			return {
				key,
				name: item.name,
				path: item.path,
				status: item.error ? 'failed' : 'queued',
				error: item.error || '',
			};
		});

	const state = imports.get(clientId);

	if (!state) {
		return;
	}

	setImport(clientId, {
		...state,
		preparing: state.preparing - 1,
		items: [...state.items, ...added],
		duplicates: state.duplicates + duplicates + held.size,
		unsupported: state.unsupported + unsupported,
	});
	pump(clientId);
}

/**
 * Stop the files still waiting. Those on their way finish.
 *
 * @param {string} clientId - loop client id.
 */
export function cancelImport(clientId) {
	updateItems(clientId, (item) =>
		'queued' === item.status ? { ...item, status: 'canceled' } : null
	);
}

export function canRetry(item) {
	const job = jobs.get(item.key);

	return 'failed' === item.status && !!(job?.getFile || job?.run);
}

/**
 * Queue the failed files again.
 *
 * @param {string} clientId - loop client id.
 */
export function retryImport(clientId) {
	updateItems(clientId, (item) =>
		canRetry(item) ? { ...item, status: 'queued', error: '' } : null
	);
	pump(clientId);
}

/**
 * Drop the summary of a finished import.
 *
 * @param {string} clientId - loop client id.
 */
export function dismissImport(clientId) {
	const state = imports.get(clientId);

	if (state && !isActive(state)) {
		for (const { key } of state.items) {
			jobs.delete(key);
		}
		setImport(clientId, null);
	}
}
