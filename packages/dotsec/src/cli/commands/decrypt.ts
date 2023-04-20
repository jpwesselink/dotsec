import { addPluginOptions } from "../../lib/addPluginOptions";
import {
	promptOverwriteIfFileExists,
	readContentsFromFile,
	writeContentsToFile,
} from "../../lib/io";
import { parse } from "../../lib/parse";
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
					envFile,
					secFile,
					engine,
					createManifest,
					manifestFile,
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

				console.log(
					"Decrypting with",
					strong(
						pluginCliDecrypt.encryptionEngineName ||
							pluginCliDecrypt.triggerOptionValue,
					),
					"engine",
				);
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
				const dotsecString = await readContentsFromFile(secFile);

				const plaintext = await pluginCliDecrypt.handler({
					ciphertext: dotsecString,
					...allOptionsValues,
				});

				const dotenvOverwriteResponse = await promptOverwriteIfFileExists({
					filePath: envFile,
					skip: yes,
				});
				if (
					dotenvOverwriteResponse === undefined ||
					dotenvOverwriteResponse.overwrite === true
				) {
					await writeContentsToFile(envFile, plaintext);
					console.log(
						`Wrote plaintext contents of ${strong(secFile)} file to ${strong(
							envFile,
						)}`,
					);
				}

				if (createManifest || dotsecConfig?.defaults?.options?.createManifest) {
					// parse raw env contents into key value pairs using the dotenv package
					const dotenvVars = parse(plaintext).obj;
					// expand env vars
					const markdownManifest = `# Dotsec decryption manifest

## Overview

- plaintext source: ${envFile}
- ciphertext target: ${secFile}
- created: ${new Date().toUTCString()}
- Decryption engine: ${
						pluginCliDecrypt.encryptionEngineName ||
						pluginCliDecrypt.triggerOptionValue
					}
- Decryption engine options: ${JSON.stringify(allOptionsValues)}

## Variables

| Key |
| --- |
${Object.keys(dotenvVars)
	.map((key) => {
		return `| \`${key} \`| `;
	})
	.join("\n")}
`;

					// write manifest file, don't prompt to overwrite
					const manifestTargetFile =
						manifestFile || `${envFile}.decryption-manifest.md`;
					await writeContentsToFile(manifestTargetFile, markdownManifest);
					console.log(
						`Wrote manifest of ${strong(envFile)} file to ${strong(
							manifestTargetFile,
						)}`,
					);
				}
			} catch (e) {
				console.error(strong(e.message));
				command.help();
			}
		});

	options.decryptHandlers.map((decryption) => {
		const { options, requiredOptions } = decryption;
		addPluginOptions(options, subProgram);
		addPluginOptions(requiredOptions, subProgram, true);
	});

	const engines = options.decryptHandlers.map((e) => e.triggerOptionValue);
	subProgram.option(
		"--engine <engine>",
		`Encryption engine${engines.length > 0 ? "s" : ""} to use: ${
			engines.length === 1 ? engines[0] : engines.join(", ")
		}`,
		engines.length === 1 ? engines[0] : undefined,
	);
	setProgramOptions({ program: subProgram, dotsecConfig });

	return subProgram;
};

export default addEncryptProgram;
