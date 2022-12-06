import JoyCon from "joycon";
import path from "path";
import { DotsecPluginModule } from "../types";
import { loadJson } from "./json";
import { bundleRequire } from "bundle-require";
import { Command } from "commander";
import Ajv from "ajv";

export type DotsecAwsPlugin = DotsecPluginModule<{
	validateKms: () => Promise<boolean>;
}>;

export type DotseGithubPlugin = DotsecPluginModule<{
	storeOrganisationSecret: () => boolean;
	storeRepositorySecret: () => void;
}>;
export const DOTSEC_DEFAULT_CONFIG_FILE = "dotsec.config.ts";
export const DOTSEC_CONFIG_FILES = [DOTSEC_DEFAULT_CONFIG_FILE];
export const DOTSEC_DEFAULT_DOTSEC_FILENAME = ".sec";
export const DOTSEC_DEFAULT_DOTENV_FILENAME = ".env";
export const DOTSEC_DEFAULT_AWS_KMS_KEY_ALIAS = "alias/dotsec";
export const DOTSEC_DEFAULT_AWS_SSM_PARAMETER_TYPE = "SecureString";
export const defaultConfig: MagicalDotsecConfig = {};

export type DotsecCliOption =
	| [
			flags: string,
			description?: string,
			defaultValue?: string | boolean | string[],
	  ]
	| [
			flags: string,
			description: string,
			fn: (value: string, previous: unknown) => unknown,
			defaultValue?: unknown,
	  ]
	| [
			flags: string,
			description: string,
			regexp: RegExp,
			defaultValue?: string | boolean | string[],
	  ];

export type CliPluginHandler<
	HandlerArgs extends Record<string, unknown>,
	HandlerResult,
	T extends Record<string, unknown> = Record<string, unknown>,
> = {
	triggerOption: string;
	options?: {
		[key in keyof T]: DotsecCliOption;
	};
	requiredOptions?: {
		[key in keyof T]: DotsecCliOption;
	};
	handler: (options: HandlerArgs & T) => Promise<HandlerResult>;
};

export type CliPluginEncryptHandler<
	HandlerPluginArgs extends Record<string, unknown> = Record<string, unknown>,
> = CliPluginHandler<{ plaintext: string }, string, HandlerPluginArgs>;

export type CliPluginDecryptHandler<
	HandlerPluginArgs extends Record<string, unknown> = Record<string, unknown>,
> = CliPluginHandler<{ ciphertext: string }, string, HandlerPluginArgs>;

export type CliPluginRunHandler<
	HandlerPluginArgs extends Record<string, unknown> = Record<string, unknown>,
> = CliPluginHandler<{ ciphertext: string }, string, HandlerPluginArgs>;

// export type PluginCliEncryptHandler<
// 	T extends Record<string, unknown> = Record<string, unknown>,
// > = {
// 	triggerOption: string;
// 	options?: {
// 		[key in keyof T]: DotsecCliOption;
// 	};
// 	requiredOptions?: {
// 		[key in keyof T]: DotsecCliOption;
// 	};
// 	handler: (
// 		options: {
// 			plaintext: string;
// 		} & T,
// 	) => Promise<string>;
// };
// export type PluginCliDecryptHandler<
// 	T extends Record<string, unknown> = Record<string, unknown>,
// > = {
// 	triggerOption: string;
// 	options?: {
// 		[key in keyof T]: DotsecCliOption;
// 	};
// 	requiredOptions?: {
// 		[kkey in keyof T]: DotsecCliOption;
// 	};
// 	handler: (
// 		options: {
// 			ciphertext: string;
// 		} & T,
// 	) => Promise<string>;
// };
export type MagicalDotsecPluginModule<
	T extends {
		plugin: MagicalDotsecPlugin;
		api?: Record<string, unknown>;
		cliHandlers?: {
			encrypt?: Record<string, unknown>;
			decrypt?: Record<string, unknown>;
			run?: Record<string, unknown>;
		};
	} = {
		plugin: MagicalDotsecPlugin;
		api?: Record<string, unknown>;
		cliHandlers?: {
			encrypt?: Record<string, unknown>;
			decrypt?: Record<string, unknown>;
			run?: Record<string, unknown>;
		};
	},
> = (options: { dotsecConfig: MagicalDotsecConfig; ajv: Ajv }) => Promise<{
	name: keyof T["plugin"];
	api: T["api"] extends Record<string, unknown> ? T["api"] : never;
	addCliCommand?: (options: {
		program: Command;
	}) => Promise<void>;
	cliHandlers?: {
		encrypt?: CliPluginEncryptHandler<
			T["cliHandlers"] extends { encrypt: Record<string, unknown> }
				? T["cliHandlers"]["encrypt"]
				: Record<string, unknown>
		>;
		decrypt?: CliPluginDecryptHandler<
			T["cliHandlers"] extends { decrypt: Record<string, unknown> }
				? T["cliHandlers"]["decrypt"]
				: Record<string, unknown>
		>;
		run?: CliPluginRunHandler<
			T["cliHandlers"] extends { run: Record<string, unknown> }
				? T["cliHandlers"]["run"]
				: Record<string, unknown>
		>;
		push?: {
			options: [string, string];
			handler: () => Promise<void>;
		}[];
	};
}>;

export const loadDotsecPlugin = async (options: {
	name: string;
}): Promise<MagicalDotsecPluginModule> => {
	const p = import(options.name).then((imported) => {
		return imported.default;
	});
	return p;
};
// Dotsec config file
export type MagicalDotsecConfigAndSource = {
	source: "json" | "ts" | "defaultConfig";
	contents: MagicalDotsecConfig;
};

export const getMagicalConfig = async (
	filename?: string,
): Promise<MagicalDotsecConfigAndSource> => {
	const cwd = process.cwd();
	const configJoycon = new JoyCon();
	const configPath = await configJoycon.resolve({
		files: filename ? [filename] : [...DOTSEC_CONFIG_FILES, "package.json"],
		cwd,
		stopDir: path.parse(cwd).root,
		packageKey: "dotsec",
	});
	if (filename && configPath === null) {
		throw new Error(`Could not find config file ${filename}`);
	}
	if (configPath) {
		if (configPath.endsWith(".json")) {
			const rawData = (await loadJson(
				configPath,
			)) as Partial<MagicalDotsecConfig>;

			let data: Partial<MagicalDotsecConfig>;

			if (
				configPath.endsWith("package.json") &&
				(rawData as { dotsec: Partial<MagicalDotsecConfig> }).dotsec !==
					undefined
			) {
				data = (rawData as { dotsec: Partial<MagicalDotsecConfig> }).dotsec;
			} else {
				data = rawData as Partial<MagicalDotsecConfig>;
			}

			return {
				source: "json",
				contents: {
					...defaultConfig,
					...data,
					plugins: {
						...data?.plugins,
						...defaultConfig.plugins,
					},
					variables: {
						...data?.variables,
					},
				},
			};
		} else if (configPath.endsWith(".ts")) {
			const bundleRequireResult = await bundleRequire({
				filepath: configPath,
			});
			const data = (bundleRequireResult.mod.dotsec ||
				bundleRequireResult.mod.default ||
				bundleRequireResult.mod) as Partial<MagicalDotsecConfig>;

			return {
				source: "ts",
				contents: {
					...defaultConfig,
					...data,
					plugins: {
						...data?.plugins,
						...defaultConfig.plugins,
					},
					variables: {
						...data?.variables,
					},
				},
			};
		}
	}

	return { source: "defaultConfig", contents: defaultConfig };
};

export type MagicalDotsecPluginConfig = {
	module?: string;
	config?: { [key: string]: unknown };
	push?: { [key: string]: unknown };
};

export type MagicalDotsecPlugin<
	T extends {
		[key: string]: MagicalDotsecPluginConfig;
	} = {
		[key: string]: MagicalDotsecPluginConfig;
	},
> = T;
export type MagicalDotsecPlugins = {
	plugins: MagicalDotsecPlugin;
};

export type MagicalDotsecConfig<
	T extends MagicalDotsecPlugins = { plugins: {} },
> = {
	plugins?: {
		[PluginKey in keyof T["plugins"]]?: {
			module?: T["plugins"][PluginKey]["module"];
		} & T["plugins"][PluginKey]["config"];
	};
	push?: {
		variables?: string[];
		to: {
			[PluginKey in keyof T["plugins"]]?: T["plugins"][PluginKey]["push"];
		};
	};
	variables?: {
		[key: string]: {
			push?: {
				[PluginKey in keyof T["plugins"]]?: T["plugins"][PluginKey]["push"];
				// [PluginKey in keyof T["plugins"]]?: T["plugins"][PluginKey]["push"];
			};
		};
	};
};

// type F = MagicalDotsecConfig<{
// 	plugins: {
// 		aws: {
// 			module: string;
// 			config: { region: string };
// 			push: { ssm?: boolean };
// 		};
// 	};
// }>;

// const f: F = {
// 	plugins: {
// 		aws: {
// 			module: "@dotsec/plugin-aws",
// 			config: {
// 				region: "eu-west-1",
// 			},
// 		},
// 	},
// 	variables: {
// 		OMG: {
// 			push: {
// 				aws: {
// 					ssm: true,
// 				},
// 			},
// 		},
// 	},
// };
