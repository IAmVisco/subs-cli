import { createWriteStream } from "node:fs";
import type { IncomingHttpHeaders } from "node:http";
import * as https from "node:https";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createUnzip } from "node:zlib";
import pkg from "fs-extra";

const { readJsonSync } = pkg;

import type { ILanguage } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pipe = promisify(pipeline);

export function isString(...str: string[]): boolean {
	for (const s of str) {
		if (s?.length < 1) {
			return false;
		}
	}
	return true;
}

export function getLang(lang: string): ILanguage | null {
	const languages: ILanguage[] = readJsonSync(join(__dirname, "../langs.json"));

	if (lang.length === 2) {
		return languages.find((l) => l.alpha2 === lang) ?? null;
	} else if (lang.length === 3) {
		return languages.find((l) => l.alpha3 === lang) ?? null;
	}

	return null;
}

export async function downloadFile(
	url: string,
	path: string,
	unzip: boolean = true,
): Promise<IncomingHttpHeaders> {
	return new Promise<IncomingHttpHeaders>((resolve, reject) => {
		https.get(
			url,
			{
				headers: {
					"User-Agent": "TemporaryUserAgent",
				},
			},
			(res) => {
				if (res.statusCode === 200) {
					let writeFile: Promise<void>;

					const fStream = createWriteStream(path);
					if (unzip) {
						writeFile = pipe(res, createUnzip(), fStream);
					} else {
						writeFile = pipe(res, fStream);
					}

					writeFile
						.then(() => resolve(res.headers))
						.catch((e: Error) => reject(new Error(e.message)));
				} else {
					reject(new Error(`${res.statusCode} ${res.statusMessage}`));
				}
			},
		);
	});
}
