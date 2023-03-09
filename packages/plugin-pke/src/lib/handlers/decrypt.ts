import { PemDotsecPluginModuleConfig } from "../../types";
import { awsEncryptionEngineFactory } from "../awsEncryptionEngineFactory";
import { InitDotsecCliPluginDecryptHandler } from "dotsec";

export const initDecryptHandler: InitDotsecCliPluginDecryptHandler<
	PemDotsecPluginModuleConfig
> = async (options) => {
	const { dotsecConfig, ajv } = options;
	return {
		encryptionEngineName: "AWS KMS",
		triggerOptionValue: "aws",
		options: {
			awsKeyAlias: [
				"--aws-key-alias, --awsKeyAlias <awsKeyAlias>",
				"AWS KMS Key Alias",
			],
			awsRegion: ["--aws-region, --awsRegion <awsRegion>", "AWS region"],
		},
		handler: async ({ ciphertext, awsKeyAlias, awsRegion }) => {
			const keyAlias =
				awsKeyAlias ||
				process.env.DOTSEC_AWS_KMS_KEY_ALIAS ||
				dotsecConfig.defaults?.plugins?.aws?.kms?.keyAlias ||
				"alias/dotsec";
			const region =
				awsRegion ||
				process.env.AWS_REGION ||
				process.env.DOTSEC_AWS_KMS_REGION ||
				dotsecConfig.defaults?.plugins?.aws?.region ||
				dotsecConfig.defaults?.plugins?.aws?.kms?.region ||
				"us-east-1";
			const encryptionPlugin = await awsEncryptionEngineFactory({
				verbose: true,
				kms: {
					keyAlias,
				},
				region,
			});

			return await encryptionPlugin.decrypt(ciphertext);
		},
	};
};
