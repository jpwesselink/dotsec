import {
	MagicalDotsecPluginModule,
	MagicalDotsecConfig,
	MagicalDotsecPlugin,
} from "dotsec";
import { awsEncryptionEngineFactory } from "./AwsKmsEncryptionEngine";

export type DotsecPluginAws = MagicalDotsecPlugin<{
	aws: {
		config: {
			region?: string;
			kms?: {
				region?: string;
				keyAlias?: string;
			};
			ssm?: {
				region?: string;
				type: "String" | "SecureString";
				pathPrefix?: `/${string}/`;
			};
			secretsManager?: {
				region?: string;
				pathPrefix?: `/${string}/`;
			};
		};
		push: {
			ssm?:
				| boolean
				| {
						region?: string;
						type?: "String" | "SecureString";
						pathPrefix?: `/${string}/`;
				  };
			secretsManager?:
				| boolean
				| {
						region?: string;
						pathPrefix?: `/${string}/`;
				  };
		};
	};
}>;

type DotsecPluginAwsApi = {
	getKmsKey: () => Promise<string>;
};

const dotsecPluginAws: MagicalDotsecPluginModule<{
	plugin: DotsecPluginAws;
	api: DotsecPluginAwsApi;
	cliHandlers: {
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
	};
}> = async ({ dotsecConfig }) => {
	const config = dotsecConfig as MagicalDotsecConfig<{
		plugins: DotsecPluginAws;
	}>;
	// verify config

	return {
		name: "aws",
		api: {
			getKmsKey: () => {
				return Promise.resolve("123");
			},
		},
		cliHandlers: {
			encrypt: {
				triggerOption: "aws",
				options: {
					aws: ["--aws", "Encrypt with AWS KMS"],
					awsKeyAlias: [
						"--aws-key-alias, --awsKeyAlias <awsKeyAlias>",
						"AWS KMS Key Alias",
					],
					awsRegion: ["--aws-region, --awsRegion <awsRegion>", "AWS region"],
				},
				handler: async ({ plaintext, awsKeyAlias, awsRegion }) => {
					const keyAlias =
						awsKeyAlias ||
						process.env.DOTSEC_AWS_KMS_KEY_ALIAS ||
						config.plugins?.aws?.kms?.keyAlias ||
						"alias/dotsec";
					const region =
						awsRegion ||
						process.env.AWS_REGION ||
						process.env.DOTSEC_AWS_KMS_REGION ||
						config.plugins?.aws?.region ||
						config.plugins?.aws?.kms?.region ||
						"us-east-1";

					const encryptionPlugin = await awsEncryptionEngineFactory({
						verbose: true,
						kms: {
							keyAlias,
						},
						region,
					});

					return await encryptionPlugin.encrypt(plaintext);
				},
			},
			decrypt: {
				triggerOption: "aws",
				options: {
					aws: ["--aws", "Decrypt with AWS KMS"],
					awsKeyAlias: [
						"--aws-key-alias, --awsKeyAlias <awsKeyAlias>",
						"AWS KMS Key Alias",
					],
					awsRegion: ["--aws-region, --awsRegion <awsRegion>", "AWS region"],
				},
				handler: async ({ ciphertext, awsKeyAlias, awsRegion }) => {
					// get credentials
					// read config file
					const keyAlias =
						awsKeyAlias ||
						process.env.DOTSEC_AWS_KMS_KEY_ALIAS ||
						config.plugins?.aws?.kms?.keyAlias ||
						"alias/dotsec";
					const region =
						awsRegion ||
						process.env.AWS_REGION ||
						process.env.DOTSEC_AWS_KMS_REGION ||
						config.plugins?.aws?.region ||
						config.plugins?.aws?.kms?.region ||
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
			},
			run: {
				triggerOption: "aws",
				options: {
					aws: ["--aws", "Decrypt .sec file on the fly with AWS KMS"],
					awsKeyAlias: [
						"--aws-key-alias, --awsKeyAlias <awsKeyAlias>",
						"AWS KMS Key Alias",
					],
					awsRegion: ["--aws-region, --awsRegion <awsRegion>", "AWS region"],
				},
				handler: async ({ ciphertext, awsKeyAlias, awsRegion }) => {
					// get credentials
					// read config file
					const keyAlias =
						awsKeyAlias ||
						process.env.DOTSEC_AWS_KMS_KEY_ALIAS ||
						config.plugins?.aws?.kms?.keyAlias ||
						"alias/dotsec";
					const region =
						awsRegion ||
						process.env.AWS_REGION ||
						process.env.DOTSEC_AWS_KMS_REGION ||
						config.plugins?.aws?.region ||
						config.plugins?.aws?.kms?.region ||
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
			},
		},
		addCliCommand: async ({ program }) => {
			program
				.enablePositionalOptions()
				.passThroughOptions()
				.command("aws")
				.action(async () => {
					console.log("OMG", config);
				});
		},
	};
};

export default dotsecPluginAws;
