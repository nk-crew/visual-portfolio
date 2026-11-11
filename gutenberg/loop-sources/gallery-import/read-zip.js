/**
 * Neither WordPress nor the browser lists the files of an archive, but the
 * browser inflates them (`DecompressionStream`), so only the directory is read
 * here, from the end of the file with `File.slice()`. Each entry is unpacked
 * only when the import asks for it, so an archive of several gigabytes never
 * sits in memory.
 */

const END_OF_DIRECTORY = 0x06054b50;
const ZIP64_LOCATOR = 0x07064b50;
const ZIP64_END_OF_DIRECTORY = 0x06064b50;
const DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_HEADER = 0x04034b50;

const STORED = 0;
const DEFLATED = 8;

// Code page 437, the encoding of a name without the UTF-8 flag.
const CP437 =
	'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';

class ZipError extends Error {}

async function readView(file, start, end) {
	return new DataView(await file.slice(start, end).arrayBuffer());
}

function getUint64(view, offset) {
	return (
		view.getUint32(offset + 4, true) * 0x100000000 +
		view.getUint32(offset, true)
	);
}

/**
 * A name of the directory that carries no UTF-8 flag.
 *
 * Archivers that set no UTF-8 flag still often write UTF-8, so that is tried
 * first, and code page 437 only where the bytes are not valid UTF-8.
 *
 * @param {Uint8Array} bytes - name bytes.
 * @return {string} name.
 */
function decodeName(bytes) {
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		return Array.from(bytes, (byte) =>
			byte < 0x80 ? String.fromCharCode(byte) : CP437[byte - 0x80]
		).join('');
	}
}

/**
 * Where the central directory is and how many entries it holds.
 *
 * @param {File} file - the archive.
 * @return {Promise<Object>} `{ offset, size, end }`, `end` where the
 *                           directory stops.
 */
async function readEndOfDirectory(file) {
	// The record is 22 bytes, followed by a comment of up to 64 KB.
	const tailStart = Math.max(0, file.size - 22 - 0xffff);
	const tail = await readView(file, tailStart, file.size);
	let at = -1;

	for (let i = tail.byteLength - 22; i >= 0; i--) {
		if (END_OF_DIRECTORY === tail.getUint32(i, true)) {
			at = i;
			break;
		}
	}

	if (-1 === at) {
		throw new ZipError();
	}

	const end = {
		size: tail.getUint32(at + 12, true),
		offset: tail.getUint32(at + 16, true),
		end: tailStart + at,
	};

	const isZip64 =
		0xffff === tail.getUint16(at + 10, true) ||
		0xffffffff === end.size ||
		0xffffffff === end.offset;

	if (
		isZip64 &&
		at >= 20 &&
		ZIP64_LOCATOR === tail.getUint32(at - 20, true)
	) {
		const recordOffset = getUint64(tail, at - 20 + 8);
		const record = await readView(file, recordOffset, recordOffset + 56);

		if (ZIP64_END_OF_DIRECTORY !== record.getUint32(0, true)) {
			throw new ZipError();
		}

		end.size = getUint64(record, 40);
		end.offset = getUint64(record, 48);
		end.end = recordOffset;
	}

	return end;
}

/**
 * Sizes and offset a ZIP64 extra field carries for the values that overflow.
 *
 * @param {DataView} view   - directory.
 * @param {number}   start  - first byte of the extra fields.
 * @param {number}   length - their length.
 * @param {Object}   entry  - entry, updated in place.
 */
function readZip64Extra(view, start, length, entry) {
	let at = start;

	while (at + 4 <= start + length) {
		const id = view.getUint16(at, true);
		const size = view.getUint16(at + 2, true);
		let field = at + 4;

		if (0x0001 === id) {
			for (const key of ['size', 'compressedSize', 'offset']) {
				if (0xffffffff === entry[key]) {
					entry[key] = getUint64(view, field);
					field += 8;
				}
			}

			return;
		}

		at += 4 + size;
	}
}

/**
 * The bytes of one entry, unpacked.
 *
 * @param {File}   file  - the archive.
 * @param {Object} entry - entry of the directory.
 * @return {Promise<Blob>} entry data.
 */
async function readEntry(file, entry) {
	const offsets = [entry.offset, entry.offset + entry.shift];

	for (
		let offset = entry.offset + 2 ** 32;
		offset < file.size;
		offset += 2 ** 32
	) {
		offsets.push(offset);
	}

	let header;
	let offset;

	for (offset of offsets) {
		header = await readView(file, offset, offset + 30);

		if (
			header.byteLength === 30 &&
			LOCAL_HEADER === header.getUint32(0, true)
		) {
			break;
		}

		header = null;
	}

	if (!header) {
		throw new ZipError();
	}

	const start =
		offset + 30 + header.getUint16(26, true) + header.getUint16(28, true);
	const data = file.slice(start, start + entry.compressedSize);

	if (STORED === entry.method) {
		return data;
	}

	return new Response(
		data.stream().pipeThrough(new DecompressionStream('deflate-raw'))
	).blob();
}

/**
 * The files of an archive.
 *
 * @param {File} file - the archive.
 * @return {Promise<Array>} `{ path, size, getFile, error }` per file; `error`
 *                          is set on an entry that cannot be unpacked here.
 */
export async function readZip(file) {
	const end = await readEndOfDirectory(file);
	let view = await readView(file, end.offset, end.offset + end.size);
	let shift = 0;

	// macOS Archive Utility writes no ZIP64 records past 4 GB, so its offsets
	// wrap around 2^32. The directory then sits right before its end record,
	// and each entry's offset is off by a multiple of 2^32.
	if (view.byteLength < 4 || DIRECTORY_ENTRY !== view.getUint32(0, true)) {
		shift = end.end - end.size - end.offset;
		view = await readView(file, end.end - end.size, end.end);

		if (
			view.byteLength < 4 ||
			DIRECTORY_ENTRY !== view.getUint32(0, true)
		) {
			throw new ZipError();
		}
	}

	const entries = [];
	let at = 0;

	// The entry count wraps past 65,535 the same way, so the directory is read
	// to its last record instead.
	while (
		at + 46 <= view.byteLength &&
		DIRECTORY_ENTRY === view.getUint32(at, true)
	) {
		const flags = view.getUint16(at + 8, true);
		const nameLength = view.getUint16(at + 28, true);
		const extraLength = view.getUint16(at + 30, true);
		const commentLength = view.getUint16(at + 32, true);
		const nameBytes = new Uint8Array(
			view.buffer,
			view.byteOffset + at + 46,
			nameLength
		);
		const entry = {
			// Windows PowerShell 5 writes `\` between folders.
			path: (flags & 0x800
				? new TextDecoder().decode(nameBytes)
				: decodeName(nameBytes)
			).replaceAll('\\', '/'),
			method: view.getUint16(at + 10, true),
			compressedSize: view.getUint32(at + 20, true),
			size: view.getUint32(at + 24, true),
			offset: view.getUint32(at + 42, true),
			shift,
			isEncrypted: !!(flags & 0x1),
		};

		readZip64Extra(view, at + 46 + nameLength, extraLength, entry);

		at += 46 + nameLength + extraLength + commentLength;

		if (!entry.path.endsWith('/')) {
			entries.push(entry);
		}
	}

	return entries.map((entry) => {
		const result = { path: entry.path, size: entry.size };

		if (entry.isEncrypted) {
			result.error = 'encrypted';
		} else if (STORED !== entry.method && DEFLATED !== entry.method) {
			result.error = 'compression';
		} else {
			result.getFile = () => readEntry(file, entry);
		}

		return result;
	});
}

export function isZipError(error) {
	return error instanceof ZipError;
}
