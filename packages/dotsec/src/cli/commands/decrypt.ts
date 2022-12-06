import { Command } from "commander";
import {
	promptOverwriteIfFileExists,
	readContentsFromFile,
	writeContentsToFile,
} from "../../lib/io";
import { CliPluginDecryptHandler } from "../../lib/plugin";
import { Decrypt2CommandOptions } from "../../types";
import { strong } from "../../utils/logger";
import { setProgramOptions } from "../options";

type Formats = {
	env?: string;
	awsKeyAlias?: string;
} & Record<string, unknown>;

const addEncryptProgram = async (
	program: Command,
	options: {
		decryption: CliPluginDecryptHandler[];
	},
) => {
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
					yes,
				} = command.optsWithGlobals<Decrypt2CommandOptions>();

				const pluginCliDecrypt = Object.keys(_options).reduce<
					CliPluginDecryptHandler | undefined
				>((acc, key) => {
					if (!acc) {
						return options.decryption.find((encryption) => {
							return encryption.triggerOption === key;
						});
					}
					return acc;
				}, undefined);

				if (!pluginCliDecrypt) {
					throw new Error(
						`No decryption plugin found, available decryption engine(s): ${options.decryption
							.map((e) => `--${e.triggerOption}`)
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
				console.log("dotsecFilename", dotsecFilename);
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

				console.log("plaintext", plaintext);
			} catch (e) {
				console.error(strong(e.message));
				command.help();
			}
		});

	options.decryption.map((decryption) => {
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
	setProgramOptions(subProgram);

	return subProgram;
};

export default addEncryptProgram;
