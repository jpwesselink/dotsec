import { secretsManagerAvailableCases, ssmAvailableCases } from "./constants";
import { AwsCredentialIdentity } from "@aws-sdk/types";
import {
	DotsecPluginModule,
	DotsecPluginUserConfigWithNamespace,
} from "dotsec";

export type ValueAndOrigin<T, U = string> = {
	value: T;
	origin: U;
};

export type CredentialsAndOrigin = ValueAndOrigin<AwsCredentialIdentity>;
export type ProfileAndOrigin = ValueAndOrigin<string>;
export type RegionAndOrigin = ValueAndOrigin<string>;

// export type SSMPathPrefixFromEnv = FromEnv<`/${string}/`>;
// export type SecretsManagerPathPrefixFromEnv = FromEnv<`/${string}/`>;

export type SsmAvailableCases = typeof ssmAvailableCases[number];
export type SecretsManagerAvailableCases =
	typeof secretsManagerAvailableCases[number];

export type AwsSsmVariableConfig = {
	// region?: string;
	type?: "String" | "SecureString";
	name?: string;
	pathPrefix?: string;
};
export type AwsSecretsManagerVariableConfig = {
	// region?: string;
	name?: string;
	pathPrefix?: string;
};

export type AwsSsmVariableConfigOrBoolean =
	ObjectOrBoolean<AwsSsmVariableConfig>;
export type AwsSecretsManagerVariableConfigOrBoolean =
	ObjectOrBoolean<AwsSecretsManagerVariableConfig>;

export type ObjectOrBoolean<T extends { [key: string]: unknown }> = T | boolean;
export const expandObjectOrBoolean = <T extends { [key: string]: unknown }>(
	config: ObjectOrBoolean<T>,
): T => {
	return typeof config === "boolean" ? ({} as T) : config;
};

export type DotsecPluginAws = DotsecPluginUserConfigWithNamespace<{
	// plugin namespace
	aws: {
		config: {
			// default region for KMS, SSM and Secrets Manager
			// defaults to "eu-east-1"
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
		// push options
		push: {
			// SSM push options
			ssm?: AwsSsmVariableConfigOrBoolean;
			// Secrets Manager push options
			secretsManager?: AwsSecretsManagerVariableConfigOrBoolean;
		};
	};
}>;

export type DotsecPluginAwsHandlers = DotsecPluginModule<{
	plugin: DotsecPluginAws;
	// api: {
	// 	// future node api
	// 	getKmsKey: () => Promise<string>;
	// };
	cliHandlersOptions: {
		encrypt: {
			// aws?: boolean;
			awsKeyAlias?: string;
			awsRegion?: string;
		};
		decrypt: {
			// aws?: boolean;
			awsKeyAlias?: string;
			awsRegion?: string;
			awsKmsRegion?: string;
		};
		run: {
			// aws?: boolean;
			awsKeyAlias?: string;
			awsRegion?: string;
		};
		push: {
			// aws?: boolean;
			awsKeyAlias?: string;
			awsRegion?: string;
			awsSsmRegion?: string;
			awsSsmPathPrefix?: string;
			awsSsmType?: "String" | "SecureString";
			awsSsmChangeCase?: SsmAvailableCases;
			// secrets manager
			awsSecretsManagerChangeCase?: SecretsManagerAvailableCases;
			awsSecretsManagerRegion?: string;
			awsSecretsManagerPathPrefix?: string;
		};
	};
}>;

// export type DotsecPluginModuleConfig = {
// 	plugin: DotsecPluginAws;
// 	api: {
// 		// future node api
// 		getKmsKey: () => Promise<string>;
// 	};
// 	cliHandlersOptions: {
// 		encrypt: {
// 			aws?: boolean;
// 			awsKeyAlias?: string;
// 			awsRegion?: string;
// 		};
// 		decrypt: {
// 			aws?: boolean;
// 			awsKeyAlias?: string;
// 			awsRegion?: string;
// 		};
// 		run: {
// 			aws?: boolean;
// 			awsKeyAlias?: string;
// 			awsRegion?: string;
// 		};
// 		push: {
// 			aws?: boolean;
// 			awsKeyAlias?: string;
// 			awsRegion?: string;
// 		};
// 	};
// };
