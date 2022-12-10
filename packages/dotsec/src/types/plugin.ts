import { DotsecConfig } from "./config";
import Ajv from "ajv";
import { Command } from "commander";

export type DotsecCliPluginHandler<
	HandlerArgs extends Record<string, unknown>,
	HandlerResult,
	T extends Record<string, unknown> = Record<string, unknown>,
> = {
	encryptionEngineName?: string;
	triggerOptionValue: string;
	options?: {
		[key in keyof T]: DotsecCliOption;
	};
	requiredOptions?: {
		[key in keyof T]: DotsecCliOption;
	};
	handler: (options: HandlerArgs & T) => Promise<HandlerResult>;
};

export type DotsecCliPluginEncryptHandler<
	HandlerPluginArgs extends Record<string, unknown> = Record<string, unknown>,
> = DotsecCliPluginHandler<{ plaintext: string }, string, HandlerPluginArgs>;

export type DotsecCliPluginDecryptHandler<
	HandlerPluginArgs extends Record<string, unknown> = Record<string, unknown>,
> = DotsecCliPluginHandler<{ ciphertext: string }, string, HandlerPluginArgs>;

export type DotsecCliPluginRunHandler<
	HandlerPluginArgs extends Record<string, unknown> = Record<string, unknown>,
> = DotsecCliPluginHandler<{ ciphertext: string }, string, HandlerPluginArgs>;

export type DotsecCliPluginPushHandler<
	HandlerPluginArgs extends Record<string, unknown> = Record<string, unknown>,
> = DotsecCliPluginHandler<
	{ variables: Record<string, string>; yes?: boolean },
	string,
	HandlerPluginArgs
>;

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

// Dotsec config file
export type DotsecConfigAndSource = {
	source: "json" | "ts" | "defaultConfig";
	contents: DotsecConfig;
};

export type DotsecPluginConfig = {
	module?: string;
	config?: { [key: string]: unknown };
	push?: { [key: string]: unknown };
};

export type DotsecPlugins = {
	plugins: DotsecPlugin;
};

export type DotsecPluginModuleConfig = {
	plugin: DotsecPlugin;
	api?: Record<string, unknown>;
	cliHandlersOptions?: {
		encrypt?: Record<string, unknown>;
		decrypt?: Record<string, unknown>;
		run?: Record<string, unknown>;
		push?: Record<string, unknown>;
	};
};

export type DotsecPluginModule<
	T extends DotsecPluginModuleConfig = DotsecPluginModuleConfig,
> = (options: { dotsecConfig: DotsecConfig; ajv: Ajv }) => Promise<{
	name: keyof T["plugin"] | string;
	encryptionEngineName?: string;
	api: T["api"] extends Record<string, unknown> ? T["api"] : never;
	addCliCommand?: (options: {
		program: Command;
	}) => Promise<void>;
	cliHandlers?: {
		encrypt?: DotsecCliPluginEncryptHandler<
			T["cliHandlersOptions"] extends { encrypt: Record<string, unknown> }
				? T["cliHandlersOptions"]["encrypt"]
				: Record<string, unknown>
		>;
		decrypt?: DotsecCliPluginDecryptHandler<
			T["cliHandlersOptions"] extends { decrypt: Record<string, unknown> }
				? T["cliHandlersOptions"]["decrypt"]
				: Record<string, unknown>
		>;
		run?: DotsecCliPluginRunHandler<
			T["cliHandlersOptions"] extends { run: Record<string, unknown> }
				? T["cliHandlersOptions"]["run"]
				: Record<string, unknown>
		>;
		push?: DotsecCliPluginPushHandler<
			T["cliHandlersOptions"] extends { push: Record<string, unknown> }
				? T["cliHandlersOptions"]["push"]
				: Record<string, unknown>
		>;
	};
}>;

export type DotsecPlugin<
	T extends {
		[key: string]: DotsecPluginConfig;
	} = {
		[key: string]: DotsecPluginConfig;
	},
> = T;