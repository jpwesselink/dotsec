export const v2 = "v2";

type CommonOptions = {
	[key: string]: unknown;
};
type DSPluginOptions = {
	[pluginName: string]: {
		defaultOperations?: {
			encrypt?: (commonOptions: CommonOptions) => void;
		};
	};
};

type DSPlugin<T extends DSPluginOptions> = T extends DSPluginOptions
	? T
	: never;

const awsPlugin: DSPlugin<{
	aws: {
		defaultOperations: {
			encrypt: (commonOptions: CommonOptions) => void;
		};
	};
}> = {
	aws: {
		defaultOperations: {
			encrypt: (commonOptions: CommonOptions) => console.log(commonOptions
		},
	},
};

const gcpPlugin: DSPlugin<{
	gcp: {
		defaultOperations: {
			encrypt: (commonOptions: CommonOptions) => void;
		};
	};
}> = {
	gcp: {
		defaultOperations: {
			encrypt: (commonOptions: CommonOptions) => console.log(commonOptions
		},
	},
};

export const app = <T extends DSPluginOptions>(options: {
	plugins: T extends DSPluginOptions ? DSPlugin<T> : never;
}): {
	api: { [key in keyof T]: () => void };
	capabilities: { [key in keyof T]: { encrypt: boolean } };
} => {
	const api = Object.fromEntries(
		Object.entries(options.plugins).map(([key]) => {
			return [key, () => {}];
		}),
	) as {
		[key in keyof T]: () => void;
	};

	const capabilities = Object.fromEntries(
		Object.entries(options.plugins).map(([key, plugin]) => {
			return [key, { encrypt: !!plugin.defaultOperations?.encrypt }];
		}),
	) as {
		[key in keyof T]: { encrypt: boolean };
	};

	return { api, capabilities };
};

const f = { ...awsPlugin, ...gcpPlugin };

export const mehApp = app({
	plugins: f,
});

mehApp.api.aws();

if (mehApp.capabilities.aws.encrypt) {
	mehApp.api.aws();
}
Object.keys(mehApp.api).forEach((key) => {
	mehApp.api[key]();
});
// type DefaultEncryptionOptions = {
// 	plaintext: string;
// };
// type DefaultDecryptionOptions = {
// 	ciphertext: string;
// };

// type PluginEncrypt<T extends { [key: string]: unknown }> = (
// 	defaultOptions: DefaultEncryptionOptions,
// 	options: T,
// ) => void;
// type PluginDecrypt<T extends { [key: string]: unknown }> = (
// 	defaultOptions: DefaultDecryptionOptions,
// 	options: T,
// ) => void;

// type PluginOptions = {
// 	[key: string]: {
// 		api?: {
// 			bespoke?: string;
// 			standard?: () => {
// 				encrypt?: (
// 					defaultOptions: DefaultEncryptionOptions,
// 					options?: { [key: string]: unknown },
// 				) => void;
// 				decrypt?: string;
// 			};
// 		};
// 	};
// };

// type DSPlugin<T> = T extends PluginOptions ? T : never;
// type AWSPlugin = DSPlugin<{
// 	aws: {
// 		api: {
// 			custom: string;
// 			standard: () => {
// 				encrypt: PluginEncrypt<{ awsRegion: string }>;
// 			};
// 		};
// 	};
// }>;
// type GCPPlugin = DSPlugin<{
// 	gcp: {
// 		api: {
// 			standard: () => {
// 				encrypt: () => void;
// 			};
// 		};
// 	};
// }>;
// const awsPlugin: AWSPlugin = {
// 	aws: {
// 		api: {
// 			custom: "stuff",
// 			standard: () => ({
// 				encrypt: (defaultOptions, options) => {
// 					console.log(options.awsRegion);
// 				},
// 			}),
// 		},
// 	},
// };
// const gcpPlugin: GCPPlugin = {
// 	gcp: {
// 		api: {
// 			standard: () => {
// 				console.log("initialized gcp plugin standard apis");
// 				return {
// 					encrypt: () => console.log("encrypting"),
// 				};
// 			},
// 		},
// 	},
// };

// type PluginKeys<T extends PluginOptions> = keyof T;

// export const app = <T extends PluginOptions>(options: {
// 	plugins: DSPlugin<T>[];
// }): {
// 	api: { [key in PluginKeys<T>]?: string };
// } => {
// 	const { plugins } = options;

// 	return { api: { ...standardApis } };
// };

// export const mehApp = app({ plugins: [awsPlugin, gcpPlugin] });
// console.log(mehApp);

// mehApp.api.gcp?.encrypt?.();
