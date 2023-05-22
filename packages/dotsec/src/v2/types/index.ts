import { SecretsManagerAvailableCases, SsmAvailableCases } from "../constants";
import { StdioOptions } from "node:child_process";

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

export type DotsecConfig = {
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
	commands?: {
		push?: {
			to?: {
				"aws-ssm"?: (
					| string
					| {
							path?: string;
							variable: string;
							type?: "String" | "SecureString";
					  }
				)[];
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
type DotsecConfigRequired = DeepRequired<DotsecConfig>;
export type DefaultConfig = Omit<DotsecConfigRequired, "aws" | "commands"> & {
	aws: {
		region: DotsecConfigRequired["aws"]["region"];
		kms: Omit<DotsecConfigRequired["aws"]["kms"], "region"> &
			Partial<Pick<DotsecConfigRequired["aws"]["kms"], "region">>;
		ssm: Omit<DotsecConfigRequired["aws"]["ssm"], "region"> &
			Partial<Pick<DotsecConfigRequired["aws"]["ssm"], "region">>;
		secretsManager: Omit<
			DotsecConfigRequired["aws"]["secretsManager"],
			"region"
		> &
			Partial<Pick<DotsecConfigRequired["aws"]["secretsManager"], "region">>;
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
export type DecryptOptions = DotsecConfig & {
	method?: "aws-kms";
	write?: boolean;
};
