import { DotsecPlugins } from "./plugin";

export type DotsecConfig<T extends DotsecPlugins = DotsecPlugins> = {
	defaults?: {
		encryptionEngine?: keyof T["plugins"] | string;
		plugins?: {
			[PluginKey in keyof T["plugins"]]?: {
				module?: T["plugins"][PluginKey]["module"];
			} & T["plugins"][PluginKey]["config"];
		};
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
			};
		};
	};
};
