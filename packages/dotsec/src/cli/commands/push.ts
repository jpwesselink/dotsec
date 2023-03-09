import { addPluginOptions } from "../../lib/addPluginOptions";
import { PushCommandOptions } from "../../types";
import { DotsecConfig } from "../../types/config";
import {
	DotsecCliOption,
	DotsecCliPluginDecryptHandler,
	DotsecCliPluginPushHandler,
} from "../../types/plugin";
import { setProgramOptions } from "../options/index";
import { Command } from "commander";
import { parse } from "dotenv";
import { expand } from "dotenv-expand";
import fs from "node:fs";

/**
 * Decrypts, and pushes the contents of a .env file to AWS SSM, AWS Secrets Manager or GitHub Actions Secrets
 * @date 12/7/2022 - 9:16:48 AM
 *
 * @async
 * @param {Command} program
 * @returns {unknown}
 */
const addPushProgram = async (
	program: Command,
	options: {
		dotsecConfig: DotsecConfig;
		handlers: {
			push: DotsecCliPluginPushHandler;
			decrypt: DotsecCliPluginDecryptHandler;
		}[];
	},
) => {
	const { dotsecConfig, handlers } = options;

	const subProgram = program
		.enablePositionalOptions()
		.passThroughOptions()
		.command("push")
		.action(async (_options: Record<string, string>, command: Command) => {
			try {
				const {
					// verbose,
					using,
					envFile,
					secFile,
					engine,

					yes,
				} = command.optsWithGlobals<PushCommandOptions>();

				const encryptionEngine =
					engine || dotsecConfig?.defaults?.encryptionEngine;

				const pluginCliDecrypt = (handlers || []).find((handler) => {
					return handler.decrypt?.triggerOptionValue === encryptionEngine;
				})?.decrypt;

				const pluginCliPush = (handlers || []).find((handler) => {
					return handler.push?.triggerOptionValue === encryptionEngine;
				})?.push;

				if (!pluginCliPush) {
					throw new Error("No push plugin found!");
				}
				const allOptionKeys = [
					...Object.keys(pluginCliDecrypt?.options || {}),
					...Object.keys(pluginCliDecrypt?.requiredOptions || {}),
					...Object.keys(pluginCliPush?.options || {}),
					...Object.keys(pluginCliPush?.requiredOptions || {}),
				];

				const allOptionsValues = Object.fromEntries(
					allOptionKeys.map((key) => {
						return [key, _options[key]];
					}),
				);

				let envContents: string | undefined;

				if (using === "env") {
					if (!envFile) {
						throw new Error("No dotenv file specified in --env-file option");
					}
					envContents = fs.readFileSync(envFile, "utf8");
				} else {
					if (!secFile) {
						throw new Error("No dotsec file specified in --sec-file option");
					}

					if (!pluginCliDecrypt) {
						throw new Error(
							`No decryption plugin found, available decryption engine(s): ${handlers
								.map((e) => `--${e.decrypt?.triggerOptionValue}`)
								.join(", ")}`,
						);
					}

					const dotSecContents = fs.readFileSync(secFile, "utf8");
					envContents = await pluginCliDecrypt.handler({
						ciphertext: dotSecContents,
						...allOptionsValues,
					});
				}
				if (envContents) {
					// convert to object
					const dotenvVars = parse(envContents);
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

					if (expandedEnvVars.parsed) {
						await pluginCliPush.handler({
							push: expandedEnvVars.parsed,
							yes,
							...allOptionsValues,
						});
					}
				} else {
					throw new Error("No .env or .sec file provided");
				}
			} catch (e) {
				console.error(e);
				process.exit(1);
			}
		});

	setProgramOptions({ program: subProgram, dotsecConfig });
	const engines = options.handlers.map(
		({ decrypt }) => decrypt.triggerOptionValue,
	);
	subProgram.option(
		"--engine <engine>",
		`Encryption engine${engines.length > 0 ? "s" : ""} to use: ${
			engines.length === 1 ? engines[0] : engines.join(", ")
		}`,
		engines.length === 1 ? engines[0] : undefined,
	);
	const allOptions: {
		[x: string]: DotsecCliOption & { required?: boolean };
	} = {};
	options.handlers.forEach((handlers) => {
		Object.keys(handlers).map((handlerName) => {
			const { options: cliOptions, requiredOptions } = handlers[handlerName];
			Object.keys(cliOptions || {}).forEach((key) => {
				allOptions[key] = Array.isArray(cliOptions[key])
					? cliOptions[key]
					: { ...allOptions[key], ...cliOptions[key] };
			});
			Object.keys(requiredOptions || {}).forEach((key) => {
				allOptions[key] = Array.isArray(requiredOptions[key])
					? requiredOptions[key]
					: {
							...allOptions[key],
							...requiredOptions[key],
							required: true,
					  };
			});
		});
	});

	const usage: string[] = [];
	const descriptions: string[] = [];

	handlers.forEach((handler) => {
		if (handler.push?.description) {
			descriptions.push(handler.push.description);
		}

		if (handler.push?.usage) {
			usage.push(handler.push.usage);
		}
	});

	if (descriptions.length > 0) {
		subProgram.description(descriptions.join("\n"));
	}

	if (usage.length > 0) {
		subProgram.usage(usage.join("\n"));
	}

	addPluginOptions(
		Object.fromEntries(
			Object.entries(allOptions).filter(
				([_key, value]) => value.required !== true,
			),
		),
		subProgram,
	);
	addPluginOptions(
		Object.fromEntries(
			Object.entries(allOptions).filter(
				([_key, value]) => value.required === true,
			),
		),
		subProgram,
		true,
	);

	return subProgram;
};

export default addPushProgram;
