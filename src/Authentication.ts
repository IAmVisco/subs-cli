import { AsyncEntry, findCredentials } from "@napi-rs/keyring";
import chalk from "chalk";
import inquirer from "inquirer";
import OpenSubtitlesPkg from "opensubtitles.com";

const OpenSubtitles = OpenSubtitlesPkg;

import Preferences from "./preferences.js";
import type { IOpenSubtitles } from "./types.js";
import { isString } from "./util.js";

const { prompt } = inquirer;

const setPassword = async (
	service: string,
	account: string,
	password: string,
) => {
	const entry = new AsyncEntry(service, account);
	await entry.setPassword(password);
};

export default async function authenticate(): Promise<IOpenSubtitles> {
	const service = "opensubtitles.com";
	const accounts = findCredentials(service);
	let apiKey = "";

	const existingApiKey = accounts.find((acc) => acc.account === "api_key");

	if (existingApiKey) {
		apiKey = existingApiKey.password;
	} else {
		console.log(chalk.yellowBright("No API Key found for opensubtitles.com"));
		console.log(
			chalk.yellowBright(
				"You will be prompted to enter your API Key. This information is stored securely in your OS keychain.",
			),
		);
		console.log();
		apiKey = await inquireApiKey();
		await setPassword(service, "api_key", apiKey);
	}

	return new OpenSubtitles({
		apikey: apiKey,
		useragent: Preferences.useragent || "subs-cli v2.0.0",
	}) as unknown as IOpenSubtitles;
}

async function inquireApiKey(): Promise<string> {
	while (true) {
		const { apiKey } = await prompt([
			{
				type: "input",
				name: "apiKey",
				message: "Enter your OpenSubtitles.com API Key:",
			},
		]);

		if (isString(apiKey)) {
			return apiKey.trim();
		}

		console.log(chalk.redBright("\nAPI Key cannot be empty!\n"));
	}
}
