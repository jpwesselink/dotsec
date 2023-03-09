import { DotsecPlugins } from "./plugin";

export type DotsecConfig<T extends DotsecPlugins = DotsecPlugins> = {
	plugins?: Array<keyof T["plugins"]>;
	defaults?: {
		encryptionEngine?: keyof T["plugins"];
		plugins?: {
			[PluginKey in keyof T["plugins"]]?: {
				name?: T["plugins"][PluginKey]["name"];
			} & T["plugins"][PluginKey]["config"];
		};
		options?: {
			envFile?: string;
			secFile?: string;
		};
	};
	push?: {
		[key: string]: {
			[PluginKey in keyof T["plugins"]]?: T["plugins"][PluginKey]["push"];
		};
	};
};
