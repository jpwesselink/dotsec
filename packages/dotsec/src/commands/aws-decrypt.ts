import fs from "node:fs";
import path from "node:path";

import { commonCliOptions } from "../commonCliOptions";
import {
	decryptAWSVariables,
	getAWSEncryptedVariablesFromFile,
} from "../lib/aws";
import { getConfig } from "../lib/config-old";
import { handleCredentialsAndRegion } from "../lib/partial-commands/handleCredentialsAndRegion";
import { YargsHandlerParams } from "../types";
import { promptOverwriteIfFileExists } from "../utils/io";
import { getLogger } from "../utils/logger";
export const command = "aws-decrypt";
export const desc = "Decrypts an unencrypted file";

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

		const { type: configType, config: awsEncryptedVariables } =
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

		const awsVariablesByStorage = await decryptAWSVariables({
			awsEncryptedVariables: awsEncryptedVariables,
			credentials: credentialsAndOrigin.value,
			region: regionAndOrigin.value,
		});

		// write to disk

		if (configType === "json") {
			const secretsPath = path.resolve(
				process.cwd(),
				argv.secretsFile || "secrets.json",
			);
			const overwriteResponse = await promptOverwriteIfFileExists({
				filePath: secretsPath,
				skip: argv.yes,
			});
			// easy peasy, write json

			if (
				overwriteResponse === undefined ||
				overwriteResponse.overwrite === true
			) {
				fs.writeFileSync(
					secretsPath,
					JSON.stringify(awsVariablesByStorage, null, 4),
				);
			}
		}
	} catch (e) {
		error(e);
	}
};
