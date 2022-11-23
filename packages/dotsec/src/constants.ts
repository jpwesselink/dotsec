import { DotsecConfig } from "./types";

export const DOTSEC_DEFAULT_CONFIG_FILE = "dotsec.config.ts";
export const DOTSEC_CONFIG_FILES = [DOTSEC_DEFAULT_CONFIG_FILE];
export const DOTSEC_DEFAULT_DOTSEC_FILENAME = ".sec";
export const DOTSEC_DEFAULT_DOTENV_FILENAME = ".env";
export const DOTSEC_DEFAULT_AWS_KMS_KEY_ALIAS = "alias/dotsec";
export const DOTSEC_DEFAULT_AWS_SSM_PARAMETER_TYPE = "SecureString";

export const defaultConfig: DotsecConfig = {
	config: {
		aws: {
			kms: {
				keyAlias: DOTSEC_DEFAULT_AWS_KMS_KEY_ALIAS,
			},
			ssm: {
				parameterType: DOTSEC_DEFAULT_AWS_SSM_PARAMETER_TYPE,
			},
		},
	},
};
