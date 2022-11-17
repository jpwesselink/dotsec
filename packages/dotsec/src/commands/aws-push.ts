import { commonCliOptions } from "../commonCliOptions";
import {
	decryptAWSVariables,
	getAWSEncryptedVariablesFromFile,
	getAWSStorageVariables,
} from "../lib/aws";
import { getConfig } from "../lib/config-old";
import { handleCredentialsAndRegion } from "../lib/partial-commands/handleCredentialsAndRegion";
import { FFObject, flatten, unflatten } from "../lib/tree";
import { YargsHandlerParams } from "../types";
import { getLogger } from "../utils/logger";
export const command = "aws-push";
export const desc =
	"Decrypts and pushes secret values to AWS SSM and SecretsManager";

export const builder = {
	"encrypted-secrets-file": {
		string: true,
		describe: "filename of json file for writing encrypted secrets",
		default: "secrets.encrypted.json",
	},
	"aws-profile": commonCliOptions.awsProfile,
	"aws-region": commonCliOptions.awsRegion,
	"aws-key-alias": commonCliOptions.awsKeyAlias,
	"aws-assume-role-arn": commonCliOptions.awsAssumeRoleArn,
	"aws-assume-role-session-duration":
		commonCliOptions.awsAssumeRoleSessionDuration,
	verbose: commonCliOptions.verbose,
	yes: { ...commonCliOptions.yes },
} as const;

export const handler = async (
	argv: YargsHandlerParams<typeof builder>,
): Promise<void> => {
	const config = await getConfig();

	const { error } = getLogger();
	try {
		const defaultRegion = config.aws.region || argv.awsRegion;
		const { credentialsAndOrigin, regionAndOrigin } =
			await handleCredentialsAndRegion({
				argv: {
					...argv,
					awsRegion: defaultRegion,
					awsProfile: config.aws.profile || argv.awsProfile,
					awsAssumeRoleArn: config.aws.assumeRoleArn || argv.awsAssumeRoleArn,
					awsAssumeRoleSessionDuration:
						config.aws.assumeRoleSessionDuration ||
						argv.awsAssumeRoleSessionDuration,
				},
				env: { ...process.env },
			});

		const { config: awsEncryptedVariables } =
			await getAWSEncryptedVariablesFromFile({
				defaultConfig: {
					config: {
						aws: {
							keyAlias: "alias/dotsec",
							regions: [regionAndOrigin.value],
						},
					},
				},
				options: {},
			});

		if (
			!awsEncryptedVariables.secretsManager &&
			!awsEncryptedVariables.parameterStore
		) {
			throw new Error(
				`Expected 'secretsManager' and/or 'parameterStore' property, but got none`,
			);
		}

		const awsVariables = await decryptAWSVariables({
			awsEncryptedVariables: awsEncryptedVariables,
			credentials: credentialsAndOrigin.value,
			region: regionAndOrigin.value,
		});
		const unflattened = unflatten(awsVariables.parameterStore as FFObject);

		const flattened = flatten(unflattened);
		console.log(JSON.stringify({ unflattened, flattened }, null, 2));
		console.log(JSON.stringify({ awsVariables }, null, 2));

		const awsStorageVariables = getAWSStorageVariables(awsVariables);
		console.log(JSON.stringify({ awsVariables, awsStorageVariables }, null, 2));
	} catch (e) {
		error(e);
	}
};
