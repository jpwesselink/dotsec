import { Command } from "commander";
import { awsEncryptionEngineFactory } from "../../lib/aws/AwsKmsEncryptionEngine";
import {
	promptOverwriteIfFileExists,
	readContentsFromFile,
	writeContentsToFile,
} from "../../lib/io";
import { EncryptionEngine, Init2CommandOptions } from "../../types";

import { getConfig } from "../../lib/config";
import { setProgramOptions } from "../options";
import { strong } from "../../utils/logger";

const addDecryptProgram = async (program: Command) => {
	const subProgram = program
		.enablePositionalOptions()
		.passThroughOptions()
		.command("decrypt")
		.action(async (_options, command: Command) => {
			const {
				configFile,
				verbose,
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
				const dotsecString = await readContentsFromFile(dotsecFilename);

				// encrypt
				const plaintext = await encryptionEngine.decrypt(dotsecString);

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
				command.error(e);
			}
		});

	setProgramOptions(subProgram);

	return subProgram;
};

export default addDecryptProgram;
