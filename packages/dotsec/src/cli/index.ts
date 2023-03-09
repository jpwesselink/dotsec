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
	const configFile =
		[
			...(Array.isArray(parsedOptions.configFile)
				? parsedOptions.configFile
				: [parsedOptions.configFile]),
			...(Array.isArray(parsedOptions.c) ? parsedOptions.c : [parsedOptions.c]),
		]?.[0] || process.env.DOTSEC_CONFIG_FILE;

	const { contents: dotsecConfig = {} } = await getMagicalConfig(configFile);
	const { defaults = {}, push: pushVariables, plugins } = dotsecConfig;
	program
		.name("dotsec")
		.description(".env, but secure")
		.version("1.0.0")
		.enablePositionalOptions()
		.action((_options, other: Command) => {
			other.help();
		});
	setProgramOptions({ program, dotsecConfig: dotsecConfig });
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

	// check plugins
	if (plugins) {
		for (const pluginName of plugins) {
			if (!defaults?.plugins?.[pluginName]) {
				defaults.plugins = {
					...defaults.plugins,
					[pluginName]: {},
				};
			}
		}
	}

	// check argv
	if (argvPluginModules.length > 0) {
		for (const pluginModule of argvPluginModules) {
			// let's load em up
			const plugin = await loadDotsecPlugin({ name: pluginModule });

			// good, let's fire 'em up
			const loadedPlugin = await plugin({
				dotsecConfig: dotsecConfig,
				ajv,
				configFile,
			});
			pluginModules[loadedPlugin.name] = pluginModule;

			if (argvPluginModules.length === 1) {
				// if we only have one plugin, let's set it as the default
				dotsecConfig.defaults = {
					...dotsecConfig.defaults,
					encryptionEngine: String(loadedPlugin.name),
					plugins: {
						...dotsecConfig.defaults?.plugins,
						[loadedPlugin.name]: {
							...dotsecConfig.defaults?.plugins?.[loadedPlugin.name],
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
				if (pluginModule?.name) {
					pluginModules[pluginName] = pluginModule?.name;
				} else {
					pluginModules[pluginName] = `@dotsec/plugin-${pluginName}`;
				}
			},
		);
	}

	Object.values(pushVariables || {}).forEach((pushVariable) => {
		Object.keys(pushVariable).forEach((pluginName) => {
			if (!pluginModules[pluginName]) {
				pluginModules[pluginName] = `@dotsec/plugin-${pluginName}`;
			}
		});
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
			dotsecConfig: dotsecConfig,
			configFile,
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
			dotsecConfig: dotsecConfig,
			encryptHandlers: cliPluginEncryptHandlers,
		});
	}
	if (cliPluginDecryptHandlers.length) {
		await addDecryptProgram(program, {
			dotsecConfig: dotsecConfig,
			decryptHandlers: cliPluginDecryptHandlers,
		});
	}
	if (cliPluginPushHandlers.length) {
		await addPushProgram(program, {
			dotsecConfig: dotsecConfig,
			handlers: cliPluginPushHandlers,
		});
	}

	// add other commands
	await addInitCommand(program, { dotsecConfig: dotsecConfig });
	await addRunCommand(program, {
		dotsecConfig: dotsecConfig,
		decryptHandlers: cliPluginDecryptHandlers,
	});
	await program.parse();
})();
