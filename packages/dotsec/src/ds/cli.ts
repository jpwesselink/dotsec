import { Command } from "commander";

import addRunCommand from "./commands/run";
import addEncryptCommand from "./commands/encrypt";
import addDecryptCommand from "./commands/decrypt";
import { getConfig } from "../lib/config";
const program = new Command();

program
	.name("dotsec")
	.description(".env, but secure")
	.version("1.0.0")
	.enablePositionalOptions()
	.option("--verbose")
	.option("--config, <dotsec config file>")
	.action((_options, other: Command) => {
		// console.log(options);
		other.help();
	})
	.hook(
		"preSubcommand",
		async (thisCommand: Command, actionCommand: Command) => {
			const configfile = thisCommand.getOptionValue("config") as string;
			const dotsecConfig = await getConfig(configfile);

			actionCommand.setOptionValue("dotsecConfig", dotsecConfig);
			actionCommand.setOptionValue(
				"verbose",
				Boolean(thisCommand.getOptionValue("verbose")),
			);
		},
	);
addRunCommand(program);
addEncryptCommand(program);
addDecryptCommand(program);
program.parse();
