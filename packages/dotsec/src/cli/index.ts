import { Command } from "commander";

import addInitCommand from "./commands/init";
import addRunCommand from "./commands/run2";
import addPushProgram from "./commands/push";
import addEncryptProgram from "./commands/encrypt";
import addDecryptProgram from "./commands/decrypt";
import { setProgramOptions } from "./options";
import {
	getMagicalConfig,
	loadDotsecPlugin,
	MagicalDotsecPluginConfig,
	CliPluginDecryptHandler,
	CliPluginEncryptHandler,
	CliPluginRunHandler,
} from "../lib/plugin";
import Ajv, { KeywordDefinition } from "ajv";

const separator: KeywordDefinition = {
	keyword: "separator",
	type: "string",
	metaSchema: {
		type: "string",
		description: "value separator",
	},
	modifying: true,
	valid: true,
	errors: false,
	compile: (schema) => (data, ctx) => {
		if (ctx) {
			const { parentData, parentDataProperty } = ctx;
			parentData[parentDataProperty] = data === "" ? [] : data.split(schema);
			return true;
		} else {
			return false;
		}
	},
};

const program = new Command();

(async () => {
	// find -c value in argv
	const configArg = process.argv.find((arg) => arg.startsWith("-c"));
	// if -c contains a =, split it and get the value. otherwise, take the next value
	const configFile = configArg
		? configArg.includes("=")
			? configArg.split("=")[1]
			: process.argv[process.argv.indexOf(configArg) + 1]
		: undefined;
	const { contents: config = {} } = await getMagicalConfig(configFile);
	const { plugins, variables } = config;

	program
		.name("dotsec")
		.description(".env, but secure")
		.version("1.0.0")
		.enablePositionalOptions()
		.action((_options, other: Command) => {
			other.help();
		});

	setProgramOptions(program);

	const pluginModules: { [key: string]: string } = {};
	if (plugins) {
		Object.entries(plugins).forEach(
			([pluginName, pluginModule]: [string, MagicalDotsecPluginConfig]) => {
				if (pluginModule?.module) {
					pluginModules[pluginName] = pluginModule?.module;
				}
			},
		);
	}
	Object.values(variables || {}).forEach((variable) => {
		if (variable?.push) {
			Object.keys(variable.push).forEach((pluginName) => {
				if (!pluginModules[pluginName]) {
					pluginModules[pluginName] = `@dotsec/plugin-${pluginName}`;
				}
			});
		}
	});

	const ajv = new Ajv({
		allErrors: true,
		removeAdditional: true,
		useDefaults: true,
		coerceTypes: true,
		allowUnionTypes: true,
		addUsedSchema: false,
		keywords: [separator],
	});

	// configure encryption command
	const cliPluginEncryptHandlers: CliPluginEncryptHandler[] = [];
	const cliPluginDecryptHandlers: CliPluginDecryptHandler[] = [];
	const cliPluginRunHandlers: CliPluginRunHandler[] = [];

	for (const pluginName of Object.keys(pluginModules)) {
		const pluginModule = pluginModules[pluginName];
		const initDotsecPlugin = await loadDotsecPlugin({ name: pluginModule });
		const { addCliCommand, cliHandlers: cli } = await initDotsecPlugin({
			ajv,
			dotsecConfig: config,
		});

		if (cli?.encrypt) {
			cliPluginEncryptHandlers.push(cli.encrypt);
		}
		if (cli?.decrypt) {
			cliPluginDecryptHandlers.push(cli.decrypt);
		}
		if (cli?.run) {
			cliPluginRunHandlers.push(cli.run);
		}
		if (addCliCommand) {
			addCliCommand({ program });
		}
	}
	if (cliPluginEncryptHandlers.length) {
		await addEncryptProgram(program, {
			encryption: cliPluginEncryptHandlers,
		});
	}
	if (cliPluginDecryptHandlers.length) {
		await addDecryptProgram(program, {
			decryption: cliPluginDecryptHandlers,
		});
	}

	// add other commands
	await addInitCommand(program);
	await addRunCommand(program, { run: cliPluginRunHandlers });
	// await addDecryptCommand(program);
	// await addEncryptCommand(program);
	await addPushProgram(program);
	await program.parse();
})();
