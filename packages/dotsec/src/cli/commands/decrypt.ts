import {
	promptOverwriteIfFileExists,
	readContentsFromFile,
	writeContentsToFile,
} from "../../lib/io";
import { DecryptCommandOptions } from "../../types";
import { DotsecConfig } from "../../types/config";
import { DotsecCliPluginDecryptHandler } from "../../types/plugin";
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
		dotsecConfig: DotsecConfig;
		decryptHandlers: DotsecCliPluginDecryptHandler[];
	},
) => {
	const { dotsecConfig, decryptHandlers } = options;
	const subProgram = program
		.enablePositionalOptions()
		.passThroughOptions()
		.command("decrypt")
		.action(async (_options: Formats, command: Command) => {
			try {
				const {
					// verbose,
					env: dotenvFilename,
					sec: dotsecFilename,
					engine,
					yes,
				} = command.optsWithGlobals<DecryptCommandOptions>();

				const encryptionEngine =
					engine || dotsecConfig?.defaults?.encryptionEngine;
				const pluginCliDecrypt = (decryptHandlers || []).find((handler) => {
					return handler.triggerOptionValue === encryptionEngine;
				});

				if (!pluginCliDecrypt) {
					throw new Error(
						`No decryption plugin found, available decryption engine(s): ${options.decryptHandlers
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
				// get current dot env file
				const dotsecString = await readContentsFromFile(dotsecFilename);

				const plaintext = await pluginCliDecrypt.handler({
					ciphertext: dotsecString,
					...allOptionsValues,
				});

				const dotenvOverwriteResponse = await promptOverwriteIfFileExists({
					filePath: dotenvFilename,
					skip: yes,
				});
				if (
					dotenvOverwriteResponse === undefined ||
					dotenvOverwriteResponse.overwrite === true
				) {
					await writeContentsToFile(dotenvFilename, plaintext);
					console.log(
						`Wrote plaintext contents of ${strong(
							dotsecFilename,
						)} file to ${strong(dotenvFilename)}`,
					);
				}
			} catch (e) {
				console.error(strong(e.message));
				command.help();
			}
		});

	options.decryptHandlers.map((decryption) => {
		const { options, requiredOptions } = decryption;
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

	const engines = options.decryptHandlers.map((e) => e.triggerOptionValue);
	subProgram.option(
		"--engine <engine>",
		`Encryption engine${engines.length > 0 ? "s" : ""} to use: ${
			(engines.join(", "), engines.length === 1 ? engines[0] : undefined)
		}`,
		engines.length === 1 ? engines[0] : undefined,
	);
	setProgramOptions(subProgram);

	return subProgram;
};

export default addEncryptProgram;
