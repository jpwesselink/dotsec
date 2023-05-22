import { SecretsManagerAvailableCases, SsmAvailableCases } from "../constants";
import { DotenvParseOutput } from "dotenv";
import { StdioOptions } from "node:child_process";
import { Result } from "ts-results-es";

export type NotNill<T> = T extends null | undefined ? never : T;

type Primitive =
	| undefined
	| null
	| boolean
	| string
	| number
	| ((...args: unknown[]) => unknown);

export type DeepRequired<T> = T extends Primitive
	? NotNill<T>
	: {
			[P in keyof T]-?: T[P] extends Array<infer U>
				? Array<DeepRequired<U>>
				: T[P] extends ReadonlyArray<infer U2>
				? DeepRequired<U2>
				: DeepRequired<T[P]>;
	  };

export type AwsSsmExpandedPushValue = {
	changeCase?: SsmAvailableCases;
	path?: string;
	variable: string;
	type?: "String" | "SecureString";
};
export type AwsSsmPushValue = string | AwsSsmExpandedPushValue;
export type DotsecConfig = {
	defaults?: {
		envFile?: string;
		secFile?: string;
		defaultEncryptionMethod?: "aws-kms";
		aws?: {
			region?: string;
			// KMS options
			kms?: {
				// KMS region, overrides aws.region
				region?: string;
				// KMS key alias, defaults to "alias/dotsec"
				keyAlias?: string;
			};
			ssm?: {
				// SSM region, overrides aws.region
				region?: string;
				// SSM type, defaults to "SecureString"
				type?: "String" | "SecureString";
				// SSM change case, when set, the variable name will be converted to the specified case
				changeCase?: SsmAvailableCases;
				// SSM path prefix, defaults to "/"
				pathPrefix?: string;
			};
			// Secrets Manager options
			secretsManager?: {
				// Secrets Manager region, overrides aws.region
				region?: string;
				// Secrets Manager change case, when set, the variable name will be converted to the specified case
				changeCase?: SecretsManagerAvailableCases;
				// Secrets Manager path prefix, defaults to "/"
				pathPrefix?: string;
			};
		};
	};
	commands?: {
		push?: {
			to?: {
				"aws-ssm"?: AwsSsmPushValue[];
				"aws-secrets-manager"?: (
					| string
					| {
							path?: string;
							variable: string;
					  }
				)[];
			};
			// variables?: {
			// 	[key: string]:
			// 		| string
			// 		| number
			// 		| boolean
			// 		| null
			// 		| undefined
			// 		| (
			// 				| {
			// 						target: "aws-ssm";
			// 						type?: "String" | "SecureString";
			// 						value: string | number | boolean | null | undefined;
			// 				  }
			// 				| {
			// 						target: "aws-secrets-manager";
			// 						type?: never;
			// 						value: string | number | boolean | null | undefined;
			// 				  }
			// 		  );
			// };
		};
	};
};

export type JSONSchemaDotsecConfig = DotsecConfig & { $schema: string };

export type CreateConfig = (
	...userConfigs: Array<DotsecConfig | DefaultConfig | undefined>
) => Result<
	{
		config: DefaultConfig;

		mergeConfig: CreateConfig;
	},
	string
>;

// type DotsecConfigRequired = DeepRequired<DotsecConfig>;
// export type DefaultCDDonfig = Omit<DotsecConfigRequired, "aws" | "commands"> & {
// 	aws: {
// 		region: DotsecConfigRequired["aws"]["region"];
// 		kms: Omit<DotsecConfigRequired["aws"]["kms"], "region"> &
// 			Partial<Pick<DotsecConfigRequired["aws"]["kms"], "region">>;
// 		ssm: Omit<DotsecConfigRequired["aws"]["ssm"], "region"> &
// 			Partial<Pick<DotsecConfigRequired["aws"]["ssm"], "region">>;
// 		secretsManager: Omit<
// 			DotsecConfigRequired["aws"]["secretsManager"],
// 			"region"
// 		> &
// 			Partial<Pick<DotsecConfigRequired["aws"]["secretsManager"], "region">>;
// 	};
// 	commands?: DotsecConfig["commands"];
// };

export type DefaultsAwsSsm = {
	region?: string;
	type: "String" | "SecureString";
	changeCase: SsmAvailableCases;
	pathPrefix: string;
};
export type DefaultConfig = {
	defaults: {
		envFile: string;
		secFile: string;
		defaultEncryptionMethod: "aws-kms";
		aws: {
			region: string;
			kms: {
				region?: string;
				keyAlias: string;
			};
			ssm: DefaultsAwsSsm;
			secretsManager: {
				region?: string;
				changeCase: SecretsManagerAvailableCases;
				pathPrefix: string;
			};
		};
	};

	commands?: DotsecConfig["commands"];
};

export type RunOptions = DotsecConfig & {
	using: "env" | "sec";
	method?: "aws-kms";
	command: string;
	stdIoOptions?: StdioOptions;
};
export type PushOptions = DotsecConfig & {
	using: "env" | "sec";
	method?: "aws-kms";
};

export type CommandParams = {
	config?: DotsecConfig;
	configFile?: string;
	verbose?: boolean;
};

export type EncryptOptions = DotsecConfig & {
	method?: "aws-kms";
	write?: boolean;
};

export type ConfigureDecrypt = (mergeConfig: CreateConfig) => Decrypt;
export type Decrypt = (decryptOptions?: DecryptOptions | undefined) => Promise<{
	write: () => Promise<void>;
	parsed: DotenvParseOutput;
	expanded: {
		[name: string]: string;
	};
	plaintext: string;
	config: DefaultConfig;
}>;
export type DecryptOptions = DotsecConfig & {
	method?: "aws-kms";
	write?: boolean;
};
