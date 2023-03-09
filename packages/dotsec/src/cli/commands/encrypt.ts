import { addPluginOptions } from "../../lib/addPluginOptions";
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
import { parse } from "dotenv";

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
					envFile,
					secFile,
					engine,
					createManifest,
					manifestFile,
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

				const dotenvString = await readContentsFromFile(envFile);

				const cipherText = await pluginCliEncrypt.handler({
					plaintext: dotenvString,
					...allOptionsValues,
				});

				const dotsecOverwriteResponse = await promptOverwriteIfFileExists({
					filePath: secFile,
					skip: yes,
				});
				if (
					dotsecOverwriteResponse === undefined ||
					dotsecOverwriteResponse.overwrite === true
				) {
					await writeContentsToFile(secFile, cipherText);
					console.log(
						`Wrote encrypted contents of ${strong(envFile)} file to ${strong(
							secFile,
						)}`,
					);

					if (createManifest) {
						// parse raw env contents into key value pairs using the dotenv package
						const dotenvVars = parse(dotenvString);
						// expand env vars
						const markdownManifest = `# Dotsec encryption manifest 

## Overview

- plaintext source: ${envFile}
- ciphertext target: ${secFile}
- created: ${new Date().toUTCString()}
- encryption engine: ${
							pluginCliEncrypt.encryptionEngineName ||
							pluginCliEncrypt.triggerOptionValue
						}
- encryption engine options: ${JSON.stringify(allOptionsValues)}

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
							manifestFile || `${secFile}.encryption-manifest.md`;
						await writeContentsToFile(manifestTargetFile, markdownManifest);
						console.log(
							`Wrote manifest of ${strong(envFile)} file to ${strong(
								manifestTargetFile,
							)}`,
						);
					}
				}
			} catch (e) {
				console.error(strong(e.message));
				command.help();
			}
		});

	options.encryptHandlers.map((encryptionHandler) => {
		const { options, requiredOptions } = encryptionHandler;
		addPluginOptions(options, subProgram);
		addPluginOptions(requiredOptions, subProgram, true);
	});
	const engines = options.encryptHandlers.map((e) => e.triggerOptionValue);
	const encryptionEngineNames = options.encryptHandlers.map(
		(e) => e.encryptionEngineName,
	);

	subProgram.option(
		"--engine <engine>",
		`Encryption engine${engines.length > 0 ? "s" : ""}: ${
			engines.length === 1 ? engines[0] : engines.join(", ")
		}`,
		engines.length === 1 ? engines[0] : undefined,
	);
	setProgramOptions({ program: subProgram, dotsecConfig });
	subProgram.description(
		`Encrypt .env file using ${encryptionEngineNames.join(", ")}`,
	);
	return subProgram;
};

export default addEncryptProgram;
