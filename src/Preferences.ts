import Conf from "conf";
import envPaths from "env-paths";

interface IPreferences {
	lang: string;
	account: string;
	useragent?: string;
}

const paths = envPaths("Subtitles CLI", { suffix: "" });
export const PREF_DIR = paths.data;

const config = new Conf<IPreferences>({
	projectName: "subs-cli",
	configName: "preferences",
	cwd: paths.data,
	defaults: {
		lang: "eng",
		account: "",
		useragent: "",
	},
});

class Preferences {
	public async loadPreferences() {
		// Conf loads automatically
	}

	get lang(): string {
		return config.get("lang");
	}

	set lang(value: string) {
		config.set("lang", value);
	}

	get account(): string {
		return config.get("account");
	}

	set account(value: string) {
		config.set("account", value);
	}

	get useragent(): string {
		return config.get("useragent") || "";
	}

	set useragent(value: string) {
		config.set("useragent", value);
	}
}

export default new Preferences();
