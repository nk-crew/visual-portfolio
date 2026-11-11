import { isZipError, readZip } from './read-zip';

/**
 * Files a computer writes beside the pictures, which nobody means to import.
 *
 * @param {string} path - relative path.
 * @return {boolean} true for a system file.
 */
export function isSystemPath(path) {
	return path
		.split('/')
		.some(
			(part) =>
				part.startsWith('.') ||
				'__MACOSX' === part ||
				'thumbs.db' === part.toLowerCase() ||
				'desktop.ini' === part.toLowerCase()
		);
}

function isZip(file) {
	return (
		/\.zip$/i.test(file.name) ||
		'application/zip' === file.type ||
		'application/x-zip-compressed' === file.type
	);
}

function getName(path) {
	return path.split('/').pop();
}

/**
 * Import items of a list of files, the archives among them unpacked.
 *
 * @param {Array} files - `{ file, path }` pairs.
 * @return {Promise<Array>} items `{ name, size, path, type, getFile, error }`.
 */
async function toItems(files) {
	const items = [];

	for (const { file, path } of files) {
		if (isSystemPath(path)) {
			continue;
		}

		if (!isZip(file)) {
			items.push({
				name: file.name,
				size: file.size,
				path,
				type: file.type,
				getFile: () => Promise.resolve(file),
			});
			continue;
		}

		try {
			const entries = await readZip(file);

			for (const entry of entries) {
				items.push({
					...entry,
					name: getName(entry.path),
					path: `${path}/${entry.path}`,
				});
			}
		} catch (error) {
			items.push({
				name: file.name,
				size: file.size,
				path,
				error: isZipError(error) ? 'archive' : error.message,
			});
		}
	}

	return items;
}

/**
 * Items of a file input, a folder picker's included.
 *
 * @param {FileList|Array} fileList - chosen files.
 * @return {Promise<Array>} items.
 */
export function collectFromFiles(fileList) {
	return toItems(
		Array.from(fileList || [], (file) => ({
			file,
			path: file.webkitRelativePath || file.name,
		}))
	);
}

/**
 * Entries of a drop, folders included.
 *
 * They have to be taken while the drop event runs: `dataTransfer` is emptied
 * once it returns.
 *
 * @param {DataTransfer} dataTransfer - of the drop event.
 * @return {Array} file system entries.
 */
export function getDroppedEntries(dataTransfer) {
	return Array.from(dataTransfer?.items || [])
		.filter((item) => 'file' === item.kind)
		.map((item) => item.webkitGetAsEntry?.())
		.filter(Boolean);
}

/**
 * Every child of a folder. `readEntries` answers in batches until an empty one.
 *
 * @param {FileSystemDirectoryEntry} directory - folder.
 * @return {Promise<Array>} entries.
 */
async function readChildren(directory) {
	const reader = directory.createReader();
	const children = [];

	for (;;) {
		const batch = await new Promise((resolve, reject) =>
			reader.readEntries(resolve, reject)
		);

		if (!batch.length) {
			return children;
		}

		children.push(...batch);
	}
}

async function walk(entry, files, unreadable) {
	const path = entry.fullPath.replace(/^\//, '');

	if (isSystemPath(path)) {
		return;
	}

	try {
		if (entry.isDirectory) {
			for (const child of await readChildren(entry)) {
				await walk(child, files, unreadable);
			}
		} else if (entry.isFile) {
			files.push({
				file: await new Promise((resolve, reject) =>
					entry.file(resolve, reject)
				),
				path,
			});
		}
	} catch (error) {
		unreadable.push({
			name: entry.name,
			size: 0,
			path,
			error: error?.message || '',
		});
	}
}

/**
 * Items of dropped entries, the files inside dropped folders included.
 *
 * @param {Array} entries - from `getDroppedEntries()`.
 * @return {Promise<Array>} items.
 */
export async function collectFromEntries(entries) {
	const files = [];
	const unreadable = [];

	for (const entry of entries) {
		await walk(entry, files, unreadable);
	}

	return [...(await toItems(files)), ...unreadable];
}
