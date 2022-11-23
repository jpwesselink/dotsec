import { Command } from "commander";
import { awsEncryptionEngineFactory } from "../../lib/aws/AwsKmsEncryptionEngine";
import {
	promptOverwriteIfFileExists,
	readContentsFromFile,
	writeContentsToFile,
} from "../../lib/io";
import { EncryptionEngine, Init2CommandOptions } from "../../types";

import path from "node:path";
import { patchConfigFile } from "../../lib/transformer";
import { setProgramOptions } from "../options";
import { strong } from "../../utils/logger";
import {
	defaultConfig,
	DOTSEC_DEFAULT_AWS_KMS_KEY_ALIAS,
} from "../../constants";
type Formats = {
	env?: string;
	awsKeyAlias?: string;
};

const addInitProgram = async (program: Command) => {
	const subProgram = program
		.enablePositionalOptions()
		.passThroughOptions()
		.command("init")
		.action(async (_options: Formats, command: Command) => {
			const {
				verbose,
				configFile,
				env: dotenvFilename,
				sec: dotsecFilename,
				awskeyAlias,
				awsRegion,
				yes,
			} = command.optsWithGlobals<Init2CommandOptions>();
			// get dotsec config

			try {
				let encryptionEngine: EncryptionEngine;

				encryptionEngine = await awsEncryptionEngineFactory({
					verbose,
					region:
						awsRegion ||
						process.env.AWS_REGION ||
						defaultConfig.config?.aws?.region,
					kms: {
						keyAlias: awskeyAlias || defaultConfig?.config?.aws?.kms?.keyAlias,
					},
				});

				// get current dot env file
				const dotenvString = await readContentsFromFile(dotenvFilename);

				// encrypt
				const cipherText = await encryptionEngine.encrypt(dotenvString);

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
						)} contents file to ${strong(dotsecFilename)}`,
					);
				}

				const patchedConfigTemplate = patchConfigFile({
					configFile: path.resolve(
						__dirname,
						"../src/templates/dotsec.config.ts",
					),
					config: {
						aws: {
							kms: {
								keyAlias: awskeyAlias || DOTSEC_DEFAULT_AWS_KMS_KEY_ALIAS,
							},
							region: awsRegion || process.env.AWS_REGION,
						},
					},
				});
				const dotsecConfigOverwriteResponse = await promptOverwriteIfFileExists(
					{
						filePath: configFile,
						skip: yes,
					},
				);
				if (
					dotsecConfigOverwriteResponse === undefined ||
					dotsecConfigOverwriteResponse.overwrite === true
				) {
					await writeContentsToFile(configFile, patchedConfigTemplate);
					console.log(`Wrote config file to ${strong(configFile)}`);
				}
			} catch (e) {
				command.error(e);
			}
		});

	setProgramOptions(subProgram);

	return subProgram;
};

export default addInitProgram;
