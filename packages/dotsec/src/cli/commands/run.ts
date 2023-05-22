import fs from "node:fs";

import { Command } from "commander";
import { expand } from "dotenv-expand";

import { addPluginOptions } from "../../lib/addPluginOptions";
import { parse } from "../../lib/parse";
import { RunCommandOptions } from "../../types";
import { DotsecConfig } from "../../types/config";
import { DotsecCliPluginDecryptHandler } from "../../types/plugin";
import { strong } from "../../utils/logging";
import { setProgramOptions } from "../options";
import { spawnSync } from "node:child_process";
const addRunProgam = (
	program: Command,
	options: {
		dotsecConfig: DotsecConfig;
		decryptHandlers?: DotsecCliPluginDecryptHandler[];
	},
) => {
	const { dotsecConfig, decryptHandlers } = options || {};
	// create api here

	// is there an encryption engine?
	const hasDecryptEngine =
		decryptHandlers !== undefined && decryptHandlers.length > 0;

	const subProgram = program
		.command("run <command...>")
		.allowUnknownOption(true)
		.enablePositionalOptions()
		.passThroughOptions()
		.showHelpAfterError(true)
		.action(
			async (
				commands: string[],
				_options: Record<string, string>,
				command: Command,
			) => {
				try {
					const { envFile, using, secFile, engine } =
						command.optsWithGlobals<RunCommandOptions>();

					let envContents: string | undefined;

					if (using === "env" || hasDecryptEngine === false) {
						if (!envFile) {
							throw new Error("No dotenv file specified in --env-file option");
						}
						envContents = fs.readFileSync(envFile, "utf8");
					} else if (using === "sec") {
						if (!secFile) {
							throw new Error("No dotsec file specified in --sec-file option");
						}

						const encryptionEngine =
							engine || dotsecConfig?.defaults?.encryptionEngine;

						const pluginCliDecrypt = (decryptHandlers || []).find((handler) => {
							return handler.triggerOptionValue === encryptionEngine;
						});

						if (!pluginCliDecrypt) {
							throw new Error(
								`No decryption plugin found, available decryption engine(s): ${(
									decryptHandlers || []
								)
									.map((e) => `--${e.triggerOptionValue}`)
									.join(", ")}`,
							);
						}

						const allOptionKeys = [
							...Object.keys(pluginCliDecrypt.options || {}),
							...Object.keys(pluginCliDecrypt.requiredOptions || {}),
						];

						const allOptionsValues = Object.fromEntries(
							allOptionKeys.map((key) => {
								return [key, _options[key]];
							}),
						);
						try {
							const dotSecContents = fs.readFileSync(secFile, "utf8");
							envContents = await pluginCliDecrypt.handler({
								ciphertext: dotSecContents,
								...allOptionsValues,
							});
						} catch (e) {
							console.error("Something bad happened while decrypting.");
							console.error(`File: ${secFile}`);
							throw e;
						}
					}
					if (envContents) {
						const dotenvVars = parse(envContents).obj;
						// expand env vars
						const expandedEnvVars = expand({
							ignoreProcessEnv: true,
							parsed: {
								// add standard env variables
								...(process.env as Record<string, string>),
								// add custom env variables, either from .env or .sec, (or empty object if none)
								...dotenvVars,
							},
						});

						const [userCommand, ...userCommandArgs] = commands;
						const spawn = spawnSync(userCommand, [...userCommandArgs], {
							stdio: "inherit",
							shell: false,
							encoding: "utf-8",
							env: {
								...expandedEnvVars.parsed,
								...process.env,
								__DOTSEC_ENV__: JSON.stringify(Object.keys(dotenvVars)),
							},
						});

						if (spawn.status !== 0) {
							process.exit(spawn.status || 1);
						}
					} else {
						throw new Error("No .env or .sec file provided");
					}
				} catch (e) {
					console.error(strong(e.message));
					command.help();
				}
			},
		);
	setProgramOptions({
		program: subProgram,
		commandName: hasDecryptEngine ? "run" : "runEnvOnly",
		dotsecConfig,
	});

	if (hasDecryptEngine) {
		decryptHandlers?.map((run) => {
			const { options, requiredOptions } = run;
			addPluginOptions(options, subProgram);
			addPluginOptions(requiredOptions, subProgram, true);
		});
		const engines = decryptHandlers?.map((e) => e.triggerOptionValue);

		subProgram.option(
			"--engine <engine>",
			`Encryption engine${engines.length > 0 ? "s" : ""}: ${
				(engines.join(", "), engines.length === 1 ? engines[0] : undefined)
			}`,
			// engines.length === 1 ? engines[0] : undefined,
		);
	}
	return subProgram;
};

export default addRunProgam;
