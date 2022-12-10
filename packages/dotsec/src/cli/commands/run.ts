import fs from "node:fs";

import { Command } from "commander";
import { parse } from "dotenv";

import { RunCommandOptions } from "../../types";
import { DotsecConfig } from "../../types/config";
import { DotsecCliPluginDecryptHandler } from "../../types/plugin";
import { strong } from "../../utils/logging";
import { setProgramOptions } from "../options";
import { spawnSync } from "node:child_process";
const addRunProgam = (
	program: Command,
	options?: {
		dotsecConfig: DotsecConfig;
		decryptHandlers?: DotsecCliPluginDecryptHandler[];
	},
) => {
	const { dotsecConfig, decryptHandlers } = options || {};

	const subProgram = program
		.command("run <command...>")
		.usage("[--with-env --env .env] [--with-sec --sec .sec] [commandArgs...]")
		.allowUnknownOption()
		.showHelpAfterError(true)
		.description(
			`Run a command in a separate process and populate env with decrypted .env or encrypted .sec values.
The --withEnv option will take precedence over the --withSec option. If neither are specified, the --withEnv option will be used by default.

${"Examples:"}

${"Run a command with a .env file"}

$ dotsec run echo "hello world"


${"Run a command with a specific .env file"}

$ dotsec run --with-env --env .env.dev echo "hello world"


${"Run a command with a .sec file"}

$ dotsec run --with-sec echo "hello world"


${"Run a command with a specific .sec file"}

$ dotsec run --with-sec --sec .sec.dev echo "hello world"

`,
		)
		.action(
			async (
				commands: string[],
				_options: Record<string, string>,
				command: Command,
			) => {
				try {
					const {
						env: dotenv,
						sec: dotsec,
						withEnv,
						withSec,
						engine,
					} = command.optsWithGlobals<RunCommandOptions>();

					if (withEnv && withSec) {
						throw new Error("Cannot use both --with-env and --with-sec");
					}

					let envContents: string | undefined;

					if (withEnv || !(withEnv || withSec)) {
						if (!dotenv) {
							throw new Error("No dotenv file specified in --env option");
						}
						envContents = fs.readFileSync(dotenv, "utf8");
					} else if (withSec) {
						if (!dotsec) {
							throw new Error("No dotsec file specified in --sec option");
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

						const dotSecContents = fs.readFileSync(dotsec, "utf8");
						envContents = await pluginCliDecrypt.handler({
							ciphertext: dotSecContents,
							...allOptionsValues,
						});
					}
					if (envContents) {
						const dotenvVars = parse(envContents);
						const [userCommand, ...userCommandArgs] = commands;
						spawnSync(userCommand, [...userCommandArgs], {
							stdio: "inherit",
							shell: false,
							env: {
								...process.env,
								...dotenvVars,
								__DOTSEC_ENV__: JSON.stringify(Object.keys(dotenvVars)),
							},
						});
					} else {
						throw new Error("No .env or .sec file provided");
					}
				} catch (e) {
					console.error(strong(e.message));
					command.help();
				}
			},
		);

	setProgramOptions(subProgram, "run");
	decryptHandlers?.map((run) => {
		const { options, requiredOptions } = run;
		if (options) {
			Object.values(options).map((option) => {
				// @ts-ignore
				subProgram.option(...option);
			});
		}
		if (requiredOptions) {
			Object.values(requiredOptions).map((requiredOption) => {
				// @ts-ignore
				subProgram.option(...requiredOption);
			});
		}
	});

	if (decryptHandlers) {
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
