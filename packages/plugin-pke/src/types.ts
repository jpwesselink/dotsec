import {
	DotsecPluginModule,
	DotsecPluginUserConfigWithNamespace,
} from "dotsec";

export type ObjectOrBoolean<T extends { [key: string]: unknown }> = T | boolean;
export const expandObjectOrBoolean = <T extends { [key: string]: unknown }>(
	config: ObjectOrBoolean<T>,
): T => {
	return typeof config === "boolean" ? ({} as T) : config;
};

export type DotsecPluginPKE = DotsecPluginUserConfigWithNamespace<{
	pke: {
		config: {
			publicPemFile?: string;
			privatePemFile?: string;
		};
	};
}>;

export type DotsecPluginPKEHandlers = DotsecPluginModule<{
	plugin: DotsecPluginPKE;
	// api: {
	// 	// future node api
	// 	getKmsKey: () => Promise<string>;
	// };
	cliHandlersOptions: {
		encrypt: {
			omg?: string;
			publicPemFile?: string;
			publicPem?: string;
		};
		decrypt: {
			privatePemFile?: string;
			privatePem?: string;
		};
		run: {
			publicPemFile?: string;
			privatePemFile?: string;
			publicPem?: string;
			privatePem?: string;
		};
	};
}>;
