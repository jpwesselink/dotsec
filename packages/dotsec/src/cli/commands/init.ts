import { promptOverwriteIfFileExists, writeContentsToFile } from "../../lib/io";
import { InitCommandOptions } from "../../types";
import { Command } from "commander";

import { patchConfigFile } from "../../lib/transformer";
import { strong } from "../../utils/logging";
import { setProgramOptions } from "../options";
import path from "node:path";
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
			const { configFile, yes } = command.optsWithGlobals<InitCommandOptions>();

			try {
				const patchedConfigTemplate = patchConfigFile({
					configFile: path.resolve(
						__dirname,
						"../../src/templates/dotsec.config.ts",
					),
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
