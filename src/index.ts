#!/usr/bin/env node

import { execSync } from "node:child_process";
import { EOL } from "node:os";
import { basename, dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import pkg from "fs-extra";
const { lstatSync, pathExistsSync, readdirSync, readFileSync } = pkg;
import parseArguments from "./arg-parser.js";
import authenticate from "./authentication.js";
import DownloadEventHandler, {
	DownloadError,
	type DownloadResult,
} from "./download-event-handler.js";
import Preferences from "./preferences.js";
import type { ILanguage, IOpenSubtitles, ISubInfo } from "./types.js";
import { downloadFile, getLang, isString } from "./util.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = parseArguments();

let osub: IOpenSubtitles;

let quota: number = -Infinity;

async function start() {
	const targetPath = getPath();

	const files = getFiles(targetPath);

	if (files.length < 1) {
		console.log(chalk.yellowBright(`${EOL}No files found${EOL}`));
		return;
	}

	await Preferences.loadPreferences();

	const lang = getLanguage();

	osub = await authenticate();

	const downloadWatcher = new DownloadEventHandler(files.length);

	for (const file of files) {
		downloadSubtitle(file, lang)
			.then(downloadWatcher.successHandler)
			.catch(downloadWatcher.errorHandler);
	}

	const result = await downloadWatcher.finishAll();

	printResult(result);

	if (quota > -1) {
		console.log(
			chalk.yellowBright(
				`${EOL}OpenSubtitle.com download quota: ${chalk.bold(quota)}`,
			),
		);
	}
}

function printResult(result: DownloadResult) {
	if (args.notificationOutput) {
		execSync(
			`osascript -e 'display notification "Downloaded ${result.success.length}" with title "Subtitle Download"'`,
		);
		return;
	}

	if (result.success.length > 0) {
		console.log();

		console.log(chalk.bold.green("  SUCCESS:"));
		for (const fileName of result.success) {
			console.log(chalk.green("✔ ") + chalk.greenBright(`${fileName}`));
		}
	}

	if (result.err.length > 0) {
		console.log();

		console.log(chalk.bold.red("  ERRORS:"));
		for (const error of result.err) {
			console.log(
				chalk.red("✖ ") +
					chalk.redBright(`${error.fileName} ${chalk.red(error.message)}`),
			);
		}
	}
}

async function downloadSubtitle(
	file: string,
	lang: ILanguage,
): Promise<string> {
	const fileBaseName = basename(file);

	const subs = await searchSubtitles(file, lang);

	if (subs.length < 1) {
		throw new DownloadError("No subtitles found", fileBaseName);
	}

	try {
		const downloadInfo = await osub.download({
			file_id: subs[0].id,
		});

		const headers = await downloadFile(
			downloadInfo.link,
			file.replace(/\.[^.]*$/, ".srt"),
			false,
		);

		const dowQuota = Number.parseInt(<string>headers["x-quota-remaining"], 10);
		if (!Number.isNaN(dowQuota)) {
			quota = dowQuota;
		}
	} catch (e: any) {
		throw new DownloadError(e.message, fileBaseName);
	}

	return fileBaseName;
}

async function searchSubtitles(
	videoFile: string,
	lang: ILanguage,
): Promise<ISubInfo[]> {
	const response = await osub.subtitles({
		languages: lang.alpha2,
		query: basename(videoFile),
	});

	return response.data.map((item: any) => ({
		id: item.attributes.files[0].file_id,
		filename: item.attributes.release,
		url: item.attributes.files[0].file_name, // Not really used for download anymore, but keeping for interface
	}));
}

function getLanguage(): ILanguage {
	const lang = getLang(args.lang ?? Preferences.lang ?? "eng");
	if (lang !== null) {
		const isDefault = lang.alpha3 !== Preferences.lang && !args.saveLang;
		console.log(
			chalk.greenBright(
				`Language set to ${chalk.yellow(lang.name)}` +
					(isDefault
						? `. To save as default add ${chalk.blueBright("-s")} option`
						: " as default") +
					EOL,
			),
		);

		if (args.saveLang === true) {
			Preferences.lang = lang.alpha3;
		}
		return lang;
	} else {
		console.error(
			chalk.redBright(`No language found for code ${chalk.red(args.lang)}`),
		);
		process.exit(0);
	}
}

function getPath(): string {
	let targetPath: string;

	if (!isString(args.path)) {
		console.error(chalk.redBright.bold(`No path specified!${EOL}`));
		console.log(args.parser.helpInformation());
		process.exit(0);
	}

	if (isAbsolute(args.path)) {
		targetPath = args.path;
	} else {
		targetPath = join(process.cwd(), args.path);
	}

	if (!pathExistsSync(targetPath)) {
		console.error(
			chalk.redBright(`Path '${chalk.bold.red(targetPath)}' doesn't exist`),
		);
		process.exit(0);
	}

	return targetPath;
}

function getFiles(targetPath: string): string[] {
	let files: string[] = [];

	const lstatRes = lstatSync(targetPath);
	if (lstatRes.isFile() && isVideoFile(targetPath)) {
		files = [targetPath];
	} else if (lstatRes.isDirectory()) {
		files = readdirSync(targetPath)
			.filter(isVideoFile)
			.map((fn) => join(targetPath, fn));
		if (args.overwrite === false) {
			files = files.filter(
				(path) => !pathExistsSync(path.replace(/\.[^.]*$/, ".srt")),
			);
		}
	}

	return files;
}

function isVideoFile(path: string) {
	const ext = path.split(".").pop();

	return ext ? extensions.indexOf(ext) > -1 : false;
}

const extensions: string[] = JSON.parse(
	readFileSync(join(__dirname, "../extensions.json"), { encoding: "utf8" }),
);

start().catch((e) => console.error(e));
