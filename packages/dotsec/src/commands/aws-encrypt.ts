import fs from "node:fs";
import path from "node:path";

import { unflatten } from "flat";

import { commonCliOptions } from "../commonCliOptions";
import { getAWSVariablesFromFile, encryptAWSVariables } from "../lib/aws";
import { getConfig } from "../lib/config-old";
import { handleCredentialsAndRegion } from "../lib/partial-commands/handleCredentialsAndRegion";
import { YargsHandlerParams } from "../types";
import { promptOverwriteIfFileExists } from "../utils/io";
import { getLogger } from "../utils/logger";
export const command = "aws-encrypt";
export const desc = "Encrypts an unencrypted file";

export const builder = {
	"secrets-file": {
		string: true,
		describe: "filename of json file reading secrets",
		default: "secrets.json",
	},
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

	const { info, error } = getLogger();
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

		const { type: configType, config: awsVariables } =
			await getAWSVariablesFromFile({
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

		if (!awsVariables.secretsManager && !awsVariables.parameterStore) {
			throw new Error(
				`Expected 'secretsManager' and/or 'parameterStore' property, but got none`,
			);
		}

		console.log(JSON.stringify({ awsVariables }, null, 4));
		// return;
		// const awsStorageVariables = getAWSStorageVariables(awsVariables);
		// console.log(
		//     JSON.stringify({ awsVariables, awsStorageVariables }, null, 2),
		// );

		const awsEncryptedVariablesByStorage = await encryptAWSVariables({
			awsVariables,
			credentials: credentialsAndOrigin.value,
			region: regionAndOrigin.value,
		});
		const meh = {
			...awsEncryptedVariablesByStorage,
			secretsManager: unflatten(awsEncryptedVariablesByStorage.secretsManager),
			parameterStore: unflatten(awsEncryptedVariablesByStorage.parameterStore),
		};
		console.log(JSON.stringify({ meh }, null, 4));

		if (configType === "json") {
			const encryptedSecretsPath = path.resolve(
				process.cwd(),
				argv.encryptedSecretsFile || "secrets.encrypted.json",
			);
			const overwriteResponse = await promptOverwriteIfFileExists({
				filePath: encryptedSecretsPath,
				skip: argv.yes,
			});
			// easy peasy, write json

			if (
				overwriteResponse === undefined ||
				overwriteResponse.overwrite === true
			) {
				fs.writeFileSync(encryptedSecretsPath, JSON.stringify(meh, null, 4));
			}
		}
	} catch (e) {
		error(e);
	}
};
