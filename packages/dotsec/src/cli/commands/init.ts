import {
	promptOverwriteIfFileExists,
	readContentsFromFile,
	writeContentsToFile,
} from "../../lib/io";
import { DotsecConfig, InitCommandOptions } from "../../types";
import { Command } from "commander";

import { strong } from "../../utils/logging";
import { setProgramOptions } from "../options";
import path from "node:path";
type Formats = {
	env?: string;
	awsKeyAlias?: string;
};

const addInitProgram = async (
	program: Command,
	options: { dotsecConfig: DotsecConfig },
) => {
	const { dotsecConfig } = options;
	const subProgram = program
		.enablePositionalOptions()
		.passThroughOptions()
		.command("init")
		.action(async (_options: Formats, command: Command) => {
			const { configFile = "dotsec.config.ts", yes } =
				command.optsWithGlobals<InitCommandOptions>();
			try {
				const configTemplate = await readContentsFromFile(
					path.resolve(__dirname, "../../src/templates/dotsec.config.ts"),
				);

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
					await writeContentsToFile(configFile, configTemplate);
					console.log(`Wrote config file to ${strong(configFile)}`);
				}
			} catch (e) {
				command.error(e);
			}
		});

	setProgramOptions({ program: subProgram, dotsecConfig });

	return subProgram;
};

export default addInitProgram;
