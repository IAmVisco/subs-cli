import { platform } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import pkg from "fs-extra";
const { readJsonSync } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Arguments {
	lang: string;
	username?: string;
	password?: string;
	overwrite?: boolean;
	saveLang?: boolean;
	path: string;
	parser: Command;
	notificationOutput: boolean;
	noPrompt: boolean;
}

export default function parse(): Arguments {
	const pack = readJsonSync(join(__dirname, "../package.json"));
	const program = new Command("subs");
	program.version(pack.version);

	program.option(
		"-l, --lang <value>",
		"the language of the subtitles (eng/en, fr/fre, ro/rum, ...) (default: eng)",
	);
	program.option("-o, --overwrite", "overwrite existing subtitles", false);
	program.option(
		"-p, --path",
		"path of file or dir of files to download subtitles for",
	);
	program.option("-s, --save-lang", "save the current language as default");
	program.option(
		"-N, --no-prompt",
		"the app will not prompt for any user input",
	);

	if (platform() === "darwin") {
		program.option(
			"-n, --notification-output",
			"show output as a notification",
		);
	}

	program.usage("<path> [options]");

	program.parse(process.argv);

	const opts = program.opts();

	return {
		lang: opts.lang,
		username: opts.username,
		password: opts.password,
		overwrite: opts.overwrite ?? false,
		saveLang: opts.saveLang ?? false,
		path: program.args[0],
		parser: program,
		notificationOutput: opts.notificationOutput ?? false,
		noPrompt: opts.noPrompt ?? false,
	};
}
