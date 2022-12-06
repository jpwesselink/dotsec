import { Command } from "commander";
import { awsEncryptionEngineFactory } from "../../lib/aws/AwsKmsEncryptionEngine";
import {
	promptOverwriteIfFileExists,
	readContentsFromFile,
	writeContentsToFile,
} from "../../lib/io";
import { EncryptionEngine, Init2CommandOptions } from "../../types";

import { getConfig } from "../../lib/config/index";
import { setProgramOptions } from "../options";
import { strong } from "../../utils/logger";

const addEncryptOldProgram = async (program: Command) => {
	const subProgram = program
		.enablePositionalOptions()
		.passThroughOptions()
		.command("encrypt")
		.action(async (_options, command: Command) => {
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
			const { contents: dotsecConfig } = await getConfig(configFile);
			try {
				let encryptionEngine: EncryptionEngine;

				encryptionEngine = await awsEncryptionEngineFactory({
					verbose,
					region:
						awsRegion ||
						process.env.AWS_REGION ||
						dotsecConfig.config?.aws?.region,
					kms: {
						keyAlias: awskeyAlias || dotsecConfig?.config?.aws?.kms?.keyAlias,
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
						)} file to ${strong(dotsecFilename)}`,
					);
				}
			} catch (e) {
				command.error(e);
			}
		});

	setProgramOptions(subProgram);

	return subProgram;
};

export default addEncryptOldProgram;
