import {
	promptOverwriteIfFileExists,
	readContentsFromFile,
	writeContentsToFile,
} from "../../lib/io";
import { EncryptCommandOptions } from "../../types";
import { DotsecConfig } from "../../types/config";
import { DotsecCliPluginEncryptHandler } from "../../types/plugin";
import { strong } from "../../utils/logging";
import { setProgramOptions } from "../options";
import { Command } from "commander";

type Formats = {
	env?: string;
	awsKeyAlias?: string;
} & Record<string, unknown>;

const addEncryptProgram = async (
	program: Command,
	options: {
		encryptHandlers: DotsecCliPluginEncryptHandler[];
		dotsecConfig: DotsecConfig;
	},
) => {
	const { encryptHandlers, dotsecConfig } = options;
	const subProgram = program
		.enablePositionalOptions()
		.passThroughOptions()
		.command("encrypt")
		.action(async (_options: Formats, command: Command) => {
			try {
				const {
					// verbose,
					env: dotenvFilename,
					sec: dotsecFilename,
					engine,
					yes,
				} = command.optsWithGlobals<EncryptCommandOptions>();

				const encryptionEngine =
					engine || dotsecConfig?.defaults?.encryptionEngine;
				const pluginCliEncrypt = (encryptHandlers || []).find((handler) => {
					return handler.triggerOptionValue === encryptionEngine;
				});

				if (!pluginCliEncrypt) {
					throw new Error(
						`No encryption plugin found, available encryption engine(s): ${options.encryptHandlers
							.map((e) => e.triggerOptionValue)
							.join(", ")}`,
					);
				}

				const allOptionKeys = [
					...Object.keys(pluginCliEncrypt.options || {}),
					...Object.keys(pluginCliEncrypt.requiredOptions || {}),
				];

				const allOptionsValues = Object.fromEntries(
					allOptionKeys.map((key) => {
						return [key, _options[key]];
					}),
				);

				const dotenvString = await readContentsFromFile(dotenvFilename);

				const cipherText = await pluginCliEncrypt.handler({
					plaintext: dotenvString,
					...allOptionsValues,
				});

				const dotsecOverwriteResponse = await promptOverwriteIfFileExists({
					filePath: dotsecFilename,
					skip: yes,
				});
				if (
					dotsecOverwriteResponse === undefined ||
					dotsecOverwriteResponse.overwrite === true
				) {
					await writeContentsToFile(dotsecFilename, cipherText);
					console.log(
						`Wrote encrypted contents of ${strong(
							dotenvFilename,
						)} file to ${strong(dotsecFilename)}`,
					);
				}
			} catch (e) {
				console.error(strong(e.message));
				command.help();
			}
		});

	options.encryptHandlers.map((encryption) => {
		const { options, requiredOptions } = encryption;
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

	const engines = options.encryptHandlers.map((e) => e.triggerOptionValue);
	const encryptionEngineNames = options.encryptHandlers.map(
		(e) => e.encryptionEngineName,
	);
	subProgram.option(
		"--engine <engine>",
		`Encryption engine${engines.length > 0 ? "s" : ""}: ${
			(engines.join(", "), engines.length === 1 ? engines[0] : undefined)
		}`,
		// engines.length === 1 ? engines[0] : undefined,
	);
	setProgramOptions(subProgram);
	subProgram.description(
		`Encrypt .env file using ${encryptionEngineNames.join(", ")}`,
	);
	return subProgram;
};

export default addEncryptProgram;
