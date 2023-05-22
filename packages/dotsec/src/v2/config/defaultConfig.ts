import { DefaultConfig } from "../types";

export const defaultConfig: DefaultConfig = {
	envFile: ".env",
	secFile: ".sec",
	defaultEncryptionMethod: "aws-kms",
	aws: {
		region: "us-east-1",
		kms: {
			keyAlias: "alias/dotsec",
		},
		ssm: {
			type: "SecureString",
			changeCase: "camelCase",
			pathPrefix: "/",
		},
		secretsManager: {
			changeCase: "camelCase",
			pathPrefix: "/",
		},
	},
};
