import { Command } from "commander";
import {
	promptOverwriteIfFileExists,
	readContentsFromFile,
	writeContentsToFile,
} from "../../lib/io";
import { CliPluginEncryptHandler } from "../../lib/plugin";
import { Encrypt2CommandOptions } from "../../types";
import { strong } from "../../utils/logger";
import { setProgramOptions } from "../options";

type Formats = {
	env?: string;
	awsKeyAlias?: string;
} & Record<string, unknown>;

const addEncryptProgram = async (
	program: Command,
	options: {
		encryption: CliPluginEncryptHandler[];
	},
) => {
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
					yes,
				} = command.optsWithGlobals<Encrypt2CommandOptions>();
				const pluginCliEncrypt = Object.keys(_options).reduce<
					CliPluginEncryptHandler | undefined
				>((acc, key) => {
					if (!acc) {
						return options.encryption.find((encryption) => {
							return encryption.triggerOption === key;
						});
					}
					return acc;
				}, undefined);

				if (!pluginCliEncrypt) {
					throw new Error(
						`No encryption plugin found, available encryption engine(s): ${options.encryption
							.map((e) => `--${e.triggerOption}`)
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

	options.encryption.map((encryption) => {
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
	setProgramOptions(subProgram);

	return subProgram;
};

export default addEncryptProgram;
