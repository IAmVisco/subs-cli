import { AsyncEntry, findCredentials } from "@napi-rs/keyring";
import chalk from "chalk";
import inquirer from "inquirer";
import OpenSubtitlesPkg from "opensubtitles.com";
import ora from "ora";

const OpenSubtitles = OpenSubtitlesPkg;

import Preferences from "./preferences.js";
import type { IOpenSubtitles } from "./types.js";
import { isString } from "./util.js";

const { prompt } = inquirer;

const service = "opensubtitles.com";

const setPassword = async (account: string, password: string) => {
	const entry = new AsyncEntry(service, account);
	await entry.setPassword(password);
};

export default async function authenticate(): Promise<IOpenSubtitles> {
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
		await setPassword("api_key", apiKey);
	}

	const osub = new OpenSubtitles({
		apikey: apiKey,
		useragent: Preferences.useragent || "subs-cli v2.0.0",
	}) as unknown as IOpenSubtitles;

	const loginAccounts = accounts.filter((acc) => acc.account !== "api_key");

	return getCredentialsRec(osub, loginAccounts);
}

async function getCredentialsRec(
	osub: IOpenSubtitles,
	accounts: { account: string; password: string }[],
	triedAccounts: string[] = [],
	firstPass: boolean = true,
): Promise<IOpenSubtitles> {
	let credentials: { account: string; password: string } | null = null;

	const validAccounts = accounts.filter(
		(acc) => triedAccounts.indexOf(acc.account) < 0,
	);

	if (validAccounts.length > 0) {
		if (
			firstPass &&
			accounts.findIndex((acc) => acc.account === Preferences.account) > -1
		) {
			credentials =
				accounts.find((acc) => acc.account === Preferences.account) || null;
		} else {
			credentials = await inquireAccount(validAccounts);
		}
		if (credentials !== null) {
			triedAccounts.push(credentials.account);
		}
	}

	if (credentials === null) {
		if (firstPass) {
			console.log(chalk.yellowBright("No account found for opensubtitles.com"));
			console.log(
				chalk.yellowBright(
					"You will be prompted to add your credentials for opensubtitles.com. This information is stored securely in your OS keychain.",
				),
			);
		}
		console.log();
		credentials = await inquireCredentials();
	}

	const success = await tryCredentials(osub, credentials);
	if (success) {
		await setPassword(credentials.account, credentials.password);
		Preferences.account = credentials.account;
		return osub;
	} else {
		return getCredentialsRec(osub, accounts, triedAccounts, false);
	}
}

async function tryCredentials(
	osub: IOpenSubtitles,
	credentials: { account: string; password: string },
): Promise<boolean> {
	const spinner = ora(
		chalk.yellow(`Logging in ${credentials.account}`),
	).start();
	try {
		await osub.login({
			username: credentials.account,
			password: credentials.password,
		});
		spinner.succeed(
			`Successfully logged in as ${chalk.blueBright(credentials.account)}`,
		);
		return true;
	} catch (e: any) {
		spinner.fail(
			`Failed to log in as ${chalk.blueBright(credentials.account)}. Error: ${chalk.redBright(e.message)}`,
		);
		return false;
	}
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

async function inquireAccount(
	accounts: { account: string; password: string }[],
): Promise<{ account: string; password: string } | null> {
	const accountName = await prompt([
		{
			type: "list",
			name: "account",
			choices: [...accounts.map((acc) => acc.account), "Other"],
			message: "Which opensubtitles.com account do you wish to use?",
		},
	]);

	return accounts.find((acc) => acc.account === accountName.account) ?? null;
}

async function inquireCredentials(): Promise<{
	account: string;
	password: string;
}> {
	while (true) {
		const credentials = await prompt([
			{ type: "input", name: "account", message: "Username:" },
			{ type: "password", name: "password", message: "Password:" },
		]);

		if (isString(credentials.password, credentials.account)) {
			return credentials;
		} else {
			console.log(chalk.redBright("\nUsername/Password cannot be empty!\n"));
		}
	}
}
