import { PutParameterRequest } from "@aws-sdk/client-ssm";
import { Command } from "commander";

// type Replace<
// 	Source,
// 	Needle extends String,
// 	Replacement,
// > = Source extends Record<string, unknown>
// 	? {
// 			[key in keyof Source]: key extends Needle
// 				? Replacement
// 				: Replace<Source[key], Needle, Replacement>;
// 	  }
// 	: Source;

// utility types
export type DeepPartial<T> = T extends object
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
	  }
	: T;

export type EncryptionEngineFactoryProps = { verbose?: boolean };
export type EncryptionEngine<T = {}> = {
	encrypt(plaintext: string): Promise<string>;
	decrypt(ciphertext: string): Promise<string>;
} & T;

export type EncryptionEngineFactory<
	T = {},
	V extends Record<string, unknown> = {},
> = {
	(options: EncryptionEngineFactoryProps & T): Promise<EncryptionEngine<V>>;
};

export abstract class EncryptionPlugin {
	protected verbose: boolean | undefined;
	constructor(options: EncryptionEngineFactoryProps) {
		this.verbose = options?.verbose;
	}
	abstract encrypt(plaintext: string): Promise<string>;
	abstract decrypt(ciphertext: string): Promise<string>;
}

type DotsecPlugin = {
	[key: string]: {
		plugin?: {
			module?: string;
		};
		config: {
			[key: string]: unknown;
		};
		push: Record<string, unknown>;
	};
};

type DotsecVariables = Record<string, DotsecVariable | boolean>;
export type DotsecConfigOptions = {
	plugins?: DotsecPlugin;
	variables?: DotsecVariables;
};
type DotSecVariableWithPlugin<
	Variable extends DotsecVariable,
	Plugins extends DotsecPlugin,
> = {
	push?: {
		[key in keyof DotsecAwsPlugin]?: DotsecAwsPlugin[key]["push"];
	} & {
		[key in keyof DotsecGitHubPlugin]?: DotsecGitHubPlugin[key]["push"];
	} & Variable["push"] & {
			[key in keyof Plugins]?: Plugins[key]["push"];
		};
};

export type DotsecVariable = {
	push?: {};
};

export type DotsecAwsPlugin = {
	aws: {
		config: {
			region?: string;
			kms?: {
				keyAlias?: string;
				encryptionAlgorithm?:
					| "RSAES_OAEP_SHA_1"
					| "RSAES_OAEP_SHA_256"
					| "SYMMETRIC_DEFAULT";
			};
			ssm?: {
				pathPrefix?: string;
				parameterType?: "String" | "SecureString";
			};
			secretsManager?: {
				pathPrefix?: string;
			};
		};
		push: {
			ssm?:
				| boolean
				| (Omit<PutParameterRequest, "Name" | "Value"> & {
						Name?: string;
				  });
			secretsManager?: boolean;
		};
	};
};
export type DotsecGitHubPlugin = {
	github: {
		config: {
			personalAccessToken?: string | { fromEnv: string };
		};
		push: {
			actionsSecrets: {
				organisations?: [{ secretName?: string; organisation: string }];
			};
		};
	};
};

export type DotsecConfig<T extends DotsecConfigOptions = DotsecConfigOptions> =
	{
		config?: // (

		{
			[key in keyof DotsecPlugin]?: DotsecPlugin[key]["config"];
		} & {
			[key in keyof DotsecAwsPlugin]?: DotsecAwsPlugin[key]["config"];
		} & {
			[key in keyof DotsecGitHubPlugin]?: DotsecGitHubPlugin[key]["config"];
		} & {
			// aws?: {
			// 	region?: string;
			// 	kms?: {
			// 		keyAlias?: string;
			// 		encryptionAlgorithm?:
			// 			| "RSAES_OAEP_SHA_1"
			// 			| "RSAES_OAEP_SHA_256"
			// 			| "SYMMETRIC_DEFAULT";
			// 	};
			// 	ssm?: {
			// 		pathPrefix?: string;
			// 		parameterType?: "String" | "SecureString";
			// 	};
			// 	secretsManager?: {
			// 		pathPrefix?: string;
			// 	};
			// };
			// github?: {
			// 	personalAccessToken:
			// 		| {
			// 				value: string;
			// 				fromEnv?: never;
			// 		  }
			// 		| {
			// 				value?: never;
			// 				fromEnv: keyof T["variables"];
			// 		  };
			// };
		};
		variables?: {
			[key in keyof T["variables"]]: T["variables"][key] extends DotsecVariable
				? DotSecVariableWithPlugin<
						T["variables"][key],
						T["plugins"] extends DotsecPlugin ? T["plugins"] : never
				  >
				: DotSecVariableWithPlugin<
						DotsecVariable,
						T["plugins"] extends DotsecPlugin ? T["plugins"] : never
				  >;
		};
	};

// Dotsec config file
export type DotsecConfigAndSource = {
	source: "json" | "ts" | "defaultConfig";
	contents: DotsecConfig;
};

// CLI types
export type GlobalCommandOptions = {
	configFile: string;
	verbose: false;
};

export type Init2CommandOptions = {
	configFile: string;
	verbose: false;
	env: string;
	sec: string;
	yes: boolean;
	awskeyAlias: string;
	awsRegion?: string;
	// performInit: (encryptionEngine: EncryptionEngine) => Promise<void>;
};
export type Encrypt2CommandOptions = {
	verbose: false;
	env: string;
	sec: string;
	yes: boolean;
	// performInit: (encryptionEngine: EncryptionEngine) => Promise<void>;
};
export type Decrypt2CommandOptions = {
	verbose: false;
	env: string;
	sec: string;
	yes: boolean;
	// performInit: (encryptionEngine: EncryptionEngine) => Promise<void>;
};

export type RunCommandOptions = GlobalCommandOptions & {
	env?: string;
	sec?: string;
	keyAlias?: string;
	region?: string;
};

export type PushCommandOptions = {
	configFile: string;
	verbose: false;
	env: string | boolean;
	sec: string | boolean;
	yes: boolean;
	awskeyAlias: string;
	awsRegion?: string;
	toAwsSsm?: boolean;
	toAwsSecretsManager?: boolean;
	toGitHubActionsSecrets?: boolean;
};

export const isString = (value: unknown): value is string => {
	return typeof value === "string";
};

export const isNumber = (value: unknown): value is number => {
	return typeof value === "number";
};
export const isBoolean = (value: unknown): value is boolean => {
	return typeof value === "boolean";
};

export type DotsecPluginModule<
	T extends Record<string, unknown> = Record<string, unknown>,
> = {
	name: string;
	init: (dotsecConfig: DotsecConfig) => Promise<T>;
	addCliCommand?: (options: {
		dotsecConfig: DotsecConfig;
		program: Command;
	}) => void;
};
