import { Command } from "commander";

import { getMagicalConfig } from "../lib/getConfig";
import { loadDotsecPlugin } from "../lib/loadDotsecPlugin";
import {
	DotsecCliPluginDecryptHandler,
	DotsecCliPluginEncryptHandler,
	DotsecCliPluginPushHandler,
	DotsecPluginConfig,
} from "../types/plugin";
import addDecryptProgram from "./commands/decrypt";
// import addPushProgram from "./commands/push";
import addEncryptProgram from "./commands/encrypt";
import addInitCommand from "./commands/init";
import addPushProgram from "./commands/push";
import addRunCommand from "./commands/run";
import { setProgramOptions } from "./options";
import Ajv, { KeywordDefinition } from "ajv";
import yargsParser from "yargs-parser";

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
	const parsedOptions = yargsParser(process.argv);
	const argvPluginModules: string[] = [];
	if (parsedOptions.plugin) {
		if (Array.isArray(parsedOptions.plugin)) {
			argvPluginModules.push(...parsedOptions.plugin);
		} else {
			argvPluginModules.push(parsedOptions.plugin);
		}
	}
	if (parsedOptions.p) {
		if (Array.isArray(parsedOptions.p)) {
			argvPluginModules.push(...parsedOptions.p);
		} else {
			argvPluginModules.push(parsedOptions.p);
		}
	}

	const configFile = [
		...(Array.isArray(parsedOptions.config)
			? parsedOptions.config
			: [parsedOptions.config]),
		...(Array.isArray(parsedOptions.c) ? parsedOptions.c : [parsedOptions.c]),
	]?.[0];

	const { contents: config = {} } = await getMagicalConfig(configFile);
	const { defaults, variables } = config;

	program
		.name("dotsec")
		.description(".env, but secure")
		.version("1.0.0")
		.enablePositionalOptions()
		.action((_options, other: Command) => {
			other.help();
		});

	setProgramOptions(program);
	const ajv = new Ajv({
		allErrors: true,
		removeAdditional: true,
		useDefaults: true,
		coerceTypes: true,
		allowUnionTypes: true,
		addUsedSchema: false,
		keywords: [separator],
	});
	// if we have plugins in the cli, we need to define them in pluginModules
	const pluginModules: { [key: string]: string } = {};
	if (argvPluginModules.length > 0) {
		for (const pluginModule of argvPluginModules) {
			// let's load em up
			const plugin = await loadDotsecPlugin({ name: pluginModule });

			// good, let's fire 'em up
			const loadedPlugin = await plugin({ dotsecConfig: config, ajv });
			pluginModules[loadedPlugin.name] = pluginModule;

			if (argvPluginModules.length === 1) {
				// if we only have one plugin, let's set it as the default
				config.defaults = {
					...config.defaults,
					encryptionEngine: String(loadedPlugin.name),
					plugins: {
						...config.defaults?.plugins,
						[loadedPlugin.name]: {
							...config.defaults?.plugins?.[loadedPlugin.name],
						},
					},
				};
			}
		}
	}

	if (defaults?.encryptionEngine) {
		if (!defaults?.plugins?.[defaults.encryptionEngine]) {
			defaults.plugins = {
				...defaults.plugins,
				[defaults.encryptionEngine]: {},
			};
		}
	}
	if (defaults?.plugins) {
		Object.entries(defaults?.plugins).forEach(
			([pluginName, pluginModule]: [string, DotsecPluginConfig]) => {
				if (pluginModule?.module) {
					pluginModules[pluginName] = pluginModule?.module;
				} else {
					pluginModules[pluginName] = `@dotsec/plugin-${pluginName}`;
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

	// configure encryption command
	const cliPluginEncryptHandlers: DotsecCliPluginEncryptHandler[] = [];
	const cliPluginDecryptHandlers: DotsecCliPluginDecryptHandler[] = [];
	const cliPluginPushHandlers: {
		push: DotsecCliPluginPushHandler;
		decrypt: DotsecCliPluginDecryptHandler;
	}[] = [];

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
			if (cli?.push) {
				cliPluginPushHandlers.push({ push: cli.push, decrypt: cli.decrypt });
			}
		}
		if (addCliCommand) {
			addCliCommand({ program });
		}
	}
	if (cliPluginEncryptHandlers.length) {
		await addEncryptProgram(program, {
			dotsecConfig: config,
			encryptHandlers: cliPluginEncryptHandlers,
		});
	}
	if (cliPluginDecryptHandlers.length) {
		await addDecryptProgram(program, {
			dotsecConfig: config,
			decryptHandlers: cliPluginDecryptHandlers,
		});
	}
	if (cliPluginPushHandlers.length) {
		await addPushProgram(program, {
			dotsecConfig: config,
			handlers: cliPluginPushHandlers,
		});
	}

	// add other commands
	await addInitCommand(program);
	await addRunCommand(program, {
		dotsecConfig: config,
		decryptHandlers: cliPluginDecryptHandlers,
	});
	// await addDecryptCommand(program);
	// await addEncryptCommand(program);
	await program.parse();
})();
