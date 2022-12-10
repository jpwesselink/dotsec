import { secretsManagerAvailableCases } from "./constants";
import { AwsCredentialIdentity } from "@aws-sdk/types";
import { DotsecPlugin, FromEnv } from "dotsec";

export type ValueAndOrigin<T, U = string> = {
	value: T;
	origin: U;
};

export type CredentialsAndOrigin = ValueAndOrigin<AwsCredentialIdentity>;
export type ProfileAndOrigin = ValueAndOrigin<string>;
export type RegionAndOrigin = ValueAndOrigin<string>;

export type SSMPathPrefixFromEnv = FromEnv<`/${string}/`>;
export type SecretsManagerPathPrefixFromEnv = FromEnv<`/${string}/`>;

export type SSMAvailableCases =
	| "camelCase"
	| "capitalCase"
	| "constantCase"
	| "dotCase"
	| "headerCase"
	| "noCase"
	| "paramCase"
	| "pascalCase"
	| "pathCase"
	| "sentenceCase"
	| "snakeCase";
export type SecretsManagerAvailableCases =
	typeof secretsManagerAvailableCases[number];

export type DotsecPluginAws = DotsecPlugin<{
	aws: {
		config: {
			region?: string;
			kms?: {
				region?: string;
				keyAlias?: string;
			};
			ssm?: {
				region?: string;
				type?: "String" | "SecureString";
				changeCase?: SSMAvailableCases;
				pathPrefix?: SSMPathPrefixFromEnv;
			};
			secretsManager?: {
				region?: string;
				changeCase?: SecretsManagerAvailableCases;
				pathPrefix?: SecretsManagerPathPrefixFromEnv;
			};
		};
		push: {
			ssm?:
				| boolean
				| {
						// region?: string;
						type?: "String" | "SecureString";
						name?: string;
						pathPrefix?: SSMPathPrefixFromEnv;
				  };
			secretsManager?:
				| boolean
				| {
						// region?: string;
						name?: string;
						pathPrefix?: SecretsManagerPathPrefixFromEnv;
				  };
		};
	};
}>;

export type DotsecPluginModuleConfig = {
	plugin: DotsecPluginAws;
	api: {
		// future node api
		getKmsKey: () => Promise<string>;
	};
	cliHandlersOptions: {
		encrypt: {
			aws?: boolean;
			awsKeyAlias?: string;
			awsRegion?: string;
		};
		decrypt: {
			aws?: boolean;
			awsKeyAlias?: string;
			awsRegion?: string;
		};
		run: {
			aws?: boolean;
			awsKeyAlias?: string;
			awsRegion?: string;
		};
		push: {
			aws?: boolean;
			awsKeyAlias?: string;
			awsRegion?: string;
		};
	};
};
