import { Command } from "commander";

import addInitCommand from "./commands/init";
import addRunCommand from "./commands/run";
import addDecryptCommand from "./commands/decrypt";
import addEncryptCommand from "./commands/encrypt";
import addPushProgram from "./commands/push";
import { setProgramOptions } from "./options";
const program = new Command();

program
	.name("dotsec")
	.description(".env, but secure")
	.version("1.0.0")
	.enablePositionalOptions()
	.action((_options, other: Command) => {
		other.help();
	});

setProgramOptions(program);
(async () => {
	await addInitCommand(program);
	await addRunCommand(program);
	await addDecryptCommand(program);
	await addEncryptCommand(program);
	await addPushProgram(program);

	program.parse();
})();
